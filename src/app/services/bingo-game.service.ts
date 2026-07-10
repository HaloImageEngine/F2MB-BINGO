import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, defer, map, of, retry, throwError, timer } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  BingoCalledSong,
  BingoCallListCreate,
  BingoCallListMaster,
  BingoCallListSongByGci,
  BingoCallListSongInsert,
  BingoCalledSongFromGci,
  BingoCallSongResult,
  BingoGameActionResult,
  BingoMaxGameCardFirstCard,
  BingoMaxGameCardHeader,
  BingoSongsCalledCalculateByGci,
  BingoTopCard,
  BingoUpsertCallListWinnerParams,
  BingoUpsertCallListWinnerResult,
  BingoWinnerResult
} from '../models/bingo-game.model';
import {
  BingoColumnLetter,
  PrintedCard,
  PrintedCardResultRow,
  PrintedCardSquare
} from '../models/printed-card.model';
import { LookupOption } from '../models/lookup-option.model';
import { Song } from '../models/song.model';

@Injectable({ providedIn: 'root' })
export class BingoGameService {
  private readonly http = inject(HttpClient);
  private readonly clearCalledFlagsApiBaseUrl = environment.bingoClearCalledFlagsApiBaseUrl;
  private readonly clearCalledSongsApiBaseUrl = environment.bingoClearCalledSongsApiBaseUrl;
  private readonly topCardsApiBaseUrl = environment.bingoTopCardsApiBaseUrl;
  private readonly topCardsWithFullCardInfoApiBaseUrl =
    environment.bingoTopCardsWithFullCardInfoApiBaseUrl;
  private readonly callSongApiUrl = environment.bingoCallSongApiUrl;
  private readonly checkForWinnerApiBaseUrl = environment.bingoCheckForWinnerApiBaseUrl;
  private readonly checkForWinner2LinesApiBaseUrl = environment.bingoCheckForWinner2LinesApiBaseUrl;
  private readonly checkForWinner4CornersApiBaseUrl = environment.bingoCheckForWinner4CornersApiBaseUrl;
  private readonly checkForWinnerBlackoutApiBaseUrl = environment.bingoCheckForWinnerBlackoutApiBaseUrl;
  private readonly upsertCallListWinnerApiBaseUrl = environment.bingoUpsertCallListWinnerApiBaseUrl;
  private readonly calledSongsApiUrl = environment.bingoCalledSongsApiUrl;
  private readonly callListMasterApiUrl = environment.bingoCallListMasterApiUrl;
  private readonly callListSongsByGciApiUrl = environment.bingoCallListSongsByGciApiUrl;
  private readonly songsCalledCalculateByGciApiBaseUrl = environment.bingoSongsCalledCalculateByGciApiBaseUrl;
  private readonly maxGameCardFirstCardApiBaseUrl = environment.bingoMaxGameCardFirstCardApiBaseUrl;
  private readonly callListDropdownApiUrl = environment.bingoCallListDropdownApiUrl;
  private readonly insertCallListMasterApiUrl = environment.bingoInsertCallListMasterApiUrl;
  private readonly insertCallListSongApiUrl = environment.bingoInsertCallListSongApiUrl;
  private readonly insertCallListSongsJsonApiUrl = environment.bingoInsertCallListSongsJsonApiUrl;

  clearAllCalledFlags(
    gameId: number,
    callListId?: number | null,
    inning?: number | null
  ): Observable<BingoGameActionResult> {
    let params = new HttpParams();

    if (typeof callListId === 'number' && Number.isFinite(callListId)) {
      params = params.set('callListId', String(callListId));
    }

    if (typeof inning === 'number' && Number.isFinite(inning)) {
      params = params.set('inning', String(inning));
    }

    return this.http.post<unknown>(`${this.clearCalledFlagsApiBaseUrl}/${gameId}`, null, { params }).pipe(
      map(response => this.normalizeActionResult(response, gameId, callListId, inning))
    );
  }

  clearAllCalledSongs(
    gameId: number,
    callListId?: number | null,
    inning?: number | null
  ): Observable<BingoGameActionResult> {
    let params = new HttpParams();

    if (typeof callListId === 'number' && Number.isFinite(callListId)) {
      params = params.set('callListId', String(callListId));
    }

    if (typeof inning === 'number' && Number.isFinite(inning)) {
      params = params.set('inning', String(inning));
    }

    return this.http.post<unknown>(`${this.clearCalledSongsApiBaseUrl}/${gameId}`, null, { params }).pipe(
      map(response => this.normalizeActionResult(response, gameId, callListId, inning))
    );
  }

  startNewGame(gameId: number): Observable<BingoGameActionResult> {
    return this.clearAllCalledFlags(gameId);
  }

  getTopCards(
    gameId: number,
    topN: number,
    callListId?: number | null,
    inning?: number | null
  ): Observable<BingoTopCard[]> {
    if (typeof callListId === 'number' && Number.isFinite(callListId) && typeof inning === 'number' && Number.isFinite(inning)) {
      return this.getTopCardsWithFullCardInfo(gameId, callListId, inning, topN);
    }

    let params = new HttpParams();

    if (typeof callListId === 'number' && Number.isFinite(callListId)) {
      params = params.set('callListId', String(callListId));
    }

    if (typeof inning === 'number' && Number.isFinite(inning)) {
      params = params.set('inning', String(inning));
    }

    return this.http.get<unknown>(`${this.topCardsApiBaseUrl}/${gameId}/${topN}`, { params }).pipe(
      map(response => this.normalizeTopCards(response)),
      catchError((err: HttpErrorResponse) => this.handleTopCardsHttpError(err))
    );
  }

