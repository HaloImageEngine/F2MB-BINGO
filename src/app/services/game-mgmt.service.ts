import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  BingoCheckCardsGameSummaryRow,
  BingoCheckCardsInningSummaryRow,
  BingoCheckCardsResult,
  BingoCheckCardsSongCountRow
} from '../models/bingo-check-cards.model';
import {
  BingoCallListWinnerByUserRow,
  BingoGameWinnerResultRow
} from '../models/bingo-game-winner-result.model';
import {
  BingoGameSetupCallListMasterRow,
  BingoGameSetupCallListSongsByInningRow,
  BingoGameSetupCardsByInningRow,
  BingoGameSetupCheckResult,
  BingoGameSetupGameNightRow,
  BingoGameSetupGameRow,
  BingoGameSetupHeader,
  BingoGameSetupInningComparisonRow,
  BingoGameSetupOverallSummary,
  BingoGameSetupValidationRow
} from '../models/bingo-game-setup.model';

@Injectable({ providedIn: 'root' })
export class GameMgmtService {
  private readonly http = inject(HttpClient);
  private readonly checkGameSetupApiBaseUrl = environment.bingoCheckGameSetupApiBaseUrl;
  private readonly checkCardsApiBaseUrl = environment.bingoCheckCardsApiBaseUrl;
  private readonly getGameWinnersResultsApiBaseUrl = environment.bingoGetGameWinnersResultsApiBaseUrl;
  private readonly getCallListWinnerByUserIdApiBaseUrl =
    environment.bingoGetCallListWinnerByUserIdApiBaseUrl;

  /**
   * `GET …/Check/Check_GameSetup/{gameId}` (optional Call_List_ID, Inning query params).
   */
  checkGameSetup(
    gameId: number,
    callListId?: number | null,
    inning?: number | null
  ): Observable<BingoGameSetupCheckResult> {
    let params = new HttpParams();
    if (callListId !== null && callListId !== undefined && callListId > 0) {
      params = params.set('Call_List_ID', String(callListId));
    }
    if (inning !== null && inning !== undefined && inning > 0) {
      params = params.set('Inning', String(inning));
    }

    return this.http
      .get<unknown>(`${this.checkGameSetupApiBaseUrl}/${gameId}`, { params })
      .pipe(map(response => this.normalizeCheckGameSetup(response, gameId)));
  }

  /** `GET …/Bingo/Check_Cards_byUser_ID/{userId}` */
  checkCards(userId: number): Observable<BingoCheckCardsResult> {
    return this.http
      .get<unknown>(`${this.checkCardsApiBaseUrl}/${userId}`)
      .pipe(map(response => this.normalizeCheckCards(response)));
  }

  /**
   * `GET …/Get_Game_Winners_Results/{Game_ID}` — production currently only serves Game_ID 1.
   */
  getGameWinnersResults(): Observable<BingoGameWinnerResultRow[]> {
    const gameId = environment.bingoGetGameWinnersResultsGameId;
    return this.http
      .get<unknown>(`${this.getGameWinnersResultsApiBaseUrl}/${gameId}`)
      .pipe(map(response => this.normalizeGameWinnersResults(response)));
  }

  /**
   * `GET …/Get_CallListWinner_by_UserID/{User_ID}?gameId={Game_ID}` — optional `gameId` filter.
   */
  getCallListWinnerByUserId(
    userId: number,
    gameId?: number | null
  ): Observable<BingoCallListWinnerByUserRow[]> {
    let params = new HttpParams();
    if (gameId !== null && gameId !== undefined && gameId > 0) {
      params = params.set('gameId', String(gameId));
    }

    return this.http
      .get<unknown>(`${this.getCallListWinnerByUserIdApiBaseUrl}/${userId}`, { params })
      .pipe(map(response => this.normalizeCallListWinnerByUser(response)));
  }

