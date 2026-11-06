/** `GET …/Bingo/Bingo/Check_CardCount_By_Game_CallList?request.call_List_ID=&request.game_ID=&request.inning=` */
export interface CardCountByGameCallList {
  Call_List_ID: number;
  Game_ID: number;
  Inning: number;
  Total_Cards: number;
}
