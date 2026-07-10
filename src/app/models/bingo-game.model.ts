export interface BingoGameActionResult {
  Success: boolean;
  GameID: number;
  CallListID?: number | null;
  Inning?: number | null;
  ReturnValue: number;
}

export interface BingoTopCard {
  CardID: number;
  CalledCount: number;
  CardRank?: number;
  GameID?: number;
  GameNumber?: number;
  GameName?: string | null;
  GameWinPattern?: string | null;
  CardIsWinner?: boolean;
}

export interface BingoWinnerResult {
  GameID: number;
  /** Present when API returns `Check_ForWinner/{Game}/{CallList}/{Inning}/{NumOfSongsCalled}` payload. */
  CallListID?: number | null;
  Inning?: number | null;
  WinningCardID: number | null;
  WinningPattern: string | null;
  PlayerName: string | null;
  PlayerEmail: string | null;
  WinningLineCount?: number | null;
  NumOfSongsCalled?: number | null;
  Result: string | null;
}

/**
 * Path/query mapping for `Upsert_CallList_Winner`:
 * `{Game_ID}/{Call_List_ID}/{Inning}/{Call_List_WinningCard}/{NumofSongsCalled}?winningPattern={Call_List_WinningPattern}`
 */
export interface BingoUpsertCallListWinnerParams {
  Game_ID: number;
  Call_List_ID: number;
  Inning: number;
  Call_List_WinningCard: number;
  Call_List_WinningPattern: string;
  NumofSongsCalled: number;
}

/**
 * Response from `Upsert_CallList_Winner/{Game_ID}/{Call_List_ID}/{Inning}/{Call_List_WinningCard}/{NumofSongsCalled}/{WinningPattern}`
 * Maps to `CallList_Winner`: Game_ID, Call_List_ID, Inning, Call_List_WinningCard, Call_List_WinningPattern, NumofSongsCalled.
 */
export interface BingoUpsertCallListWinnerResult {
  Message: string;
}

export interface BingoCalledSong {
  SongID: number;
  SongTitle: string;
  SongArtist: string;
}

/** `GET …/Bingo/Bingo/Call_TheSongNumber` success body (usp_CallSong summary). */
export interface BingoCallSongResult {
  Game_ID: number;
  Song_ID: number;
  Song_Title: string;
  Song_Artist: string;
  Called_ID: number;
  Cards_Checked: number;
  Cards_Matched: number;
}

/** One row inside `BingoSongsCalledCalculateByGci.CalledSongs`. */
export interface BingoCalledSongFromGci {
  Inning: number;
  Call_List_ID: number;
  song_id: number;
  title: string;
  artist: string;
  DateTimeStamp: string | null;
  ThisNumberAWinner: string;
}

/** GET …/Get_Songs_Called_Calculate_by_GCI/{Game_ID}/{Call_List_ID}/{Inning} */
export interface BingoSongsCalledCalculateByGci {
  SongsCalled: number;
  TotalSongs: number;
  SongsRemaining: number;
  Game_ID: number;
  Call_List_ID: number;
  Inning: number;
  CalledSongs?: BingoCalledSongFromGci[];
}

type BingoCardCol = 'B' | 'I' | 'N' | 'G' | 'O';
type BingoCardRow = 1 | 2 | 3 | 4 | 5;

/** Song id on one square (free center may be `null`). */
export type BingoMaxGameCardSquareSongKey = {
  [C in BingoCardCol]: { [R in BingoCardRow]: `Sq_${C}${R}` }[BingoCardRow];
}[BingoCardCol];

export type BingoMaxGameCardSquareCalledKey = `${BingoMaxGameCardSquareSongKey}_Called`;

export type BingoMaxGameCardSquareFields = {
  [K in BingoMaxGameCardSquareSongKey]: number | null;
} & {
  [K in BingoMaxGameCardSquareCalledKey]: boolean;
};

/** Card header from GET …/Get_MaxGameCard_FirstCard/{Game_ID}/{Call_List_ID}/{Inning} */
export interface BingoMaxGameCardHeader {
  Card_ID: number;
  Game_ID: number;
  Call_List_ID: number;
  Inning: number;
  Card_Date_Create: string | null;
  Card_PlayerName: string | null;
  Card_PlayerEmail: string | null;
  PlayCount: number;
  Card_IsWinner: boolean;
  Card_SeedKey: string | null;
  Card_PrintedAt: string | null;
}

/** Full first-card payload including all BINGO square song ids and called flags. */
export type BingoMaxGameCardFirstCard = BingoMaxGameCardHeader & BingoMaxGameCardSquareFields;

export interface BingoCallListMaster {
  Call_List_ID: number;
  Call_List_Name: string;
  Call_List_Date: string | null;
  Call_List_Description: string | null;
  Call_List_Genre: string | null;
  Call_List_Decade: string | null;
  Call_List_Era: string | null;
  Call_List_SongCount: number;
  Call_List_IsActive: boolean;
  Call_List_CreatedAt: string | null;
  Call_List_UpdatedAt: string | null;
}