  private normalizeCallListWinnerByUser(response: unknown): BingoCallListWinnerByUserRow[] {
    const list = this.extractArray(response);
    return list.map(item => {
      const row = this.unwrapRecord(item) ?? {};
      const winningCard =
        this.asNumber(row['Call_List_WinningCard'] ?? row['callListWinningCard']) ?? 0;
      const cardId = this.asNumber(row['Card_ID'] ?? row['cardId']) ?? winningCard;

      return {
        Call_List_Winner_ID: this.asNumber(row['Call_List_Winner_ID'] ?? row['callListWinnerId']) ?? 0,
        Game_ID: this.asNumber(row['Game_ID'] ?? row['gameId']) ?? 0,
        Call_List_ID: this.asNumber(row['Call_List_ID'] ?? row['callListId']) ?? 0,
        Inning: this.asNumber(row['Inning'] ?? row['inning']) ?? 0,
        Call_List_Name: this.asNullableString(row['Call_List_Name'] ?? row['callListName']),
        Game_Number: this.asNullableNumber(row['Game_Number'] ?? row['gameNumber']),
        Game_Name: this.asNullableString(row['Game_Name'] ?? row['gameName']),
        Game_Status: this.asNullableString(row['Game_Status'] ?? row['gameStatus']),
        Call_List_WinningCard: winningCard,
        Card_ID: cardId,
        Card_PlayerName: this.asNullableString(row['Card_PlayerName'] ?? row['cardPlayerName']),
        Card_PlayerEmail: this.asNullableString(row['Card_PlayerEmail'] ?? row['cardPlayerEmail']),
        Call_List_WinningPatter: this.asNullableString(
          row['Call_List_WinningPatter'] ??
            row['Call_List_WinningPattern'] ??
            row['callListWinningPatter'] ??
            row['callListWinningPattern']
        ),
        NumofSongsCalled: this.asNullableNumber(row['NumofSongsCalled'] ?? row['numOfSongsCalled']),
        Call_List_CreatedAt: this.asNullableString(row['Call_List_CreatedAt'] ?? row['callListCreatedAt']),
        Call_List_UpdatedAt: this.asNullableString(row['Call_List_UpdatedAt'] ?? row['callListUpdatedAt'])
      };
    });
  }

  private normalizeGameWinnersResults(response: unknown): BingoGameWinnerResultRow[] {
    const list = this.extractArray(response);
    return list.map(item => {
      const row = this.unwrapRecord(item) ?? {};
      return {
        Call_List_Winner_ID: this.asNumber(row['Call_List_Winner_ID'] ?? row['callListWinnerId']) ?? 0,
        Game_ID: this.asNumber(row['Game_ID'] ?? row['gameId']) ?? 0,
        Call_List_ID: this.asNumber(row['Call_List_ID'] ?? row['callListId']) ?? 0,
        Inning: this.asNumber(row['Inning'] ?? row['inning']) ?? 0,
        Call_List_WinningCard:
          this.asNumber(row['Call_List_WinningCard'] ?? row['callListWinningCard']) ?? 0,
        Call_List_WinningPatter: this.asNullableString(
          row['Call_List_WinningPatter'] ??
            row['Call_List_WinningPattern'] ??
            row['callListWinningPatter'] ??
            row['callListWinningPattern']
        ),
        Call_List_CreatedAt: this.asNullableString(row['Call_List_CreatedAt'] ?? row['callListCreatedAt']),
        Call_List_UpdatedAt: this.asNullableString(row['Call_List_UpdatedAt'] ?? row['callListUpdatedAt']),
        NumofSongsCalled: this.asNullableNumber(row['NumofSongsCalled'] ?? row['numOfSongsCalled'])
      };
    });
  }

  private normalizeCheckCards(response: unknown): BingoCheckCardsResult {
    const record = this.unwrapRecord(response) ?? {};

    return {
      GameSummary: this.normalizeCheckCardsGameSummary(record['GameSummary'] ?? record['gameSummary']),
      InningSummary: this.normalizeCheckCardsInningSummary(
        record['InningSummary'] ?? record['inningSummary']
      ),
      SongCounts: this.normalizeCheckCardsSongCounts(record['SongCounts'] ?? record['songCounts'])
    };
  }

