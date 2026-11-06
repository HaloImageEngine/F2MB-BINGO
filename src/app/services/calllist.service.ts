import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, defer, forkJoin, map, Observable, of, switchMap, tap, throwError } from 'rxjs';

import { environment } from '../../environments/environment';
import { CardCountByGameCallList } from '../models/card-count.model';
import {
  BingoCallListCreate,
  BingoCallListDropdownByUser,
  BingoExistingCardsByCli,
  BingoExistingCardsByCliSummary,
  BingoExistingCardsByUser,
  BingoExistingCardsInningBreakdown,
  BingoExistingCardsSummary,
  BingoExistingCardDetail,
  BingoCallListMaster,
  BingoCallListMasterUpdate,
  BingoCallListMasterUpdateResult,
  BingoCallListSong,
  BingoCallListSongInsert,
  BingoCallListSongRemoveResult,
  BingoCallListSongsCompleteResult,
  BINGO_GENERATE_CARDS_DEFAULT_CARD_COUNT,
  BINGO_GENERATE_CARDS_DEFAULT_PLAYLIST_SIZE,
  BingoGenerateBingoCardsFromClSongsOptions,
  BingoGenerateBingoCardsFromClSongsResult,
  BingoInsertNewGame,
  BingoInsertNewGameResult,
  BingoLatestGame,
  BingoUpdateGameByGid,
  BingoUpdateGameByGidResult,
  CallListBuildResult
} from '../models/bingo-game.model';

@Injectable({ providedIn: 'root' })
export class CallListService {
  private readonly http = inject(HttpClient);
  private readonly callListMasterApiUrl = environment.bingoCallListMasterApiUrl;
  private readonly callListSongsApiUrl = environment.bingoCallListSongsApiUrl;
  private readonly insertCallListMasterApiUrl = environment.bingoInsertCallListMasterApiUrl;
  private readonly updateCallListMasterByCallListIdApiUrl =
    environment.bingoUpdateCallListMasterByCallListIdApiUrl;
  private readonly insertCallListSongApiUrl = environment.bingoInsertCallListSongApiUrl;
  private readonly removeCallListSongApiUrl = environment.bingoRemoveCallListSongApiUrl;
  private readonly completeCallListSongsByCallListAndInningApiUrl =
    environment.bingoCompleteCallListSongsByCallListAndInningApiUrl;
  private readonly insertCallListSongsJsonApiUrl = environment.bingoInsertCallListSongsJsonApiUrl;
  private readonly maxCallListIdApiUrl = environment.bingoMaxCallListIdApiUrl;
  private readonly maxGameIdApiUrl = environment.bingoMaxGameIdApiUrl;
  private readonly dropDownCallListByUserApiUrl = environment.bingoDropDownCallListByUserApiUrl;
  private readonly existingCardsByUserApiUrl = environment.bingoExistingCardsByUserApiUrl;
  private readonly existingCardsByCliApiUrl = environment.bingoExistingCardsByCliApiUrl;
  private readonly insertNewGameApiUrl = environment.bingoInsertNewGameApiUrl;
  private readonly latestGamesByUserApiUrl = environment.bingoLatestGamesByUserApiUrl;
  private readonly updateGameByGidApiUrl = environment.bingoUpdateGameByGidApiUrl;
  private readonly generateBingoCardsFromClSongsApiUrl =
    environment.bingoGenerateBingoCardsFromClSongsApiUrl;
  private readonly checkCardCountByGameCallListApiUrl =
    environment.bingoCheckCardCountByGameCallListApiUrl;

  getMaxCallListId(userId?: number | null): Observable<number> {
    const url = userId && userId > 0 ? `${this.maxCallListIdApiUrl}/${userId}` : this.maxCallListIdApiUrl;
    return this.http.get<unknown>(url).pipe(
      map(response => {
        const arr = this.unwrapArray(response);
        const record = this.asRecord(arr[0]);
        return this.asNullableNumber(record?.['Max_CallList_ID']) ?? 0;
      })
    );
  }

  getMaxGameId(userId?: number | null): Observable<number> {
    const url = userId && userId > 0 ? `${this.maxGameIdApiUrl}/${userId}` : this.maxGameIdApiUrl;
    return this.http.get<unknown>(url).pipe(
      map(response => this.parseMaxGameId(response))
    );
  }

  getDropDownCallListByUserId(userId: number): Observable<BingoCallListDropdownByUser[]> {
    if (!Number.isInteger(userId) || userId <= 0) {
      return of([]);
    }

    return this.http.get<unknown>(`${this.dropDownCallListByUserApiUrl}/${userId}`).pipe(
      map(response => this.normalizeCallListDropdownByUser(response)),
      catchError(() => this.loadCallListDropdownFallback(userId))
    );
  }

  private normalizeCallListDropdownByUser(response: unknown): BingoCallListDropdownByUser[] {
    return this.unwrapArray(response)
      .map(item => this.mapCallListDropdownByUser(item))
      .filter((item): item is BingoCallListDropdownByUser => item !== null);
  }

  private loadCallListDropdownFallback(userId: number): Observable<BingoCallListDropdownByUser[]> {
    return this.getCallListMasters(userId).pipe(
      map(masters =>
        masters
          .filter(master => master.Call_List_ID > 0)
          .map(master => ({
            Call_List_ID: master.Call_List_ID,
            User_ID: userId
          }))
      ),
      catchError(() =>
        this.getExistingCardsByUserId(userId).pipe(
          map(existing => this.dropdownFromExistingCards(existing, userId))
        )
      ),
      catchError(() => of([]))
    );
  }

  private dropdownFromExistingCards(
    existing: BingoExistingCardsByUser,
    userId: number
  ): BingoCallListDropdownByUser[] {
    const seen = new Set<number>();

    return existing.CardDetails.filter(card => {
      const callListId = card.Call_List_ID;
      if (!Number.isInteger(callListId) || callListId <= 0 || seen.has(callListId)) {
        return false;
      }

      seen.add(callListId);
      return true;
    }).map(card => ({
      Call_List_ID: card.Call_List_ID,
      Game_ID: card.Game_ID ?? null,
      User_ID: userId
    }));
  }

  /** Unique Call_List_ID values, newest first — for select dropdowns bound to Get_DropDown_CallList_ByUserID. */
  static callListIdsFromDropdown(rows: BingoCallListDropdownByUser[]): number[] {
    const seen = new Set<number>();
    const ids: number[] = [];

    for (const row of rows) {
      const id = row.Call_List_ID;
      if (!Number.isInteger(id) || id <= 0 || seen.has(id)) {
        continue;
      }
      seen.add(id);
      ids.push(id);
    }

    return ids.sort((left, right) => right - left);
  }

  /**
   * `GET …/Bingo/Bingo/Check_CardCount_By_Game_CallList?request.call_List_ID=&request.game_ID=&request.inning=`
   * Returns how many cards already exist for the game / call list / inning.
   */
  checkCardCountByGameCallList(
    callListId: number,
    gameId: number,
    inning: number
  ): Observable<CardCountByGameCallList> {
    const params = new HttpParams()
      .set('request.call_List_ID', String(callListId))
      .set('request.game_ID', String(gameId))
      .set('request.inning', String(inning));

    return this.http.get<CardCountByGameCallList>(this.checkCardCountByGameCallListApiUrl, { params });
  }

