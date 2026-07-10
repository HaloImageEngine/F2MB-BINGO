import { SongObj } from './song-obj.model';

export type BingoColumnLetter = 'B' | 'I' | 'N' | 'G' | 'O';

export interface PrintedCardResultRow {
  CardID: number;
  GameID: number;
  CallListID: number | null;
  Inning: number | null;
  UserID: number;
  GameNumber: string;
  GameName: string | null;
  GameWinPattern: string | null;
  CardDateCreate: string;
  CardPlayerName: string | null;
  CardPlayerEmail: string | null;
  PlayCount: number;
  CardIsWinner: boolean;
  CardSeedKey: string | null;
  CardPrintedAt: string | null;
  SquareCode: string;
  SquarePosition: number;
  ColumnLetter: BingoColumnLetter;
  RowNumber: number;
  SongID: number | null;
  SongTitle: string | null;
  SongArtist: string | null;
  IsCalled: boolean;
  IsFreeSpace: boolean;
}

export interface PrintedCardSquare {
  SquareCode: string;
  SquarePosition: number;
  ColumnLetter: BingoColumnLetter;
  RowNumber: number;
  Song: SongObj | null;
  IsCalled: boolean;
  IsFreeSpace: boolean;
}

export interface PrintedCard {
  CardID: number;
  GameID: number;
  CallListID: number | null;
  Inning: number | null;
  UserID: number;
  GameNumber: string;
  GameName: string | null;
  GameWinPattern: string | null;
  CardDateCreate: string;
  CardPlayerName: string | null;
  CardPlayerEmail: string | null;
  PlayCount: number;
  CardIsWinner: boolean;
  CardSeedKey: string | null;
  CardPrintedAt: string | null;
  Squares: PrintedCardSquare[];
}
