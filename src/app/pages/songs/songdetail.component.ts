import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';

import { ModelSongDisplay } from '../../models/model-song-display.model';
import { SongService } from '../../services/song.service';

@Component({
  selector: 'app-song-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './songdetail.component.html',
  styleUrl: './songdetail.component.css'
})
export class SongDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly songService = inject(SongService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly song = signal<ModelSongDisplay | null>(null);

  ngOnInit(): void {
    const songIdParam = this.route.snapshot.paramMap.get('songId');
    const songId = songIdParam ? Number(songIdParam) : NaN;

    if (!Number.isInteger(songId)) {
      this.error.set('Song identifier is missing.');
      return;
    }

    this.loadSong(songId);
  }

  loadSong(songId: number): void {
    this.loading.set(true);
    this.error.set(null);

    this.songService
      .getSongById(songId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(err => {
          console.error('Song detail load failed', err);
          this.error.set('Unable to load song details right now.');
          return of<ModelSongDisplay | null>(null);
        }),
        finalize(() => this.loading.set(false))
      )
      .subscribe(song => {
        if (!song) {
          this.error.set('Song not found.');
          return;
        }

        this.song.set(song);
      });
  }

  formatDuration(seconds: number | null): string {
    if (!seconds) {
      return '--:--';
    }

    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${minutes}:${remainder.toString().padStart(2, '0')}`;
  }
}