  /**
   * `POST …/GenerateBingoCards_From_CLSongs/{callListId}/{gameId}/{inning}?cardCount=&playlistSize=&genre=`
   * Builds bingo cards from call-list songs for the given game/inning.
   */
  generateBingoCardsFromClSongs(
    callListId: number,
    gameId: number,
    inning: number,
    options: BingoGenerateBingoCardsFromClSongsOptions = {}
  ): Observable<BingoGenerateBingoCardsFromClSongsResult> {
    const cardCount =
      Number.isInteger(options.cardCount) && options.cardCount! > 0
        ? options.cardCount!
        : BINGO_GENERATE_CARDS_DEFAULT_CARD_COUNT;
    const playlistSize =
      Number.isInteger(options.playlistSize) && options.playlistSize! > 0
        ? options.playlistSize!
        : BINGO_GENERATE_CARDS_DEFAULT_PLAYLIST_SIZE;

    let params = new HttpParams()
      .set('cardCount', String(cardCount))
      .set('playlistSize', String(playlistSize));

    const genre = options.genre?.trim();
    if (genre) {
      params = params.set('genre', genre);
    }

    return this.http
      .post<unknown>(
        `${this.generateBingoCardsFromClSongsApiUrl}/${callListId}/${gameId}/${inning}`,
        null,
        { params }
      )
      .pipe(
        tap(response => {
          console.group('GenerateBingoCards_From_CLSongs');
          console.log('callListId', callListId, 'gameId', gameId, 'inning', inning);
          console.log('cardCount', cardCount, 'playlistSize', playlistSize, 'genre', genre ?? '(none)');
          console.log('Response JSON', JSON.parse(JSON.stringify(response)));
          console.groupEnd();
        }),
        map(response => this.normalizeGenerateBingoCardsFromClSongs(response))
      );
  }

  /**
   * `PUT …/Bingo/Game/Update_Game_byGID`
   * Updates an existing game row (body includes `Game_ID`).
   */
  updateGameByGid(payload: BingoUpdateGameByGid): Observable<BingoUpdateGameByGidResult> {
    const body = this.toUpdateGameByGidApiPayload(payload);

    return this.http.put<unknown>(this.updateGameByGidApiUrl, body).pipe(
      tap(response => {
        console.group('Update_Game_byGID');
        console.log('URL', this.updateGameByGidApiUrl);
        console.log('Request JSON', JSON.parse(JSON.stringify(body)));
        console.log('Response JSON', JSON.parse(JSON.stringify(response)));
        console.groupEnd();
      }),
      map(response => this.normalizeUpdateGameByGidResult(response)),
      catchError((err: HttpErrorResponse) => throwError(() => this.wrapUpdateGameByGidHttpError(err)))
    );
  }

  /**
   * `GET …/Bingo/Game/Get_Latest_Games_by_UserID/{User_ID}?topN={n}`
   * Returns the most recent games for the user (newest first).
   */
  getLatestGamesByUserId(userId: number, topN = 10): Observable<BingoLatestGame[]> {
    if (!Number.isInteger(userId) || userId <= 0) {
      return of([]);
    }

    const top = Number.isInteger(topN) && topN > 0 ? topN : 10;
    const params = new HttpParams().set('topN', String(top));

    return this.http
      .get<unknown>(`${this.latestGamesByUserApiUrl}/${userId}`, { params })
      .pipe(map(response => this.normalizeLatestGames(response)));
  }

  getExistingCardsByUserId(userId: number): Observable<BingoExistingCardsByUser> {
    if (!Number.isInteger(userId) || userId <= 0) {
      return of(this.emptyExistingCardsByUser(userId));
    }

    return this.http.get<unknown>(`${this.existingCardsByUserApiUrl}/${userId}`).pipe(
      map(response => this.normalizeExistingCardsByUser(response, userId))
    );
  }

  /**
   * `GET …/Get_Existing_Cards_ByCLI/{Call_List_ID}`
   * Returns summary stats, inning breakdown, inning list, and card details for one call list.
   */
  getExistingCardsByCallListId(callListId: number): Observable<BingoExistingCardsByCli> {
    if (!Number.isInteger(callListId) || callListId <= 0) {
      return of(this.emptyExistingCardsByCli(callListId));
    }

    return this.http.get<unknown>(`${this.existingCardsByCliApiUrl}/${callListId}`).pipe(
      map(response => this.normalizeExistingCardsByCli(response, callListId))
    );
  }

  private parseMaxGameId(response: unknown): number {
    const fromRow = this.unwrapArray(response)
      .map(item => this.asNullableNumber(this.asRecord(item)?.['Max_Game_ID']))
      .find((id): id is number => id !== null);

    if (fromRow !== undefined) {
      return fromRow;
    }

    const record = this.asRecord(response);
    return this.asNullableNumber(record?.['Max_Game_ID']) ?? 0;
  }

  getCallListMasters(userId: number): Observable<BingoCallListMaster[]> {
    return this.http.get<unknown>(`${this.callListMasterApiUrl}/${userId}`).pipe(
      tap(response => {
        console.group('getCallListMasters raw response');
        console.log('response', response);
        console.groupEnd();
      }),
      map(response => this.normalizeCallListMasters(response)),
      tap(masters => {
        console.group('getCallListMasters normalized');
        console.log('count', masters.length);
        console.log('masters', masters);
        console.groupEnd();
      })
    );
  }

  getCallListSongs(callListId: number): Observable<BingoCallListSong[]> {
    return this.http.get<unknown>(`${this.callListSongsApiUrl}/${callListId}`).pipe(
      map(response => this.normalizeCallListSongs(response))
    );
  }

  /**
   * `POST …/Remove_CallList_Song/{callListId}/{inning}/{songId}`
   * `songId` is the library `Song_ID` (same as `BingoCallListSong.song_id` from GET).
   */
  removeCallListSong(
    callListId: number,
    inning: number,
    songId: number
  ): Observable<BingoCallListSongRemoveResult> {
    return this.http
      .post<unknown>(`${this.removeCallListSongApiUrl}/${callListId}/${inning}/${songId}`, null)
      .pipe(map(response => this.normalizeCallListSongRemove(response)));
  }

  /**
   * `POST …/Complete_CallList_Songs_by_CallListandInning/{callListId}/{inning}?genre={genre}`
   * Fills a call-list inning up to the target count (e.g. 70) with random songs for the genre.
   */
  completeCallListSongsByCallListAndInning(
    callListId: number,
    inning: number,
    genre: string
  ): Observable<BingoCallListSongsCompleteResult> {
    const params = new HttpParams().set('genre', genre.trim());

    return this.http
      .post<unknown>(`${this.completeCallListSongsByCallListAndInningApiUrl}/${callListId}/${inning}`, null, {
        params
      })
      .pipe(map(response => this.normalizeCallListSongsComplete(response)));
  }

  addCallListSong(payload: BingoCallListSongInsert): Observable<BingoCallListSongInsert> {
    const requestBody = this.toAddCallListSongApiPayload(payload);

    console.group('Insert_CallList_Song');
    console.log('URL', this.insertCallListSongApiUrl);
    console.log('Request JSON', JSON.parse(JSON.stringify(requestBody)));
    console.groupEnd();

    return this.http.post<unknown>(this.insertCallListSongApiUrl, requestBody).pipe(
      tap(response => {
        console.group('Insert_CallList_Song Response');
        console.log('Response JSON', JSON.parse(JSON.stringify(response)));
        console.groupEnd();
      }),
      map(response => this.normalizeCallListSongInsert(response, payload))
    );
  }

