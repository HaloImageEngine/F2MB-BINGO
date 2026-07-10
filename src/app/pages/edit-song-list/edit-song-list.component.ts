import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, FormsModule, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, finalize, forkJoin, of } from 'rxjs';

import {
  BingoCallListCreate,
  BingoCallListMaster,
  BingoCallListMasterUpdate,
  BingoCallListSong,
  BingoCallListSongInsert
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
  selector: 'app-edit-song-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './edit-song-list.component.html',
  styleUrl: './edit-song-list.component.scss'
})
export class EditSongListComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly songService = inject(SongService);
  private readonly callListService = inject(CallListService);
  private readonly authUserService = inject(AuthUserService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly consoleContextService = inject(ConsoleContextService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly loadingLookups = signal(false);
  readonly saving = signal(false);
  readonly updatingMaster = signal(false);
  readonly formError = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly showEditForm = signal(false);
  readonly editedList = signal<BingoCallListCreate | null>(null);
  readonly songs = signal<ModelSongDisplay[]>([]);
  readonly selectedSongs = signal<ModelSongDisplay[]>([]);
  readonly callListSongs = signal<BingoCallListSong[]>([]);
  readonly selectedCallListMaster = signal<BingoCallListMaster | null>(null);
  readonly searchTerm = signal('');
  readonly callListMasters = signal<BingoCallListMaster[]>([]);
  readonly loadingCallListMasters = signal(false);
  readonly callListMasterError = signal<string | null>(null);
  readonly loadingCallListSongs = signal(false);
  readonly callListSongError = signal<string | null>(null);
  readonly addingSongId = signal<number | null>(null);
  readonly removingSongId = signal<number | null>(null);
  /** Shared inning for Full Songlist Add and CallList_Songs view (kept in sync). */
  readonly inning = signal<number>(1);
  readonly maxGameId = signal<number | null>(null);
  readonly maxCallListId = signal<number | null>(null);
  readonly genreOptions = signal<LookupOption[]>([]);
  readonly decadeOptions = signal<LookupOption[]>([]);
  readonly eraOptions = signal<LookupOption[]>([]);
  readonly currentUser = computed(() => this.authUserService.user());

  readonly form = this.formBuilder.group({
    CallListName: this.formBuilder.nonNullable.control('', [trimmedRequired, Validators.maxLength(150)]),
    CallListDate: this.formBuilder.nonNullable.control(this.today(), [Validators.required]),
    CallListDescription: this.formBuilder.nonNullable.control('', [Validators.maxLength(500)]),
    GameID: this.formBuilder.control<number | null>(null),
    CallListGenre: this.formBuilder.nonNullable.control('', [Validators.required, Validators.maxLength(100)]),
    CallListDecade: this.formBuilder.nonNullable.control('', [Validators.required, Validators.maxLength(5)]),
    CallListEra: this.formBuilder.nonNullable.control('', [Validators.required, Validators.maxLength(100)]),
    CallListIsActive: this.formBuilder.nonNullable.control(true)
  });

  /** Library song IDs already on this call list for the active inning. */
  readonly callListSongIdsOnActiveInning = computed(() => {
    const activeInning = this.inning();
    const ids = new Set<number>();
    for (const row of this.callListSongs()) {
      const id = row.song_id;
      const inn = row.inning;
      if (
        typeof id === 'number' &&
        Number.isFinite(id) &&
        inn !== null &&
        inn !== undefined &&
        Number.isFinite(inn) &&
        Math.trunc(inn) === activeInning
      ) {
        ids.add(id);
      }
    }
    return ids;
  });

  /** Library song ID → other innings (not active) where the song appears on this call list. */
  readonly callListSongOtherInningsBySongId = computed(() => {
    const activeInning = this.inning();
    const map = new Map<number, number[]>();
    for (const row of this.callListSongs()) {
      const id = row.song_id;
      const inn = row.inning;
      if (typeof id !== 'number' || !Number.isFinite(id)) {
        continue;
      }
      if (inn === null || inn === undefined || !Number.isFinite(inn)) {
        continue;
      }
      const inningNum = Math.trunc(inn);
      if (inningNum === activeInning) {
        continue;
      }
      const existing = map.get(id) ?? [];
      if (!existing.includes(inningNum)) {
        existing.push(inningNum);
        existing.sort((left, right) => left - right);
        map.set(id, existing);
      }
    }
    return map;
  });

  readonly filteredSongs = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const selectedIds = new Set(this.selectedSongs().map(song => song.song_id));
    const onActiveInning = this.callListSongIdsOnActiveInning();

    return this.songs().filter(song => {
      const songId = song.song_id;
      if (songId !== undefined && songId !== null && selectedIds.has(songId)) {
        return false;
      }
      if (songId !== undefined && songId !== null && onActiveInning.has(songId)) {
        return false;
      }

      if (!term) {
        return true;
      }

      const title = (song.Title ?? '').toLowerCase();
      const artist = (song.Artist ?? '').toLowerCase();
      const genre = (song.Genre ?? '').toLowerCase();

      return title.includes(term) || artist.includes(term) || genre.includes(term);
    });
  });

  readonly songCount = computed(() => this.filteredSongs().length);
  readonly selectedCount = computed(() => this.selectedSongs().length);
  readonly callListMasterCount = computed(() => this.callListMasters().length);
  /** True when an existing master was chosen from the CallList_Master panel. */
  readonly isEditingExistingMaster = computed(() => this.selectedCallListMaster() !== null);
  readonly selectedCallListMasterId = computed(() => this.selectedCallListMaster()?.Call_List_ID ?? null);
  readonly compareCallListMasterById = (a: number | null, b: number | null): boolean => Number(a) === Number(b);
  readonly trackBySong = (index: number, song: ModelSongDisplay) => song.song_id ?? index;
  readonly trackByCallListMaster = (index: number, item: BingoCallListMaster) => item.Call_List_ID ?? index;
  readonly trackByCallListSong = (index: number, item: BingoCallListSong) => item.song_id ?? index;

  /** Count of loaded call-list songs per inning (null/invalid inning grouped as "Unspecified"). */
  readonly callListSongsInningCountRows = computed(() => {
    const songs = this.callListSongs();
    const counts = new Map<number, number>();
    for (const s of songs) {
      const inn = s.inning;
      const key =
        inn !== null && inn !== undefined && Number.isFinite(inn) ? Math.trunc(inn) : -1;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([inningKey, count]) => ({
        inningKey,
        label: inningKey === -1 ? 'Unspecified' : `Inning ${inningKey}`,
        count
      }));
  });

  readonly filteredCallListSongsForView = computed(() => {
    const activeInning = this.inning();
    return this.callListSongs().filter(s => {
      const inn = s.inning;
      if (inn === null || inn === undefined || !Number.isFinite(inn)) {
        return false;
      }
      return Math.trunc(inn) === activeInning;
    });
  });

  ngOnInit(): void {
    const ctx = this.consoleContextService.getContext();
    if (ctx) {
      if (ctx.Inning) this.inning.set(ctx.Inning);
      if (ctx.Game_ID) this.form.patchValue({ GameID: ctx.Game_ID });
    }

    this.loadSongs();
    this.loadLookups();
    this.loadCallListMasters();
    this.loadMaxIds();
  }

  loadSongs(): void {
    this.loading.set(true);
    this.error.set(null);

    this.songService
      .getSongs()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(err => {
          console.error('Edit song list load failed', err);
          this.error.set('Unable to load songs right now.');
          return of<ModelSongDisplay[]>([]);
        }),
        finalize(() => this.loading.set(false))
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

  loadMaxIds(): void {
    this.callListService
      .getMaxGameId(this.authUserService.user()?.UserId ?? null)
      .pipe(takeUntilDestroyed(this.destroyRef), catchError(() => of(0)))
      .subscribe(val => this.maxGameId.set(val));

    this.callListService.getMaxCallListId(this.authUserService.user()?.UserId ?? null)
      .pipe(takeUntilDestroyed(this.destroyRef), catchError(() => of(null)))
      .subscribe(val => this.maxCallListId.set(val));
  }

  loadLookups(): void {
    this.loadingLookups.set(true);
    this.formError.set(null);

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
          console.error('Call list master load failed', err);
          this.callListMasterError.set('Unable to load call list masters right now.');
          return of([]);
        }),
        finalize(() => this.loadingCallListMasters.set(false))
      )
      .subscribe(items => {
        this.callListMasters.set(items);

        const currentSelectedId = this.selectedCallListMaster()?.Call_List_ID;
        const storedCallListId = this.consoleContextService.getCallListId();

        const nextSelected = storedCallListId !== null
          ? items.find(item => item.Call_List_ID === storedCallListId) ?? items[0] ?? null
          : items.find(item => item.Call_List_ID === currentSelectedId) ?? items[0] ?? null;

        if (nextSelected) {
          this.selectCallListMaster(nextSelected);
        } else {
          this.selectedCallListMaster.set(null);
          this.callListSongs.set([]);
        }
      });
  }

  selectCallListMasterById(callListId: number | null): void {
    if (callListId === null) {
      this.selectedCallListMaster.set(null);
      this.callListSongs.set([]);
      return;
    }

    const master = this.callListMasters().find(item => item.Call_List_ID === callListId) ?? null;
    if (!master) {
      return;
    }

    this.selectCallListMaster(master);
  }

  selectCallListMaster(callListMaster: BingoCallListMaster): void {
    this.selectedCallListMaster.set(callListMaster);
    this.loadingCallListSongs.set(true);
    this.callListSongError.set(null);

    const storedGameId = this.consoleContextService.getGameId();

    this.form.patchValue({
      CallListName: callListMaster.Call_List_Name,
      CallListDate: callListMaster.Call_List_Date ?? this.today(),
      CallListDescription: callListMaster.Call_List_Description ?? '',
      GameID: storedGameId,
      CallListGenre: callListMaster.Call_List_Genre ?? '',
      CallListDecade: callListMaster.Call_List_Decade ?? '',
      CallListEra: callListMaster.Call_List_Era ?? '',
      CallListIsActive: callListMaster.Call_List_IsActive
    });

    this.callListService
      .getCallListSongs(callListMaster.Call_List_ID)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(err => {
          console.error('Call list songs load failed', err);
          this.callListSongError.set('Unable to load call list songs right now.');
          return of<BingoCallListSong[]>([]);
        }),
        finalize(() => this.loadingCallListSongs.set(false))
      )
      .subscribe(items => {
        this.callListSongs.set(items);
        this.alignInningToLoadedSongs();
      });
  }

  toggleEditForm(): void {
    this.showEditForm.update(value => !value);
    this.formError.set(null);
    this.success.set(null);
  }

  updateCallListMaster(): void {
    this.formError.set(null);
    this.success.set(null);

    const master = this.selectedCallListMaster();
    if (!master) {
      this.formError.set('Select a call list master before updating.');
      this.showEditForm.set(true);
      return;
    }

    if (!this.authUserService.user()?.UserId) {
      this.formError.set('Log in before updating a call list. User_ID is required.');
      this.showEditForm.set(true);
      return;
    }

    const gameId = this.form.getRawValue().GameID ?? this.consoleContextService.getGameId();
    if (!gameId) {
      this.formError.set('Set Game_ID in Game Master or Console before updating a call list.');
      this.showEditForm.set(true);
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formError.set('Fill in the required fields before updating.');
      this.showEditForm.set(true);
      return;
    }

    let payload: BingoCallListMasterUpdate;
    try {
      payload = this.buildCallListMasterUpdatePayload();
    } catch (err) {
      this.formError.set(err instanceof Error ? err.message : 'Unable to build the update request.');
      this.showEditForm.set(true);
      return;
    }

    this.updatingMaster.set(true);

    this.callListService
      .updateCallListMasterByCallListId(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(err => {
          console.error('Update_CallList_Master_By_Call_List_ID failed', err);
          if (err instanceof Error) {
            this.formError.set(err.message);
            return of(null);
          }
          this.formError.set('Unable to update the call list master right now.');
          return of(null);
        }),
        finalize(() => this.updatingMaster.set(false))
      )
      .subscribe(result => {
        if (!result) {
          return;
        }

        const updatedMaster: BingoCallListMaster = {
          Call_List_ID: result.Call_List_ID,
          Call_List_Name: result.Call_List_Name,
          Call_List_Date: result.Call_List_Date,
          Call_List_Description: result.Call_List_Description,
          Call_List_Genre: result.Call_List_Genre,
          Call_List_Decade: result.Call_List_Decade,
          Call_List_Era: result.Call_List_Era,
          Call_List_SongCount: result.Call_List_SongCount,
          Call_List_IsActive: result.Call_List_IsActive,
          Call_List_CreatedAt: result.Call_List_CreatedAt,
          Call_List_UpdatedAt: null
        };

        this.selectedCallListMaster.set(updatedMaster);
        this.callListMasters.update(items =>
          [updatedMaster, ...items.filter(item => item.Call_List_ID !== updatedMaster.Call_List_ID)]
        );
        this.success.set(result.Message?.trim() || 'Call list master updated successfully.');
      });
  }

  saveSongList(): void {
    this.formError.set(null);
    this.success.set(null);

    if (this.isEditingExistingMaster()) {
      this.formError.set('Use Update Calllist Master to save changes to an existing call list.');
      this.showEditForm.set(true);
      return;
    }

    if (!this.authUserService.user()?.UserId) {
      this.formError.set('Log in before creating a call list. User_ID is required.');
      this.showEditForm.set(true);
      return;
    }

    const gameId = this.form.getRawValue().GameID ?? this.consoleContextService.getGameId();
    if (!gameId) {
      this.formError.set('Set Game_ID in Game Master or Console before creating a call list.');
      this.showEditForm.set(true);
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formError.set('Fill in the required fields before saving.');
      this.showEditForm.set(true);
      return;
    }

    const payload = this.buildCallListPayload();
    const selectedSongs = this.selectedSongs();

    this.saving.set(true);

    const insertInning = this.inning();
    const songPayloads = selectedSongs.map(song => this.buildCallListSongPayload(0, song, insertInning));

    this.callListService
      .buildCallList(payload, songPayloads)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(err => {
          console.error('Call list save failed', err);
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
            this.formError.set('Unable to save the call list right now.');
          }
          return of(null);
        }),
        finalize(() => this.saving.set(false))
      )
      .subscribe(result => {
        if (!result) {
          return;
        }

        const updatedResult = {
          NewCallListID: null,
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
        } satisfies BingoCallListCreate;

        this.editedList.set(updatedResult);
        this.callListMasters.update(items => [result.master, ...items.filter(item => item.Call_List_ID !== result.master.Call_List_ID)]);
        this.selectedCallListMaster.set(result.master);
        this.callListSongs.set(result.songs);
        this.success.set(
          result.songs.length > 0
            ? `Saved the call list and added ${result.songs.length} songs.`
            : 'Saved the call list successfully.'
        );
        this.loadMaxIds();
        this.clearSelection();
      });
  }

  insertSongDirect(song: ModelSongDisplay, inningFromInput?: number | string | null): void {
    const master = this.selectedCallListMaster();

    if (!master) {
      this.formError.set('Select a call list master before adding songs.');
      return;
    }

    if (this.addingSongId() !== null) {
      return;
    }

    const insertInning = this.resolveInsertInning(inningFromInput);
    this.inning.set(insertInning);
    this.syncConsoleInning(insertInning);

    this.addingSongId.set(song.song_id ?? null);
    this.formError.set(null);

    const payload = this.buildCallListSongPayload(master.Call_List_ID, song, insertInning);

    this.callListService
      .addCallListSong(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(err => {
          console.error('Insert_CallList_Song failed', err);
          const modelState = err?.error?.ModelState ?? err?.error?.modelState;
          if (modelState) {
            const details = Object.entries(modelState)
              .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(', ')}`)
              .join(' | ');
            this.formError.set(`Insert failed — ${details}`);
          } else if (this.isSongUsedInOtherInning(song.song_id)) {
            this.formError.set(
              `"${song.Title ?? 'This song'}" is already used in another inning. The API must allow the same song per inning before it can be added here.`
            );
          } else {
            this.formError.set(`Failed to add "${song.Title ?? 'song'}" to the call list.`);
          }
          this.success.set(null);
          return of(null);
        }),
        finalize(() => this.addingSongId.set(null))
      )
      .subscribe(result => {
        if (!result) {
          return;
        }

        const insertedInning =
          result.Inning !== null && result.Inning !== undefined && result.Inning > 0
            ? result.Inning
            : insertInning;
        this.appendCallListSongLocally(master, song, result, insertedInning);

        this.formError.set(null);
        this.success.set(
          `Added "${song.Title ?? 'song'}" to call list #${master.Call_List_ID} (Inning ${insertedInning}).`
        );
        this.callListService
          .getCallListSongs(master.Call_List_ID)
          .pipe(takeUntilDestroyed(this.destroyRef), catchError(() => of(this.callListSongs())))
          .subscribe(items => {
            const merged = this.applyCallListSongsRefresh(
              items,
              { ...payload, Inning: insertedInning },
              song,
              insertedInning
            );
            this.callListSongs.set(merged);
            this.callListMasters.update(masters =>
              masters.map(m =>
                m.Call_List_ID === master.Call_List_ID
                  ? { ...m, Call_List_SongCount: merged.length }
                  : m
              )
            );
          });
      });
  }

  addSong(song: ModelSongDisplay): void {
    if (this.selectedSongs().some(item => item.song_id === song.song_id)) {
      return;
    }

    this.selectedSongs.update(list => [...list, song]);
  }

  removeSong(song: ModelSongDisplay): void {
    this.selectedSongs.update(list => list.filter(item => item.song_id !== song.song_id));
  }

  clearSelection(): void {
    this.selectedSongs.set([]);
  }

  /** Updates both Full Songlist and CallList_Songs inning controls. */
  setActiveInning(value: number | string | null): void {
    const activeInning = this.resolveInsertInning(value);
    this.inning.set(activeInning);
    this.syncConsoleInning(activeInning);
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

  private buildCallListMasterUpdatePayload(): BingoCallListMasterUpdate {
    const create = this.buildCallListPayload();
    const master = this.selectedCallListMaster();

    if (!master || create.CallListID === null) {
      throw new Error('Select a call list master before updating.');
    }

    if (create.UserID === null || create.UserID < 1) {
      throw new Error('User_ID is required. Log in before updating a call list.');
    }

    if (create.GameID === null || create.GameID < 1) {
      throw new Error('Game_ID is required. Set Game_ID in Game Master or Console first.');
    }

    const inning = create.InningNumber ?? this.inning();
    if (!Number.isFinite(inning) || inning < 1) {
      throw new Error('InningNumber is required and must be 1 or greater.');
    }

    return {
      Call_List_ID: create.CallListID,
      Call_List_Name: create.CallListName,
      Call_List_Date: create.CallListDate,
      Call_List_Description: create.CallListDescription,
      Game_ID: create.GameID,
      User_ID: create.UserID,
      Call_List_Genre: create.CallListGenre,
      Call_List_Decade: create.CallListDecade,
      Call_List_Era: create.CallListEra,
      Call_List_SongCount: master.Call_List_SongCount,
      Call_List_IsActive: create.CallListIsActive,
      InningNumber: inning
    };
  }

  private buildCallListPayload(): BingoCallListCreate {
    const value = this.form.getRawValue();

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
      CallListID: this.selectedCallListMaster()?.Call_List_ID ?? null,
      InningNumber: this.inning()
    };
  }

  private buildCallListSongPayload(
    callListId: number,
    song: ModelSongDisplay,
    inning = this.inning()
  ): BingoCallListSongInsert {
    return {
      CallListID: callListId,
      Inning: inning,
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
      Era: (song.Era ?? '').slice(0, 10),
      LastPlayed: song.LastPlayed ?? new Date().toISOString(),
      NewSongID: song.song_id ?? 0
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

  private resolveInsertInning(value?: number | string | null): number {
    if (value !== null && value !== undefined && value !== '') {
      const raw = typeof value === 'string' ? Number.parseFloat(value) : Number(value);
      if (Number.isFinite(raw) && raw >= 1) {
        return Math.min(4, Math.max(1, Math.trunc(raw)));
      }
    }

    return Math.min(4, Math.max(1, this.inning()));
  }

  /** If active inning has no songs but the list does, switch to the first inning present. */
  private alignInningToLoadedSongs(): void {
    const songs = this.callListSongs();
    if (songs.length === 0) {
      return;
    }

    const active = this.inning();
    const hasActive = songs.some(s => Math.trunc(s.inning ?? 0) === active);
    if (hasActive) {
      return;
    }

    const innings = songs
      .map(s => s.inning)
      .filter((inn): inn is number => inn !== null && inn !== undefined && Number.isFinite(inn) && inn > 0)
      .map(inn => Math.trunc(inn))
      .sort((a, b) => a - b);

    if (innings.length > 0) {
      this.inning.set(innings[0]);
    }
  }

  private syncConsoleInning(inning: number): void {
    const callListId = this.selectedCallListMaster()?.Call_List_ID ?? null;
    if (callListId === null) {
      return;
    }

    const gameId = this.form.getRawValue().GameID ?? this.consoleContextService.getGameId();
    this.consoleContextService.setContext({
      Game_ID: gameId,
      Call_List_ID: callListId,
      Inning: inning
    });
  }

  /** Full Songlist Add — show row in CallList_Songs immediately with the posted inning. */
  private appendCallListSongLocally(
    master: BingoCallListMaster,
    song: ModelSongDisplay,
    insertResult: BingoCallListSongInsert,
    insertInning: number
  ): void {
    const rowId = song.song_id ?? insertResult.Song_ID ?? 0;
    const row: BingoCallListSong = {
      song_id: rowId,
      Call_List_ID: master.Call_List_ID,
      inning: insertInning,
      title: song.Title ?? '',
      artist: song.Artist ?? '',
      featured_artist: null,
      lead_vocalist: null,
      artist_type: song.ArtistType ?? null,
      genre: song.Genre ?? null,
      explicit: false,
      release_year: song.ReleaseYear ?? null,
      decade: song.Decade ?? null,
      era: song.Era ?? null,
      last_played: song.LastPlayed ?? null
    };

    this.callListSongs.update(list => {
      const exists = list.some(
        item => item.song_id === row.song_id && Math.trunc(item.inning ?? 0) === insertInning
      );
      if (exists) {
        return list.map(item =>
          item.song_id === row.song_id && Math.trunc(item.inning ?? 0) === insertInning
            ? { ...item, inning: insertInning }
            : item
        );
      }
      return [...list, row];
    });
  }

  /** Merge GET results with any optimistic row not yet returned by the API. */
  private applyCallListSongsRefresh(
    items: BingoCallListSong[],
    payload: BingoCallListSongInsert,
    song: ModelSongDisplay,
    insertedInning: number
  ): BingoCallListSong[] {
    const librarySongId = payload.Song_ID;
    const targetInning = Math.trunc(insertedInning);
    const fromApi = this.mergeCallListSongInning(items, payload);
    const hasRowForInning = (rows: BingoCallListSong[]) =>
      rows.some(
        row => row.song_id === librarySongId && Math.trunc(row.inning ?? 0) === targetInning
      );

    if (hasRowForInning(fromApi)) {
      return fromApi;
    }

    const optimistic = this.callListSongs().find(
      row => row.song_id === librarySongId && Math.trunc(row.inning ?? 0) === targetInning
    );

    if (optimistic) {
      return [...fromApi, optimistic];
    }

    return [
      ...fromApi,
      {
        song_id: librarySongId,
        Call_List_ID: payload.CallListID ?? 0,
        inning: insertedInning,
        title: song.Title ?? '',
        artist: song.Artist ?? '',
        featured_artist: null,
        lead_vocalist: null,
        artist_type: song.ArtistType ?? null,
        genre: song.Genre ?? null,
        explicit: false,
        release_year: song.ReleaseYear ?? null,
        decade: song.Decade ?? null,
        era: song.Era ?? null,
        last_played: song.LastPlayed ?? null
      }
    ];
  }

  /** API list rows sometimes return inning 0/null; keep the inning we just posted. */
  private mergeCallListSongInning(
    items: BingoCallListSong[],
    payload: BingoCallListSongInsert
  ): BingoCallListSong[] {
    const targetSongId = payload.Song_ID;
    const targetInning = payload.Inning;

    return items.map(item => {
      if (item.song_id !== targetSongId) {
        return item;
      }

      const inning = item.inning;
      if (inning === null || inning === undefined || !Number.isFinite(inning) || inning <= 0) {
        return { ...item, inning: targetInning };
      }

      return item;
    });
  }

  onFullSongAddClick(song: ModelSongDisplay): void {
    this.insertSongDirect(song, this.inning());
  }

  isSongUsedInOtherInning(songId: number | undefined | null): boolean {
    if (songId === undefined || songId === null || !Number.isFinite(songId)) {
      return false;
    }
    return this.callListSongOtherInningsBySongId().has(songId);
  }

  otherInningUsageMessage(songId: number | undefined | null): string | null {
    if (!this.isSongUsedInOtherInning(songId)) {
      return null;
    }
    return 'Already used in another inning';
  }
}
