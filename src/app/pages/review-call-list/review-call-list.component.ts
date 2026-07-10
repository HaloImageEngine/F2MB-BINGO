import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, FormsModule, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, finalize, forkJoin, merge, of } from 'rxjs';

import {
  BingoCallListCreate,
  BingoCallListMaster,
  BingoCallListSong,
  BingoCallListSongInsert,
  BingoInsertNewGame,
  BingoLatestGame
} from '../../models/bingo-game.model';
import { LookupOption } from '../../models/lookup-option.model';
import { ModelSongDisplay } from '../../models/model-song-display.model';
import { AuthUserService } from '../../services/auth-user.service';
import { CallListService } from '../../services/calllist.service';
import { ConsoleContextService } from '../../services/console-context.service';
import { SongService } from '../../services/song.service';

const trimmedRequired: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  return typeof control.value === 'string' && control.value.trim().length === 0
    ? { required: true }
    : null;
};

@Component({
  selector: 'app-create-call-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './review-call-list.component.html',
  styleUrl: './review-call-list.component.scss'
})
export class CreateCallListComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly songService = inject(SongService);
  private readonly callListService = inject(CallListService);
  private readonly authUserService = inject(AuthUserService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly consoleContextService = inject(ConsoleContextService);

  readonly loadingSongs = signal(false);
  readonly loadingLookups = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly formError = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly createdList = signal<BingoCallListCreate | null>(null);
  readonly songs = signal<ModelSongDisplay[]>([]);
  readonly selectedSongs = signal<ModelSongDisplay[]>([]);
  readonly latestInsertSongRequestJson = signal<string | null>(null);
  readonly latestInsertSongResultJson = signal<string | null>(null);
  readonly latestInsertSongErrorJson = signal<string | null>(null);
  readonly addingSongId = signal<number | null>(null);
  readonly searchTerm = signal('');
  readonly callListMasters = signal<BingoCallListMaster[]>([]);
  readonly loadingCallListMasters = signal(false);
  readonly callListMasterError = signal<string | null>(null);
  readonly selectedCallListMasterId = signal<number | null>(null);
  readonly maxGameId = signal<number | null>(null);
  readonly insertingNewGame = signal(false);
  readonly insertNewGameError = signal<string | null>(null);
  readonly insertNewGameSuccess = signal<string | null>(null);
  readonly latestGames = signal<BingoLatestGame[]>([]);
  readonly loadingLatestGames = signal(false);
  readonly latestGamesError = signal<string | null>(null);
  readonly genreOptions = signal<LookupOption[]>([]);
  readonly decadeOptions = signal<LookupOption[]>([]);
  readonly eraOptions = signal<LookupOption[]>([]);
  readonly currentUser = computed(() => this.authUserService.user());

  private readonly insertPayloadRevision = signal(0);

  readonly form = this.formBuilder.group({
    GameID: this.formBuilder.control<number | null>(null),
    GameNumber: this.formBuilder.control('', [Validators.required, Validators.pattern(/^[1-9]\d*$/)]),
    GameInning: this.formBuilder.control('', [Validators.required, Validators.pattern(/^[1-9]\d*$/)]),
    GameWinPattern: this.formBuilder.nonNullable.control('TBD', [Validators.required, Validators.maxLength(100)]),
    CallListName: this.formBuilder.nonNullable.control('', [trimmedRequired, Validators.maxLength(150)]),
    CallListDate: this.formBuilder.nonNullable.control(this.today(), [Validators.required]),
    CallListDescription: this.formBuilder.nonNullable.control('', [Validators.maxLength(500)]),
    CallListGenre: this.formBuilder.nonNullable.control('', [Validators.required, Validators.maxLength(100)]),
    CallListDecade: this.formBuilder.nonNullable.control('', [Validators.required, Validators.maxLength(10)]),
    CallListEra: this.formBuilder.nonNullable.control('', [Validators.required, Validators.maxLength(100)]),
    CallListIsActive: this.formBuilder.nonNullable.control(true)
  });

  readonly filteredSongs = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const selectedIds = new Set(this.selectedSongs().map(song => song.song_id));
    const selectedSongKeys = new Set(this.selectedSongs().map(song => this.toSongIdentityKey(song.Title, song.Artist)));

    return this.songs().filter(song => {
      if (selectedIds.has(song.song_id)) {
        return false;
      }

      if (selectedSongKeys.has(this.toSongIdentityKey(song.Title, song.Artist))) {
        return false;
      }

      if (!term) {
        return true;
      }

      const title = (song.Title ?? '').toLowerCase();
      const artist = (song.Artist ?? '').toLowerCase();

      return title.includes(term) || artist.includes(term);
    });
  });

  readonly selectedCount = computed(() => this.selectedSongs().length);
  readonly songCount = computed(() => this.songs().length);
  readonly currentCallListId = computed(() => this.createdList()?.CallListID ?? this.selectedCallListMasterId() ?? null);
  readonly maxCallListId = computed(() => {
    const masters = this.callListMasters();
    return masters.length > 0 ? Math.max(...masters.map(m => m.Call_List_ID)) : null;
  });
  readonly nextGameNumber = computed(() => {
    const fromForm = this.resolveGameNumber();
    if (fromForm !== null) {
      return fromForm + 1;
    }

    const games = this.latestGames();
    if (games.length > 0) {
      return Math.max(...games.map(g => g.Game_Number ?? 0)) + 1;
    }

    return 1;
  });
  readonly defaultGameInning = computed(() => this.consoleContextService.getInning() ?? 1);
  readonly insertNewGamePayload = computed(() => {
    this.insertPayloadRevision();
    this.selectedCallListMasterId();
    this.maxGameId();
    return this.buildInsertNewGamePayload();
  });
  readonly insertNewGamePayloadJson = computed(() => {
    const payload = this.insertNewGamePayload();
    return payload ? JSON.stringify(payload, null, 2) : null;
  });
  readonly canInsertNewGame = computed(() => this.insertNewGamePayload() !== null);
  readonly trackBySong = (index: number, song: ModelSongDisplay) => song.song_id ?? index;
  readonly trackByLatestGame = (_index: number, game: BingoLatestGame) => game.Game_ID;

  ngOnInit(): void {
    const ctx = this.consoleContextService.getContext();
    if (ctx?.Game_ID) {
      this.form.patchValue({ GameID: ctx.Game_ID });
    }
    if (ctx?.Inning) {
      this.form.patchValue({ GameInning: String(ctx.Inning) });
    } else {
      this.form.patchValue({ GameInning: String(this.defaultGameInning()) });
    }

    merge(
      this.form.controls.GameNumber.valueChanges,
      this.form.controls.GameInning.valueChanges,
      this.form.controls.GameWinPattern.valueChanges
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.insertPayloadRevision.update(v => v + 1));

    this.loadSongs();
    this.loadLookups();
    this.loadCallListMasters();
    this.loadMaxGameId();
    this.loadLatestGames();
  }

  loadLatestGames(): void {
    const userId = this.currentUser()?.UserId;
    if (!userId) {
      this.latestGames.set([]);
      this.latestGamesError.set(null);
      this.loadingLatestGames.set(false);
      return;
    }

    this.loadingLatestGames.set(true);
    this.latestGamesError.set(null);

    this.callListService
      .getLatestGamesByUserId(userId, 10)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(err => {
          console.error('Get_Latest_Games_by_UserID failed', err);
          this.latestGamesError.set('Unable to load previous games right now.');
          return of<BingoLatestGame[]>([]);
        }),
        finalize(() => this.loadingLatestGames.set(false))
      )
      .subscribe(games => this.latestGames.set(games));
  }

  loadMaxGameId(): void {
    const storedMax = this.consoleContextService.getStoredMaxGameId();
    if (storedMax !== null) {
      this.maxGameId.set(storedMax);
      if (!String(this.form.controls.GameNumber.value ?? '').trim()) {
        this.form.patchValue({ GameNumber: String(storedMax + 1) });
      }
    }

    this.callListService
      .getMaxGameId(this.currentUser()?.UserId ?? null)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(err => {
          console.error('Get_Max_Game_ID failed', err);
          return of(storedMax ?? 0);
        })
      )
      .subscribe(val => {
        this.maxGameId.set(val);
        this.consoleContextService.setStoredMaxGameId(val);
        if (this.form.controls.GameNumber.pristine) {
          this.form.patchValue({ GameNumber: String(val + 1) });
        }
      });
  }

  insertNewGame(): void {
    this.insertNewGameError.set(null);
    this.insertNewGameSuccess.set(null);

    const payload = this.buildInsertNewGamePayload();
    if (!payload) {
      this.insertNewGameError.set('Select a CallList_Master and log in before inserting a game.');
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

        this.form.patchValue({
          GameID: result.New_Game_ID,
          GameNumber: String(payload.Game_Number + 1)
        });
        this.consoleContextService.setContext({
          Game_ID: result.New_Game_ID,
          Call_List_ID: payload.Call_List_ID,
          Inning: payload.Game_Inning,
          Max_Game_ID: result.New_Game_ID
        });
        this.maxGameId.set(result.New_Game_ID);
        this.consoleContextService.setStoredMaxGameId(result.New_Game_ID);

        this.insertNewGameSuccess.set(
          result.Message
            ? `${result.Message} — New_Game_ID ${result.New_Game_ID}`
            : `New game created (ID ${result.New_Game_ID}).`
        );
        this.loadLatestGames();
      });
  }

  formatGameDate(value: string | null): string {
    if (!value) {
      return '—';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return parsed.toLocaleString();
  }

  loadSongs(): void {
    this.loadingSongs.set(true);
    this.error.set(null);

    this.songService
      .getSongs()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(err => {
          console.error('Create call list songs load failed', err);
          this.error.set('Unable to load songs right now.');
          return of<ModelSongDisplay[]>([]);
        }),
        finalize(() => this.loadingSongs.set(false))
      )
      .subscribe(songs => {
        const sortedSongs = [...songs].sort((left, right) => {
          const leftTitle = left.Title ?? '';
          const rightTitle = right.Title ?? '';
          return leftTitle.localeCompare(rightTitle);
        });

        this.songs.set(sortedSongs);

        if (this.genreOptions().length === 0) {
          this.genreOptions.set(this.buildGenreFallbackOptions(sortedSongs));
        }
      });
  }

  loadLookups(): void {
    this.loadingLookups.set(true);

    forkJoin({
      genres: this.songService.getGenreOptions().pipe(catchError(() => of<LookupOption[]>([]))),
      decades: this.songService.getDecadeOptions().pipe(catchError(() => of<LookupOption[]>([]))),
      eras: this.songService.getEraOptions().pipe(catchError(() => of<LookupOption[]>([])))
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingLookups.set(false))
      )
      .subscribe(result => {
        this.genreOptions.set(
          result.genres.length > 0 ? this.sortLookupOptions(result.genres) : this.buildGenreFallbackOptions(this.songs())
        );
        this.decadeOptions.set(this.sortLookupOptions(result.decades));
        this.eraOptions.set(this.sortLookupOptions(result.eras));
      });
  }

  loadCallListMasters(): void {
    this.loadingCallListMasters.set(true);
    this.callListMasterError.set(null);
    const userId = this.authUserService.user()?.UserId;
    if (!userId) {
      this.loadingCallListMasters.set(false);
      this.callListMasterError.set('Log in to load your call list masters.');
      this.callListMasters.set([]);
      return;
    }

    this.callListService
      .getCallListMasters(userId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(err => {
          console.error('Create call list masters load failed', err);
          this.callListMasterError.set('Unable to load call list masters right now.');
          return of<BingoCallListMaster[]>([]);
        }),
        finalize(() => this.loadingCallListMasters.set(false))
      )
      .subscribe(items => {
        this.callListMasters.set(items);
        this.loadLatestGames();

        const storedCallListId = this.consoleContextService.getCallListId();
        if (storedCallListId !== null) {
          this.selectExistingCallListMaster(storedCallListId);
        }
      });
  }

  addSong(song: ModelSongDisplay): void {
    if (this.addingSongId() !== null) {
      return;
    }

    const callListId = this.resolveActiveCallListId();

    console.group('Add Button Clicked');
    console.log('Song', { title: song.Title, artist: song.Artist, songId: song.song_id });
    console.log('Resolved CallList_ID', callListId);
    console.groupEnd();

    if (callListId === null) {
      this.latestInsertSongRequestJson.set(JSON.stringify({
        skipped: true,
        reason: 'no active CallList_ID',
        title: song.Title ?? '',
        artist: song.Artist ?? '',
        songId: song.song_id ?? 0
      }, null, 2));
      this.latestInsertSongResultJson.set(null);
      this.latestInsertSongErrorJson.set(null);

      console.error('Insert_CallList_Song skipped: no active CallList_ID', {
        title: song.Title ?? '',
        artist: song.Artist ?? '',
        songId: song.song_id ?? 0
      });
      this.formError.set('Select or create a Call List before adding songs.');
      return;
    }

    const songId = song.song_id ?? 0;
    if (!Number.isInteger(songId) || songId <= 0) {
      this.formError.set('This song has no valid Song_ID and cannot be added to the call list.');
      return;
    }

    const identityKey = this.toSongIdentityKey(song.Title, song.Artist);
    const alreadySelected = this.selectedSongs().some(
      item => item.song_id === songId || this.toSongIdentityKey(item.Title, item.Artist) === identityKey
    );
    if (alreadySelected) {
      this.formError.set('This song is already on the call list.');
      return;
    }

    this.formError.set(null);
    this.latestInsertSongResultJson.set(null);
    this.latestInsertSongErrorJson.set(null);

    const requestPayload = this.buildCallListSongPayload(song, callListId);

    const debugPayload = {
      CallListID: requestPayload.CallListID,
      title: requestPayload.Title,
      artist: requestPayload.Artist,
      featured_artist: requestPayload.FeaturedArtist || null,
      lead_vocalist: requestPayload.LeadVocalist || null,
      artist_type: requestPayload.ArtistType || null,
      genre: requestPayload.Genre || null,
      explicit: requestPayload.Explicit,
      release_year: requestPayload.ReleaseYear || null,
      decade: requestPayload.Decade || null,
      era: requestPayload.Era || null
    };

    this.latestInsertSongRequestJson.set(JSON.stringify(debugPayload, null, 2));

    console.group('Add Song — Insert_CallList_Song');
    console.log('Song info', { title: song.Title, artist: song.Artist, songId: song.song_id, genre: song.Genre, releaseYear: song.ReleaseYear });
    console.log('Request payload', { ...debugPayload });
    console.groupEnd();

    this.addingSongId.set(songId);

    this.callListService
      .addCallListSong(requestPayload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(err => {
          console.error('Add call list song failed', err);
          this.latestInsertSongErrorJson.set(JSON.stringify(this.toDebugError(err), null, 2));
          this.formError.set(this.formatInsertSongError(err, callListId));
          return of(null);
        }),
        finalize(() => this.addingSongId.set(null))
      )
      .subscribe(result => {
        if (!result) {
          return;
        }

        this.latestInsertSongResultJson.set(JSON.stringify(result, null, 2));
        this.refreshSelectedSongs(callListId);
      });
  }

  removeSong(song: ModelSongDisplay): void {
    this.selectedSongs.update(items => items.filter(item => item.song_id !== song.song_id));
  }

  clearSelection(): void {
    this.selectedSongs.set([]);
  }

  readonly compareById = (a: number | null, b: number | null): boolean => Number(a) === Number(b);

  selectExistingCallListMaster(callListId: number | string | null): void {
    const parsedId = Number(callListId);

    if (!Number.isFinite(parsedId)) {
      this.selectedCallListMasterId.set(null);
      this.selectedSongs.set([]);
      return;
    }

    const selectedMaster = this.callListMasters().find(item => item.Call_List_ID === parsedId) ?? null;

    this.selectedCallListMasterId.set(selectedMaster?.Call_List_ID ?? null);

    if (!selectedMaster) {
      return;
    }

    this.form.patchValue({
      CallListName: selectedMaster.Call_List_Name ?? '',
      CallListDate: selectedMaster.Call_List_Date ?? this.today(),
      CallListGenre: selectedMaster.Call_List_Genre ?? '',
      CallListDecade: selectedMaster.Call_List_Decade ?? '',
      CallListEra: selectedMaster.Call_List_Era ?? ''
    });

    this.refreshSelectedSongs(selectedMaster.Call_List_ID);
  }

  createCallList(): void {
    this.formError.set(null);
    this.success.set(null);

    if (!this.authUserService.user()?.UserId) {
      this.formError.set('Log in before creating a call list. User_ID is required.');
      return;
    }

    const gameId = this.form.getRawValue().GameID ?? this.consoleContextService.getGameId();
    if (!gameId) {
      this.formError.set('Set Game_ID in Game Master or Console before creating a call list.');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();

      const invalidFields = Object.entries(this.form.controls)
        .filter(([, control]) => control.invalid)
        .map(([name, control]) => ({ field: name, errors: control.errors, value: control.value }));

      console.group('createCallList — form invalid');
      console.log('invalid fields', invalidFields);
      console.groupEnd();

      this.formError.set('Fill in the required call list fields before creating the list.');
      return;
    }

    const payload = this.buildCallListPayload();
    const songPayloads = this.selectedSongs().map(song => this.buildCallListSongPayload(song));

    this.saving.set(true);

    this.callListService
      .buildCallList(payload, songPayloads)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(err => {
          console.error('Create call list failed', err);
          if (err instanceof Error) {
            this.formError.set(err.message);
            return of(null);
          }
          const modelState = err?.error?.ModelState ?? err?.error?.modelState;
          if (modelState) {
            const details = Object.entries(modelState)
              .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(', ')}`)
              .join(' | ');
            console.error('ModelState errors', details);
            this.formError.set(`Validation failed — ${details}`);
          } else {
            this.formError.set('Unable to create the call list right now.');
          }
          return of(null);
        }),
        finalize(() => this.saving.set(false))
      )
      .subscribe(result => {
        if (!result) {
          return;
        }

        this.createdList.set({
          NewCallListID: result.master.Call_List_ID,
          CallListName: result.master.Call_List_Name,
          CallListDate: result.master.Call_List_Date ?? '',
          CallListDescription: result.master.Call_List_Description ?? '',
          UserID: payload.UserID,
          GameID: payload.GameID,
          CallListGenre: result.master.Call_List_Genre ?? '',
          CallListDecade: result.master.Call_List_Decade ?? '',
          CallListEra: result.master.Call_List_Era ?? '',
          CallListSongCount: result.master.Call_List_SongCount,
          CallListIsActive: result.master.Call_List_IsActive,
          CallListCreatedAt: result.master.Call_List_CreatedAt,
          CallListID: result.master.Call_List_ID,
          InningNumber: payload.InningNumber
        });
        this.selectedCallListMasterId.set(result.master.Call_List_ID);
        this.refreshSelectedSongs(result.master.Call_List_ID);

        this.success.set(
          result.songs.length > 0
            ? `Created call list #${result.master.Call_List_ID} with ${result.songs.length} songs.`
            : `Created call list #${result.master.Call_List_ID}.`
        );
      });
  }

  showFieldError(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  fieldError(controlName: string): string | null {
    const control = this.form.get(controlName);

    if (!control?.errors) {
      return null;
    }

    if (control.errors['required']) {
      return 'This field is required.';
    }

    if (control.errors['maxlength']) {
      return `Maximum length is ${control.errors['maxlength'].requiredLength} characters.`;
    }

    return 'Enter a valid value.';
  }

  formatDuration(seconds: number | null): string {
    if (!seconds) {
      return '--:--';
    }

    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${minutes}:${remainder.toString().padStart(2, '0')}`;
  }

  private buildInsertNewGamePayload(): BingoInsertNewGame | null {
    const userId = this.authUserService.user()?.UserId;
    const callListId = this.selectedCallListMasterId();

    if (!userId || !callListId) {
      return null;
    }

    const gameNumber = this.resolveGameNumber();
    if (gameNumber === null) {
      return null;
    }

    const inning = this.resolveGameInning();
    if (inning === null) {
      return null;
    }

    const now = this.toInsertNewGameIsoTimestamp();

    return {
      User_ID: userId,
      Call_List_ID: callListId,
      Game_Number: gameNumber,
      Game_Inning: inning,
      Game_Name: `CL ${callListId} `,
      Game_StartTime: now,
      Game_EndTime: now,
      Game_WinPattern: this.resolveGameWinPattern(),
      Game_WinnerCard_ID: 0,
      Game_Status: 'Pending'
    };
  }

  /** ISO-8601 UTC (e.g. `2026-05-31T20:52:20.066Z`) for Insert_NewGame. */
  private toInsertNewGameIsoTimestamp(): string {
    const iso = new Date().toISOString();
    return iso.replace(/\.(\d{3})\d*Z$/, '.$1Z');
  }

  private resolveGameInning(): number | null {
    const raw = String(this.form.controls.GameInning.value ?? '').trim();
    if (!raw) {
      return null;
    }

    const inning = Number(raw);
    return Number.isInteger(inning) && inning >= 1 ? inning : null;
  }

  private resolveGameWinPattern(): string {
    const raw = String(this.form.controls.GameWinPattern.value ?? '').trim();
    return raw || 'Line';
  }

  private resolveGameNumber(): number | null {
    const raw = String(this.form.controls.GameNumber.value ?? '').trim();
    if (!raw) {
      return null;
    }

    const gameNumber = Number(raw);
    return Number.isInteger(gameNumber) && gameNumber >= 1 ? gameNumber : null;
  }

  private buildCallListPayload(): BingoCallListCreate {
    const value = this.form.getRawValue();
    const ctx = this.consoleContextService.getContext();

    return {
      NewCallListID: 0,
      CallListName: value.CallListName.trim(),
      CallListDate: value.CallListDate,
      CallListDescription: value.CallListDescription.trim(),
      UserID: this.authUserService.user()?.UserId ?? null,
      GameID: value.GameID && value.GameID > 0 ? value.GameID : this.consoleContextService.getGameId(),
      CallListGenre: value.CallListGenre,
      CallListDecade: value.CallListDecade,
      CallListEra: value.CallListEra,
      CallListSongCount: this.selectedCount(),
      CallListIsActive: value.CallListIsActive,
      CallListCreatedAt: null,
      CallListID: null,
      InningNumber: ctx?.Inning ?? 4
    };
  }

  private resolveInsertInning(): number {
    const raw = String(this.form.controls.GameInning.value ?? '').trim();
    if (raw) {
      const parsed = Number(raw);
      if (Number.isInteger(parsed) && parsed >= 1) {
        return parsed;
      }
    }

    return this.consoleContextService.getInning() ?? 1;
  }

  private buildCallListSongPayload(song: ModelSongDisplay, callListId = 0): BingoCallListSongInsert {
    return {
      CallListID: callListId,
      Inning: this.resolveInsertInning(),
      Song_ID: song.song_id ?? 0,
      Title: song.Title ?? '',
      Artist: song.Artist ?? '',
      FeaturedArtist: '',
      LeadVocalist: '',
      ArtistType: song.ArtistType ?? '',
      Genre: song.Genre ?? '',
      Explicit: false,
      ReleaseYear: song.ReleaseYear ?? 0,
      Decade: song.Decade ?? '',
      Era: song.Era ?? '',
      LastPlayed: song.LastPlayed ?? new Date().toISOString(),
      NewSongID: song.song_id ?? 0
    };
  }

  private resolveActiveCallListId(): number | null {
    return this.currentCallListId();
  }

  private toSongIdentityKey(title: string | null, artist: string | null): string {
    const normalizedTitle = (title ?? '').trim().toLowerCase();
    const normalizedArtist = (artist ?? '').trim().toLowerCase();

    return `${normalizedTitle}::${normalizedArtist}`;
  }

  private refreshSelectedSongs(callListId: number): void {
    this.callListService
      .getCallListSongs(callListId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(err => {
          console.error('Refresh call list songs failed', err);
          this.formError.set(`Song added, but unable to refresh call list #${callListId}.`);
          return of<BingoCallListSong[]>([]);
        })
      )
      .subscribe(items => {
        this.selectedSongs.set(items.map(item => this.mapCallListSongToDisplay(item)));
        this.createdList.update(current => current
          ? {
              ...current,
              CallListSongCount: items.length,
              CallListID: callListId
            }
          : current);
      });
  }

  private mapCallListSongToDisplay(song: BingoCallListSong): ModelSongDisplay {
    return {
      song_id: song.song_id,
      Title: song.title,
      Artist: song.artist,
      ArtistType: song.artist_type,
      Genre: song.genre,
      Subgenre: null,
      Mood: null,
      Tempo: null,
      ReleaseYear: song.release_year,
      Decade: song.decade,
      Era: song.era,
      BingoCategory: null,
      Difficulty: null,
      ChartPeakPosition: null,
      ChartCountry: null,
      LastPlayed: song.last_played,
      SpotifyPopularity: null,
      DurationSeconds: null,
      Active: true
    };
  }

  private sortLookupOptions(options: LookupOption[]): LookupOption[] {
    return [...options].sort((left, right) => (left.Name ?? '').localeCompare(right.Name ?? ''));
  }

  private buildGenreFallbackOptions(songs: ModelSongDisplay[]): LookupOption[] {
    const uniqueGenres = Array.from(new Set(songs.map(song => song.Genre?.trim()).filter((genre): genre is string => !!genre)));

    return uniqueGenres
      .sort((left, right) => left.localeCompare(right))
      .map((genre, index) => ({ Id: index + 1, Name: genre }));
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private formatInsertSongError(error: unknown, callListId: number): string {
    const apiMessage = this.extractApiErrorMessage(error);
    if (apiMessage) {
      return apiMessage;
    }

    if (error instanceof Error && error.message.includes('NG0911')) {
      return 'Request finished after leaving the page. Stay on Review Call List and try again.';
    }

    return `Unable to add the song to call list #${callListId} right now.`;
  }

  private extractApiErrorMessage(error: unknown): string | null {
    if (!(error && typeof error === 'object')) {
      return null;
    }

    const record = error as Record<string, unknown>;
    const body = record['error'];

    if (typeof body === 'string' && body.trim()) {
      return body.trim();
    }

    if (body && typeof body === 'object') {
      const bodyRecord = body as Record<string, unknown>;
      const direct =
        bodyRecord['Message'] ??
        bodyRecord['message'] ??
        bodyRecord['title'] ??
        bodyRecord['detail'];
      if (typeof direct === 'string' && direct.trim()) {
        return direct.trim();
      }

      const modelState = bodyRecord['ModelState'] ?? bodyRecord['modelState'];
      if (modelState && typeof modelState === 'object') {
        const parts = Object.entries(modelState as Record<string, unknown>)
          .map(([field, msgs]) => {
            const text = Array.isArray(msgs) ? msgs.join(', ') : String(msgs ?? '');
            return `${field}: ${text}`;
          })
          .filter(part => part.length > 2);
        if (parts.length > 0) {
          return parts.join(' | ');
        }
      }
    }

    return null;
  }

  private toDebugError(error: unknown): Record<string, unknown> {
    if (error && typeof error === 'object') {
      const record = error as Record<string, unknown>;

      return {
        message: typeof record['message'] === 'string' ? record['message'] : null,
        status: typeof record['status'] === 'number' ? record['status'] : null,
        statusText: typeof record['statusText'] === 'string' ? record['statusText'] : null,
        error: record['error'] ?? null,
        url: typeof record['url'] === 'string' ? record['url'] : null,
        apiMessage: this.extractApiErrorMessage(error)
      };
    }

    return { error };
  }
}
