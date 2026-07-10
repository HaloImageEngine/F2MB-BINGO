import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, finalize, forkJoin, of } from 'rxjs';

import { LookupOption } from '../../models/lookup-option.model';
import { McInfoArtistTypeCount, McInfoDecadeCount, McInfoEraCount, McInfoGenreCount } from '../../models/mcinfo.model';
import { ModelSongDisplay } from '../../models/model-song-display.model';
import { DashboardSummaryService } from '../../services/dashboard-summary.service';
import { SongService } from '../../services/song.service';

type SortColumn = 'Title' | 'Era' | 'ReleaseYear' | 'Tempo' | 'Decade' | 'Genre' | 'Difficulty' | 'LastPlayed' | 'Active';
type SortDirection = 'asc' | 'desc';

@Component({
  selector: 'app-songs-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './songslist.component.html',
  styleUrl: './songslist.component.css'
})
export class SongsListComponent implements OnInit {
  private readonly songService = inject(SongService);
  private readonly dashboardSummaryService = inject(DashboardSummaryService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly songs = signal<ModelSongDisplay[]>([]);
  readonly searchTerm = signal('');
  readonly selectedDecade = signal('');
  readonly selectedGenre = signal('');
  readonly decadeOptions = signal<LookupOption[]>([]);
  readonly sortColumn = signal<SortColumn>('Title');
  readonly sortDirection = signal<SortDirection>('asc');
  readonly eraCounts = signal<McInfoEraCount[]>([]);
  readonly genreCounts = signal<McInfoGenreCount[]>([]);
  readonly artistTypeCounts = signal<McInfoArtistTypeCount[]>([]);
  readonly decadeCounts = signal<McInfoDecadeCount[]>([]);
  readonly loadingCounts = signal(false);
  readonly genreOptions = computed(() => {
    return [...new Set(this.songs().map(song => song.Genre).filter((genre): genre is string => !!genre && genre.trim().length > 0))]
      .sort((left, right) => left.localeCompare(right));
  });

  readonly filteredSongs = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const decade = this.selectedDecade().trim().toLowerCase();
    const genre = this.selectedGenre().trim().toLowerCase();
    const sortColumn = this.sortColumn();
    const sortDirection = this.sortDirection();

    const matches = !term
      ? this.songs()
      : this.songs().filter(song => {
          const title = (song.Title ?? '').toLowerCase();
          const artist = (song.Artist ?? '').toLowerCase();
          return title.includes(term) || artist.includes(term);
        });

    const decadeMatches = !decade
      ? matches
      : matches.filter(song => (song.Decade ?? '').toLowerCase() === decade);

    const genreMatches = !genre
      ? decadeMatches
      : decadeMatches.filter(song => (song.Genre ?? '').toLowerCase() === genre);

    return [...genreMatches].sort((left, right) => this.compareSongs(left, right, sortColumn, sortDirection));
  });

  readonly totalCount = computed(() => this.songs().length);
  readonly activeCount = computed(() => this.songs().filter(song => song.Active).length);

  readonly trackBySong = (index: number, song: ModelSongDisplay) => song.song_id ?? index;

  ngOnInit(): void {
    this.loadSongs();
    this.loadDecadeOptions();
    this.loadCounts();
  }

  loadSongs(): void {
    this.loading.set(true);
    this.error.set(null);

    this.songService
      .getSongs()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(err => {
          console.error('Songs list load failed', err);
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
      });
  }

  loadCounts(): void {
    this.loadingCounts.set(true);

    forkJoin({
      eras: this.dashboardSummaryService.getCountByEra(),
      genres: this.dashboardSummaryService.getCountByGenre(),
      artistTypes: this.dashboardSummaryService.getCountByArtistType(),
      decades: this.dashboardSummaryService.getCountByDecade()
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(err => {
          console.error('Count load failed', err);
          return of({ eras: [], genres: [], artistTypes: [], decades: [] });
        }),
        finalize(() => this.loadingCounts.set(false))
      )
      .subscribe(({ eras, genres, artistTypes, decades }) => {
        this.eraCounts.set(eras);
        this.genreCounts.set(genres);
        this.artistTypeCounts.set(artistTypes);
        this.decadeCounts.set(decades);
      });
  }

  loadDecadeOptions(): void {
    this.songService
      .getDecadeOptions()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(err => {
          console.error('Songs decade lookup load failed', err);
          return of<LookupOption[]>([]);
        })
      )
      .subscribe(options => {
        const sortedOptions = [...options].sort((left, right) => (left.Name ?? '').localeCompare(right.Name ?? ''));
        this.decadeOptions.set(sortedOptions);
      });
  }

  songDetailLink(song: ModelSongDisplay): string[] {
    return ['/console/songs', this.songService.getSongRouteId(song)];
  }

  updateSearchTerm(value: string): void {
    this.searchTerm.set(value);
  }

  updateSelectedDecade(value: string): void {
    this.selectedDecade.set(value);
  }

  updateSelectedGenre(value: string): void {
    this.selectedGenre.set(value);
  }

  toggleSort(column: SortColumn): void {
    if (this.sortColumn() === column) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
      return;
    }

    this.sortColumn.set(column);
    this.sortDirection.set('asc');
  }

  sortIndicator(column: SortColumn): string {
    if (this.sortColumn() !== column) {
      return ' ';
    }

    return this.sortDirection() === 'asc' ? '▲' : '▼';
  }

  formatLastPlayed(value: string | null): string {
    if (!value) {
      return 'Never';
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return parsed.toLocaleDateString();
  }

  private compareSongs(
    left: ModelSongDisplay,
    right: ModelSongDisplay,
    column: SortColumn,
    direction: SortDirection
  ): number {
    const multiplier = direction === 'asc' ? 1 : -1;

    switch (column) {
      case 'ReleaseYear':
        return multiplier * this.compareNumbers(left.ReleaseYear, right.ReleaseYear);
      case 'LastPlayed':
        return multiplier * this.compareDates(left.LastPlayed, right.LastPlayed);
      case 'Active':
        return multiplier * this.compareBooleans(left.Active, right.Active);
      case 'Title':
        return multiplier * this.compareStrings(left.Title, right.Title);
      case 'Era':
        return multiplier * this.compareStrings(left.Era, right.Era);
      case 'Tempo':
        return multiplier * this.compareStrings(left.Tempo, right.Tempo);
      case 'Decade':
        return multiplier * this.compareStrings(left.Decade, right.Decade);
      case 'Genre':
        return multiplier * this.compareStrings(left.Genre, right.Genre);
      case 'Difficulty':
        return multiplier * this.compareStrings(left.Difficulty, right.Difficulty);
      default:
        return 0;
    }
  }

  private compareStrings(left: string | null, right: string | null): number {
    return (left ?? '').localeCompare(right ?? '');
  }

  private compareNumbers(left: number | null, right: number | null): number {
    return (left ?? Number.NEGATIVE_INFINITY) - (right ?? Number.NEGATIVE_INFINITY);
  }

  private compareBooleans(left: boolean, right: boolean): number {
    return Number(left) - Number(right);
  }

  private compareDates(left: string | null, right: string | null): number {
    const leftDate = left ? new Date(left).getTime() : Number.NEGATIVE_INFINITY;
    const rightDate = right ? new Date(right).getTime() : Number.NEGATIVE_INFINITY;
    return leftDate - rightDate;
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
