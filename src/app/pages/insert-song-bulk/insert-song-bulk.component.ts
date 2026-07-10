import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';

import { ModelSongInsertResult } from '../../models/model-song-insert-result.model';
import { AuthUserService } from '../../services/auth-user.service';
import { SongService } from '../../services/song.service';

const validJsonArray: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = typeof control.value === 'string' ? control.value.trim() : '';

  if (!value) {
    return { required: true };
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (!Array.isArray(parsed)) {
      return { jsonArray: true };
    }

    return null;
  } catch {
    return { invalidJson: true };
  }
};

@Component({
  selector: 'app-insert-song-bulk',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './insert-song-bulk.component.html',
  styleUrl: './insert-song-bulk.component.css'
})
export class InsertSongBulkComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly songService = inject(SongService);
  private readonly authUserService = inject(AuthUserService);
  private readonly destroyRef = inject(DestroyRef);

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly results = signal<ModelSongInsertResult[]>([]);
  readonly currentUser = this.authUserService.user;

  readonly form = this.formBuilder.group({
    jsonPayload: this.formBuilder.nonNullable.control('', [Validators.required, validJsonArray])
  });

  readonly parsedCount = computed(() => {
    const value = this.form.controls.jsonPayload.value.trim();

    if (!value) {
      return 0;
    }

    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      return 0;
    }
  });

  submit(): void {
    this.error.set(null);
    this.success.set(null);
    this.results.set([]);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Enter a valid JSON array before sending the bulk insert request.');
      return;
    }

    const payload = this.form.controls.jsonPayload.value;
    this.saving.set(true);

    this.songService
      .insertSongs(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(err => {
          console.error('Bulk song insert failed', err);
          this.error.set('Unable to insert the song list right now.');
          return of<ModelSongInsertResult[]>([]);
        }),
        finalize(() => this.saving.set(false))
      )
      .subscribe(results => {
        if (results.length === 0) {
          if (!this.error()) {
            this.error.set('The API did not return any insert results.');
          }

          return;
        }

        this.results.set(results);

        const insertedCount = results.filter(result => result.Inserted).length;
        this.success.set(`${insertedCount} of ${results.length} songs inserted.`);
      });
  }

  resetForm(): void {
    this.form.reset({ jsonPayload: '' });
    this.error.set(null);
    this.success.set(null);
    this.results.set([]);
  }

  showJsonError(): boolean {
    const control = this.form.controls.jsonPayload;
    return control.invalid && (control.touched || control.dirty);
  }

  jsonErrorMessage(): string | null {
    const control = this.form.controls.jsonPayload;

    if (control.errors?.['required']) {
      return 'Paste a JSON array payload.';
    }

    if (control.errors?.['invalidJson']) {
      return 'The content is not valid JSON.';
    }

    if (control.errors?.['jsonArray']) {
      return 'The payload must be a JSON array of songs.';
    }

    return null;
  }
}