  /** GET …/Get_Top_Cards_with_Full_Card_Info/{gameId}/{callListId}/{inning}?topN= */
  getTopCardsWithFullCardInfo(
    gameId: number,
    callListId: number,
    inning: number,
    topN = 5
  ): Observable<BingoTopCard[]> {
    const params = new HttpParams().set('topN', String(topN));

    return this.http
      .get<unknown>(`${this.topCardsWithFullCardInfoApiBaseUrl}/${gameId}/${callListId}/${inning}`, { params })
      .pipe(
        map(response => this.normalizeTopCardsFromFullCardInfo(response)),
        catchError((err: HttpErrorResponse) => this.handleTopCardsHttpError(err))
      );
  }

  /** Full 5×5 card payloads for top-N cards (slide / print views). */
  getTopCardsAsPrintedCards(
    gameId: number,
    callListId: number,
    inning: number,
    topN = 5
  ): Observable<PrintedCard[]> {
    const params = new HttpParams().set('topN', String(topN));

    return this.http
      .get<unknown>(`${this.topCardsWithFullCardInfoApiBaseUrl}/${gameId}/${callListId}/${inning}`, { params })
      .pipe(
        map(response => this.groupTopCardsFullInfoIntoPrintedCards(this.extractArrayFromResponse(response))),
        catchError((err: HttpErrorResponse) => {
          if (err.status === 404) {
            return of<PrintedCard[]>([]);
          }

          throw err;
        })
      );
  }

  getCalledSongs(gameId: number): Observable<BingoCalledSong[]> {
    return this.http.get<unknown>(`${this.calledSongsApiUrl}?Game_ID=${gameId}`).pipe(
      map(response => this.normalizeCalledSongs(response))
    );
  }

  getCallListMaster(): Observable<BingoCallListMaster[]> {
    return this.http.get<unknown>(this.callListMasterApiUrl).pipe(
      map(response => this.normalizeCallListMaster(response))
    );
  }

  getCallListSongsByGci(gameId: number, callListId: number, inning: number): Observable<BingoCallListSongByGci[]> {
    return this.http.get<unknown>(`${this.callListSongsByGciApiUrl}/${gameId}/${callListId}/${inning}`).pipe(
      map(response => this.normalizeCallListSongsByGci(response))
    );
  }

  getSongsCalledCalculateByGci(
    gameId: number,
    callListId: number,
    inning: number
  ): Observable<BingoSongsCalledCalculateByGci> {
    return this.http
      .get<unknown>(`${this.songsCalledCalculateByGciApiBaseUrl}/${gameId}/${callListId}/${inning}`)
      .pipe(map(response => this.normalizeSongsCalledCalculateByGci(response, gameId, callListId, inning)));
  }

  getMaxGameCardFirstCard(
    gameId: number,
    callListId: number,
    inning: number
  ): Observable<BingoMaxGameCardFirstCard> {
    return this.http
      .get<unknown>(`${this.maxGameCardFirstCardApiBaseUrl}/${gameId}/${callListId}/${inning}`)
      .pipe(map(response => this.normalizeMaxGameCardFirstCard(response, gameId, callListId, inning)));
  }

  getCallListDropdownOptions(): Observable<LookupOption[]> {
    return this.http.get<unknown>(this.callListDropdownApiUrl).pipe(
      map(response => this.normalizeCallListDropdownOptions(response))
    );
  }

  insertCallListMaster(payload: BingoCallListCreate): Observable<BingoCallListCreate> {
    return this.http.post<unknown>(this.insertCallListMasterApiUrl, this.toCreateCallListApiPayload(payload)).pipe(
      map(response => this.normalizeCallListCreate(response, payload))
    );
  }