  private normalizeCheckCardsGameSummary(value: unknown): BingoCheckCardsGameSummaryRow[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.map(item => {
      const row = this.unwrapRecord(item) ?? {};
      return {
        Game_ID: this.asNumber(row['Game_ID'] ?? row['gameId']) ?? 0,
        Call_List_ID: this.asNullableNumber(row['Call_List_ID'] ?? row['callListId']),
        Game_Number: this.asNullableNumber(row['Game_Number'] ?? row['gameNumber']),
        Game_Name: this.asNullableString(row['Game_Name'] ?? row['gameName']),
        Game_Status: this.asNullableString(row['Game_Status'] ?? row['gameStatus']),
        Game_Inning: this.asNullableNumber(row['Game_Inning'] ?? row['gameInning']),
        Game_StartTime: this.asNullableString(row['Game_StartTime'] ?? row['gameStartTime']),
        Game_EndTime: this.asNullableString(row['Game_EndTime'] ?? row['gameEndTime']),
        Total_Cards: this.asNullableNumber(row['Total_Cards'] ?? row['totalCards']),
        Total_Winners: this.asNullableNumber(row['Total_Winners'] ?? row['totalWinners']),
        Total_NonWinners: this.asNullableNumber(row['Total_NonWinners'] ?? row['totalNonWinners']),
        Win_Rate_Pct: this.asNullableNumber(row['Win_Rate_Pct'] ?? row['winRatePct']),
        Total_Printed: this.asNullableNumber(row['Total_Printed'] ?? row['totalPrinted']),
        Print_Rate_Pct: this.asNullableNumber(row['Print_Rate_Pct'] ?? row['printRatePct']),
        Total_PlayCount: this.asNullableNumber(row['Total_PlayCount'] ?? row['totalPlayCount']),
        Avg_PlayCount: this.asNullableNumber(row['Avg_PlayCount'] ?? row['avgPlayCount']),
        First_Card_Created: this.asNullableString(row['First_Card_Created'] ?? row['firstCardCreated']),
        Last_Card_Created: this.asNullableString(row['Last_Card_Created'] ?? row['lastCardCreated'])
      };
    });
  }

  private normalizeCheckCardsInningSummary(value: unknown): BingoCheckCardsInningSummaryRow[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.map(item => {
      const row = this.unwrapRecord(item) ?? {};
      return {
        Game_ID: this.asNumber(row['Game_ID'] ?? row['gameId']) ?? 0,
        Game_Number: this.asNullableNumber(row['Game_Number'] ?? row['gameNumber']),
        Game_Name: this.asNullableString(row['Game_Name'] ?? row['gameName']),
        Game_Status: this.asNullableString(row['Game_Status'] ?? row['gameStatus']),
        Call_List_ID: this.asNullableNumber(row['Call_List_ID'] ?? row['callListId']),
        Inning: this.asNumber(row['Inning'] ?? row['inning']) ?? 0,
        Card_Count: this.asNullableNumber(row['Card_Count'] ?? row['cardCount']),
        Song_Count: this.asNullableNumber(row['Song_Count'] ?? row['songCount'])
      };
    });
  }

  private normalizeCheckCardsSongCounts(value: unknown): BingoCheckCardsSongCountRow[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.map(item => {
      const row = this.unwrapRecord(item) ?? {};
      return {
        Game_ID: this.asNumber(row['Game_ID'] ?? row['gameId']) ?? 0,
        Game_Number: this.asNullableNumber(row['Game_Number'] ?? row['gameNumber']),
        Game_Name: this.asNullableString(row['Game_Name'] ?? row['gameName']),
        Game_Status: this.asNullableString(row['Game_Status'] ?? row['gameStatus']),
        Call_List_ID: this.asNullableNumber(row['Call_List_ID'] ?? row['callListId']),
        Call_List_Name: this.asNullableString(row['Call_List_Name'] ?? row['callListName']),
        Total_Songs_In_CallList: this.asNullableNumber(
          row['Total_Songs_In_CallList'] ?? row['totalSongsInCallList']
        ),
        Inning: this.asNumber(row['Inning'] ?? row['inning']) ?? 0,
        Songs_In_Inning: this.asNullableNumber(row['Songs_In_Inning'] ?? row['songsInInning']),
        Songs_Called: this.asNullableNumber(row['Songs_Called'] ?? row['songsCalled']),
        Songs_Not_Called: this.asNullableNumber(row['Songs_Not_Called'] ?? row['songsNotCalled'])
      };
    });
  }

