import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, finalize, forkJoin, of } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  BingoCallListDropdownByUser,
  BingoInsertNewGame,
  BingoUpdateGameByGid
} from '../../models/bingo-game.model';
import {
  BingoGameSetupCheckResult,
  BingoGameSetupGameNightRow
} from '../../models/bingo-game-setup.model';
import {
  BingoCallListWinnerByUserRow,
  BingoGameWinnerResultRow
} from '../../models/bingo-game-winner-result.model';
import { CallListIdFieldComponent } from '../../shared/call-list-id-field/call-list-id-field.component';
import { AuthUserService } from '../../services/auth-user.service';
import { CallListService } from '../../services/calllist.service';
import { ConsoleContextService } from '../../services/console-context.service';
import { GameMgmtService } from '../../services/game-mgmt.service';
import { validationStatusClass } from '../../shared/validation-status';
import { numericDraftFromValue, parsePositiveInteger } from '../../shared/numeric-input-draft';

export type GameMasterTab = 'gameInfo' | 'gameResults' | 'gameWinners';

@Component({
  selector: 'app-game-master',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CallListIdFieldComponent],
  templateUrl: './game-master.component.html',
  styleUrl: './game-master.component.scss'
})
export class GameMasterComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly consoleContextService = inject(ConsoleContextService);
  private readonly gameMgmtService = inject(GameMgmtService);
  private readonly callListService = inject(CallListService);
  private readonly authUserService = inject(AuthUserService);

  readonly currentUser = this.authUserService.user;

  readonly gameId = signal(1);
  readonly callListId = signal<number | null>(null);
  readonly inning = signal(1);
  readonly gameIdDraft = signal('1');
  readonly inningDraft = signal('1');

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly hasLoaded = signal(false);
  readonly loadMessage = signal<string | null>(null);
  readonly activeTab = signal<GameMasterTab>('gameInfo');
  readonly gameSetup = signal<BingoGameSetupCheckResult | null>(null);
  readonly rawGameSetupJson = signal<string | null>(null);
  readonly setupLoading = signal(false);
  readonly setupError = signal<string | null>(null);

  readonly gameSetupApiPath = computed(() => `api/Bingo/Check/Check_GameSetup/${this.gameId()}`);

  readonly gameSetupRequestUrl = computed(
    () => `${environment.bingoCheckGameSetupApiBaseUrl}/${this.gameId()}`
  );
  readonly gameWinners = signal<BingoGameWinnerResultRow[]>([]);
  readonly winnersLoading = signal(false);
  readonly winnersError = signal<string | null>(null);
  readonly callListWinnersByUser = signal<BingoCallListWinnerByUserRow[]>([]);
  readonly callListWinnersByUserLoading = signal(false);
  readonly callListWinnersByUserError = signal<string | null>(null);

  readonly insertUserId = signal('');
  readonly insertCallListId = signal('');
  readonly insertGameNumber = signal('');
  readonly insertGameInning = signal('');
  readonly insertGameName = signal('');
  readonly insertGameStartTime = signal('');
  readonly insertGameEndTime = signal('');
  readonly insertGameWinPattern = signal('Line');
  readonly insertWinnerCardId = signal('0');
  readonly insertGameStatus = signal('Pending');
  readonly insertingNewGame = signal(false);
  readonly updatingGame = signal(false);
  readonly insertNewGameError = signal<string | null>(null);
  readonly insertNewGameSuccess = signal<string | null>(null);
  readonly maxGameIdFromApi = signal<number | null>(null);
  readonly maxCallListIdFromApi = signal<number | null>(null);
  readonly maxGameIdLoading = signal(false);
  readonly callListDropdown = signal<BingoCallListDropdownByUser[]>([]);
  readonly callListDefaultsLoading = signal(false);

  readonly isNewGameSlot = computed(() => {
    const gameId = this.gameId();
    const maxGameId = this.maxGameIdFromApi();
    if (maxGameId === null) {
      return true;
    }
    return gameId > maxGameId;
  });

  readonly canInsertNewGame = computed(() => {
    this.currentUser();
    this.callListId();
    this.inning();
    this.maxCallListIdFromApi();
    this.maxGameIdFromApi();
    this.gameId();
    this.callListDropdown();
    if (!this.isNewGameSlot()) {
      return false;
    }
    return this.buildInsertNewGamePayload() !== null;
  });

  readonly canUpdateGame = computed(() => {
    this.hasLoaded();
    this.gameId();
    this.maxGameIdFromApi();
    this.callListId();
    this.inning();
    if (!this.hasLoaded() || this.isNewGameSlot()) {
      return false;
    }
    return this.buildUpdateGameByGidPayload() !== null;
  });

  selectTab(tab: GameMasterTab): void {
    this.activeTab.set(tab);
    if (tab === 'gameWinners' && this.hasLoaded()) {
      this.loadCallListWinnersByUser();
    }
  }

  loadCallListWinnersByUser(): void {
    const userId = this.resolveWinnersUserId();
    if (!userId || userId <= 0) {
      this.callListWinnersByUser.set([]);
      this.callListWinnersByUserError.set('Sign in or set User_ID to load winners for your account.');
      return;
    }

    const gameId = this.gameId();
    this.callListWinnersByUserLoading.set(true);
    this.callListWinnersByUserError.set(null);

    this.gameMgmtService
      .getCallListWinnerByUserId(userId, gameId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err: HttpErrorResponse) => {
          console.error('Get_CallListWinner_by_UserID failed', err);
          this.callListWinnersByUserError.set(
            this.formatApiError('Get_CallListWinner_by_UserID', err, gameId)
          );
          return of([] as BingoCallListWinnerByUserRow[]);
        }),
        finalize(() => this.callListWinnersByUserLoading.set(false))
      )
      .subscribe(rows => this.callListWinnersByUser.set(rows));
  }

  ngOnInit(): void {
    const ctx = this.consoleContextService.getContext();
    if (ctx) {
      if (ctx.Game_ID) {
        this.gameId.set(ctx.Game_ID);
      }
      if (ctx.Call_List_ID !== null && ctx.Call_List_ID !== undefined) {
        this.callListId.set(ctx.Call_List_ID);
      }
      if (ctx.Inning !== null && ctx.Inning !== undefined) {
        this.inning.set(ctx.Inning);
      }
    }

    this.syncNumericDrafts();
    this.initInsertFormFromContext();
    this.loadMaxGameIdForInsert();
    this.loadCallListDefaults();
  }

  clearInsertFormMessages(): void {
    this.insertNewGameError.set(null);
    this.insertNewGameSuccess.set(null);
  }

  setInsertUserIdFromInput(value: unknown): void {
    this.insertUserId.set(String(value ?? '').trim());
    this.clearInsertFormMessages();
  }

  insertCallListIdValue(): number | null {
    return this.parsePositiveInt(this.insertCallListId());
  }

  setInsertCallListIdFromInput(value: unknown): void {
    this.insertCallListId.set(this.coerceIdInput(value));
    const parsed =
      typeof value === 'number' && Number.isInteger(value) && value > 0
        ? value
        : this.parsePositiveInt(this.insertCallListId());
    if (parsed !== null) {
      this.callListId.set(parsed);
      if (!this.insertGameName().trim()) {
        this.insertGameName.set(`CL ${parsed} `);
      }
    }
    this.clearInsertFormMessages();
  }

  setInsertGameNumberFromInput(value: unknown): void {
    this.insertGameNumber.set(String(value ?? '').trim());
    this.clearInsertFormMessages();
  }

  setInsertGameInningFromInput(value: unknown): void {
    this.insertGameInning.set(String(value ?? '').trim());
    this.clearInsertFormMessages();
  }

  setInsertGameNameFromInput(value: unknown): void {
    this.insertGameName.set(String(value ?? '').trim());
  }

  setInsertGameStartTimeFromInput(value: unknown): void {
    this.insertGameStartTime.set(String(value ?? '').trim());
  }

  setInsertGameEndTimeFromInput(value: unknown): void {
    this.insertGameEndTime.set(String(value ?? '').trim());
  }

  setInsertGameWinPatternFromInput(value: unknown): void {
    this.insertGameWinPattern.set(String(value ?? '').trim());
  }

  setInsertWinnerCardIdFromInput(value: unknown): void {
    this.insertWinnerCardId.set(String(value ?? '').trim());
  }

  setInsertGameStatusFromInput(value: unknown): void {
    this.insertGameStatus.set(String(value ?? '').trim());
  }

  useNowForInsertTimes(): void {
    const now = this.toInsertNewGameIsoTimestamp();
    this.insertGameStartTime.set(now);
    this.insertGameEndTime.set(now);
  }

  updateGame(): void {
    this.insertNewGameError.set(null);
    this.insertNewGameSuccess.set(null);

    const payload = this.buildUpdateGameByGidPayload();
    if (!payload) {
      this.insertNewGameError.set(this.describeUpdateGameValidation());
      return;
    }

    this.updatingGame.set(true);

    this.callListService
      .updateGameByGid(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(err => {
          console.error('Update_Game_byGID failed', err);
          this.insertNewGameError.set(
            err instanceof Error ? err.message : 'Unable to update this game right now.'
          );
          return of(null);
        }),
        finalize(() => this.updatingGame.set(false))
      )
      .subscribe(result => {
        if (!result) {
          return;
        }

        if (!result.Success) {
          this.insertNewGameError.set(result.Message || 'Game update was not successful.');
          return;
        }

        this.gameId.set(result.Game_ID || payload.Game_ID);
        this.callListId.set(payload.Call_List_ID);
        this.inning.set(payload.Game_Inning);
        this.syncNumericDrafts();
        this.consoleContextService.setContext({
          Game_ID: result.Game_ID || payload.Game_ID,
          Call_List_ID: payload.Call_List_ID,
          Inning: payload.Game_Inning
        });
        this.hasLoaded.set(true);

        this.insertNewGameSuccess.set(
          result.Message
            ? `${result.Message} — Game_ID ${result.Game_ID || payload.Game_ID}`
            : `Game ${payload.Game_ID} updated.`
        );
        this.loadMessage.set(
          `Game ${result.Game_ID || payload.Game_ID} · Call list ${payload.Call_List_ID} · Inning ${payload.Game_Inning} updated.`
        );
        this.fetchGameData(result.Game_ID || payload.Game_ID, payload.Call_List_ID, payload.Game_Inning);
      });
  }

  insertNewGame(): void {
    this.insertNewGameError.set(null);
    this.insertNewGameSuccess.set(null);

    const payload = this.buildInsertNewGamePayload();
    if (!payload) {
      this.insertNewGameError.set(this.describeInsertNewGameValidation());
      return;
    }

    this.insertingNewGame.set(true);

    this.callListService
      .insertNewGame(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(err => {
          console.error('Insert_NewGame failed', err);
          this.insertNewGameError.set(
            err instanceof Error ? err.message : 'Unable to insert a new game right now.'
          );
          return of(null);
        }),
        finalize(() => this.insertingNewGame.set(false))
      )
      .subscribe(result => {
        if (!result) {
          return;
        }

        this.gameId.set(result.New_Game_ID);
        this.callListId.set(payload.Call_List_ID);
        this.inning.set(payload.Game_Inning);
        this.syncNumericDrafts();
        this.consoleContextService.setContext({
          Game_ID: result.New_Game_ID,
          Call_List_ID: payload.Call_List_ID,
          Inning: payload.Game_Inning,
          Max_Game_ID: result.New_Game_ID
        });
        this.consoleContextService.setStoredMaxGameId(result.New_Game_ID);
        this.maxGameIdFromApi.set(result.New_Game_ID);
        this.insertGameNumber.set(String(payload.Game_Number + 1));
        this.initInsertFormFromContext();
        this.hasLoaded.set(true);

        this.insertNewGameSuccess.set(
          result.Message
            ? `${result.Message} — New_Game_ID ${result.New_Game_ID}`
            : `New game created (ID ${result.New_Game_ID}).`
        );
        this.loadMessage.set(
          `Game ${result.New_Game_ID} · Call list ${payload.Call_List_ID} · Inning ${payload.Game_Inning} saved.`
        );
        this.fetchGameData(result.New_Game_ID, payload.Call_List_ID, payload.Game_Inning);
      });
  }

  private loadCallListDefaults(): void {
    const userId = this.currentUser()?.UserId;
    if (!userId || userId <= 0) {
      return;
    }

    this.callListDefaultsLoading.set(true);

    forkJoin({
      maxCallListId: this.callListService.getMaxCallListId(userId).pipe(catchError(() => of(0))),
      dropdown: this.callListService
        .getDropDownCallListByUserId(userId)
        .pipe(catchError(() => of([] as BingoCallListDropdownByUser[])))
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.callListDefaultsLoading.set(false))
      )
      .subscribe(({ maxCallListId, dropdown }) => {
        this.maxCallListIdFromApi.set(maxCallListId > 0 ? maxCallListId : null);
        this.callListDropdown.set(
          [...dropdown].sort((a, b) => b.Call_List_ID - a.Call_List_ID)
        );

        if (this.resolveInsertCallListId() !== null) {
          return;
        }

        const fromDropdown =
          dropdown.length > 0
            ? Math.max(...dropdown.map(row => row.Call_List_ID))
            : null;
        const resolved =
          (maxCallListId > 0 ? maxCallListId : null) ?? fromDropdown;

        if (resolved !== null && resolved > 0) {
          this.applyCallListId(resolved);
        }
      });
  }

  private applyCallListId(callListId: number): void {
    this.callListId.set(callListId);
    this.insertCallListId.set(String(callListId));
    if (!this.insertGameName().trim()) {
      this.insertGameName.set(`CL ${callListId} `);
    }
  }

  private loadMaxGameIdForInsert(): void {
    const storedMax = this.consoleContextService.getStoredMaxGameId();
    if (storedMax !== null) {
      this.maxGameIdFromApi.set(storedMax);
    }

    this.maxGameIdLoading.set(true);

    this.callListService
      .getMaxGameId(this.currentUser()?.UserId ?? null)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => of(storedMax ?? 0)),
        finalize(() => this.maxGameIdLoading.set(false))
      )
      .subscribe(val => {
        this.maxGameIdFromApi.set(val);
        this.consoleContextService.setStoredMaxGameId(val);
        if (!this.insertGameNumber().trim()) {
          this.insertGameNumber.set(String(Math.max(1, val + 1)));
        }
      });
  }

  private initInsertFormFromContext(): void {
    const user = this.currentUser();
    if (user?.UserId) {
      this.insertUserId.set(String(user.UserId));
    }

    const clid = this.resolveInsertCallListId();
    if (clid !== null && clid > 0) {
      this.applyCallListId(clid);
    }

    const inn = this.resolveInsertGameInning() ?? this.inning();
    if (inn >= 1) {
      this.insertGameInning.set(String(inn));
    }

    if (!this.insertGameNumber().trim()) {
      const max = this.maxGameIdFromApi();
      this.insertGameNumber.set(String(max !== null ? Math.max(1, max + 1) : 1));
    }

    const clidNum = Number(this.insertCallListId().trim());
    if (Number.isInteger(clidNum) && clidNum > 0 && !this.insertGameName().trim()) {
      this.insertGameName.set(`CL ${clidNum} `);
    }

    const now = this.toInsertNewGameIsoTimestamp();
    if (!this.insertGameStartTime().trim()) {
      this.insertGameStartTime.set(now);
    }
    if (!this.insertGameEndTime().trim()) {
      this.insertGameEndTime.set(now);
    }
  }

  private describeUpdateGameValidation(): string {
    const missing: string[] = [];
    if (!Number.isInteger(this.gameId()) || this.gameId() < 1) {
      missing.push('Game_ID (set in top bar and click Load Game)');
    }
    if (!this.hasLoaded()) {
      missing.push('loaded game (click Load Game first)');
    }
    if (this.isNewGameSlot()) {
      missing.push('an existing Game_ID (current ID is above your max — use Insert instead)');
    }
    if (this.resolveInsertCallListId() === null) {
      missing.push('Call_List_ID');
    }
    if (this.resolveInsertGameNumber() === null) {
      missing.push('Game_Number');
    }
    if (this.resolveInsertGameInning() === null) {
      missing.push('Game_Inning');
    }
    if (!this.insertGameStartTime().trim()) {
      missing.push('Game_StartTime');
    }
    return missing.length
      ? `Missing or invalid: ${missing.join(', ')}.`
      : 'Complete all required fields before updating.';
  }

  private describeInsertNewGameValidation(): string {
    const missing: string[] = [];
    if (this.resolveInsertUserId() === null) {
      missing.push('User_ID (log in or enter a positive number)');
    }
    if (this.resolveInsertCallListId() === null) {
      missing.push(
        this.callListDefaultsLoading()
          ? 'Call_List_ID (loading your call lists…)'
          : 'Call_List_ID (enter above, pick from dropdown, or set in top bar)'
      );
    }
    if (this.resolveInsertGameNumber() === null) {
      missing.push('Game_Number');
    }
    if (this.resolveInsertGameInning() === null) {
      missing.push('Game_Inning');
    }
    if (!this.insertGameStartTime().trim()) {
      missing.push('Game_StartTime');
    }
    return missing.length
      ? `Missing or invalid: ${missing.join(', ')}.`
      : 'Complete all required insert fields before submitting.';
  }

  private buildInsertNewGamePayload(): BingoInsertNewGame | null {
    const userId = this.resolveInsertUserId();
    const callListId = this.resolveInsertCallListId();
    const gameNumber = this.resolveInsertGameNumber();
    const inning = this.resolveInsertGameInning();
    const startTime = this.insertGameStartTime().trim();
    const endTime = this.insertGameEndTime().trim() || startTime;

    if (
      userId === null ||
      callListId === null ||
      gameNumber === null ||
      inning === null ||
      !startTime
    ) {
      return null;
    }

    const gameName =
      this.insertGameName().trim() ||
      (callListId !== null ? `CL ${callListId} ` : '');

    return {
      User_ID: userId,
      Call_List_ID: callListId,
      Game_Number: gameNumber,
      Game_Inning: inning,
      Game_Name: gameName,
      Game_StartTime: startTime,
      Game_EndTime: endTime,
      Game_WinPattern: this.insertGameWinPattern().trim() || 'Line',
      Game_WinnerCard_ID: this.resolveInsertWinnerCardId() ?? 0,
      Game_Status: this.insertGameStatus().trim() || 'Pending'
    };
  }

  private buildUpdateGameByGidPayload(): BingoUpdateGameByGid | null {
    const gameId = this.gameId();
    const callListId = this.resolveInsertCallListId();
    const gameNumber = this.resolveInsertGameNumber();
    const inning = this.resolveInsertGameInning();
    const startTime = this.insertGameStartTime().trim();
    const endTime = this.insertGameEndTime().trim() || startTime;

    if (
      !Number.isInteger(gameId) ||
      gameId < 1 ||
      callListId === null ||
      gameNumber === null ||
      inning === null ||
      !startTime
    ) {
      return null;
    }

    const gameName =
      this.insertGameName().trim() ||
      (callListId !== null ? `CL ${callListId} ` : '');

    return {
      Game_ID: gameId,
      Call_List_ID: callListId,
      Game_Number: gameNumber,
      Game_Inning: inning,
      Game_Name: gameName,
      Game_StartTime: startTime,
      Game_EndTime: endTime,
      Game_WinPattern: this.insertGameWinPattern().trim() || 'Line',
      Game_WinnerCard_ID: this.resolveInsertWinnerCardId() ?? 0,
      Game_Status: this.insertGameStatus().trim() || 'Pending'
    };
  }

  private applyLoadedGameRowToInsertForm(): void {
    const setup = this.gameSetup();
    if (!setup) {
      return;
    }

    const gameId = this.gameId();
    const inning = this.inning();
    const row =
      setup.GameRows.find(
        candidate =>
          candidate.Game_ID === gameId &&
          (candidate.Game_Inning === null || candidate.Game_Inning === inning)
      ) ?? setup.GameRows.find(candidate => candidate.Game_ID === gameId);

    if (!row) {
      return;
    }

    if (row.Call_List_ID !== null && row.Call_List_ID !== undefined && row.Call_List_ID > 0) {
      this.applyCallListId(row.Call_List_ID);
    }
    if (row.Game_Number !== null && row.Game_Number !== undefined && row.Game_Number >= 1) {
      this.insertGameNumber.set(String(row.Game_Number));
    }
    if (row.Game_Inning !== null && row.Game_Inning !== undefined && row.Game_Inning >= 1) {
      this.insertGameInning.set(String(row.Game_Inning));
    }
    if (row.Game_Name?.trim()) {
      this.insertGameName.set(row.Game_Name.trim());
    }
    if (row.Game_StartTime?.trim()) {
      this.insertGameStartTime.set(row.Game_StartTime.trim());
    }
    if (row.Game_EndTime?.trim()) {
      this.insertGameEndTime.set(row.Game_EndTime.trim());
    } else if (row.Game_StartTime?.trim()) {
      this.insertGameEndTime.set(row.Game_StartTime.trim());
    }
    if (row.Game_WinPattern?.trim()) {
      this.insertGameWinPattern.set(row.Game_WinPattern.trim());
    }
    if (row.Game_Status?.trim()) {
      this.insertGameStatus.set(row.Game_Status.trim());
    }
    if (setup.Header.User_ID_Found !== null && setup.Header.User_ID_Found > 0) {
      this.insertUserId.set(String(setup.Header.User_ID_Found));
    }
  }

  private resolveInsertUserId(): number | null {
    const fromInput = this.parsePositiveInt(this.insertUserId());
    if (fromInput !== null) {
      return fromInput;
    }
    return this.currentUser()?.UserId ?? null;
  }

  private resolveInsertCallListId(): number | null {
    const fromInsert = this.parsePositiveInt(this.insertCallListId());
    if (fromInsert !== null) {
      return fromInsert;
    }

    const top = this.callListId();
    if (top !== null && top > 0) {
      return top;
    }

    const max = this.maxCallListIdFromApi();
    if (max !== null && max > 0) {
      return max;
    }

    const dropdown = this.callListDropdown();
    if (dropdown.length > 0) {
      return Math.max(...dropdown.map(row => row.Call_List_ID));
    }

    const ctx = this.consoleContextService.getContext()?.Call_List_ID;
    return ctx !== null && ctx !== undefined && ctx > 0 ? ctx : null;
  }

  private coerceIdInput(value: unknown): string {
    if (value === null || value === undefined || value === '') {
      return '';
    }
    return String(value).trim();
  }

  private parsePositiveInt(value: string): number | null {
    const raw = value.trim();
    if (!raw) {
      return null;
    }
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }

  private resolveInsertGameNumber(): number | null {
    const raw = this.insertGameNumber().trim();
    if (!raw) {
      return null;
    }
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed >= 1 ? parsed : null;
  }

  private resolveInsertGameInning(): number | null {
    const fromInsert = this.parsePositiveInt(this.insertGameInning());
    if (fromInsert !== null) {
      return fromInsert;
    }
    const top = this.inning();
    return Number.isInteger(top) && top >= 1 ? top : null;
  }

  private resolveInsertWinnerCardId(): number | null {
    const raw = this.insertWinnerCardId().trim();
    if (!raw) {
      return 0;
    }
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
  }

  private toInsertNewGameIsoTimestamp(): string {
    const iso = new Date().toISOString();
    return iso.replace(/\.(\d{3})\d*Z$/, '.$1Z');
  }

  readonly trackByGameNightRow = (index: number, row: BingoGameSetupGameNightRow): number =>
    row.Game_ID ?? row.GN_ID ?? row.User_ID ?? index;

  readonly trackByGameWinnerRow = (index: number, row: BingoGameWinnerResultRow): number =>
    row.Call_List_Winner_ID ?? index;

  readonly trackByCallListWinnerByUserRow = (
    _index: number,
    row: BingoCallListWinnerByUserRow
  ): number => row.Call_List_Winner_ID;

  readonly validationStatusClass = validationStatusClass;

  formatBool(value: boolean | null | undefined): string {
    if (value === true) {
      return 'Yes';
    }
    if (value === false) {
      return 'No';
    }
    return '—';
  }

  formatValue(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') {
      return '—';
    }
    return String(value);
  }

  onGameIdDraftInput(value: unknown): void {
    this.gameIdDraft.set(value != null && value !== '' ? String(value) : '');
  }

  commitGameIdFromDraft(): void {
    const parsed = parsePositiveInteger(this.gameIdDraft());
    if (parsed !== null) {
      if (parsed !== this.gameId()) {
        this.hasLoaded.set(false);
      }
      this.gameId.set(parsed);
      this.gameIdDraft.set(String(parsed));
      return;
    }
    this.gameIdDraft.set(String(this.gameId()));
  }

  onInningDraftInput(value: unknown): void {
    this.inningDraft.set(value != null && value !== '' ? String(value) : '');
  }

  commitInningFromDraft(): void {
    const parsed = parsePositiveInteger(this.inningDraft());
    if (parsed !== null) {
      if (parsed !== this.inning()) {
        this.hasLoaded.set(false);
      }
      this.inning.set(parsed);
      this.inningDraft.set(String(parsed));
      this.insertGameInning.set(String(parsed));
      this.insertNewGameError.set(null);
      this.insertNewGameSuccess.set(null);
      return;
    }
    this.inningDraft.set(String(this.inning()));
  }

  private commitNumericDrafts(): void {
    this.commitGameIdFromDraft();
    this.commitInningFromDraft();
  }

  private syncNumericDrafts(): void {
    this.gameIdDraft.set(String(this.gameId()));
    this.inningDraft.set(String(this.inning()));
  }

  setCallListIdFromInput(value: unknown): void {
    if (value === null || value === undefined || value === '') {
      this.hasLoaded.set(false);
      this.callListId.set(null);
      return;
    }
    const n = typeof value === 'string' ? Number.parseInt(value, 10) : Number(value);
    if (!Number.isInteger(n) || n < 1) {
      this.hasLoaded.set(false);
      this.callListId.set(null);
      return;
    }
    if (n !== this.callListId()) {
      this.hasLoaded.set(false);
    }
    this.applyCallListId(n);
  }

  loadGame(): void {
    this.commitNumericDrafts();
    const gid = this.gameId();
    const clid = this.callListId();
    const inn = this.inning();

    if (!Number.isFinite(gid) || gid < 1) {
      this.error.set('Enter a valid Game_ID (1 or greater).');
      this.loadMessage.set(null);
      return;
    }
    if (clid === null || clid < 1) {
      this.error.set('Enter a valid Call_List_ID (1 or greater).');
      this.loadMessage.set(null);
      return;
    }
    if (!Number.isFinite(inn) || inn < 1) {
      this.error.set('Enter a valid Inning (1 or greater).');
      this.loadMessage.set(null);
      return;
    }

    this.error.set(null);
    this.consoleContextService.setContext({
      Game_ID: gid,
      Call_List_ID: clid,
      Inning: inn
    });
    this.activeTab.set('gameInfo');
    this.hasLoaded.set(true);
    this.setupError.set(null);
    this.winnersError.set(null);
    this.loadMessage.set(`Game ${gid} · Call list ${clid} · Inning ${inn} saved for Console and related pages.`);
    this.fetchGameData(gid, clid, inn);
  }

  private fetchGameData(gameId: number, callListId: number, inning: number): void {
    this.fetchGameSetup(gameId, callListId, inning);
    this.fetchGameWinners(gameId);
    this.loadCallListWinnersByUser();
  }

  resolveWinnersUserId(): number | null {
    const fromUser = this.currentUser()?.UserId ?? null;
    if (fromUser && fromUser > 0) {
      return fromUser;
    }

    const fromInsert = this.resolveInsertUserId();
    if (fromInsert !== null) {
      return fromInsert;
    }

    const fromSetup = this.gameSetup()?.Header.User_ID_Found ?? null;
    return fromSetup !== null && fromSetup > 0 ? fromSetup : null;
  }

  private fetchGameSetup(gameId: number, callListId: number, inning: number): void {
    this.setupLoading.set(true);
    this.setupError.set(null);
    this.gameSetup.set(null);
    this.rawGameSetupJson.set(null);

    this.gameMgmtService
      .checkGameSetup(gameId, callListId, inning)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err: HttpErrorResponse) => {
          console.error('Check/Check_GameSetup failed', err);
          this.setupError.set(this.formatApiError('Check/Check_GameSetup', err, gameId));
          return of<BingoGameSetupCheckResult | null>(null);
        }),
        finalize(() => this.setupLoading.set(false))
      )
      .subscribe(result => {
        if (result) {
          this.gameSetup.set(result);
          this.rawGameSetupJson.set(JSON.stringify(result, null, 2));
          this.applyLoadedGameRowToInsertForm();
        }
      });
  }

  private fetchGameWinners(_gameId: number): void {
    const winnersGameId = environment.bingoGetGameWinnersResultsGameId;
    this.winnersLoading.set(true);
    this.winnersError.set(null);
    this.gameWinners.set([]);

    this.gameMgmtService
      .getGameWinnersResults()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err: HttpErrorResponse) => {
          console.error('Get_Game_Winners_Results failed', err);
          this.winnersError.set(this.formatApiError('Get_Game_Winners_Results', err, winnersGameId));
          return of<BingoGameWinnerResultRow[]>([]);
        }),
        finalize(() => this.winnersLoading.set(false))
      )
      .subscribe(rows => this.gameWinners.set(rows));
  }

  private formatApiError(endpoint: string, err: HttpErrorResponse, gameId: number): string {
    if (err.status === 404) {
      return `${endpoint} is not available on the API (404). Confirm the route is deployed for Game_ID ${gameId}.`;
    }
    if (err.status === 500) {
      return `${endpoint} returned a server error (500) for Game_ID ${gameId}. Verify the database procedure is deployed and valid.`;
    }
    if (err.status === 0) {
      return `Unable to reach ${endpoint} (network/CORS error). Confirm the route is ${environment.bingoGetGameWinnersResultsApiBaseUrl}/${gameId}.`;
    }
    return `Unable to load ${endpoint} (HTTP ${err.status || 'unknown'}).`;
  }
}
