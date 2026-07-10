import { inject, Injectable } from '@angular/core';
import { catchError, forkJoin, map, Observable, of } from 'rxjs';

import { CallListService } from './calllist.service';

export interface BingoConsoleContext {
  Game_ID: number | null;
  Call_List_ID: number | null;
  Inning: number | null;
  /** Latest `Get_Max_Game_ID` value (persisted in `bingo_console_context_v1`). */
  Max_Game_ID: number | null;
}

/** Last bingo winner card for the matching Game / Call List / Inning (`bingo_console_winning_card_v1`). */
export interface BingoWinningCardHold {
  Game_ID: number;
  Call_List_ID: number;
  Inning: number;
  WinningCardID: number;
}

@Injectable({ providedIn: 'root' })
export class ConsoleContextService {
  private readonly storageKey = 'bingo_console_context_v1';
  private readonly winningCardStorageKey = 'bingo_console_winning_card_v1';
  private readonly callListService = inject(CallListService);

  getContext(): BingoConsoleContext | null {
    if (typeof window === 'undefined') return null;

    const raw = window.localStorage.getItem(this.storageKey);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as Partial<BingoConsoleContext>;
      return this.normalizeContext(parsed);
    } catch {
      return null;
    }
  }

  /**
   * Stores the 3 values as a single JSON object in localStorage.
   * If all values are null/invalid, the item is removed.
   */
  setContext(context: Partial<BingoConsoleContext>): void {
    if (typeof window === 'undefined') return;

    const existing = this.getContext();
    const normalized = this.normalizeContext({ ...existing, ...context });
    const shouldRemove =
      normalized.Game_ID === null &&
      normalized.Call_List_ID === null &&
      normalized.Inning === null &&
      normalized.Max_Game_ID === null;

    if (shouldRemove) {
      window.localStorage.removeItem(this.storageKey);
      return;
    }

    window.localStorage.setItem(this.storageKey, JSON.stringify(normalized));
  }

  clear(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(this.storageKey);
    window.localStorage.removeItem(this.winningCardStorageKey);
  }

  /** Persists the winning card when bingo is declared for the current GCI. */
  setWinningCard(hold: BingoWinningCardHold): void {
    if (typeof window === 'undefined') return;

    const gameId = this.normalizePositiveInt(hold.Game_ID);
    const callListId = this.normalizePositiveInt(hold.Call_List_ID);
    const inning = this.normalizePositiveInt(hold.Inning);
    const winningCardId = this.normalizePositiveInt(hold.WinningCardID);

    if (gameId === null || callListId === null || inning === null || winningCardId === null) {
      return;
    }

    const payload: BingoWinningCardHold = {
      Game_ID: gameId,
      Call_List_ID: callListId,
      Inning: inning,
      WinningCardID: winningCardId
    };

    window.localStorage.setItem(this.winningCardStorageKey, JSON.stringify(payload));
  }

  getWinningCard(): BingoWinningCardHold | null {
    if (typeof window === 'undefined') return null;

    const raw = window.localStorage.getItem(this.winningCardStorageKey);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as Partial<BingoWinningCardHold>;
      const gameId = this.normalizePositiveInt(parsed.Game_ID);
      const callListId = this.normalizePositiveInt(parsed.Call_List_ID);
      const inning = this.normalizePositiveInt(parsed.Inning);
      const winningCardId = this.normalizePositiveInt(parsed.WinningCardID);

      if (gameId === null || callListId === null || inning === null || winningCardId === null) {
        return null;
      }

      return {
        Game_ID: gameId,
        Call_List_ID: callListId,
        Inning: inning,
        WinningCardID: winningCardId
      };
    } catch {
      return null;
    }
  }

  /**
   * Returns the stored winning card ID only when it matches the given Game / Call List / Inning.
   */
  getWinningCardIdForContext(
    gameId: number | null,
    callListId: number | null,
    inning: number | null
  ): number | null {
    const hold = this.getWinningCard();
    if (!hold || gameId === null || callListId === null || inning === null) {
      return null;
    }

    if (hold.Game_ID !== gameId || hold.Call_List_ID !== callListId || hold.Inning !== inning) {
      return null;
    }

    return hold.WinningCardID;
  }

  clearWinningCard(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(this.winningCardStorageKey);
  }

  getGameId(): number | null {
    return this.getContext()?.Game_ID ?? null;
  }

  getCallListId(): number | null {
    return this.getContext()?.Call_List_ID ?? null;
  }

  getInning(): number | null {
    return this.getContext()?.Inning ?? null;
  }

  getStoredMaxGameId(): number | null {
    return this.getContext()?.Max_Game_ID ?? null;
  }

  /** Merges `Max_Game_ID` into `bingo_console_context_v1` without changing GCI fields. */
  setStoredMaxGameId(maxGameId: number): void {
    const max = this.normalizeNonNegativeInt(maxGameId);
    if (max === null) {
      return;
    }

    this.setContext({ Max_Game_ID: max });
  }

  /** `GET …/Get_Max_Game_ID` — persists the current max in localStorage. */
  refreshMaxGameIdFromApi(userId?: number | null): Observable<number> {
    return this.callListService.getMaxGameId(userId).pipe(
      catchError(() => of(0)),
      map(max => {
        this.setStoredMaxGameId(max);
        return max;
      })
    );
  }

  /**
   * Runs once at app startup (see APP_INITIALIZER).
   * - If nothing is in localStorage yet: fetch max Game ID and max Call List ID from the API
   *   and persist them with Inning 1 as the default “latest” row context.
   * - If localStorage already has a saved context: keep it (user/session choice) and do not
   *   overwrite with API values.
   */
  initializeFromApiAndStorage(): Observable<BingoConsoleContext> {
    if (typeof window === 'undefined') {
      return of(this.normalizeContext({}));
    }

    if (window.localStorage.getItem(this.storageKey)) {
      const existing = this.getContext() ?? this.normalizeContext({});
      return of(existing);
    }

    return forkJoin({
      maxGameId: this.callListService.getMaxGameId().pipe(catchError(() => of(0))),
      maxCallListId: this.callListService.getMaxCallListId().pipe(catchError(() => of(0)))
    }).pipe(
      map(({ maxGameId, maxCallListId }) => {
        const merged = this.normalizeContext({
          Game_ID: maxGameId > 0 ? maxGameId : null,
          Call_List_ID: maxCallListId > 0 ? maxCallListId : null,
          Inning: 1,
          Max_Game_ID: maxGameId
        });
        this.setContext(merged);
        return merged;
      })
    );
  }

  private normalizeContext(context: Partial<BingoConsoleContext>): BingoConsoleContext {
    const gameId = this.normalizePositiveInt(context.Game_ID);
    const callListId = this.normalizePositiveInt(context.Call_List_ID);
    const inning = this.normalizePositiveInt(context.Inning);
    const maxGameId = this.normalizeNonNegativeInt(context.Max_Game_ID);

    return {
      Game_ID: gameId,
      Call_List_ID: callListId,
      Inning: inning,
      Max_Game_ID: maxGameId
    };
  }

  private normalizeNonNegativeInt(value: unknown): number | null {
    if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
      return value;
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);
      return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
    }

    return null;
  }

  private normalizePositiveInt(value: unknown): number | null {
    if (typeof value === 'number' && Number.isInteger(value) && value > 0) return value;

    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);
      return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
    }

    return null;
  }
}