  private normalizeCheckGameSetup(response: unknown, fallbackGameId: number): BingoGameSetupCheckResult {
    const record = this.unwrapRecord(response) ?? {};

    return {
      Header: this.normalizeHeader(record['Header'] ?? record['header'], fallbackGameId),
      GameNightRows: this.normalizeGameNightRows(record['GameNightRows'] ?? record['gameNightRows']),
      GameRows: this.normalizeGameRows(record['GameRows'] ?? record['gameRows']),
      CallListMasterRows: this.normalizeCallListMasterRows(
        record['CallListMasterRows'] ?? record['callListMasterRows']
      ),
      CallListSongsByInning: this.normalizeCallListSongsByInning(
        record['CallListSongsByInning'] ?? record['callListSongsByInning']
      ),
      CardsByInning: this.normalizeCardsByInning(record['CardsByInning'] ?? record['cardsByInning']),
      InningComparisons: this.normalizeInningComparisons(
        record['InningComparisons'] ?? record['inningComparisons']
      ),
      OverallSummary: this.normalizeOverallSummary(record['OverallSummary'] ?? record['overallSummary']),
      ValidationReport: this.normalizeValidationReport(record['ValidationReport'] ?? record['validationReport'])
    };
  }

  private normalizeHeader(value: unknown, fallbackGameId: number): BingoGameSetupHeader {
    const row = this.unwrapRecord(value) ?? {};
    const userIdFound = this.asNullableNumber(
      row['User_ID_Found'] ?? row['userIdFound'] ?? row['GN_ID_Found'] ?? row['gnIdFound']
    );

    return {
      Game_ID_Checked: this.asNumber(row['Game_ID_Checked'] ?? row['gameIdChecked']) ?? fallbackGameId,
      User_ID_Found: userIdFound,
      GN_ID_Found: this.asNullableNumber(row['GN_ID_Found'] ?? row['gnIdFound']),
      Call_List_ID_Found: this.asNullableNumber(row['Call_List_ID_Found'] ?? row['callListIdFound']),
      Check_Timestamp: this.asNullableString(row['Check_Timestamp'] ?? row['checkTimestamp'])
    };
  }

  private normalizeGameNightRows(value: unknown): BingoGameSetupGameNightRow[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.map(item => {
      const row = this.unwrapRecord(item) ?? {};
      return {
        Table_Name: this.asString(row['Table_Name'] ?? row['tableName']) ?? 'Game (User)',
        GN_ID: this.asNullableNumber(row['GN_ID'] ?? row['gnId'] ?? row['User_ID'] ?? row['userId']),
        User_ID: this.asNullableNumber(row['User_ID'] ?? row['userId'] ?? row['GN_ID']),
        Game_ID: this.asNullableNumber(row['Game_ID'] ?? row['gameId']),
        Game_Number: this.asNullableNumber(row['Game_Number'] ?? row['gameNumber']),
        Game_Name: this.asNullableString(row['Game_Name'] ?? row['gameName']),
        Game_Status: this.asNullableString(row['Game_Status'] ?? row['gameStatus']),
        Game_StartTime: this.asNullableString(row['Game_StartTime'] ?? row['gameStartTime']),
        Game_CreatedAt: this.asNullableString(row['Game_CreatedAt'] ?? row['gameCreatedAt']),
        GN_Name: this.asNullableString(row['GN_Name'] ?? row['gnName']),
        GN_Date: this.asNullableString(row['GN_Date'] ?? row['gnDate']),
        GN_Venue: this.asNullableString(row['GN_Venue'] ?? row['gnVenue']),
        GN_HostName: this.asNullableString(row['GN_HostName'] ?? row['gnHostName']),
        GN_IsActive: this.asNullableBoolean(row['GN_IsActive'] ?? row['gnIsActive']),
        Status: this.asNullableString(row['Status'] ?? row['status'])
      };
    });
  }

  private normalizeGameRows(value: unknown): BingoGameSetupGameRow[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.map(item => {
      const row = this.unwrapRecord(item) ?? {};
      return {
        Table_Name: this.asString(row['Table_Name'] ?? row['tableName']) ?? 'Game',
        Game_ID: this.asNumber(row['Game_ID'] ?? row['gameId']) ?? 0,
        GN_ID: this.asNullableNumber(row['GN_ID'] ?? row['gnId'] ?? row['User_ID'] ?? row['userId']),
        User_ID: this.asNullableNumber(row['User_ID'] ?? row['userId'] ?? row['GN_ID']),
        Call_List_ID: this.asNullableNumber(row['Call_List_ID'] ?? row['callListId']),
        Game_Inning: this.asNullableNumber(row['Game_Inning'] ?? row['gameInning']),
        Game_Number: this.asNullableNumber(row['Game_Number'] ?? row['gameNumber']),
        Game_Name: this.asNullableString(row['Game_Name'] ?? row['gameName']),
        Game_Status: this.asNullableString(row['Game_Status'] ?? row['gameStatus']),
        Game_WinPattern: this.asNullableString(row['Game_WinPattern'] ?? row['gameWinPattern']),
        Game_StartTime: this.asNullableString(row['Game_StartTime'] ?? row['gameStartTime']),
        Game_EndTime: this.asNullableString(row['Game_EndTime'] ?? row['gameEndTime']),
        Status: this.asNullableString(row['Status'] ?? row['status'])
      };
    });
  }

