import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, FormsModule, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, finalize, forkJoin, of } from 'rxjs';

import { BingoCallListCreate, BingoCallListMaster, BingoCallListSong, BingoCallListSongInsert } from '../../models/bingo-game.model';
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
  selector: 'app-create-master-withsonglist',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './create-master-withsongs.component.html',
  styleUrl: './create-master-withsongs.component.scss'
})
export class CreateSongListComponent implements OnInit {
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
  readonly formError = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly showCreateForm = signal(false);
  readonly createdList = signal<BingoCallListCreate | null>(null);
  readonly songs = signal<ModelSongDisplay[]>([]);
  readonly selectedSongs = signal<ModelSongDisplay[]>([]);
  readonly callListSongs = signal<BingoCallListSong[]>([]);
  readonly selectedCallListMaster = signal<BingoCallListMaster | null>(null);
  readonly searchTerm = signal('');
  readonly inning = signal<number>(4);
  readonly callListMasters = signal<BingoCallListMaster[]>([]);
  readonly loadingCallListMasters = signal(false);
  readonly callListMasterError = signal<string | null>(null);
  readonly loadingCallListSongs = signal(false);
  readonly callListSongError = signal<string | null>(null);
  readonly maxGameId = signal<number | null>(null);
  readonly maxCallListId = signal<number | null>(null);
  readonly genreOptions = signal<LookupOption[]>([]);
  readonly decadeOptions = signal<LookupOption[]>([]);
  readonly eraOptions = signal<LookupOption[]>([]);
  readonly currentUser = computed(() => this.authUserService.user());
  readonly nextGameId = computed(() => (this.maxGameId() ?? 0) + 1);

  readonly form = this.formBuilder.group({
    CallListName: this.formBuilder.nonNullable.control('', [trimmedRequired, Validators.maxLength(150)]),
    CallListDate: this.formBuilder.nonNullable.control(this.today(), [Validators.required]),
    CallListDescription: this.formBuilder.nonNullable.control('', [Validators.maxLength(500)]),
    CallListGenre: this.formBuilder.nonNullable.control('', [Validators.required, Validators.maxLength(100)]),
    CallListDecade: this.formBuilder.nonNullable.control('', [Validators.required, Validators.maxLength(5)]),
    CallListEra: this.formBuilder.nonNullable.control('', [Validators.required, Validators.maxLength(100)]),
    CallListIsActive: this.formBuilder.nonNullable.control(true)
  });

  readonly filteredSongs = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const selectedIds = new Set(this.selectedSongs().map(song => song.song_id));

    return this.songs().filter(song => {
      if (selectedIds.has(song.song_id)) {
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

  readonly songCount = computed(() => this.songs().length);
  readonly selectedCount = computed(() => this.selectedSongs().length);
  readonly callListMasterCount = computed(() => this.callListMasters().length);
  readonly trackBySong = (index: number, song: ModelSongDisplay) => song.song_id ?? index;
  readonly trackByCallListMaster = (index: number, item: BingoCallListMaster) => item.Call_List_ID ?? index;
  readonly trackByCallListSong = (index: number, item: BingoCallListSong) => item.song_id ?? index;

  ngOnInit(): void {
    const ctx = this.consoleContextService.getContext();
    if (ctx?.Inning) {
      this.inning.set(ctx.Inning);
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
          console.error('Create song list load failed', err);
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
    const storedMax = this.consoleContextService.getStoredMaxGameId();
    if (storedMax !== null) {
      this.maxGameId.set(storedMax);
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
      });

    this.callListService.getMaxCallListId(this.currentUser()?.UserId ?? null)
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

  selectCallListMaster(callListMaster: BingoCallListMaster): void {
    this.selectedCallListMaster.set(callListMaster);
    this.loadingCallListSongs.set(true);
    this.callListSongError.set(null);

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
      });
  }

  toggleCreateForm(): void {
    this.showCreateForm.update(value => !value);
    this.formError.set(null);
    this.success.set(null);
  }

  createSongList(): void {
    this.formError.set(null);
    this.success.set(null);

    const userId = this.currentUser()?.UserId;
    if (!userId) {
      this.formError.set('Log in before creating a call list. User_ID is required.');
      this.showCreateForm.set(true);
      return;
    }

    if (this.maxGameId() === null) {
      this.formError.set('Loading next Game_ID. Please wait and try again.');
      this.showCreateForm.set(true);
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formError.set('Fill in the required song list fields before creating the list.');
      this.showCreateForm.set(true);
      return;
    }

    const selectedSongs = this.selectedSongs();
    if (selectedSongs.length < 1) {
      this.formError.set('Add at least one song before creating the song master.');
      this.showCreateForm.set(true);
      return;
    }

    const payload = this.buildCallListPayload();

    this.saving.set(true);

    const songPayloads = selectedSongs.map(song => this.buildCallListSongPayload(0, song));

    this.callListService
      .buildCallList(payload, songPayloads)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(err => {
          console.error('Call list create failed', err);
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
            this.formError.set('Unable to create the song list right now.');
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

        this.createdList.set(updatedResult);
        this.callListMasters.update(items => [result.master, ...items.filter(item => item.Call_List_ID !== result.master.Call_List_ID)]);
        this.selectedCallListMaster.set(result.master);
        this.callListSongs.set(result.songs);
        this.success.set(
          result.songs.length > 0
            ? `Created the song list and added ${result.songs.length} songs.`
            : 'Created the song list successfully.'
        );
        this.loadMaxIds();
        this.resetCreateForm();
        this.clearSelection();
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

  resetCreateForm(): void {
    this.form.reset({
      CallListName: '',
      CallListDate: this.today(),
      CallListDescription: '',
      CallListGenre: '',
      CallListDecade: '',
      CallListEra: '',
      CallListIsActive: true
    });
    this.showCreateForm.set(false);
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

  private buildCallListPayload(): BingoCallListCreate {
    const value = this.form.getRawValue();

    return {
      NewCallListID: 0,
      CallListName: value.CallListName.trim(),
      CallListDate: value.CallListDate,
      CallListDescription: value.CallListDescription.trim(),
      UserID: this.authUserService.user()?.UserId ?? null,
      GameID: this.nextGameId(),
      CallListGenre: value.CallListGenre,
      CallListDecade: value.CallListDecade,
      CallListEra: value.CallListEra,
      CallListSongCount: this.selectedCount(),
      CallListIsActive: value.CallListIsActive,
      CallListCreatedAt: null,
      CallListID: null,
      InningNumber: this.inning()
    };
  }

  private buildCallListSongPayload(callListId: number, song: ModelSongDisplay): BingoCallListSongInsert {
    return {
      CallListID: callListId,
      Inning: this.inning(),
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
}