export interface BingoCallListCreate {
  NewCallListID: number | null;
  CallListName: string;
  CallListDate: string;
  CallListDescription: string;
  UserID: number | null;
  GameID: number | null;
  CallListGenre: string;
  CallListDecade: string;
  CallListEra: string;
  CallListSongCount: number;
  CallListIsActive: boolean;
  CallListCreatedAt: string | null;
  CallListID: number | null;
  InningNumber: number | null;
}

/** Request body for `PUT …/Update_CallList_Master_By_Call_List_ID`. */
export interface BingoCallListMasterUpdate {
  Call_List_ID: number;
  Call_List_Name: string;
  Call_List_Date: string;
  Call_List_Description?: string | null;
  Game_ID: number;
  User_ID: number;
  Call_List_Genre?: string | null;
  Call_List_Decade?: string | null;
  Call_List_Era?: string | null;
  Call_List_SongCount?: number;
  Call_List_IsActive: boolean;
  InningNumber: number;
}

/** Response from `PUT …/Update_CallList_Master_By_Call_List_ID`. */
export interface BingoCallListMasterUpdateResult {
  Call_List_ID: number;
  Call_List_Name: string;
  Call_List_Date: string | null;
  Call_List_Description: string | null;
  Game_ID: number;
  User_ID: number;
  Call_List_Genre: string | null;
  Call_List_Decade: string | null;
  Call_List_Era: string | null;
  Call_List_SongCount: number;
  Call_List_IsActive: boolean;
  InningNumber: number;
  Call_List_CreatedAt: string | null;
  Message: string;
}

export interface BingoCallListSongInsert {
  CallListID: number;
  Inning: number;
  Song_ID: number;
  Title: string;
  Artist: string;
  FeaturedArtist: string;
  LeadVocalist: string;
  ArtistType: string;
  Genre: string;
  Explicit: boolean;
  ReleaseYear: number;
  Decade: string;
  Era: string;
  LastPlayed: string;
  NewSongID?: number;
}

/** `POST …/Complete_CallList_Songs_by_CallListandInning/{Call_List_ID}/{Inning}?genre=…` */
export interface BingoCallListSongsCompleteResult {
  Call_List_ID: number;
  Inning: number;
  Genre: string;
  InitialCount: number;
  SongsNeeded: number;
  SongsAdded: number;
  FinalCount: number;
  TargetMet: string;
  StatusMessage: string;
}

/** `POST …/Remove_CallList_Song/{Call_List_ID}/{Inning}/{Song_ID}` */
export interface BingoCallListSongRemoveResult {
  Call_List_ID: number;
  song_id_removed: number;
  title: string;
  artist: string;
  Call_List_SongCount: number;
}

export interface BingoCallListSong {
  song_id: number;
  Call_List_ID: number;
  inning: number | null;
  title: string;
  artist: string;
  featured_artist: string | null;
  lead_vocalist: string | null;
  artist_type: string | null;
  genre: string | null;
  explicit: boolean;
  release_year: number | null;
  decade: string | null;
  era: string | null;
  last_played: string | null;
}

export interface BingoCallListSongByGci {
  Inning: number;
  Call_List_ID: number;
  song_id: number;
  title: string;
  artist: string;
  genre: string | null;
  release_year: number | null;
  decade: string | null;
  era: string | null;
  last_played: string | null;
}

/** `GET …/Get_DropDown_CallList_ByUserID/{User_ID}` — API may return only Call_List_ID per row. */
export interface BingoCallListDropdownByUser {
  Call_List_ID: number;
  Game_ID?: number | null;
  User_ID?: number | null;
}

/** Summary block from `GET …/Get_Existing_Cards_byUserID/{User_ID}`. */
export interface BingoExistingCardsSummary {
  User_ID: number;
  Total_Cards: number;
  Total_CallLists: number;
  Total_Innings: number;
  Total_Winners: number;
  Total_NonWinners: number;
  Win_Rate_Pct: number;
  Total_Printed: number;
  Print_Rate_Pct: number;
  Total_Named_Players: number;
  Total_PlayCount: number;
  Avg_PlayCount: number;
  Max_PlayCount: number;
  First_Card_Created: string | null;
  Last_Card_Created: string | null;
  Last_Printed: string | null;
}

/** Per-inning stats from existing-cards lookup APIs. */
export interface BingoExistingCardsInningBreakdown {
  Inning: number;
  Card_Count: number;
  Winner_Count: number;
  NonWinner_Count: number;
  Printed_Count: number;
  Win_Rate_Pct: number;
}

/** Card row from existing-cards lookup APIs (`CardDetails`). */
export interface BingoExistingCardDetail {
  Card_ID: number;
  User_ID: number | null;
  Game_ID: number | null;
  Call_List_ID: number;
  Inning: number;
  Card_Date_Create: string | null;
  Card_PlayerName: string | null;
  Card_PlayerEmail: string | null;
  PlayCount: number;
  Card_IsWinner: boolean;
  Card_SeedKey: string | null;
  Card_PrintedAt: string | null;
  Call_List_Name: string | null;
}

