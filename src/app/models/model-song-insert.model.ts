export interface ModelSongInsert {
  song_id?: number | null;
  Title: string;
  Artist: string;
  ArtistType: string;
  Genre: string;
  Subgenre: string;
  Mood: string;
  Tempo: string;
  ReleaseYear: number | null;
  Decade: string;
  Era: string;
  BingoCategory: string;
  Difficulty: string;
  ChartPeakPosition: number | null;
  ChartCountry: string;
  SpotifyPopularity: number | null;
  DurationSeconds: number | null;
  Active: boolean;
}