  private normalizeCallListMasterRows(value: unknown): BingoGameSetupCallListMasterRow[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.map(item => {
      const row = this.unwrapRecord(item) ?? {};
      return {
        Table_Name: this.asString(row['Table_Name'] ?? row['tableName']) ?? 'CallList_Master',
        Call_List_ID: this.asNumber(row['Call_List_ID'] ?? row['callListId']) ?? 0,
        Game_ID: this.asNullableNumber(row['Game_ID'] ?? row['gameId']),
        Inning: this.asNumber(row['Inning'] ?? row['inning']) ?? 0,
        Call_List_Name: this.asNullableString(row['Call_List_Name'] ?? row['callListName']),
        Call_List_Genre: this.asNullableString(row['Call_List_Genre'] ?? row['callListGenre']),
        Call_List_Decade: this.asNullableString(row['Call_List_Decade'] ?? row['callListDecade']),
        Call_List_Era: this.asNullableString(row['Call_List_Era'] ?? row['callListEra']),
        Call_List_SongCount: this.asNullableNumber(row['Call_List_SongCount'] ?? row['callListSongCount']),
        Call_List_IsActive: this.asNullableBoolean(row['Call_List_IsActive'] ?? row['callListIsActive']),
        Status: this.asNullableString(row['Status'] ?? row['status'])
      };
    });
  }

  private normalizeCallListSongsByInning(value: unknown): BingoGameSetupCallListSongsByInningRow[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.map(item => {
      const row = this.unwrapRecord(item) ?? {};
      return {
        Table_Name: this.asString(row['Table_Name'] ?? row['tableName']) ?? 'CallList_Songs',
        Inning: this.asNumber(row['Inning'] ?? row['inning']) ?? 0,
        Song_Count: this.asNullableNumber(row['Song_Count'] ?? row['songCount']),
        Genre_Count: this.asNullableNumber(row['Genre_Count'] ?? row['genreCount']),
        Decade_Count: this.asNullableNumber(row['Decade_Count'] ?? row['decadeCount']),
        First_Song: this.asNullableString(row['First_Song'] ?? row['firstSong']),
        Last_Song: this.asNullableString(row['Last_Song'] ?? row['lastSong']),
        Explicit_Count: this.asNullableNumber(row['Explicit_Count'] ?? row['explicitCount'])
      };
    });
  }

  private normalizeCardsByInning(value: unknown): BingoGameSetupCardsByInningRow[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.map(item => {
      const row = this.unwrapRecord(item) ?? {};
      return {
        Table_Name: this.asString(row['Table_Name'] ?? row['tableName']) ?? 'Cards',
        Inning: this.asNumber(row['Inning'] ?? row['inning']) ?? 0,
        Total_Cards: this.asNullableNumber(row['Total_Cards'] ?? row['totalCards']),
        Unique_Card_IDs: this.asNullableNumber(row['Unique_Card_IDs'] ?? row['uniqueCardIds']),
        Unique_Players: this.asNullableNumber(row['Unique_Players'] ?? row['uniquePlayers']),
        Winner_Count: this.asNullableNumber(row['Winner_Count'] ?? row['winnerCount']),
        First_Card_Created: this.asNullableString(row['First_Card_Created'] ?? row['firstCardCreated']),
        Last_Card_Created: this.asNullableString(row['Last_Card_Created'] ?? row['lastCardCreated'])
      };
    });
  }