/** `GET …/Get_Existing_Cards_byUserID/{User_ID}` */
export interface BingoExistingCardsByUser {
  Summary: BingoExistingCardsSummary;
  InningBreakdown: BingoExistingCardsInningBreakdown[];
  InningList: number[];
  CardDetails: BingoExistingCardDetail[];
}

/** Summary block from `GET …/Get_Existing_Cards_ByCLI/{Call_List_ID}`. */
export interface BingoExistingCardsByCliSummary {
  Call_List_ID: number;
  Total_Cards: number;
  Total_Innings: number;
  Total_Winners: number;
  Total_NonWinners: number;
  Win_Rate_Pct: number;
  Total_Printed: number;
  Print_Rate_Pct: number;
  Total_Named_Players: number;
  Total_PlayCount: number;
  Avg_PlayCount: number;
  Max_PlayCount: number;
  First_Card_Created: string | null;
  Last_Card_Created: string | null;
  Last_Printed: string | null;
}

/** `GET …/Get_Existing_Cards_ByCLI/{Call_List_ID}` */
export interface BingoExistingCardsByCli {
  Summary: BingoExistingCardsByCliSummary;
  InningBreakdown: BingoExistingCardsInningBreakdown[];
  InningList: number[];
  CardDetails: BingoExistingCardDetail[];
}

/** `GET …/Get_Call_List_Songs_by4Inning/{Game_ID}/{Call_List_ID}` */
export interface BingoCallListSongsBy4Inning {
  Inning1: BingoCallListSong[];
  Inning2: BingoCallListSong[];
  Inning3: BingoCallListSong[];
  Inning4: BingoCallListSong[];
}

export interface CallListBuildResult {
  master: BingoCallListMaster;
  songs: BingoCallListSong[];
}

export interface BingoInsertNewGame {
  User_ID: number;
  Call_List_ID: number;
  Game_Number: number;
  Game_Inning: number;
  Game_Name: string;
  Game_StartTime: string;
  Game_EndTime?: string | null;
  Game_WinPattern: string;
  Game_WinnerCard_ID: number;
  Game_Status: string;
}

export interface BingoInsertNewGameResult {
  New_Game_ID: number;
  Message: string;
}

/** Body for `PUT …/Bingo/Game/Update_Game_byGID`. */
export interface BingoUpdateGameByGid {
  Game_ID: number;
  Call_List_ID: number;
  Game_Number: number;
  Game_Inning: number;
  Game_Name: string;
  Game_StartTime: string;
  Game_EndTime?: string | null;
  Game_WinPattern: string;
  Game_WinnerCard_ID: number;
  Game_Status: string;
}

/** Response from `PUT …/Bingo/Game/Update_Game_byGID`. */
export interface BingoUpdateGameByGidResult {
  Success: boolean;
  Message: string;
  Game_ID: number;
  ErrorNumber: number | null;
  ErrorLine: number | null;
}

/** Defaults for `GenerateBingoCards_From_CLSongs` query params (production API). */
export const BINGO_GENERATE_CARDS_DEFAULT_CARD_COUNT = 70;
export const BINGO_GENERATE_CARDS_DEFAULT_PLAYLIST_SIZE = 25;

/** Query options for `POST …/GenerateBingoCards_From_CLSongs/{callListId}/{gameId}/{inning}`. */
export interface BingoGenerateBingoCardsFromClSongsOptions {
  cardCount?: number;
  playlistSize?: number;
  /** Query param `genre` (e.g. Pop, Rock). */
  genre?: string;
}

/**
 * Response from `POST …/GenerateBingoCards_From_CLSongs/{callListId}/{gameId}/{inning}`.
 * Example 200 body: CardsGenerated, User_ID, Game_ID, Game_Number, Call_List_ID, Inning,
 * SongPoolSize, PlaylistSize, HotSongsInPlaylist, GuaranteedWinnerNote.
 */
export interface BingoGenerateBingoCardsFromClSongsResult {
  CardsGenerated: number;
  User_ID: number;
  Game_ID: number;
  Game_Number: number;
  Call_List_ID: number;
  Inning: number;
  SongPoolSize: number;
  PlaylistSize: number;
  HotSongsInPlaylist: number;
  GuaranteedWinnerNote: string;
}

/** Row from `GET …/Bingo/Game/Get_Latest_Games_by_UserID/{User_ID}?topN={n}`. */
export interface BingoLatestGame {
  Game_ID: number;
  Game_Number: number;
  Game_Inning: number;
  Game_Name: string;
  Game_Status: string;
  Game_StartTime: string | null;
  Game_EndTime: string | null;
  Game_WinPattern: string | null;
  Game_WinnerCard_ID: number | null;
  Game_CreatedAt: string | null;
  Call_List_ID: number;
  Call_List_Name: string | null;
  Call_List_Genre: string | null;
  Call_List_Decade: string | null;
}
