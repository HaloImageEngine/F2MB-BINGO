export interface McInfoArtistTypeCount {
  ArtistType: string;
  SongCount: number;
}

export interface McInfoDecadeCount {
  Decade: string;
  SongCount: number;
}

export interface McInfoEraCount {
  Era: string;
  SongCount: number;
}

export interface McInfoGenreCount {
  Genre: string;
  SongCount: number;
}

export interface McInfoSongDuplicate {
  song_id: number | null;
  title: string | null;
  artist: string | null;
  featured_artist: string | null;
  lead_vocalist: string | null;
  genre: string | null;
  subgenre: string | null;
  release_year: number | null;
  decade: string | null;
  bingo_category: string | null;
  active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  Duplicate_Count: number | null;
  Match_Type: string | null;
}
