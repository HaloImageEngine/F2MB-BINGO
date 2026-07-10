import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable, catchError, finalize, map, of, switchMap } from 'rxjs';

import {
  CallListSongColumnItem,
  CallListSongsFourColumnView,
  CallListSongsInningColumn,
  buildCallListSongsFourColumnView,
  groupCallListSongsByInning
} from '../../models/call-list-songs-four-column-view.model';
import { BingoCallListDropdownByUser, BingoCallListSongsBy4Inning } from '../../models/bingo-game.model';
import { genreEnumToLookupOption } from '../../models/genre-enum-dropdown.model';
import { LookupOption } from '../../models/lookup-option.model';
import { CallListIdFieldComponent } from '../../shared/call-list-id-field/call-list-id-field.component';
import { AuthUserService } from '../../services/auth-user.service';
import { CallListService } from '../../services/calllist.service';
import { ConsoleContextService } from '../../services/console-context.service';
import { SongService } from '../../services/song.service';
import { numericDraftFromValue, parsePositiveInteger } from '../../shared/numeric-input-draft';

@Component({
  selector: 'app-clsong-review',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CallListIdFieldComponent],
  templateUrl: './clsong-review.component.html',
  styleUrl: './clsong-review.component.scss'
})
export class ClsongReviewComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly songService = inject(SongService);
  private readonly authUserService = inject(AuthUserService);
  private readonly callListService = inject(CallListService);
  private readonly consoleContextService = inject(ConsoleContextService);

  readonly gameId = signal(1);
  readonly callListId = signal<number | null>(null);
  readonly inning = signal(1);
  readonly gameIdDraft = signal('1');
  readonly inningDraft = signal('1');

  readonly loading = signal(false);
  readonly removingSongKey = signal<string | null>(null);
  readonly completingInningKey = signal<string | null>(null);
  readonly genreOptions = signal<LookupOption[]>([]);
  /** Per-inning genre for Gen 70; defaults to Pop when unset. */
  readonly genreByInning = signal<Record<number, string>>({ 1: 'Pop', 2: 'Pop', 3: 'Pop', 4: 'Pop' });
  readonly error = signal<string | null>(null);
  readonly loadMessage = signal<string | null>(null);
  /** API returned 404 with no content for by4Inning. */
  readonly noContent = signal(false);
  readonly columnView = signal<CallListSongsFourColumnView | null>(null);
  private loadRequestId = 0;
  readonly currentUser = this.authUserService.user;
  readonly startingGameRows = signal<BingoCallListDropdownByUser[]>([]);
  readonly maxGameId = signal<number | null>(null);
  readonly startingGameOptions = computed(() => {
    const gamesFromApi: number[] = [];
    const seenGames = new Set<number>();

    for (const row of this.startingGameRows()) {
      const gameId = row.Game_ID;
      if (
        typeof gameId === 'number' &&
        Number.isInteger(gameId) &&
        gameId > 0 &&
        gameId <= 999 &&
        !seenGames.has(gameId)
      ) {
        seenGames.add(gameId);
        gamesFromApi.push(gameId);
      }
    }

    gamesFromApi.sort((left, right) => right - left);

    const current = this.gameId();
    if (gamesFromApi.length > 0) {
      if (current > 0 && !gamesFromApi.includes(current)) {
        return [current, ...gamesFromApi];
      }
      return gamesFromApi;
    }

    const max = this.maxGameId() ?? this.consoleContextService.getStoredMaxGameId();
    const upper =
      Number.isInteger(max) && max !== null && max > 0
        ? Math.min(max, 999)
        : Math.max(current, 26);
    const options: number[] = [];
    for (let game = upper; game >= 1; game -= 1) {
      options.push(game);
    }

    if (current > 0 && !options.includes(current)) {
      options.unshift(current);
    }

    return options;
  });

  readonly activeInningSongCount = computed(() => {
    const activeInning = this.inning();
    const column = this.columnView()?.columns.find(item => item.inning === activeInning);
    return column?.songCount ?? 0;
  });

  ngOnInit(): void {
    const storedMaxGameId = this.consoleContextService.getStoredMaxGameId();
    if (storedMaxGameId !== null) {
      this.maxGameId.set(storedMaxGameId);
    }

    this.loadStartingGameDropdown();
    this.loadMaxGameId();
    this.loadGenreOptions();

    const ctx = this.consoleContextService.getContext();
    if (!ctx) {
      return;
    }
    if (ctx.Game_ID) {
      this.gameId.set(ctx.Game_ID);
    }
    if (ctx.Call_List_ID !== null && ctx.Call_List_ID !== undefined) {
      this.callListId.set(ctx.Call_List_ID);
    }
    if (ctx.Inning !== null && ctx.Inning !== undefined) {
      this.inning.set(ctx.Inning);
    }
    this.syncNumericDrafts();
    if (ctx.Game_ID && ctx.Call_List_ID) {
      this.loadSongs();
    }
  }

  updateStartingGame(value: unknown): void {
    const n = typeof value === 'string' ? Number.parseInt(value, 10) : Number(value);
    if (!Number.isInteger(n) || n < 1) {
      return;
    }

    this.gameId.set(n);
    this.gameIdDraft.set(String(n));
    const rows = this.startingGameRows();
    const rowsWithGame = rows.some(row => typeof row.Game_ID === 'number' && row.Game_ID > 0);
    const matched = (rowsWithGame ? rows.filter(row => row.Game_ID === n) : rows).sort(
      (left, right) => right.Call_List_ID - left.Call_List_ID
    );
    this.callListId.set(matched.length > 0 ? matched[0].Call_List_ID : this.callListId());
    this.consoleContextService.setContext({
      Game_ID: this.gameId(),
      Call_List_ID: this.callListId(),
      Inning: this.inning()
    });
  }

  onGameIdDraftInput(value: unknown): void {
    this.gameIdDraft.set(value != null && value !== '' ? String(value) : '');
  }

  commitGameIdFromDraft(): void {
    const parsed = parsePositiveInteger(this.gameIdDraft());
    if (parsed !== null) {
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
      this.inning.set(parsed);
      this.inningDraft.set(String(parsed));
      this.applyInningHighlight();
      return;
    }
    this.inningDraft.set(String(this.inning()));
  }

  setInningFromSelect(value: unknown): void {
    const n = typeof value === 'string' ? Number.parseInt(value, 10) : Number(value);
    if (!Number.isFinite(n)) {
      this.inning.set(1);
      this.inningDraft.set('1');
      this.applyInningHighlight();
      return;
    }
    const inn = Math.max(1, Math.trunc(n));
    this.inning.set(inn);
    this.inningDraft.set(String(inn));
    this.applyInningHighlight();
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
      this.callListId.set(null);
      return;
    }
    const n = typeof value === 'string' ? Number.parseInt(value, 10) : Number(value);
    if (!Number.isInteger(n) || n < 1) {
      this.callListId.set(null);
      return;
    }
    this.callListId.set(n);
  }

  loadSongs(): void {
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
    this.noContent.set(false);
    this.consoleContextService.setContext({
      Game_ID: gid,
      Call_List_ID: clid,
      Inning: inn
    });

    const requestId = ++this.loadRequestId;
    this.loading.set(true);

    this.loadFourColumnView(gid, clid, inn)
      .pipe(
        catchError(err => {
          console.error('Call list songs load failed', err);
          this.error.set('Unable to load call list songs from the API.');
          this.noContent.set(false);
          if (requestId === this.loadRequestId) {
            this.columnView.set(null);
          }
          return of(null);
        }),
        finalize(() => {
          if (requestId === this.loadRequestId) {
            this.loading.set(false);
          }
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(result => {
        if (!result || requestId !== this.loadRequestId) {
          return;
        }

        this.columnView.set(result.view);
        this.error.set(null);

        if (result.noContent) {
          this.noContent.set(true);
          this.loadMessage.set(null);
          return;
        }

        this.noContent.set(false);
        this.loadMessage.set(
          `Loaded ${result.view.totalSongCount} songs for call list ${clid} (Inning ${result.view.activeInning} highlighted).`
        );
      });
  }

  /**
   * Prefer `Get_Call_List_Songs_by4Inning`; 404 with no body is shown as "no content".
   * Other failures fall back to `Get_All_CallList_Songs_by_CallList_ID`.
   */
  private loadFourColumnView(
    gameId: number,
    callListId: number,
    inning: number
  ): Observable<{ view: CallListSongsFourColumnView; noContent: boolean }> {
    return this.songService.getCallListSongsBy4Inning(gameId, callListId).pipe(
      switchMap(grouped => this.resolveFourColumnView(grouped, gameId, callListId, inning)),
      catchError(err => {
        if (this.isBy4InningNoContent(err)) {
          return of({
            view: this.buildEmptyFourColumnView(gameId, callListId, inning),
            noContent: true
          });
        }

        console.warn(
          'Get_Call_List_Songs_by4Inning failed; using Get_All_CallList_Songs_by_CallList_ID fallback',
          err
        );
        return this.loadFromFlatCallListSongs(gameId, callListId, inning).pipe(
          map(view => ({ view, noContent: false }))
        );
      })
    );
  }

  private resolveFourColumnView(
    grouped: BingoCallListSongsBy4Inning,
    gameId: number,
    callListId: number,
    inning: number
  ): Observable<{ view: CallListSongsFourColumnView; noContent: boolean }> {
    const primary = buildCallListSongsFourColumnView(grouped, gameId, callListId, inning);
    if (primary.totalSongCount > 0) {
      return of({ view: primary, noContent: false });
    }

    return this.loadFromFlatCallListSongs(gameId, callListId, inning, primary).pipe(
      map(view => ({ view, noContent: false }))
    );
  }

  private loadFromFlatCallListSongs(
    gameId: number,
    callListId: number,
    inning: number,
    emptyFallback?: CallListSongsFourColumnView
  ): Observable<CallListSongsFourColumnView> {
    return this.callListService.getCallListSongs(callListId).pipe(
      map(songs =>
        buildCallListSongsFourColumnView(groupCallListSongsByInning(songs), gameId, callListId, inning)
      ),
      catchError(() =>
        of(emptyFallback ?? this.buildEmptyFourColumnView(gameId, callListId, inning))
      )
    );
  }

  /** `404` with empty body from by4Inning — treat as no content, not an error. */
  private isBy4InningNoContent(err: unknown): boolean {
    if (!(err instanceof HttpErrorResponse) || err.status !== 404) {
      return false;
    }

    const body = err.error;
    if (body === null || body === undefined || body === '') {
      return true;
    }

    if (typeof body === 'string' && body.trim().length === 0) {
      return true;
    }

    return false;
  }

  private buildEmptyFourColumnView(
    gameId: number,
    callListId: number,
    inning: number
  ): CallListSongsFourColumnView {
    const emptyGrouped: BingoCallListSongsBy4Inning = {
      Inning1: [],
      Inning2: [],
      Inning3: [],
      Inning4: []
    };
    return buildCallListSongsFourColumnView(emptyGrouped, gameId, callListId, inning);
  }

  isRemovingSong(song: CallListSongColumnItem): boolean {
    return this.removingSongKey() === this.songRemoveKey(song);
  }

  isCompletingInning(inning: number): boolean {
    return this.completingInningKey() === this.inningCompleteKey(inning);
  }

  isGen70Disabled(column: CallListSongsInningColumn): boolean {
    return (
      this.loading() ||
      this.completingInningKey() !== null ||
      this.removingSongKey() !== null ||
      this.callListId() === null ||
      column.songCount >= 70
    );
  }

  isCompletingActiveInning(): boolean {
    return this.isCompletingInning(this.inning());
  }

  isCompleteBarDisabled(): boolean {
    const callListId = this.callListId();
    return (
      callListId === null ||
      callListId < 1 ||
      this.completingInningKey() !== null ||
      this.removingSongKey() !== null ||
      this.activeInningSongCount() >= 70
    );
  }

  completeCallListSongsFromBar(): void {
    this.generateSeventyForInning(this.inning(), this.activeInningSongCount());
  }

  genreForInning(inning: number): string {
    const key = Math.min(4, Math.max(1, Math.trunc(inning)));
    const selected = this.genreByInning()[key]?.trim();
    return selected || 'Pop';
  }

  setGenreForInning(inning: number, value: unknown): void {
    const key = Math.min(4, Math.max(1, Math.trunc(inning)));
    const genre = typeof value === 'string' && value.trim().length > 0 ? value.trim() : 'Pop';
    this.genreByInning.update(map => ({ ...map, [key]: genre }));
  }

  generateSeventyForInning(inning: number, songCount = 0): void {
    const callListId = this.callListId();
    const targetInning = Math.min(4, Math.max(1, Math.trunc(inning)));
    const genre = this.genreForInning(targetInning);

    if (songCount >= 70) {
      return;
    }

    if (callListId === null || callListId < 1) {
      this.error.set('Enter a valid Call_List_ID before Gen 70.');
      this.loadMessage.set(null);
      return;
    }
    if (this.completingInningKey() !== null || this.removingSongKey() !== null) {
      return;
    }

    this.completingInningKey.set(this.inningCompleteKey(targetInning));
    this.error.set(null);
    this.loadMessage.set(null);

    this.callListService
      .completeCallListSongsByCallListAndInning(callListId, targetInning, genre)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(err => {
          console.error('Complete_CallList_Songs_by_CallListandInning failed', err);
          this.error.set(
            `Failed to generate songs for call list #${callListId}, Inning ${targetInning} (${genre}).`
          );
          return of(null);
        }),
        finalize(() => this.completingInningKey.set(null))
      )
      .subscribe(result => {
        if (!result) {
          return;
        }

        this.inning.set(targetInning);
        this.applyInningHighlight();
        this.loadMessage.set(
          `Inning ${targetInning}: ${result.StatusMessage} (${result.InitialCount} → ${result.FinalCount}, added ${result.SongsAdded}).`
        );
        this.loadSongs();
      });
  }

  removeCallListSong(song: CallListSongColumnItem): void {
    const callListId = song.callListId ?? this.callListId();
    const inning = this.resolveSongInning(song);
    const songId = song.songId;

    if (callListId === null || callListId < 1 || !songId || songId < 1 || inning === null) {
      this.error.set('Cannot remove — missing Call_List_ID, Inning, or Song_ID.');
      this.loadMessage.set(null);
      return;
    }

    const removeKey = this.songRemoveKey(song);
    if (this.removingSongKey() !== null) {
      return;
    }

    this.removingSongKey.set(removeKey);
    this.error.set(null);
    this.loadMessage.set(null);

    this.callListService
      .removeCallListSong(callListId, inning, songId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(err => {
          console.error('Remove_CallList_Song failed', err);
          this.error.set(`Failed to remove "${song.title}" from the call list.`);
          return of(null);
        }),
        finalize(() => this.removingSongKey.set(null))
      )
      .subscribe(result => {
        if (!result) {
          return;
        }

        this.removeSongFromColumnView(song);
        this.loadMessage.set(
          `Removed "${result.title}" from call list #${callListId}, Inning ${inning} (${result.Call_List_SongCount} songs remaining).`
        );
      });
  }

  /** Re-highlight the active column when Inning changes without refetching. */
  applyInningHighlight(): void {
    const current = this.columnView();
    const gid = this.gameId();
    const clid = this.callListId();
    const inn = this.inning();

    if (!current || clid === null) {
      return;
    }

    this.consoleContextService.setContext({
      Game_ID: gid,
      Call_List_ID: clid,
      Inning: inn
    });

    const active = Math.min(4, Math.max(1, Math.trunc(inn)));
    this.columnView.set({
      ...current,
      activeInning: active,
      columns: current.columns.map(col => ({
        ...col,
        isActive: col.inning === active
      }))
    });
  }

  private inningCompleteKey(inning: number): string {
    return `${this.callListId() ?? 0}-${inning}`;
  }

  private songRemoveKey(song: CallListSongColumnItem): string {
    const callListId = song.callListId ?? this.callListId() ?? 0;
    const inning = this.resolveSongInning(song) ?? 0;
    return `${callListId}-${inning}-${song.songId}`;
  }

  private resolveSongInning(song: CallListSongColumnItem): number | null {
    const inn = song.inning;
    if (inn !== null && inn !== undefined && Number.isFinite(inn) && inn >= 1) {
      return Math.min(4, Math.max(1, Math.trunc(inn)));
    }
    return null;
  }

  private removeSongFromColumnView(song: CallListSongColumnItem): void {
    const current = this.columnView();
    if (!current) {
      return;
    }

    const targetInning = this.resolveSongInning(song);
    if (targetInning === null) {
      return;
    }

    const columns = current.columns.map(col => {
      if (col.inning !== targetInning) {
        return col;
      }

      const songs = col.songs.filter(row => row.songId !== song.songId);
      return {
        ...col,
        songs,
        songCount: songs.length
      };
    });

    this.columnView.set({
      ...current,
      columns,
      totalSongCount: columns.reduce((sum, col) => sum + col.songCount, 0)
    });
  }

  private loadGenreOptions(): void {
    this.songService
      .getDropDownGenreEnum()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(err => {
          console.error('Get_DropDown_Genre_Enum failed', err);
          return of([]);
        })
      )
      .subscribe(items => {
        const options = items.map(genreEnumToLookupOption);
        const hasPop = options.some(option => (option.Name ?? '').trim().toLowerCase() === 'pop');
        this.genreOptions.set(hasPop ? options : [{ Id: 0, Name: 'Pop' }, ...options]);
      });
  }

  private loadStartingGameDropdown(): void {
    const userId = this.currentUser()?.UserId ?? null;
    if (!userId || userId <= 0) {
      this.startingGameRows.set([]);
      return;
    }

    this.callListService
      .getDropDownCallListByUserId(userId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(err => {
          console.error('Get_DropDown_CallList_ByUserID failed', err);
          return of([] as BingoCallListDropdownByUser[]);
        })
      )
      .subscribe(rows => this.startingGameRows.set(rows));
  }

  private loadMaxGameId(): void {
    const userId = this.currentUser()?.UserId ?? null;

    this.callListService
      .getMaxGameId(userId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(err => {
          console.error('Get_Max_Game_ID failed', err);
          return of(null as number | null);
        })
      )
      .subscribe(maxGameId => {
        if (maxGameId !== null && maxGameId > 0) {
          this.maxGameId.set(maxGameId);
        }
      });
  }
}