  private toCreateCallListApiPayload(payload: BingoCallListCreate): Record<string, unknown> {
    if (payload.UserID == null || payload.UserID <= 0) {
      throw new Error('User_ID is required. Log in before creating a call list.');
    }

    if (payload.GameID == null || payload.GameID <= 0) {
      throw new Error('Game_ID is required. Set Game_ID in Game Master or Console first.');
    }

    return {
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
  }

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

  /**
   * `GET …/Check_ForWinner/{Game_ID}/{Call_List_ID}/{Inning}/{NumOfSongsCalled}` — requires valid GCI + songs-called count.
   */
  checkForWinner(
    gameId: number,
    callListId: number | null,
    inning: number | null,
    numOfSongsCalled: number
  ): Observable<BingoWinnerResult[]> {
    return this.requestWinnerCheckWithGci(
      this.checkForWinnerApiBaseUrl,
      gameId,
      callListId,
      inning,
      numOfSongsCalled
    );
  }

  checkForWinner2Lines(
    gameId: number,
    callListId: number | null,
    inning: number | null,
    numOfSongsCalled: number
  ): Observable<BingoWinnerResult[]> {
    return this.requestWinnerCheckWithGci(
      this.checkForWinner2LinesApiBaseUrl,
      gameId,
      callListId,
      inning,
      numOfSongsCalled
    );
  }

  checkForWinner4Corners(
    gameId: number,
    callListId: number | null,
    inning: number | null,
    numOfSongsCalled: number
  ): Observable<BingoWinnerResult[]> {
    return this.requestWinnerCheckWithGci(
      this.checkForWinner4CornersApiBaseUrl,
      gameId,
      callListId,
      inning,
      numOfSongsCalled
    );
  }

  checkForWinnerBlackout(
    gameId: number,
    callListId: number | null,
    inning: number | null,
    numOfSongsCalled: number
  ): Observable<BingoWinnerResult[]> {
    return this.requestWinnerCheckWithGci(
      this.checkForWinnerBlackoutApiBaseUrl,
      gameId,
      callListId,
      inning,
      numOfSongsCalled
    );
  }

  /**
   * `POST …/Upsert_CallList_Winner/{Game_ID}/{Call_List_ID}/{Inning}/{Call_List_WinningCard}/{NumofSongsCalled}?winningPattern=…`
   */
  upsertCallListWinner(
    gameId: number,
    callListId: number,
    inning: number,
    callListWinningCard: number,
    numOfSongsCalled: number,
    winningPattern: string
  ): Observable<BingoUpsertCallListWinnerResult> {
    const url =
      `${this.upsertCallListWinnerApiBaseUrl}/${gameId}/${callListId}/${inning}/${callListWinningCard}/${numOfSongsCalled}/${encodeURIComponent(winningPattern.trim())}`;

    return this.http.post<unknown>(url, null).pipe(
      retry({ count: 1, delay: (err: HttpErrorResponse) => timer(err.status === 0 ? 1000 : 0) }),
      map(response => this.normalizeUpsertCallListWinnerResult(response))
    );
  }

  callSongByNumber(
    gameId: number,
    songId: number,
    callListId?: number | null,
    inning?: number | null
  ): Observable<BingoCallSongResult> {
    if (!Number.isFinite(gameId) || gameId <= 0) {
      return throwError(() => new Error('Invalid Game ID.'));
    }

    if (typeof callListId !== 'number' || !Number.isFinite(callListId) || callListId <= 0) {
      return throwError(() => new Error('Select a Call List before calling a song.'));
    }

    if (typeof inning !== 'number' || !Number.isFinite(inning) || inning <= 0) {
      return throwError(() => new Error('Select an Inning before calling a song.'));
    }

    if (!Number.isFinite(songId) || songId <= 0) {
      return throwError(() => new Error('Enter a valid Song ID.'));
    }

    const queryParams: Record<string, number> = {
      Game_ID: gameId,
      Call_List_ID: callListId,
      Inning: inning,
      Song_ID: songId
    };
    const url = `${this.callSongApiUrl}?Game_ID=${gameId}&Call_List_ID=${callListId}&Inning=${inning}&Song_ID=${songId}`;

    return defer(() => {
      if (environment.debugLogging) {
        console.log(
          '[BingoGameService] Call_TheSongNumber — single outbound GET (one Song_ID; no JSON body)',
          JSON.stringify(
            {
              method: 'GET',
              url,
              body: null,
              queryParams
            },
            null,
            2
          )
        );
      }
      return this.http.get<unknown>(url);
    }).pipe(
      map(response => this.normalizeCallSongResult(response, gameId, songId)),
      catchError((err: unknown) => {
        if (err instanceof Error && !(err instanceof HttpErrorResponse)) {
          return throwError(() => err);
        }

        if (err instanceof HttpErrorResponse) {
          return throwError(() => new Error(this.formatCallSongHttpError(err)));
        }

        return throwError(() => new Error('Failed to call song.'));
      })
    );
  }

  private formatCallSongHttpError(err: HttpErrorResponse): string {
    const body = err.error;
    if (body && typeof body === 'object' && !Array.isArray(body)) {
      const message = (body as Record<string, unknown>)['Message'] ?? (body as Record<string, unknown>)['message'];
      if (typeof message === 'string' && message.trim().length > 0) {
        return `Call song failed (HTTP ${err.status}): ${message.trim()}`;
      }
    }

    if (typeof body === 'string' && body.trim().length > 0) {
      return `Call song failed (HTTP ${err.status}): ${body.trim()}`;
    }

    if (err.status === 500) {
      return (
        'Call song failed (HTTP 500): server error. Usually the Song ID is not on this Game / Call List / Inning, ' +
        'or the database procedure failed. Check the Network tab request URL and verify the song exists for the current inning.'
      );
    }

    if (err.status === 404) {
      return 'Call song failed (HTTP 404): API route not found. Confirm Call_List_ID and Inning are included in the request.';
    }

    return `Call song failed (HTTP ${err.status || 'unknown'}).`;
  }

  insertCallListSong(payload: BingoCallListSongInsert): Observable<BingoCallListSongInsert> {
    return this.http.post<unknown>(this.insertCallListSongApiUrl, payload).pipe(
      map(response => this.normalizeCallListSongInsert(response, payload))
    );
  }

  insertCallListSongs(payload: BingoCallListSongInsert[]): Observable<BingoCallListSongInsert[]> {
    return this.http.post<unknown>(this.insertCallListSongsJsonApiUrl, payload).pipe(
      map(response => this.normalizeCallListSongInsertList(response, payload))
    );
  }

  private normalizeUpsertCallListWinnerResult(response: unknown): BingoUpsertCallListWinnerResult {
    const record = this.unwrapRecord(response) ?? {};
    const message = record['Message'] ?? record['message'];

    return {
      Message: typeof message === 'string' && message.trim().length > 0 ? message.trim() : 'OK'
    };
  }

  private normalizeWinnerResults(
    response: unknown,
    fallbackGameId: number,
    fallbackCallListId: number | null,
    fallbackInning: number | null,
    fallbackNumOfSongsCalled: number | null
  ): BingoWinnerResult[] {
    const rawItems = this.extractArrayFromResponse(response);
    if (rawItems.length === 0) {
      return [
        this.emptyWinnerCheckResult(
          fallbackGameId,
          fallbackCallListId,
          fallbackInning,
          fallbackNumOfSongsCalled
        )
      ];
    }

    return rawItems.map(item =>
      this.normalizeWinnerResultRow(
        item,
        fallbackGameId,
        fallbackCallListId,
        fallbackInning,
        fallbackNumOfSongsCalled
      )
    );
  }

  private normalizeWinnerResultRow(
    response: unknown,
    fallbackGameId: number,
    fallbackCallListId: number | null,
    fallbackInning: number | null,
    fallbackNumOfSongsCalled: number | null
  ): BingoWinnerResult {
    const record = this.unwrapRecord(response) ?? {};

    return {
      GameID: this.asNullableNumber(record['GameID'] ?? record['Game_ID'] ?? record['gameId']) ?? fallbackGameId,
      CallListID:
        this.asNullableNumber(record['CallListID'] ?? record['Call_List_ID'] ?? record['callListId']) ??
        fallbackCallListId,
      Inning: this.asNullableNumber(record['Inning'] ?? record['inning']) ?? fallbackInning,
      WinningCardID: this.asNullableNumber(
        record['WinningCardID'] ?? record['Winning_Card_ID'] ?? record['winningCardId']
      ),
      WinningPattern: (record['WinningPattern'] ??
        record['Winning_Pattern'] ??
        record['winningPattern'] ??
        null) as string | null,
      PlayerName: (record['PlayerName'] ?? record['Player_Name'] ?? record['playerName'] ?? null) as string | null,
      PlayerEmail: (record['PlayerEmail'] ?? record['Player_Email'] ?? record['playerEmail'] ?? null) as
        | string
        | null,
      WinningLineCount: this.asNullableNumber(
        record['WinningLineCount'] ?? record['winningLineCount'] ?? record['Winning_Line_Count']
      ),
      NumOfSongsCalled:
        this.asNullableNumber(
          record['NumOfSongsCalled'] ?? record['NumofSongsCalled'] ?? record['numOfSongsCalled']
        ) ?? fallbackNumOfSongsCalled,
      Result: (record['Result'] ?? record['result'] ?? null) as string | null
    };
  }

  /**
   * All `Check_ForWinner*` endpoints use `GET {base}/{Game_ID}/{Call_List_ID}/{Inning}/{NumOfSongsCalled}` and the same
   * `BingoWinnerResult` shape (including `Result` with a bingo message when applicable).
   */
  private requestWinnerCheckWithGci(
    apiBaseUrl: string,
    gameId: number,
    callListId: number | null,
    inning: number | null,
    numOfSongsCalled: number
  ): Observable<BingoWinnerResult[]> {
    if (
      typeof callListId !== 'number' ||
      !Number.isInteger(callListId) ||
      callListId <= 0 ||
      typeof inning !== 'number' ||
      !Number.isInteger(inning) ||
      inning <= 0 ||
      !Number.isInteger(numOfSongsCalled) ||
      numOfSongsCalled < 0
    ) {
      return of([this.emptyWinnerCheckResult(gameId, callListId, inning, numOfSongsCalled)]);
    }

    return this.http
      .get<unknown>(`${apiBaseUrl}/${gameId}/${callListId}/${inning}/${numOfSongsCalled}`)
      .pipe(
        map(response =>
          this.normalizeWinnerResults(response, gameId, callListId, inning, numOfSongsCalled)
        )
      );
  }

  private emptyWinnerCheckResult(
    gameId: number,
    callListId: number | null,
    inning: number | null,
    numOfSongsCalled: number | null = null
  ): BingoWinnerResult {
    return {
      GameID: gameId,
      CallListID: callListId,
      Inning: inning,
      WinningCardID: null,
      WinningPattern: null,
      PlayerName: null,
      PlayerEmail: null,
      WinningLineCount: null,
      NumOfSongsCalled: numOfSongsCalled,
      Result: null
    };
  }

  private normalizeCallListSongInsert(
    response: unknown,
    fallbackPayload: BingoCallListSongInsert
  ): BingoCallListSongInsert {
    const record = this.unwrapRecord(response) ?? {};

    return {
      CallListID: this.asNullableNumber(record['CallListID'] ?? record['CallListId'] ?? record['Call_List_ID']) ?? fallbackPayload.CallListID,
      Inning: this.asNullableNumber(record['Inning'] ?? record['inning']) ?? fallbackPayload.Inning,
      Song_ID: this.asNullableNumber(record['Song_ID'] ?? record['SongID'] ?? record['SongId'] ?? record['song_id']) ?? fallbackPayload.Song_ID,
      Title: this.asString(record['Title'] ?? record['title'], fallbackPayload.Title),
      Artist: this.asString(record['Artist'] ?? record['artist'], fallbackPayload.Artist),
      FeaturedArtist: this.asString(
        record['FeaturedArtist'] ?? record['featured_artist'],
        fallbackPayload.FeaturedArtist
      ),
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
    const candidates = ['data', 'Data', 'items', 'Items', 'result', 'Result', 'payload', 'Payload'];
    const record = this.asRecord(response);
    const listCandidate = record
      ? candidates.map(key => record[key]).find(value => Array.isArray(value))
      : undefined;
    const rawItems = Array.isArray(listCandidate)
      ? listCandidate
      : Array.isArray(response)
        ? response
        : response
          ? [response]
          : [];

    return rawItems
      .map((item: unknown, index: number) => {
        const record = this.asRecord(item);
        const songRecord = this.asRecord(record?.['Song']) ?? record;

        if (!songRecord) {
          return fallbackPayloads[index] ?? null;
        }

        return this.normalizeCallListSongInsert(songRecord, fallbackPayloads[index] ?? fallbackPayloads[0]);
      })
      .filter((item: BingoCallListSongInsert | null): item is BingoCallListSongInsert => item !== null);
  }

  private normalizeCallListCreate(response: unknown, fallbackPayload: BingoCallListCreate): BingoCallListCreate {
    const record = this.unwrapRecord(response) ?? {};

    return {
      NewCallListID: this.asNullableNumber(record['NewCallListID'] ?? record['ReturnValue']) ?? fallbackPayload.NewCallListID,
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

  private normalizeCallSongResult(
    response: unknown,
    fallbackGameId: number,
    fallbackSongId: number
  ): BingoCallSongResult {
    if (response === false || response === 'false') {
      throw new Error(
        'The server rejected this song call. The song may not be on this call list/inning, or it may already have been called.'
      );
    }

    const record = this.unwrapRecord(response) ?? this.asRecord(response);
    if (!record) {
      throw new Error(
        'Call song returned an unexpected response. Expected Game_ID, Song_ID, Called_ID, Cards_Checked, and Cards_Matched.'
      );
    }

    const calledId = this.asNullableNumber(record['Called_ID'] ?? record['calledId'] ?? record['CalledId']);
    if (calledId === null || calledId <= 0) {
      throw new Error(
        'Call song did not return a Called_ID. Confirm Game ID, Call List, Inning, and Song ID match the active game setup.'
      );
    }

    return {
      Game_ID: this.asNullableNumber(record['Game_ID'] ?? record['gameId'] ?? record['GameID']) ?? fallbackGameId,
      Song_ID: this.asNullableNumber(record['Song_ID'] ?? record['SongID'] ?? record['song_id']) ?? fallbackSongId,
      Song_Title: String(record['Song_Title'] ?? record['song_title'] ?? record['Title'] ?? record['title'] ?? ''),
      Song_Artist: String(record['Song_Artist'] ?? record['song_artist'] ?? record['Artist'] ?? record['artist'] ?? ''),
      Called_ID: calledId,
      Cards_Checked: this.asNullableNumber(record['Cards_Checked'] ?? record['cardsChecked']) ?? 0,
      Cards_Matched: this.asNullableNumber(record['Cards_Matched'] ?? record['cardsMatched']) ?? 0
    };
  }

  private normalizeSongResponse(response: unknown, fallbackSongId: number): Song | null {
    const candidates = ['data', 'Data', 'item', 'Item', 'result', 'Result', 'payload', 'Payload'];
    const record = this.asRecord(response);
    const nested = record
      ? candidates.map(k => this.asRecord(record[k])).find(v => v !== null) ?? record
      : null;

    if (!nested) return null;

    const songId = this.asNullableNumber(nested['song_id'] ?? nested['Song_ID'] ?? nested['SongID']) ?? fallbackSongId;
    const title = (nested['title'] ??
      nested['Title'] ??
      nested['Song_Title'] ??
      nested['SongName'] ??
      nested['song_name'] ??
      '') as string;
    const artist = (nested['artist'] ?? nested['Artist'] ?? nested['Song_Artist'] ?? '') as string;

    return {
      song_id: songId,
      title: String(title),
      artist: String(artist),
      play_count: 0,
      active: true
    };
  }

  callSongResultToSong(result: BingoCallSongResult): Song {
    return {
      song_id: result.Song_ID,
      title: result.Song_Title,
      artist: result.Song_Artist,
      play_count: 0,
      active: true
    };
  }

  private normalizeActionResult(
    response: unknown,
    fallbackGameId: number,
    fallbackCallListId?: number | null,
    fallbackInning?: number | null
  ): BingoGameActionResult {
    const record = this.unwrapRecord(response);

    return {
      Success: this.asBoolean(record?.['Success'] ?? record?.['success']),
      GameID: this.asNullableNumber(record?.['GameID'] ?? record?.['gameId']) ?? fallbackGameId,
      CallListID: this.asNullableNumber(record?.['CallListID'] ?? record?.['CallListId'] ?? record?.['Call_List_ID']) ?? fallbackCallListId ?? null,
      Inning: this.asNullableNumber(record?.['Inning'] ?? record?.['inning']) ?? fallbackInning ?? null,
      ReturnValue: this.asNullableNumber(record?.['ReturnValue'] ?? record?.['returnValue']) ?? 0
    };
  }

  private normalizeSongsCalledCalculateByGci(
    response: unknown,
    fallbackGameId: number,
    fallbackCallListId: number,
    fallbackInning: number
  ): BingoSongsCalledCalculateByGci {
    const record = this.unwrapRecord(response) ?? {};

    const rawList = record['CalledSongs'] ?? record['calledSongs'];
    let calledSongs: BingoCalledSongFromGci[] | undefined;
    if (Array.isArray(rawList)) {
      calledSongs = rawList
        .map(item => this.mapGciCalledSongRow(item))
        .filter((row): row is BingoCalledSongFromGci => row !== null);
    }

    return {
      SongsCalled: this.asNullableNumber(record['SongsCalled'] ?? record['songsCalled']) ?? 0,
      TotalSongs: this.asNullableNumber(record['TotalSongs'] ?? record['totalSongs']) ?? 0,
      SongsRemaining: this.asNullableNumber(record['SongsRemaining'] ?? record['songsRemaining']) ?? 0,
      Game_ID: this.asNullableNumber(record['Game_ID'] ?? record['GameID'] ?? record['gameId']) ?? fallbackGameId,
      Call_List_ID:
        this.asNullableNumber(record['Call_List_ID'] ?? record['CallListID'] ?? record['callListId']) ??
        fallbackCallListId,
      Inning: this.asNullableNumber(record['Inning'] ?? record['inning']) ?? fallbackInning,
      CalledSongs: calledSongs
    };
  }

  private mapGciCalledSongRow(item: unknown): BingoCalledSongFromGci | null {
    const row = this.asRecord(item);
    if (!row) {
      return null;
    }

    const songId = this.asNullableNumber(row['song_id'] ?? row['Song_ID'] ?? row['SongID']);
    if (songId === null) {
      return null;
    }

    const inning = this.asNullableNumber(row['Inning'] ?? row['inning']) ?? 0;
    const callListId = this.asNullableNumber(row['Call_List_ID'] ?? row['CallListID'] ?? row['callListId']) ?? 0;

    return {
      Inning: inning,
      Call_List_ID: callListId,
      song_id: songId,
      title: this.asString(row['title'] ?? row['Title'], ''),
      artist: this.asString(row['artist'] ?? row['Artist'], ''),
      DateTimeStamp: this.asNullableString(row['DateTimeStamp'] ?? row['dateTimeStamp']),
      ThisNumberAWinner: this.asString(row['ThisNumberAWinner'] ?? row['thisNumberAWinner'], 'False')
    };
  }

  private normalizeMaxGameCardFirstCard(
    response: unknown,
    fallbackGameId: number,
    fallbackCallListId: number,
    fallbackInning: number
  ): BingoMaxGameCardFirstCard {
    const r = this.unwrapRecord(response) ?? {};
    const cols = ['B', 'I', 'N', 'G', 'O'] as const;
    const rows = [1, 2, 3, 4, 5] as const;

    const header: BingoMaxGameCardHeader = {
      Card_ID: this.asNullableNumber(r['Card_ID'] ?? r['CardID'] ?? r['cardId']) ?? 0,
      Game_ID: this.asNullableNumber(r['Game_ID'] ?? r['GameID'] ?? r['gameId']) ?? fallbackGameId,
      Call_List_ID:
        this.asNullableNumber(r['Call_List_ID'] ?? r['CallListID'] ?? r['callListId']) ?? fallbackCallListId,
      Inning: this.asNullableNumber(r['Inning'] ?? r['inning']) ?? fallbackInning,
      Card_Date_Create: this.asNullableString(r['Card_Date_Create'] ?? r['CardDateCreate'] ?? r['cardDateCreate']),
      Card_PlayerName: this.asNullableString(r['Card_PlayerName'] ?? r['CardPlayerName'] ?? r['cardPlayerName']),
      Card_PlayerEmail: this.asNullableString(r['Card_PlayerEmail'] ?? r['CardPlayerEmail'] ?? r['cardPlayerEmail']),
      PlayCount: this.asNullableNumber(r['PlayCount'] ?? r['playCount']) ?? 0,
      Card_IsWinner: this.asBoolean(r['Card_IsWinner'] ?? r['CardIsWinner'] ?? r['cardIsWinner']),
      Card_SeedKey: this.asNullableString(r['Card_SeedKey'] ?? r['CardSeedKey'] ?? r['cardSeedKey']),
      Card_PrintedAt: this.asNullableString(r['Card_PrintedAt'] ?? r['CardPrintedAt'] ?? r['cardPrintedAt'])
    };

    const squares: Record<string, number | boolean | null> = {};
    for (const c of cols) {
      for (const n of rows) {
        const songKey = `Sq_${c}${n}`;
        const calledKey = `${songKey}_Called`;
        squares[songKey] = this.asNullableNumber(r[songKey]);
        squares[calledKey] = this.asBoolean(r[calledKey]);
      }
    }

    return { ...header, ...squares } as BingoMaxGameCardFirstCard;
  }

  private normalizeCalledSongs(response: unknown): BingoCalledSong[] {
    const candidates = ['data', 'Data', 'items', 'Items', 'result', 'Result', 'payload', 'Payload'];
    const record = this.asRecord(response);
    const listCandidate = record
      ? candidates.map(key => record[key]).find(value => Array.isArray(value))
      : undefined;
    const rawItems = Array.isArray(listCandidate)
      ? listCandidate
      : Array.isArray(response)
        ? response
        : response
          ? [response]
          : [];

    return rawItems
      .map(item => this.mapCalledSong(item))
      .filter((item): item is BingoCalledSong => item !== null);
  }

  private normalizeCallListMaster(response: unknown): BingoCallListMaster[] {
    const candidates = ['data', 'Data', 'items', 'Items', 'result', 'Result', 'payload', 'Payload'];
    const record = this.asRecord(response);
    const listCandidate = record
      ? candidates.map(key => record[key]).find(value => Array.isArray(value))
      : undefined;
    const rawItems = Array.isArray(listCandidate)
      ? listCandidate
      : Array.isArray(response)
        ? response
        : response
          ? [response]
          : [];

    return rawItems
      .map(item => this.mapCallListMaster(item))
      .filter((item): item is BingoCallListMaster => item !== null);
  }

  private normalizeCallListSongsByGci(response: unknown): BingoCallListSongByGci[] {
    const candidates = ['data', 'Data', 'items', 'Items', 'result', 'Result', 'payload', 'Payload'];
    const record = this.asRecord(response);
    const listCandidate = record
      ? candidates.map(key => record[key]).find(value => Array.isArray(value))
      : undefined;
    const rawItems = Array.isArray(listCandidate)
      ? listCandidate
      : Array.isArray(response)
        ? response
        : response
          ? [response]
          : [];

    return rawItems
      .map(item => this.mapCallListSongByGci(item))
      .filter((item): item is BingoCallListSongByGci => item !== null);
  }

  private normalizeCallListDropdownOptions(response: unknown): LookupOption[] {
    const candidates = ['data', 'Data', 'items', 'Items', 'result', 'Result', 'payload', 'Payload'];
    const record = this.asRecord(response);
    const listCandidate = record
      ? candidates.map(key => record[key]).find(value => Array.isArray(value))
      : undefined;
    const rawItems = Array.isArray(listCandidate)
      ? listCandidate
      : Array.isArray(response)
        ? response
        : response
          ? [response]
          : [];

    return rawItems
      .map(item => this.mapCallListDropdownOption(item))
      .filter((item): item is LookupOption => item !== null);
  }

  private handleTopCardsHttpError(err: HttpErrorResponse): Observable<BingoTopCard[]> {
    if (err.status === 404) {
      return of<BingoTopCard[]>([]);
    }

    throw err;
  }

  private groupTopCardsFullInfoIntoPrintedCards(rawItems: unknown[]): PrintedCard[] {
    const cards = new Map<number, PrintedCard>();
    const cardRank = new Map<number, number>();

    for (const item of rawItems) {
      const record = this.asRecord(item);
      const row = this.mapFullCardInfoRow(item);

      if (!record || !row) {
        continue;
      }

      const rank = this.asNullableNumber(record['CardRank'] ?? record['cardRank']);

      if (rank !== null && !cardRank.has(row.CardID)) {
        cardRank.set(row.CardID, rank);
      }

      const existing = cards.get(row.CardID);

      if (existing) {
        existing.Squares.push(this.mapFullCardInfoSquare(row));
        continue;
      }

      cards.set(row.CardID, {
        CardID: row.CardID,
        GameID: row.GameID,
        CallListID: row.CallListID,
        Inning: row.Inning,
        UserID: row.UserID,
        GameNumber: row.GameNumber,
        GameName: row.GameName,
        GameWinPattern: row.GameWinPattern,
        CardDateCreate: row.CardDateCreate,
        CardPlayerName: row.CardPlayerName,
        CardPlayerEmail: row.CardPlayerEmail,
        PlayCount: row.PlayCount,
        CardIsWinner: row.CardIsWinner,
        CardSeedKey: row.CardSeedKey,
        CardPrintedAt: row.CardPrintedAt,
        Squares: [this.mapFullCardInfoSquare(row)]
      });
    }

    return Array.from(cards.values())
      .map(card => ({
        ...card,
        Squares: [...card.Squares].sort((left, right) => left.SquarePosition - right.SquarePosition)
      }))
      .sort(
        (left, right) =>
          (cardRank.get(left.CardID) ?? Number.MAX_SAFE_INTEGER) -
          (cardRank.get(right.CardID) ?? Number.MAX_SAFE_INTEGER)
      );
  }

  private mapFullCardInfoRow(item: unknown): PrintedCardResultRow | null {
    const record = this.asRecord(item);

    if (!record) {
      return null;
    }

    const cardId = this.asNullableNumber(record['CardID'] ?? record['Card_ID'] ?? record['cardId']);
    const gameId = this.asNullableNumber(record['GameID'] ?? record['Game_ID']);
    const callListId = this.asNullableNumber(record['Call_List_ID'] ?? record['CallListID'] ?? record['CallListId']);
    const inning = this.asNullableNumber(record['Inning'] ?? record['inning']);
    const squarePosition = this.asNullableNumber(record['SquarePosition']);
    const rowNumber = this.asNullableNumber(record['RowNumber']);
    const columnLetter = this.asBingoColumnLetter(record['ColumnLetter']);
    const gameNumberRaw = record['GameNumber'] ?? record['gameNumber'];
    const gameNumber =
      typeof gameNumberRaw === 'string'
        ? gameNumberRaw
        : typeof gameNumberRaw === 'number'
          ? String(gameNumberRaw)
          : null;
    const squareCode = this.asNullableString(record['SquareCode']);

    if (
      cardId === null ||
      gameId === null ||
      squarePosition === null ||
      rowNumber === null ||
      columnLetter === null ||
      gameNumber === null ||
      squareCode === null
    ) {
      return null;
    }

    return {
      CardID: cardId,
      GameID: gameId,
      CallListID: callListId,
      Inning: inning,
      UserID: 0,
      GameNumber: gameNumber,
      GameName: this.asNullableString(record['GameName'] ?? record['gameName']),
      GameWinPattern: this.asNullableString(record['GameWinPattern'] ?? record['gameWinPattern']),
      CardDateCreate: this.asString(record['CardDateCreate'] ?? record['cardDateCreate']),
      CardPlayerName: this.asNullableString(record['CardPlayerName'] ?? record['cardPlayerName']),
      CardPlayerEmail: this.asNullableString(record['CardPlayerEmail'] ?? record['cardPlayerEmail']),
      PlayCount: this.asNullableNumber(record['PlayCount'] ?? record['playCount']) ?? 0,
      CardIsWinner: this.asBoolean(record['CardIsWinner'] ?? record['cardIsWinner']),
      CardSeedKey: this.asNullableString(record['CardSeedKey'] ?? record['cardSeedKey']),
      CardPrintedAt: this.asNullableString(record['CardPrintedAt'] ?? record['cardPrintedAt']),
      SquareCode: squareCode,
      SquarePosition: squarePosition,
      ColumnLetter: columnLetter,
      RowNumber: rowNumber,
      SongID: this.asNullableNumber(record['SongID'] ?? record['songId']),
      SongTitle: this.asNullableString(record['SongTitle'] ?? record['songTitle']),
      SongArtist: this.asNullableString(record['SongArtist'] ?? record['songArtist']),
      IsCalled: this.asBoolean(record['IsCalled'] ?? record['isCalled']),
      IsFreeSpace: this.asBoolean(record['IsFreeSpace'] ?? record['isFreeSpace'])
    };
  }

  private mapFullCardInfoSquare(row: PrintedCardResultRow): PrintedCardSquare {
    return {
      SquareCode: row.SquareCode,
      SquarePosition: row.SquarePosition,
      ColumnLetter: row.ColumnLetter,
      RowNumber: row.RowNumber,
      Song:
        row.SongID === null
          ? null
          : {
              SongID: row.SongID,
              SongName: row.SongTitle ?? '',
              SongArtist: row.SongArtist ?? ''
            },
      IsCalled: row.IsCalled,
      IsFreeSpace: row.IsFreeSpace
    };
  }

  private asBingoColumnLetter(value: unknown): BingoColumnLetter | null {
    const letter = typeof value === 'string' ? value.trim().toUpperCase() : '';

    if (letter === 'B' || letter === 'I' || letter === 'N' || letter === 'G' || letter === 'O') {
      return letter;
    }

    return null;
  }

  private normalizeTopCardsFromFullCardInfo(response: unknown): BingoTopCard[] {
    const rawItems = this.extractArrayFromResponse(response);
    const byCard = new Map<number, BingoTopCard>();

    for (const item of rawItems) {
      const record = this.asRecord(item);

      if (!record) {
        continue;
      }

      const cardId = this.asNullableNumber(record['CardID'] ?? record['Card_ID'] ?? record['cardId']);
      const calledCount = this.asNullableNumber(
        record['Called_Count'] ?? record['CalledCount'] ?? record['calledCount']
      );

      if (cardId === null || calledCount === null) {
        continue;
      }

      if (byCard.has(cardId)) {
        continue;
      }

      byCard.set(cardId, {
        CardID: cardId,
        CalledCount: calledCount,
        CardRank: this.asNullableNumber(record['CardRank'] ?? record['cardRank']) ?? undefined,
        GameID: this.asNullableNumber(record['GameID'] ?? record['Game_ID']) ?? undefined,
        GameNumber: this.asNullableNumber(record['GameNumber'] ?? record['gameNumber']) ?? undefined,
        GameName: this.asNullableString(record['GameName'] ?? record['gameName']),
        GameWinPattern: this.asNullableString(record['GameWinPattern'] ?? record['gameWinPattern']),
        CardIsWinner: this.asBoolean(record['CardIsWinner'] ?? record['cardIsWinner'])
      });
    }

    return Array.from(byCard.values()).sort(
      (left, right) => (left.CardRank ?? Number.MAX_SAFE_INTEGER) - (right.CardRank ?? Number.MAX_SAFE_INTEGER)
    );
  }

  private extractArrayFromResponse(response: unknown): unknown[] {
    const candidates = ['data', 'Data', 'items', 'Items', 'result', 'Result', 'payload', 'Payload'];
    const record = this.asRecord(response);
    const listCandidate = record
      ? candidates.map(key => record[key]).find(value => Array.isArray(value))
      : undefined;

    return Array.isArray(listCandidate)
      ? listCandidate
      : Array.isArray(response)
        ? response
        : response
          ? [response]
          : [];
  }

  private normalizeTopCards(response: unknown): BingoTopCard[] {
    const rawItems = this.extractArrayFromResponse(response);

    return rawItems
      .map(item => this.mapTopCard(item))
      .filter((item): item is BingoTopCard => item !== null);
  }

  private mapCalledSong(item: unknown): BingoCalledSong | null {
    const record = this.asRecord(item);

    if (!record) {
      return null;
    }

    const songId = this.asNullableNumber(record['SongID'] ?? record['songId'] ?? record['song_id']);
    const songTitle = record['SongTitle'] ?? record['songTitle'] ?? record['Title'];
    const songArtist = record['SongArtist'] ?? record['songArtist'] ?? record['Artist'];

    if (songId === null) {
      return null;
    }

    return {
      SongID: songId,
      SongTitle: typeof songTitle === 'string' ? songTitle : '',
      SongArtist: typeof songArtist === 'string' ? songArtist : ''
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

  private mapCallListDropdownOption(item: unknown): LookupOption | null {
    const record = this.asRecord(item);

    if (!record) {
      return null;
    }

    const id = this.asNullableNumber(record['Call_List_ID'] ?? record['CallListID']);
    const name = this.asNullableString(record['Call_List_Description'] ?? record['CallListDescription']);

    if (id === null || name === null) {
      return null;
    }

    return {
      Id: id,
      Name: name
    };
  }

  private mapCallListSongByGci(item: unknown): BingoCallListSongByGci | null {
    const record = this.asRecord(item);

    if (!record) {
      return null;
    }

    const inning = this.asNullableNumber(record['Inning'] ?? record['inning']);
    const callListId = this.asNullableNumber(record['Call_List_ID'] ?? record['CallListID'] ?? record['CallListId']);
    const songId = this.asNullableNumber(record['song_id'] ?? record['Song_ID'] ?? record['SongID']);
    const title = this.asNullableString(record['title'] ?? record['Title']);
    const artist = this.asNullableString(record['artist'] ?? record['Artist']);

    if (inning === null || callListId === null || songId === null || title === null || artist === null) {
      return null;
    }

    return {
      Inning: inning,
      Call_List_ID: callListId,
      song_id: songId,
      title,
      artist,
      genre: this.asNullableString(record['genre'] ?? record['Genre']),
      release_year: this.asNullableNumber(record['release_year'] ?? record['ReleaseYear']),
      decade: this.asNullableString(record['decade'] ?? record['Decade']),
      era: this.asNullableString(record['era'] ?? record['Era']),
      last_played: this.asNullableString(record['last_played'] ?? record['LastPlayed'])
    };
  }

  private mapTopCard(item: unknown): BingoTopCard | null {
    const record = this.asRecord(item);

    if (!record) {
      return null;
    }

    const cardId = this.asNullableNumber(record['CardID'] ?? record['Card_ID'] ?? record['cardId']);
    const calledCount = this.asNullableNumber(
      record['CalledCount'] ?? record['Called_Count'] ?? record['calledCount']
    );

    if (cardId === null || calledCount === null) {
      return null;
    }

    return {
      CardID: cardId,
      CalledCount: calledCount
    };
  }

  private unwrapRecord(response: unknown): Record<string, unknown> | null {
    const record = this.asRecord(response);

    if (!record) {
      return null;
    }

    const candidates = ['data', 'Data', 'item', 'Item', 'result', 'Result', 'payload', 'Payload'];

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

  private asNullableString(value: unknown): string | null {
    return typeof value === 'string' ? value : null;
  }

  private asString(value: unknown, fallback = ''): string {
    return typeof value === 'string' ? value : fallback;
  }

  private asBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      return value !== 0;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      return normalized === 'true' || normalized === '1';
    }

    return false;
  }
}