  private normalizeInningComparisons(value: unknown): BingoGameSetupInningComparisonRow[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.map(item => {
      const row = this.unwrapRecord(item) ?? {};
      return {
        Inning: this.asNumber(row['Inning'] ?? row['inning']) ?? 0,
        Has_CallList_Master: this.asNullableString(row['Has_CallList_Master'] ?? row['hasCallListMaster']),
        Has_Songs: this.asNullableString(row['Has_Songs'] ?? row['hasSongs']),
        Song_Count: this.asNullableNumber(row['Song_Count'] ?? row['songCount']),
        Has_Cards: this.asNullableString(row['Has_Cards'] ?? row['hasCards']),
        Card_Count: this.asNullableNumber(row['Card_Count'] ?? row['cardCount']),
        Inning_Status: this.asNullableString(row['Inning_Status'] ?? row['inningStatus'])
      };
    });
  }

  private normalizeOverallSummary(value: unknown): BingoGameSetupOverallSummary {
    const row = this.unwrapRecord(value) ?? {};
    const userId = this.asNullableNumber(row['User_ID'] ?? row['userId'] ?? row['GN_ID'] ?? row['gnId']);

    return {
      Game_ID: this.asNullableNumber(row['Game_ID'] ?? row['gameId']),
      User_ID: userId,
      GN_ID: this.asNullableNumber(row['GN_ID'] ?? row['gnId']),
      Call_List_ID: this.asNullableNumber(row['Call_List_ID'] ?? row['callListId']),
      User_Game_Count: this.asNullableNumber(
        row['User_Game_Count'] ?? row['userGameCount'] ?? row['GameNight_Records'] ?? row['gameNightRecords']
      ),
      GameNight_Records: this.asNullableNumber(row['GameNight_Records'] ?? row['gameNightRecords']),
      Game_Records: this.asNullableNumber(row['Game_Records'] ?? row['gameRecords']),
      CallList_Master_Innings: this.asNullableNumber(
        row['CallList_Master_Innings'] ?? row['callListMasterInnings']
      ),
      Songs_Innings: this.asNullableNumber(row['Songs_Innings'] ?? row['songsInnings']),
      Cards_Innings: this.asNullableNumber(row['Cards_Innings'] ?? row['cardsInnings']),
      Total_Songs: this.asNullableNumber(row['Total_Songs'] ?? row['totalSongs']),
      Total_Cards: this.asNullableNumber(row['Total_Cards'] ?? row['totalCards']),
      Inning_Sync_Status: this.asNullableString(row['Inning_Sync_Status'] ?? row['inningSyncStatus'])
    };
  }

  private normalizeValidationReport(value: unknown): BingoGameSetupValidationRow[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.map(item => {
      const row = this.unwrapRecord(item) ?? {};
      return {
        Check_Number: this.asNumber(row['Check_Number'] ?? row['checkNumber']) ?? 0,
        Component: this.asNullableString(row['Component'] ?? row['component']),
        Status: this.asNullableString(row['Status'] ?? row['status']),
        Message: this.asNullableString(row['Message'] ?? row['message'])
      };
    });
  }

  private extractArray(response: unknown): unknown[] {
    if (Array.isArray(response)) {
      return response;
    }

    const record = this.unwrapRecord(response);
    if (!record) {
      return [];
    }

    const keys = ['value', 'Value', 'data', 'Data', 'items', 'Items', 'result', 'Result'];
    for (const key of keys) {
      const candidate = record[key];
      if (Array.isArray(candidate)) {
        return candidate;
      }
    }

    return [];
  }

  private unwrapRecord(value: unknown): Record<string, unknown> | null {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === 'object' && !Array.isArray(value)) {
      const record = value as Record<string, unknown>;
      const keys = ['value', 'Value', 'data', 'Data', 'result', 'Result', 'payload', 'Payload'];
      for (const key of keys) {
        const nested = this.unwrapRecord(record[key]);
        if (nested) {
          return nested;
        }
      }
      return record;
    }
    return null;
  }

  private asString(value: unknown): string | null {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
    return null;
  }

  private asNullableString(value: unknown): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    }
    return String(value);
  }

  private asNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  private asNullableNumber(value: unknown): number | null {
    const n = this.asNumber(value);
    return n === null ? null : n;
  }

  private asNullableBoolean(value: unknown): boolean | null {
    if (typeof value === 'boolean') {
      return value;
    }
    if (value === 'true' || value === 1 || value === '1') {
      return true;
    }
    if (value === 'false' || value === 0 || value === '0') {
      return false;
    }
    return null;
  }
}
