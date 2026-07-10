export interface ModelSongDisplay {
  song_id: number | null;
  Title: string | null;
  Artist: string | null;
  ArtistType: string | null;
  Genre: string | null;
  Subgenre: string | null;
  Mood: string | null;
  Tempo: string | null;
  ReleaseYear: number | null;
  Decade: string | null;
  Era: string | null;
  BingoCategory: string | null;
  Difficulty: string | null;
  ChartPeakPosition: number | null;
  ChartCountry: string | null;
  LastPlayed: string | null;
  SpotifyPopularity: number | null;
  DurationSeconds: number | null;
  Active: boolean;
}
