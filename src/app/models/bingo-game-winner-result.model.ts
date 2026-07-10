/** Row from `GET …/Get_Game_Winners_Results/{Game_ID}`. */
export interface BingoGameWinnerResultRow {
  Call_List_Winner_ID: number;
  Game_ID: number;
  Call_List_ID: number;
  Inning: number;
  Call_List_WinningCard: number;
  Call_List_WinningPatter: string | null;
  Call_List_CreatedAt: string | null;
  Call_List_UpdatedAt: string | null;
  NumofSongsCalled: number | null;
}

/** Row from `GET …/Get_CallListWinner_by_UserID/{User_ID}?gameId=…`. */
export interface BingoCallListWinnerByUserRow {
  Call_List_Winner_ID: number;
  Game_ID: number;
  Call_List_ID: number;
  Inning: number;
  Call_List_Name: string | null;
  Game_Number: number | null;
  Game_Name: string | null;
  Game_Status: string | null;
  Call_List_WinningCard: number;
  Card_ID: number;
  Card_PlayerName: string | null;
  Card_PlayerEmail: string | null;
  Call_List_WinningPatter: string | null;
  NumofSongsCalled: number | null;
  Call_List_CreatedAt: string | null;
  Call_List_UpdatedAt: string | null;
}
