import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, finalize, forkJoin, of } from 'rxjs';

import { LookupOption } from '../../models/lookup-option.model';
import { ModelSongInsert } from '../../models/model-song-insert.model';
import { SongService } from '../../services/song.service';

const trimmedRequired: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  return typeof control.value === 'string' && control.value.trim().length === 0
    ? { required: true }
    : null;
};

@Component({
  selector: 'app-insert-song-single',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './insert-song-single.component.html',
  styleUrl: './insert-song-single.component.css'
})
export class InsertSongSingleComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly songService = inject(SongService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly releaseYearMin = 1900;
  private readonly releaseYearMax = 2100;
  private readonly spotifyPopularityMin = 0;
  private readonly spotifyPopularityMax = 100;

  readonly loadingLookups = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);

  readonly artistTypeOptions = signal<LookupOption[]>([]);
  readonly tempoOptions = signal<LookupOption[]>([]);
  readonly decadeOptions = signal<LookupOption[]>([]);
  readonly eraOptions = signal<LookupOption[]>([]);
  readonly difficultyOptions = signal<LookupOption[]>([]);

  readonly form = this.formBuilder.group({
    Title: this.formBuilder.nonNullable.control('', [trimmedRequired, Validators.maxLength(100)]),
    Artist: this.formBuilder.nonNullable.control('', [trimmedRequired, Validators.maxLength(200)]),
    ArtistType: this.formBuilder.nonNullable.control('', [Validators.required, Validators.maxLength(50)]),
    Genre: this.formBuilder.nonNullable.control('', [trimmedRequired, Validators.maxLength(100)]),
    Subgenre: this.formBuilder.nonNullable.control('', [trimmedRequired, Validators.maxLength(100)]),
    Mood: this.formBuilder.nonNullable.control('', [trimmedRequired, Validators.maxLength(100)]),
    Tempo: this.formBuilder.nonNullable.control('', [Validators.required, Validators.maxLength(50)]),
    ReleaseYear: this.formBuilder.control<number | null>(null, [Validators.min(this.releaseYearMin), Validators.max(this.releaseYearMax)]),
    Decade: this.formBuilder.nonNullable.control('', [Validators.required, Validators.maxLength(50)]),
    Era: this.formBuilder.nonNullable.control('', [Validators.required, Validators.maxLength(50)]),
    BingoCategory: this.formBuilder.nonNullable.control('', [trimmedRequired, Validators.maxLength(100)]),
    Difficulty: this.formBuilder.nonNullable.control('', [Validators.required, Validators.maxLength(50)]),
    ChartPeakPosition: this.formBuilder.control<number | null>(null, [Validators.min(1)]),
    ChartCountry: this.formBuilder.nonNullable.control('', [trimmedRequired, Validators.maxLength(100)]),
    SpotifyPopularity: this.formBuilder.control<number | null>(null, [Validators.min(this.spotifyPopularityMin), Validators.max(this.spotifyPopularityMax)]),
    DurationSeconds: this.formBuilder.control<number | null>(null, [Validators.min(1)]),
    Active: this.formBuilder.nonNullable.control(true)
  });

  ngOnInit(): void {
    this.loadLookups();
  }

  loadLookups(): void {
    this.loadingLookups.set(true);
    this.error.set(null);

    forkJoin({
      artistTypes: this.songService.getArtistTypes(),
      tempos: this.songService.getTempoOptions(),
      decades: this.songService.getDecadeOptions(),
      eras: this.songService.getEraOptions(),
      difficulties: this.songService.getDifficultyOptions()
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(err => {
          console.error('Song insert lookup load failed', err);
          this.error.set('Unable to load lookup values right now.');
          return of({
            artistTypes: [] as LookupOption[],
            tempos: [] as LookupOption[],
            decades: [] as LookupOption[],
            eras: [] as LookupOption[],
            difficulties: [] as LookupOption[]
          });
        }),
        finalize(() => this.loadingLookups.set(false))
      )
      .subscribe(result => {
        this.artistTypeOptions.set(this.sortLookupOptions(result.artistTypes));
        this.tempoOptions.set(this.sortLookupOptions(result.tempos));
        this.decadeOptions.set(this.sortLookupOptions(result.decades));
        this.eraOptions.set(this.sortLookupOptions(result.eras));
        this.difficultyOptions.set(this.sortLookupOptions(result.difficulties));
      });
  }

  submit(): void {
    this.success.set(null);
    this.error.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Fill in the required song fields before saving.');
      return;
    }

    const payload = this.buildPayload();

    this.saving.set(true);

    this.songService
      .insertSong(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(err => {
          console.error('Song insert failed', err);
          this.error.set('Unable to insert the song right now.');
          return of({ ReturnValue: null, Inserted: false, Message: null });
        }),
        finalize(() => this.saving.set(false))
      )
      .subscribe(result => {
        if (!result.Inserted) {
          this.error.set(result.Message ?? 'The song was not inserted.');
          return;
        }

        this.success.set(result.Message ?? 'Song inserted successfully.');
        this.resetForm();
      });
  }

  resetForm(): void {
    this.error.set(null);
    this.success.set(null);
    this.form.reset({
      Title: '',
      Artist: '',
      ArtistType: '',
      Genre: '',
      Subgenre: '',
      Mood: '',
      Tempo: '',
      ReleaseYear: null,
      Decade: '',
      Era: '',
      BingoCategory: '',
      Difficulty: '',
      ChartPeakPosition: null,
      ChartCountry: '',
      SpotifyPopularity: null,
      DurationSeconds: null,
      Active: true
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

    if (control.errors['min']) {
      if (controlName === 'ReleaseYear') {
        return `Release year must be ${this.releaseYearMin} or later.`;
      }

      if (controlName === 'SpotifyPopularity') {
        return `Spotify popularity must be ${this.spotifyPopularityMin} or higher.`;
      }

      return 'Value is below the allowed minimum.';
    }

    if (control.errors['max']) {
      if (controlName === 'ReleaseYear') {
        return `Release year must be ${this.releaseYearMax} or earlier.`;
      }

      if (controlName === 'SpotifyPopularity') {
        return `Spotify popularity must be ${this.spotifyPopularityMax} or lower.`;
      }

      return 'Value is above the allowed maximum.';
    }

    return 'Enter a valid value.';
  }

  private buildPayload(): ModelSongInsert {
    const value = this.form.getRawValue();

    return {
      Title: value.Title.trim(),
      Artist: value.Artist.trim(),
      ArtistType: value.ArtistType,
      Genre: value.Genre.trim(),
      Subgenre: value.Subgenre.trim(),
      Mood: value.Mood.trim(),
      Tempo: value.Tempo,
      ReleaseYear: value.ReleaseYear,
      Decade: value.Decade,
      Era: value.Era,
      BingoCategory: value.BingoCategory.trim(),
      Difficulty: value.Difficulty,
      ChartPeakPosition: value.ChartPeakPosition,
      ChartCountry: value.ChartCountry.trim(),
      SpotifyPopularity: value.SpotifyPopularity,
      DurationSeconds: value.DurationSeconds,
      Active: value.Active
    };
  }

  private sortLookupOptions(options: LookupOption[]): LookupOption[] {
    return [...options].sort((left, right) => (left.Name ?? '').localeCompare(right.Name ?? ''));
  }
}
