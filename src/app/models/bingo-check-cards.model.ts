/** Per-game rollup from `GET …/Bingo/Check_Cards_byUser_ID/{User_ID}`. */
export interface BingoCheckCardsGameSummaryRow {
  Game_ID: number;
  Call_List_ID: number | null;
  Game_Number: number | null;
  Game_Name: string | null;
  Game_Status: string | null;
  Game_Inning: number | null;
  Game_StartTime: string | null;
  Game_EndTime: string | null;
  Total_Cards: number | null;
  Total_Winners: number | null;
  Total_NonWinners: number | null;
  Win_Rate_Pct: number | null;
  Total_Printed: number | null;
  Print_Rate_Pct: number | null;
  Total_PlayCount: number | null;
  Avg_PlayCount: number | null;
  First_Card_Created: string | null;
  Last_Card_Created: string | null;
}

/** Per-game / per-inning card vs song counts. */
export interface BingoCheckCardsInningSummaryRow {
  Game_ID: number;
  Game_Number: number | null;
  Game_Name: string | null;
  Game_Status: string | null;
  Call_List_ID: number | null;
  Inning: number;
  Card_Count: number | null;
  Song_Count: number | null;
}

/** Called vs not-called songs by call list / inning. */
export interface BingoCheckCardsSongCountRow {
  Game_ID: number;
  Game_Number: number | null;
  Game_Name: string | null;
  Game_Status: string | null;
  Call_List_ID: number | null;
  Call_List_Name: string | null;
  Total_Songs_In_CallList: number | null;
  Inning: number;
  Songs_In_Inning: number | null;
  Songs_Called: number | null;
  Songs_Not_Called: number | null;
}

/** `GET …/Bingo/Bingo/Check_Cards_byUser_ID/{User_ID}` */
export interface BingoCheckCardsResult {
  GameSummary: BingoCheckCardsGameSummaryRow[];
  InningSummary: BingoCheckCardsInningSummaryRow[];
  SongCounts: BingoCheckCardsSongCountRow[];
}
