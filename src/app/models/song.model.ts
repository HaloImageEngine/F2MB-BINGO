export interface Song {
  song_id: number;
  title: string;
  artist: string;
  featured_artist?: string;
  genre?: string;
  subgenre?: string;
  mood?: string;
  tempo?: 'slow' | 'medium' | 'fast' | 'dance';
  bpm?: number;
  release_year?: number;
  decade?: string;
  era?: string;
  bingo_category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  play_count: number;
  duration_seconds?: number;
  active: boolean;
  /** When the row comes from `Get_Songs_Called_Calculate_by_GCI` → `CalledSongs`. */
  calledTimeStamp?: string | null;
  /** GCI `ThisNumberAWinner` ("True" / "False"). */
  thisNumberAWinner?: string | null;
}