  /** `POST …/Bingo/CallList/Insert_NewGame` */
  insertNewGame(payload: BingoInsertNewGame): Observable<BingoInsertNewGameResult> {
    const body = this.toInsertNewGameApiPayload(payload);

    console.group('Insert_NewGame');
    console.log('URL', this.insertNewGameApiUrl);
    console.log('Request JSON', JSON.parse(JSON.stringify(body)));
    console.groupEnd();

    return this.http.post<unknown>(this.insertNewGameApiUrl, body).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => this.wrapInsertNewGameHttpError(err))),
      tap(response => {
        console.group('Insert_NewGame Response');
        console.log('Response JSON', JSON.parse(JSON.stringify(response)));
        console.groupEnd();
      }),
      map(response => this.normalizeInsertNewGameResult(response))
    );
  }

  private toUpdateGameByGidApiPayload(payload: BingoUpdateGameByGid): Record<string, unknown> {
    const gameId = this.asNullableNumber(payload.Game_ID);
    if (gameId === null || gameId < 1) {
      throw new Error('Game_ID is required to update a game.');
    }

    const callListId = this.asNullableNumber(payload.Call_List_ID);
    if (callListId === null || callListId < 1) {
      throw new Error('Call_List_ID is required to update a game.');
    }

    const start = payload.Game_StartTime.trim();
    const end = (payload.Game_EndTime ?? payload.Game_StartTime).trim();

    return {
      Game_ID: gameId,
      Call_List_ID: callListId,
      Game_Number: payload.Game_Number,
      Game_Inning: payload.Game_Inning,
      Game_Name: payload.Game_Name.trim(),
      Game_StartTime: start,
      Game_EndTime: end,
      Game_WinPattern: payload.Game_WinPattern.trim(),
      Game_WinnerCard_ID: payload.Game_WinnerCard_ID ?? 0,
      Game_Status: payload.Game_Status.trim()
    };
  }

  private normalizeUpdateGameByGidResult(response: unknown): BingoUpdateGameByGidResult {
    const record = this.unwrapRecord(response) ?? {};

    return {
      Success: this.asBoolean(record['Success'] ?? record['success']),
      Message: String(record['Message'] ?? record['message'] ?? ''),
      Game_ID: this.asNullableNumber(record['Game_ID'] ?? record['GameID'] ?? record['gameId']) ?? 0,
      ErrorNumber: this.asNullableNumber(record['ErrorNumber'] ?? record['errorNumber']),
      ErrorLine: this.asNullableNumber(record['ErrorLine'] ?? record['errorLine'])
    };
  }

  private wrapUpdateGameByGidHttpError(err: HttpErrorResponse): Error {
    if (err.status === 404 || err.status === 0) {
      return new Error(
        `Update_Game_byGID is not available on the API (HTTP ${err.status || 0}). ` +
          `Confirm ${this.updateGameByGidApiUrl} is published on the server.`
      );
    }

    const modelState = (err.error as Record<string, unknown> | null)?.['ModelState'] as
      | Record<string, string[]>
      | undefined;
    if (modelState) {
      const details = Object.entries(modelState)
        .map(([field, msgs]) => `${field}: ${(msgs ?? []).join(', ')}`)
        .join(' | ');
      return new Error(`Update_Game_byGID validation failed — ${details}`);
    }

    const message = (err.error as Record<string, unknown> | null)?.['Message'];
    if (typeof message === 'string' && message.trim().length > 0) {
      return new Error(message);
    }

    return new Error(`Update_Game_byGID failed (HTTP ${err.status || 'unknown'}).`);
  }

  private toInsertNewGameApiPayload(payload: BingoInsertNewGame): Record<string, unknown> {
    const start = payload.Game_StartTime.trim();
    const end = (payload.Game_EndTime ?? payload.Game_StartTime).trim();

    return {
      User_ID: payload.User_ID,
      Call_List_ID: payload.Call_List_ID,
      Game_Number: payload.Game_Number,
      Game_Inning: payload.Game_Inning,
      Game_Name: payload.Game_Name.trim(),
      Game_StartTime: start,
      Game_EndTime: end,
      Game_WinPattern: payload.Game_WinPattern.trim(),
      Game_WinnerCard_ID: payload.Game_WinnerCard_ID ?? 0,
      Game_Status: payload.Game_Status.trim()
    };
  }

  private normalizeInsertNewGameResult(response: unknown): BingoInsertNewGameResult {
    const record = this.unwrapRecord(response) ?? {};

    return {
      New_Game_ID:
        this.asNullableNumber(record['New_Game_ID'] ?? record['NewGameID'] ?? record['new_Game_ID']) ?? 0,
      Message: String(record['Message'] ?? record['message'] ?? '')
    };
  }

  private wrapInsertNewGameHttpError(err: HttpErrorResponse): Error {
    if (err.status === 404 || err.status === 0) {
      return new Error(
        `Insert_NewGame is not available on the API (HTTP ${err.status || 0}). ` +
          `Confirm ${this.insertNewGameApiUrl} is published on the server.`
      );
    }

    const modelState = (err.error as Record<string, unknown> | null)?.['ModelState'] as
      | Record<string, string[]>
      | undefined;
    if (modelState) {
      const details = Object.entries(modelState)
        .map(([field, msgs]) => `${field}: ${(msgs ?? []).join(', ')}`)
        .join(' | ');
      return new Error(`Insert_NewGame validation failed — ${details}`);
    }

    return new Error(`Insert_NewGame failed (HTTP ${err.status || 'unknown'}).`);
  }

  /**
   * `PUT …/Update_CallList_Master_By_Call_List_ID`
   * Updates an existing CallList_Master row (body includes `Call_List_ID`).
   */
  updateCallListMasterByCallListId(
    payload: BingoCallListMasterUpdate
  ): Observable<BingoCallListMasterUpdateResult> {
    const body = this.toUpdateCallListMasterApiPayload(payload);

    return this.http.put<unknown>(this.updateCallListMasterByCallListIdApiUrl, body).pipe(
      tap(response => {
        console.group('Update_CallList_Master_By_Call_List_ID');
        console.log('URL', this.updateCallListMasterByCallListIdApiUrl);
        console.log('payload', JSON.parse(JSON.stringify(body)));
        console.log('Response JSON', JSON.parse(JSON.stringify(response)));
        console.groupEnd();
      }),
      map(response => this.normalizeUpdateCallListMasterResult(response)),
      catchError((err: HttpErrorResponse) =>
        throwError(() => this.wrapUpdateCallListMasterHttpError(err))
      )
    );
  }

  buildCallList(payload: BingoCallListCreate, songs: BingoCallListSongInsert[]): Observable<CallListBuildResult> {
    return defer(() =>
      this.http.post<unknown>(this.insertCallListMasterApiUrl, this.toCreateCallListApiPayload(payload))
    ).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => this.wrapCallListMasterHttpError(err))),
      map(response => this.normalizeCallListCreate(response, payload)),
      switchMap(result => {
        const callListId = result.CallListID ?? result.NewCallListID;

        if (callListId === null) {
          throw new Error('Call list creation did not return an identifier.');
        }

        const insertRequests = songs.length > 0
          ? this.insertCallListSongs(songs.map(song => ({ ...song, CallListID: callListId })))
          : of([] as BingoCallListSongInsert[]);

        return insertRequests.pipe(
          switchMap(() => this.getCallListSongs(callListId).pipe(
            map(callListSongs => ({
              master: this.toCallListMaster(result, callListSongs.length || payload.CallListSongCount, callListId),
              songs: callListSongs
            }))
          ))
        );
      })
    );
  }

  private toUpdateCallListMasterApiPayload(payload: BingoCallListMasterUpdate): Record<string, unknown> {
    const callListId = this.asNullableNumber(payload.Call_List_ID);
    if (callListId === null || callListId < 1) {
      throw new Error('Call_List_ID is required to update a call list master.');
    }

    const userId = this.asNullableNumber(payload.User_ID);
    if (userId === null || userId < 1) {
      throw new Error('User_ID is required. Log in before updating a call list.');
    }

    const gameId = this.asNullableNumber(payload.Game_ID);
    if (gameId === null || gameId < 1) {
      throw new Error('Game_ID is required. Set Game_ID in Game Master or Console first.');
    }

    const inning = this.asNullableNumber(payload.InningNumber);
    if (inning === null || inning < 1) {
      throw new Error('InningNumber is required and must be 1 or greater.');
    }

    return {
      Call_List_ID: callListId,
      Call_List_Name: payload.Call_List_Name.trim(),
      Call_List_Date: this.toInsertCallListApiDate(payload.Call_List_Date),
      Call_List_Description: payload.Call_List_Description?.trim() ?? '',
      Game_ID: gameId,
      User_ID: userId,
      InningNumber: inning,
      Call_List_Genre: payload.Call_List_Genre ?? '',
      Call_List_Decade: payload.Call_List_Decade ?? '',
      Call_List_Era: (payload.Call_List_Era ?? '').slice(0, 100),
      Call_List_SongCount: payload.Call_List_SongCount ?? 0,
      Call_List_IsActive: payload.Call_List_IsActive
    };
  }

  private wrapUpdateCallListMasterHttpError(err: HttpErrorResponse): Error {
    if (err.status === 404 || err.status === 0) {
      return new Error(
        `Update_CallList_Master_By_Call_List_ID is not available on the API (HTTP ${err.status || 0}). ` +
          `Confirm ${this.updateCallListMasterByCallListIdApiUrl} is published on the server.`
      );
    }

    const modelState = (err.error as Record<string, unknown> | null)?.['ModelState'] as
      | Record<string, string[]>
      | undefined;
    if (modelState) {
      const details = Object.entries(modelState)
        .map(([field, msgs]) => `${field}: ${(msgs ?? []).join(', ')}`)
        .join(' | ');
      return new Error(`Update_CallList_Master_By_Call_List_ID validation failed — ${details}`);
    }

    const message = (err.error as Record<string, unknown> | null)?.['Message'];
    if (typeof message === 'string' && message.trim().length > 0) {
      return new Error(message);
    }

    return new Error(`Update_CallList_Master_By_Call_List_ID failed (HTTP ${err.status || 'unknown'}).`);
  }

  private normalizeUpdateCallListMasterResult(response: unknown): BingoCallListMasterUpdateResult {
    const record = this.unwrapRecord(response) ?? {};
    const callListId = this.asNullableNumber(record['Call_List_ID'] ?? record['CallListID']);

    if (callListId === null) {
      throw new Error('Update_CallList_Master_By_Call_List_ID did not return Call_List_ID.');
    }

    return {
      Call_List_ID: callListId,
      Call_List_Name: this.asString(record['Call_List_Name'] ?? record['CallListName']),
      Call_List_Date: this.asNullableString(record['Call_List_Date'] ?? record['CallListDate']),
      Call_List_Description: this.asNullableString(
        record['Call_List_Description'] ?? record['CallListDescription']
      ),
      Game_ID: this.asNullableNumber(record['Game_ID'] ?? record['GameID']) ?? 0,
      User_ID: this.asNullableNumber(record['User_ID'] ?? record['UserID']) ?? 0,
      Call_List_Genre: this.asNullableString(record['Call_List_Genre'] ?? record['CallListGenre']),
      Call_List_Decade: this.asNullableString(record['Call_List_Decade'] ?? record['CallListDecade']),
      Call_List_Era: this.asNullableString(record['Call_List_Era'] ?? record['CallListEra']),
      Call_List_SongCount:
        this.asNullableNumber(record['Call_List_SongCount'] ?? record['CallListSongCount']) ?? 0,
      Call_List_IsActive: this.asBoolean(record['Call_List_IsActive'] ?? record['CallListIsActive']),
      InningNumber: this.asNullableNumber(record['InningNumber'] ?? record['inningNumber']) ?? 0,
      Call_List_CreatedAt: this.asNullableString(
        record['Call_List_CreatedAt'] ?? record['CallListCreatedAt']
      ),
      Message: this.asString(record['Message'] ?? record['message'])
    };
  }

  private toCreateCallListApiPayload(payload: BingoCallListCreate): Record<string, unknown> {
    if (payload.UserID == null || payload.UserID <= 0) {
      throw new Error('User_ID is required. Log in before creating a call list.');
    }

    if (payload.GameID == null || payload.GameID <= 0) {
      throw new Error('Game_ID is required. Set Game_ID in Game Master or Console first.');
    }

    const body: Record<string, unknown> = {
      Call_List_Name: payload.CallListName.trim(),
      Call_List_Date: this.toInsertCallListApiDate(payload.CallListDate),
      Call_List_Description: payload.CallListDescription.trim(),
      Game_ID: payload.GameID,
      User_ID: payload.UserID,
      InningNumber: payload.InningNumber ?? 4,
      Call_List_Genre: payload.CallListGenre,
      Call_List_Decade: payload.CallListDecade,
      Call_List_Era: (payload.CallListEra || '').slice(0, 100),
      Call_List_SongCount: payload.CallListSongCount ?? 0,
      Call_List_IsActive: payload.CallListIsActive,
      NewCallListID: payload.NewCallListID ?? 0
    };

    console.group('Insert_CallList_Master request');
    console.log('URL', this.insertCallListMasterApiUrl);
    console.log('payload', JSON.parse(JSON.stringify(body)));
    console.groupEnd();

    return body;
  }

  private wrapCallListMasterHttpError(err: HttpErrorResponse): Error {
    if (err.status === 404 || err.status === 0) {
      return new Error(
        `Insert_CallList_Master is not available on the API (HTTP ${err.status || 0}). ` +
          `Confirm ${this.insertCallListMasterApiUrl} is published on the server.`
      );
    }

    const modelState = (err.error as Record<string, unknown> | null)?.['ModelState'] as
      | Record<string, string[]>
      | undefined;
    if (modelState) {
      const details = Object.entries(modelState)
        .map(([field, msgs]) => `${field}: ${(msgs ?? []).join(', ')}`)
        .join(' | ');
      return new Error(`Insert_CallList_Master validation failed — ${details}`);
    }

    return new Error(`Insert_CallList_Master failed (HTTP ${err.status || 'unknown'}).`);
  }

  /** `Insert_CallList_Master` expects ISO-8601 (e.g. `2026-05-31T20:52:20.070Z`). */
  private toInsertCallListApiDate(date: string): string {
    const trimmed = date.trim();
    if (trimmed.includes('T')) {
      return trimmed;
    }

    const parts = trimmed.split('-').map(part => Number(part));
    if (parts.length === 3 && !parts.some(part => Number.isNaN(part))) {
      const [year, month, day] = parts;
      const now = new Date();
      return new Date(
        Date.UTC(year, month - 1, day, now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds(), now.getUTCMilliseconds())
      ).toISOString();
    }

    return new Date().toISOString();
  }

  private toAddCallListSongApiPayload(payload: BingoCallListSongInsert): Record<string, unknown> {
    const inning = this.asNullableNumber(payload.Inning);
    const normalizedInning = inning !== null && inning > 0 ? Math.trunc(inning) : 1;

    return {
      CallListID: payload.CallListID,
      Call_List_ID: payload.CallListID,
      Inning: normalizedInning,
      Song_ID: payload.Song_ID,
      title: payload.Title,
      artist: payload.Artist,
      featured_artist: payload.FeaturedArtist || null,
      lead_vocalist: payload.LeadVocalist || null,
      artist_type: payload.ArtistType || null,
      genre: payload.Genre || null,
      explicit: payload.Explicit,
      release_year: payload.ReleaseYear || null,
      decade: payload.Decade || null,
      era: payload.Era || null
    };
  }

  insertCallListSongs(payload: BingoCallListSongInsert[]): Observable<BingoCallListSongInsert[]> {
    return this.http.post<unknown>(this.insertCallListSongsJsonApiUrl, payload).pipe(
      map(response => this.normalizeCallListSongInsertList(response, payload))
    );
  }

  private toCallListMaster(
    result: BingoCallListCreate,
    songCount: number,
    callListId: number
  ): BingoCallListMaster {
    return {
      Call_List_ID: callListId,
      Call_List_Name: result.CallListName,
      Call_List_Date: result.CallListDate || null,
      Call_List_Description: result.CallListDescription || null,
      Call_List_Genre: result.CallListGenre || null,
      Call_List_Decade: result.CallListDecade || null,
      Call_List_Era: result.CallListEra || null,
      Call_List_SongCount: songCount,
      Call_List_IsActive: result.CallListIsActive,
      Call_List_CreatedAt: result.CallListCreatedAt,
      Call_List_UpdatedAt: null
    };
  }

  private normalizeCallListMasters(response: unknown): BingoCallListMaster[] {
    return this.unwrapArray(response)
      .map(item => this.mapCallListMaster(item))
      .filter((item): item is BingoCallListMaster => item !== null);
  }

  private normalizeCallListSongs(response: unknown): BingoCallListSong[] {
    return this.unwrapArray(response)
      .map(item => this.mapCallListSong(item))
      .filter((item): item is BingoCallListSong => item !== null);
  }

  private normalizeCallListCreate(response: unknown, fallbackPayload: BingoCallListCreate): BingoCallListCreate {
    const record = this.unwrapRecord(response) ?? {};

    return {
      NewCallListID:
        this.asNullableNumber(record['NewCallListID'] ?? record['CallListID'] ?? record['Call_List_ID'] ?? record['ReturnValue'])
        ?? fallbackPayload.NewCallListID,
      CallListName: this.asString(record['CallListName'] ?? record['Call_List_Name'], fallbackPayload.CallListName),
      CallListDate: this.asString(record['CallListDate'] ?? record['Call_List_Date'], fallbackPayload.CallListDate),
      CallListDescription: this.asString(
        record['CallListDescription'] ?? record['Call_List_Description'],
        fallbackPayload.CallListDescription
      ),
      UserID: this.asNullableNumber(record['UserID'] ?? record['User_ID']) ?? fallbackPayload.UserID,
      GameID: this.asNullableNumber(record['GameID'] ?? record['Game_ID']) ?? fallbackPayload.GameID,
      CallListGenre: this.asString(record['CallListGenre'] ?? record['Call_List_Genre'], fallbackPayload.CallListGenre),
      CallListDecade: this.asString(record['CallListDecade'] ?? record['Call_List_Decade'], fallbackPayload.CallListDecade),
      CallListEra: this.asString(record['CallListEra'] ?? record['Call_List_Era'], fallbackPayload.CallListEra),
      CallListSongCount: this.asNullableNumber(record['CallListSongCount'] ?? record['Call_List_SongCount']) ?? fallbackPayload.CallListSongCount,
      CallListIsActive: this.asBoolean(record['CallListIsActive'] ?? record['Call_List_IsActive'] ?? fallbackPayload.CallListIsActive),
      CallListCreatedAt: this.asNullableString(record['CallListCreatedAt'] ?? record['Call_List_CreatedAt']) ?? fallbackPayload.CallListCreatedAt,
      CallListID: this.asNullableNumber(record['CallListID'] ?? record['Call_List_ID']) ?? fallbackPayload.CallListID,
      InningNumber: this.asNullableNumber(record['InningNumber'] ?? record['Inning'] ?? record['inning']) ?? fallbackPayload.InningNumber
    };
  }

  private normalizeCallListSongInsert(response: unknown, fallbackPayload: BingoCallListSongInsert): BingoCallListSongInsert {
    const record = this.unwrapRecord(response) ?? {};
    const inningFromApi = this.asNullableNumber(record['Inning'] ?? record['inning']);
    const inning =
      inningFromApi !== null && inningFromApi > 0 ? inningFromApi : fallbackPayload.Inning;

    return {
      CallListID: this.asNullableNumber(record['CallListID'] ?? record['CallListId'] ?? record['Call_List_ID']) ?? fallbackPayload.CallListID,
      Inning: inning,
      Song_ID: this.asNullableNumber(record['Song_ID'] ?? record['SongID'] ?? record['SongId'] ?? record['song_id']) ?? fallbackPayload.Song_ID,
      Title: this.asString(record['Title'] ?? record['title'], fallbackPayload.Title),
      Artist: this.asString(record['Artist'] ?? record['artist'], fallbackPayload.Artist),
      FeaturedArtist: this.asString(record['FeaturedArtist'] ?? record['featured_artist'], fallbackPayload.FeaturedArtist),
      LeadVocalist: this.asString(record['LeadVocalist'] ?? record['lead_vocalist'], fallbackPayload.LeadVocalist),
      ArtistType: this.asString(record['ArtistType'] ?? record['artist_type'], fallbackPayload.ArtistType),
      Genre: this.asString(record['Genre'] ?? record['genre'], fallbackPayload.Genre),
      Explicit: this.asBoolean(record['Explicit'] ?? record['explicit'] ?? fallbackPayload.Explicit),
      ReleaseYear: this.asNullableNumber(record['ReleaseYear'] ?? record['release_year']) ?? fallbackPayload.ReleaseYear,
      Decade: this.asString(record['Decade'] ?? record['decade'], fallbackPayload.Decade),
      Era: this.asString(record['Era'] ?? record['era'], fallbackPayload.Era),
      LastPlayed: this.asString(record['LastPlayed'] ?? record['last_played'], fallbackPayload.LastPlayed),
      NewSongID: this.asNullableNumber(record['NewSongID'] ?? record['SongId'] ?? record['song_id'] ?? record['SongID']) ?? fallbackPayload.NewSongID
    };
  }

  private normalizeCallListSongInsertList(
    response: unknown,
    fallbackPayloads: BingoCallListSongInsert[]
  ): BingoCallListSongInsert[] {
    return this.unwrapArray(response)
      .map((item, index) => {
        const record = this.asRecord(item);
        const songRecord = this.asRecord(record?.['Song']) ?? record;

        if (!songRecord) {
          return fallbackPayloads[index] ?? null;
        }

        return this.normalizeCallListSongInsert(songRecord, fallbackPayloads[index] ?? fallbackPayloads[0]);
      })
      .filter((item): item is BingoCallListSongInsert => item !== null);
  }

  private normalizeGenerateBingoCardsFromClSongs(
    response: unknown
  ): BingoGenerateBingoCardsFromClSongsResult {
    const record = this.unwrapRecord(response) ?? {};

    return {
      CardsGenerated:
        this.asNullableNumber(record['CardsGenerated'] ?? record['cardsGenerated']) ?? 0,
      User_ID: this.asNullableNumber(record['User_ID'] ?? record['UserID'] ?? record['userId']) ?? 0,
      Game_ID: this.asNullableNumber(record['Game_ID'] ?? record['GameID'] ?? record['gameId']) ?? 0,
      Game_Number:
        this.asNullableNumber(record['Game_Number'] ?? record['GameNumber'] ?? record['gameNumber']) ?? 0,
      Call_List_ID:
        this.asNullableNumber(record['Call_List_ID'] ?? record['CallListID'] ?? record['callListId']) ?? 0,
      Inning: this.asNullableNumber(record['Inning'] ?? record['inning']) ?? 0,
      SongPoolSize:
        this.asNullableNumber(record['SongPoolSize'] ?? record['songPoolSize']) ?? 0,
      PlaylistSize:
        this.asNullableNumber(record['PlaylistSize'] ?? record['playlistSize']) ?? 0,
      HotSongsInPlaylist:
        this.asNullableNumber(record['HotSongsInPlaylist'] ?? record['hotSongsInPlaylist']) ?? 0,
      GuaranteedWinnerNote: this.asString(
        record['GuaranteedWinnerNote'] ?? record['guaranteedWinnerNote']
      )
    };
  }

  private normalizeLatestGames(response: unknown): BingoLatestGame[] {
    return this.unwrapArray(response)
      .map(item => this.mapLatestGame(item))
      .filter((item): item is BingoLatestGame => item !== null)
      .sort((left, right) => right.Game_ID - left.Game_ID);
  }

  private mapLatestGame(item: unknown): BingoLatestGame | null {
    const record = this.asRecord(item);
    if (!record) {
      return null;
    }

    const gameId = this.asNullableNumber(record['Game_ID'] ?? record['GameID']);
    const callListId = this.asNullableNumber(record['Call_List_ID'] ?? record['CallListID']);
    const gameNumber = this.asNullableNumber(record['Game_Number'] ?? record['GameNumber']);
    const gameInning = this.asNullableNumber(record['Game_Inning'] ?? record['GameInning']);

    if (gameId === null || callListId === null || gameNumber === null || gameInning === null) {
      return null;
    }

    return {
      Game_ID: gameId,
      Game_Number: gameNumber,
      Game_Inning: gameInning,
      Game_Name: this.asString(record['Game_Name'] ?? record['GameName']),
      Game_Status: this.asString(record['Game_Status'] ?? record['GameStatus']),
      Game_StartTime: this.asNullableString(record['Game_StartTime'] ?? record['GameStartTime']),
      Game_EndTime: this.asNullableString(record['Game_EndTime'] ?? record['GameEndTime']),
      Game_WinPattern: this.asNullableString(record['Game_WinPattern'] ?? record['GameWinPattern']),
      Game_WinnerCard_ID: this.asNullableNumber(record['Game_WinnerCard_ID'] ?? record['GameWinnerCard_ID']),
      Game_CreatedAt: this.asNullableString(record['Game_CreatedAt'] ?? record['GameCreatedAt']),
      Call_List_ID: callListId,
      Call_List_Name: this.asNullableString(record['Call_List_Name'] ?? record['CallListName']),
      Call_List_Genre: this.asNullableString(record['Call_List_Genre'] ?? record['CallListGenre']),
      Call_List_Decade: this.asNullableString(record['Call_List_Decade'] ?? record['CallListDecade'])
    };
  }

  private mapCallListMaster(item: unknown): BingoCallListMaster | null {
    const record = this.asRecord(item);

    if (!record) {
      return null;
    }

    const callListId = this.asNullableNumber(record['Call_List_ID'] ?? record['CallListID']);
    if (callListId === null) {
      return null;
    }

    return {
      Call_List_ID: callListId,
      Call_List_Name: this.asString(record['Call_List_Name'] ?? record['CallListName']),
      Call_List_Date: this.asNullableString(record['Call_List_Date'] ?? record['CallListDate']),
      Call_List_Description: this.asNullableString(record['Call_List_Description'] ?? record['CallListDescription']),
      Call_List_Genre: this.asNullableString(record['Call_List_Genre'] ?? record['CallListGenre']),
      Call_List_Decade: this.asNullableString(record['Call_List_Decade'] ?? record['CallListDecade']),
      Call_List_Era: this.asNullableString(record['Call_List_Era'] ?? record['CallListEra']),
      Call_List_SongCount: this.asNullableNumber(record['Call_List_SongCount'] ?? record['CallListSongCount']) ?? 0,
      Call_List_IsActive: this.asBoolean(record['Call_List_IsActive'] ?? record['CallListIsActive']),
      Call_List_CreatedAt: this.asNullableString(record['Call_List_CreatedAt'] ?? record['CallListCreatedAt']),
      Call_List_UpdatedAt: this.asNullableString(record['Call_List_UpdatedAt'] ?? record['CallListUpdatedAt'])
    };
  }

  private normalizeCallListSongsComplete(response: unknown): BingoCallListSongsCompleteResult {
    const record = this.unwrapRecord(response) ?? {};

    return {
      Call_List_ID: this.asNullableNumber(record['Call_List_ID'] ?? record['CallListID']) ?? 0,
      Inning: this.asNullableNumber(record['Inning'] ?? record['inning']) ?? 0,
      Genre: this.asString(record['Genre'] ?? record['genre']),
      InitialCount: this.asNullableNumber(record['InitialCount'] ?? record['initialCount']) ?? 0,
      SongsNeeded: this.asNullableNumber(record['SongsNeeded'] ?? record['songsNeeded']) ?? 0,
      SongsAdded: this.asNullableNumber(record['SongsAdded'] ?? record['songsAdded']) ?? 0,
      FinalCount: this.asNullableNumber(record['FinalCount'] ?? record['finalCount']) ?? 0,
      TargetMet: this.asString(record['TargetMet'] ?? record['targetMet']),
      StatusMessage: this.asString(record['StatusMessage'] ?? record['statusMessage'])
    };
  }

  private normalizeCallListSongRemove(response: unknown): BingoCallListSongRemoveResult {
    const record = this.unwrapRecord(response) ?? {};

    return {
      Call_List_ID: this.asNullableNumber(record['Call_List_ID'] ?? record['CallListID']) ?? 0,
      song_id_removed:
        this.asNullableNumber(
          record['song_id_removed'] ?? record['Song_ID'] ?? record['SongId'] ?? record['song_id']
        ) ?? 0,
      title: this.asString(record['title'] ?? record['Title']),
      artist: this.asString(record['artist'] ?? record['Artist']),
      Call_List_SongCount:
        this.asNullableNumber(record['Call_List_SongCount'] ?? record['CallListSongCount']) ?? 0
    };
  }

  private mapCallListSong(item: unknown): BingoCallListSong | null {
    const record = this.asRecord(item);

    if (!record) {
      return null;
    }

    const songId = this.asNullableNumber(record['song_id'] ?? record['SongID'] ?? record['Song_ID']);
    const callListId = this.asNullableNumber(record['Call_List_ID'] ?? record['CallListID']);

    if (songId === null || callListId === null) {
      return null;
    }

    return {
      song_id: songId,
      Call_List_ID: callListId,
      inning: this.asNullableNumber(record['inning'] ?? record['Inning']),
      title: this.asString(record['title'] ?? record['Title']),
      artist: this.asString(record['artist'] ?? record['Artist']),
      featured_artist: this.asNullableString(record['featured_artist'] ?? record['FeaturedArtist']),
      lead_vocalist: this.asNullableString(record['lead_vocalist'] ?? record['LeadVocalist']),
      artist_type: this.asNullableString(record['artist_type'] ?? record['ArtistType']),
      genre: this.asNullableString(record['genre'] ?? record['Genre']),
      explicit: this.asBoolean(record['explicit'] ?? record['Explicit']),
      release_year: this.asNullableNumber(record['release_year'] ?? record['ReleaseYear']),
      decade: this.asNullableString(record['decade'] ?? record['Decade']),
      era: this.asNullableString(record['era'] ?? record['Era']),
      last_played: this.asNullableString(record['last_played'] ?? record['LastPlayed'])
    };
  }

  private emptyExistingCardsByUser(userId: number): BingoExistingCardsByUser {
    return {
      Summary: this.mapExistingCardsSummary({}, userId),
      InningBreakdown: [],
      InningList: [],
      CardDetails: []
    };
  }

  private emptyExistingCardsByCli(callListId: number): BingoExistingCardsByCli {
    return {
      Summary: this.mapExistingCardsByCliSummary({}, callListId),
      InningBreakdown: [],
      InningList: [],
      CardDetails: []
    };
  }

  private normalizeExistingCardsByUser(response: unknown, userId: number): BingoExistingCardsByUser {
    const record = this.unwrapRecord(response) ?? this.asRecord(response) ?? {};
    const summarySource = this.asRecord(record['Summary'] ?? record['summary']) ?? record;
    const lists = this.parseExistingCardsLists(record);

    return {
      Summary: this.mapExistingCardsSummary(summarySource, userId),
      ...lists
    };
  }

  private normalizeExistingCardsByCli(response: unknown, callListId: number): BingoExistingCardsByCli {
    const record = this.unwrapRecord(response) ?? this.asRecord(response) ?? {};
    const summarySource = this.asRecord(record['Summary'] ?? record['summary']) ?? record;
    const lists = this.parseExistingCardsLists(record);

    return {
      Summary: this.mapExistingCardsByCliSummary(summarySource, callListId),
      ...lists
    };
  }

  private parseExistingCardsLists(record: Record<string, unknown>): {
    InningBreakdown: BingoExistingCardsInningBreakdown[];
    InningList: number[];
    CardDetails: BingoExistingCardDetail[];
  } {
    const inningBreakdown = this.unwrapArray(record['InningBreakdown'] ?? record['inningBreakdown']);
    const inningList = record['InningList'] ?? record['inningList'];
    const cardDetails = this.unwrapArray(record['CardDetails'] ?? record['cardDetails']);

    return {
      InningBreakdown: inningBreakdown
        .map(item => this.mapExistingCardsInningBreakdown(item))
        .filter((item): item is BingoExistingCardsInningBreakdown => item !== null),
      InningList: this.normalizeInningList(inningList),
      CardDetails: cardDetails
        .map(item => this.mapExistingCardDetail(item))
        .filter((item): item is BingoExistingCardDetail => item !== null)
    };
  }

  private mapExistingCardsByCliSummary(
    record: Record<string, unknown>,
    fallbackCallListId: number
  ): BingoExistingCardsByCliSummary {
    const callListId = this.asNullableNumber(
      record['Call_List_ID'] ?? record['CallListID'] ?? record['call_list_id']
    );

    return {
      Call_List_ID: callListId ?? fallbackCallListId,
      Total_Cards: this.asNullableNumber(record['Total_Cards'] ?? record['TotalCards']) ?? 0,
      Total_Innings: this.asNullableNumber(record['Total_Innings'] ?? record['TotalInnings']) ?? 0,
      Total_Winners: this.asNullableNumber(record['Total_Winners'] ?? record['TotalWinners']) ?? 0,
      Total_NonWinners: this.asNullableNumber(record['Total_NonWinners'] ?? record['TotalNonWinners']) ?? 0,
      Win_Rate_Pct: this.asNullableNumber(record['Win_Rate_Pct'] ?? record['WinRatePct']) ?? 0,
      Total_Printed: this.asNullableNumber(record['Total_Printed'] ?? record['TotalPrinted']) ?? 0,
      Print_Rate_Pct: this.asNullableNumber(record['Print_Rate_Pct'] ?? record['PrintRatePct']) ?? 0,
      Total_Named_Players: this.asNullableNumber(record['Total_Named_Players'] ?? record['TotalNamedPlayers']) ?? 0,
      Total_PlayCount: this.asNullableNumber(record['Total_PlayCount'] ?? record['TotalPlayCount']) ?? 0,
      Avg_PlayCount: this.asNullableNumber(record['Avg_PlayCount'] ?? record['AvgPlayCount']) ?? 0,
      Max_PlayCount: this.asNullableNumber(record['Max_PlayCount'] ?? record['MaxPlayCount']) ?? 0,
      First_Card_Created: this.asNullableString(record['First_Card_Created'] ?? record['FirstCardCreated']),
      Last_Card_Created: this.asNullableString(record['Last_Card_Created'] ?? record['LastCardCreated']),
      Last_Printed: this.asNullableString(record['Last_Printed'] ?? record['LastPrinted'])
    };
  }

  private mapExistingCardsSummary(record: Record<string, unknown>, fallbackUserId: number): BingoExistingCardsSummary {
    const userId = this.asNullableNumber(record['User_ID'] ?? record['UserID'] ?? record['user_id']);

    return {
      User_ID: userId ?? fallbackUserId,
      Total_Cards: this.asNullableNumber(record['Total_Cards'] ?? record['TotalCards']) ?? 0,
      Total_CallLists: this.asNullableNumber(record['Total_CallLists'] ?? record['TotalCallLists']) ?? 0,
      Total_Innings: this.asNullableNumber(record['Total_Innings'] ?? record['TotalInnings']) ?? 0,
      Total_Winners: this.asNullableNumber(record['Total_Winners'] ?? record['TotalWinners']) ?? 0,
      Total_NonWinners: this.asNullableNumber(record['Total_NonWinners'] ?? record['TotalNonWinners']) ?? 0,
      Win_Rate_Pct: this.asNullableNumber(record['Win_Rate_Pct'] ?? record['WinRatePct']) ?? 0,
      Total_Printed: this.asNullableNumber(record['Total_Printed'] ?? record['TotalPrinted']) ?? 0,
      Print_Rate_Pct: this.asNullableNumber(record['Print_Rate_Pct'] ?? record['PrintRatePct']) ?? 0,
      Total_Named_Players: this.asNullableNumber(record['Total_Named_Players'] ?? record['TotalNamedPlayers']) ?? 0,
      Total_PlayCount: this.asNullableNumber(record['Total_PlayCount'] ?? record['TotalPlayCount']) ?? 0,
      Avg_PlayCount: this.asNullableNumber(record['Avg_PlayCount'] ?? record['AvgPlayCount']) ?? 0,
      Max_PlayCount: this.asNullableNumber(record['Max_PlayCount'] ?? record['MaxPlayCount']) ?? 0,
      First_Card_Created: this.asNullableString(record['First_Card_Created'] ?? record['FirstCardCreated']),
      Last_Card_Created: this.asNullableString(record['Last_Card_Created'] ?? record['LastCardCreated']),
      Last_Printed: this.asNullableString(record['Last_Printed'] ?? record['LastPrinted'])
    };
  }

  private mapExistingCardsInningBreakdown(item: unknown): BingoExistingCardsInningBreakdown | null {
    const record = this.asRecord(item);
    if (!record) {
      return null;
    }

    const inning = this.asNullableNumber(record['Inning'] ?? record['inning']);
    if (inning === null) {
      return null;
    }

    return {
      Inning: inning,
      Card_Count: this.asNullableNumber(record['Card_Count'] ?? record['CardCount'] ?? record['Total_Cards']) ?? 0,
      Winner_Count: this.asNullableNumber(record['Winner_Count'] ?? record['WinnerCount'] ?? record['Total_Winners']) ?? 0,
      NonWinner_Count:
        this.asNullableNumber(record['NonWinner_Count'] ?? record['NonWinnerCount'] ?? record['Total_NonWinners']) ?? 0,
      Printed_Count: this.asNullableNumber(record['Printed_Count'] ?? record['PrintedCount'] ?? record['Total_Printed']) ?? 0,
      Win_Rate_Pct: this.asNullableNumber(record['Win_Rate_Pct'] ?? record['WinRatePct']) ?? 0
    };
  }

  private normalizeInningList(value: unknown): number[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map(item => {
        if (typeof item === 'number' && Number.isFinite(item)) {
          return Math.trunc(item);
        }

        const record = this.asRecord(item);
        const inning = this.asNullableNumber(record?.['Inning'] ?? record?.['inning']);
        return inning;
      })
      .filter((inning): inning is number => inning !== null);
  }

  private mapExistingCardDetail(item: unknown): BingoExistingCardDetail | null {
    const record = this.asRecord(item);
    if (!record) {
      return null;
    }

    const cardId = this.asNullableNumber(record['Card_ID'] ?? record['CardID'] ?? record['card_id']);
    const gameId = this.asNullableNumber(record['Game_ID'] ?? record['GameID'] ?? record['game_id']);
    const userId = this.asNullableNumber(record['User_ID'] ?? record['UserID'] ?? record['user_id']);
    const callListId = this.asNullableNumber(record['Call_List_ID'] ?? record['CallListID'] ?? record['call_list_id']);
    const inning = this.asNullableNumber(record['Inning'] ?? record['inning']);

    if (cardId === null || callListId === null || inning === null) {
      return null;
    }

    return {
      Card_ID: cardId,
      User_ID: userId,
      Game_ID: gameId,
      Call_List_ID: callListId,
      Inning: inning,
      Card_Date_Create: this.asNullableString(
        record['Card_Date_Create'] ?? record['CardDateCreate'] ?? record['Card_DateCreate']
      ),
      Card_PlayerName: this.asNullableString(record['Card_PlayerName'] ?? record['CardPlayerName']),
      Card_PlayerEmail: this.asNullableString(record['Card_PlayerEmail'] ?? record['CardPlayerEmail']),
      PlayCount: this.asNullableNumber(record['PlayCount'] ?? record['play_count']) ?? 0,
      Card_IsWinner: this.asBoolean(record['Card_IsWinner'] ?? record['CardIsWinner']),
      Card_SeedKey: this.asNullableString(record['Card_SeedKey'] ?? record['CardSeedKey']),
      Card_PrintedAt: this.asNullableString(record['Card_PrintedAt'] ?? record['CardPrintedAt']),
      Call_List_Name: this.asNullableString(record['Call_List_Name'] ?? record['CallListName'])
    };
  }

  private mapCallListDropdownByUser(item: unknown): BingoCallListDropdownByUser | null {
    if (typeof item === 'number' && Number.isInteger(item) && item > 0) {
      return { Call_List_ID: item };
    }

    const record = this.asRecord(item);
    if (!record) {
      return null;
    }

    const callListId = this.asNullableNumber(
      record['Call_List_ID'] ??
        record['CallListID'] ??
        record['callListId'] ??
        record['call_list_id'] ??
        record['Id'] ??
        record['id']
    );
    if (callListId === null || callListId <= 0) {
      return null;
    }

    return {
      Call_List_ID: callListId,
      Game_ID: this.asNullableNumber(record['Game_ID'] ?? record['GameID'] ?? record['gameId']),
      User_ID: this.asNullableNumber(record['User_ID'] ?? record['UserID'] ?? record['userId'])
    };
  }

  private unwrapArray(response: unknown): unknown[] {
    const record = this.asRecord(response);
    const candidates = ['value', 'Value', 'data', 'Data', 'items', 'Items', 'result', 'Result', 'payload', 'Payload'];
    const listCandidate = record
      ? candidates.map(key => record[key]).find(value => Array.isArray(value))
      : undefined;

    if (Array.isArray(listCandidate)) {
      return listCandidate;
    }

    if (Array.isArray(response)) {
      return response;
    }

    return response ? [response] : [];
  }

  private unwrapRecord(response: unknown): Record<string, unknown> | null {
    const record = this.asRecord(response);
    if (!record) {
      return null;
    }

    const candidates = ['value', 'Value', 'data', 'Data', 'item', 'Item', 'result', 'Result', 'payload', 'Payload'];
    for (const candidate of candidates) {
      const nested = this.asRecord(record[candidate]);
      if (nested) {
        return nested;
      }
    }

    return record;
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    return value !== null && typeof value === 'object' ? value as Record<string, unknown> : null;
  }

  private asNullableNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  private asString(value: unknown, fallback = ''): string {
    return typeof value === 'string' ? value : fallback;
  }

  private asNullableString(value: unknown): string | null {
    if (value === null) {
      return null;
    }

    return typeof value === 'string' ? value : null;
  }

  private asBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      return value !== 0;
    }

    if (typeof value === 'string') {
      return ['true', '1', 'y', 'yes'].includes(value.trim().toLowerCase());
    }

    return false;
  }
}
