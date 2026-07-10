import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../environments/environment';
import { groupCallListSongsByInning } from '../models/call-list-songs-four-column-view.model';
import { BingoCallListSong, BingoCallListSongsBy4Inning } from '../models/bingo-game.model';
import { GenreEnumDropdown } from '../models/genre-enum-dropdown.model';
import { LookupOption } from '../models/lookup-option.model';
import { ModelSongDisplay } from '../models/model-song-display.model';
import { ModelSongInsertResult } from '../models/model-song-insert-result.model';
import { ModelSongInsert } from '../models/model-song-insert.model';

@Injectable({ providedIn: 'root' })
export class SongService {
  private readonly http = inject(HttpClient);
  private readonly getAllSongsUrl = environment.bingoSongsApiUrl;
  private readonly insertSongUrl = environment.bingoInsertSongApiUrl;
  private readonly insertSongsUrl = environment.bingoInsertSongsApiUrl;
  private readonly artistTypesUrl = environment.bingoArtistTypesApiUrl;
  private readonly genreUrl = environment.bingoGenreApiUrl;
  private readonly dropDownGenreEnumUrl = environment.bingoDropDownGenreEnumApiUrl;
  private readonly tempoUrl = environment.bingoTempoApiUrl;
  private readonly decadeUrl = environment.bingoDecadeApiUrl;
  private readonly eraUrl = environment.bingoEraApiUrl;
  private readonly streamingEraUrl = environment.bingoStreamingEraApiUrl;
  private readonly difficultyUrl = environment.bingoDifficultyApiUrl;
  private readonly callListSongsBy4InningApiBaseUrl = environment.bingoCallListSongsBy4InningApiBaseUrl;

  /**
   * `GET …/Get_Call_List_Songs_by4Inning/{Game_ID}/{Call_List_ID}`
   */
  getCallListSongsBy4Inning(gameId: number, callListId: number): Observable<BingoCallListSongsBy4Inning> {
    return this.http
      .get<unknown>(`${this.callListSongsBy4InningApiBaseUrl}/${gameId}/${callListId}`)
      .pipe(map(response => this.normalizeCallListSongsBy4Inning(response)));
  }

  getSongs(): Observable<ModelSongDisplay[]> {
    return this.http.get(this.getAllSongsUrl, { responseType: 'text' }).pipe(
      map(response => this.parseSongsResponse(response))
    );
  }

  insertSong(song: ModelSongInsert): Observable<ModelSongInsertResult> {
    return this.http.post<unknown>(this.insertSongUrl, this.buildSongInsertPayload(song)).pipe(
      map(response => this.mapSongInsertResult(response))
    );
  }

  insertSongs(songs: ModelSongInsert[] | string): Observable<ModelSongInsertResult[]> {
    return this.http.post<unknown>(this.insertSongsUrl, this.normalizeSongInsertPayloads(songs)).pipe(
      map(response => this.normalizeSongInsertResults(response))
    );
  }

  getArtistTypes(): Observable<LookupOption[]> {
    return this.http.get<unknown>(this.artistTypesUrl).pipe(
      map(response => this.normalizeLookupOptions(response))
    );
  }

  /**
   * `GET …/Bingo/Lookups/Get_DropDown_Genre_Enum`
   * Returns genre enum rows (`ID`, `Category`, `Description`, `Sequence`).
   */
  getDropDownGenreEnum(): Observable<GenreEnumDropdown[]> {
    return this.http.get<unknown>(this.dropDownGenreEnumUrl).pipe(
      map(response => this.normalizeGenreEnumDropdowns(response))
    );
  }

  getGenreOptions(): Observable<LookupOption[]> {
    return this.http.get<unknown>(this.genreUrl).pipe(
      map(response => this.normalizeLookupOptions(response))
    );
  }

  getTempoOptions(): Observable<LookupOption[]> {
    return this.http.get<unknown>(this.tempoUrl).pipe(
      map(response => this.normalizeLookupOptions(response))
    );
  }

  getDecadeOptions(): Observable<LookupOption[]> {
    return this.http.get<unknown>(this.decadeUrl).pipe(
      map(response => this.normalizeLookupOptions(response))
    );
  }

  getEraOptions(): Observable<LookupOption[]> {
    return this.http.get<unknown>(this.eraUrl).pipe(
      map(response => this.normalizeLookupOptions(response))
    );
  }

  getStreamingEraOptions(): Observable<LookupOption[]> {
    return this.http.get<unknown>(this.streamingEraUrl).pipe(
      map(response => this.normalizeLookupOptions(response))
    );
  }

  getDifficultyOptions(): Observable<LookupOption[]> {
    return this.http.get<unknown>(this.difficultyUrl).pipe(
      map(response => this.normalizeLookupOptions(response))
    );
  }

  getSongById(songId: number): Observable<ModelSongDisplay | null> {
    return this.getSongs().pipe(
      map(songs => songs.find(song => song.song_id === songId) ?? null)
    );
  }

  getSongRouteId(song: Pick<ModelSongDisplay, 'song_id'>): string {
    return String(song.song_id ?? '');
  }

  private parseSongsResponse(response: string): ModelSongDisplay[] {
    const normalized = response.trim();

    if (normalized.length === 0) {
      return [];
    }

    if (normalized.startsWith('<')) {
      return this.parseSongsXml(normalized);
    }

    try {
      return this.normalizeSongs(JSON.parse(normalized));
    } catch {
      return [];
    }
  }

  private normalizeCallListSongsBy4Inning(response: unknown): BingoCallListSongsBy4Inning {
    const record = this.unwrapInningGroupedRecord(response);
    const grouped: BingoCallListSongsBy4Inning = {
      Inning1: this.normalizeCallListSongs(record['Inning1'] ?? record['inning1']),
      Inning2: this.normalizeCallListSongs(record['Inning2'] ?? record['inning2']),
      Inning3: this.normalizeCallListSongs(record['Inning3'] ?? record['inning3']),
      Inning4: this.normalizeCallListSongs(record['Inning4'] ?? record['inning4'])
    };

    const total =
      grouped.Inning1.length +
      grouped.Inning2.length +
      grouped.Inning3.length +
      grouped.Inning4.length;
    if (total > 0) {
      return grouped;
    }

    const flat = this.normalizeCallListSongs(response);
    if (flat.length > 0) {
      return groupCallListSongsByInning(flat);
    }

    return grouped;
  }

  private unwrapInningGroupedRecord(response: unknown): Record<string, unknown> {
    const record = this.asRecord(response) ?? {};
    const wrappers = ['value', 'Value', 'data', 'Data', 'result', 'Result', 'payload', 'Payload'];

    for (const key of wrappers) {
      const nested = this.asRecord(record[key]);
      if (nested && this.hasInningBuckets(nested)) {
        return nested;
      }
    }

    return record;
  }

  private hasInningBuckets(record: Record<string, unknown>): boolean {
    return (
      Array.isArray(record['Inning1']) ||
      Array.isArray(record['inning1']) ||
      Array.isArray(record['Inning2']) ||
      Array.isArray(record['inning2'])
    );
  }

  private normalizeCallListSongs(response: unknown): BingoCallListSong[] {
    const items = Array.isArray(response) ? response : this.extractCollection(response);

    return items
      .map(item => this.mapCallListSong(item))
      .filter((item): item is BingoCallListSong => item !== null);
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
      featured_artist: this.asCallListNullableString(record['featured_artist'] ?? record['FeaturedArtist']),
      lead_vocalist: this.asCallListNullableString(record['lead_vocalist'] ?? record['LeadVocalist']),
      artist_type: this.asCallListNullableString(record['artist_type'] ?? record['ArtistType']),
      genre: this.asCallListNullableString(record['genre'] ?? record['Genre']),
      explicit: this.asBoolean(record['explicit'] ?? record['Explicit']),
      release_year: this.asNullableNumber(record['release_year'] ?? record['ReleaseYear']),
      decade: this.asCallListNullableString(record['decade'] ?? record['Decade']),
      era: this.asCallListNullableString(record['era'] ?? record['Era']),
      last_played: this.asCallListNullableString(record['last_played'] ?? record['LastPlayed'])
    };
  }

  private normalizeLookupOptions(response: unknown): LookupOption[] {
    const rawItems = this.extractCollection(response);

    return rawItems
      .map(item => this.mapLookupOption(item))
      .filter((item): item is LookupOption => item !== null);
  }

  private normalizeGenreEnumDropdowns(response: unknown): GenreEnumDropdown[] {
    return this.extractCollection(response)
      .map(item => this.mapGenreEnumDropdown(item))
      .filter((item): item is GenreEnumDropdown => item !== null)
      .sort((left, right) => {
        const leftSeq = left.Sequence ?? Number.MAX_SAFE_INTEGER;
        const rightSeq = right.Sequence ?? Number.MAX_SAFE_INTEGER;
        if (leftSeq !== rightSeq) {
          return leftSeq - rightSeq;
        }

        return left.Category.localeCompare(right.Category, undefined, { sensitivity: 'base' });
      });
  }

  private mapGenreEnumDropdown(item: unknown): GenreEnumDropdown | null {
    const record = this.asRecord(item);

    if (!record) {
      return null;
    }

    const id = this.asNullableNumber(record['ID'] ?? record['Id'] ?? record['id']);
    const category = this.asNullableString(record['Category'] ?? record['category'] ?? record['Name'] ?? record['name']);

    if (id === null || !category) {
      return null;
    }

    return {
      ID: id,
      Category: category,
      Description: this.asNullableString(record['Description'] ?? record['description']),
      Sequence: this.asNullableNumber(record['Sequence'] ?? record['sequence'])
    };
  }

  private normalizeSongs(response: unknown): ModelSongDisplay[] {
    const rawItems = this.extractCollection(response);

    return rawItems
      .map(item => this.mapSong(item))
      .filter((item): item is ModelSongDisplay => item !== null);
  }

  private parseSongsXml(xml: string): ModelSongDisplay[] {
    const document = this.parseXmlDocument(xml);

    if (!document) {
      return [];
    }

    return Array.from(document.getElementsByTagName('ModelSongsDisplay'))
      .map(node => this.mapSong(this.xmlNodeToRecord(node)))
      .filter((item): item is ModelSongDisplay => item !== null);
  }

  private mapSong(item: unknown): ModelSongDisplay | null {
    const record = this.asRecord(item);

    if (!record) {
      return null;
    }

    return {
      song_id: this.asNullableNumber(record['song_id']),
      Title: this.asNullableString(record['Title']),
      Artist: this.asNullableString(record['Artist']),
      ArtistType: this.asNullableString(record['ArtistType']),
      Genre: this.asNullableString(record['Genre']),
      Subgenre: this.asNullableString(record['Subgenre']),
      Mood: this.asNullableString(record['Mood']),
      Tempo: this.asNullableString(record['Tempo']),
      ReleaseYear: this.asNullableNumber(record['ReleaseYear']),
      Decade: this.asNullableString(record['Decade']),
      Era: this.asNullableString(record['Era']),
      BingoCategory: this.asNullableString(record['BingoCategory']),
      Difficulty: this.asNullableString(record['Difficulty']),
      ChartPeakPosition: this.asNullableNumber(record['ChartPeakPosition']),
      ChartCountry: this.asNullableString(record['ChartCountry']),
      LastPlayed: this.asNullableString(record['LastPlayed']),
      SpotifyPopularity: this.asNullableNumber(record['SpotifyPopularity']),
      DurationSeconds: this.asNullableNumber(record['DurationSeconds']),
      Active: this.asBoolean(record['Active'])
    };
  }

  private mapLookupOption(item: unknown): LookupOption | null {
    const record = this.asRecord(item);

    if (!record) {
      return null;
    }

    const id = this.asNullableNumber(record['Id'] ?? record['ID'] ?? record['id']);
    const name = this.asNullableString(record['Name'] ?? record['name'] ?? record['Category'] ?? record['category']);

    if (id === null && !name) {
      return null;
    }

    return {
      Id: id,
      Name: name
    };
  }

  private mapSongInsertResult(response: unknown): ModelSongInsertResult {
    const record = this.extractRecord(response);

    return {
      ReturnValue: this.asNullableNumber(record?.['ReturnValue']),
      Inserted: this.asBoolean(record?.['Inserted']),
      Message: this.asNullableString(record?.['Message'])
    };
  }

  private normalizeSongInsertResults(response: unknown): ModelSongInsertResult[] {
    return this.extractCollection(response).map(item => this.mapSongInsertResult(item));
  }

  private normalizeSongInsertPayloads(songs: ModelSongInsert[] | string): Record<string, unknown>[] {
    const parsedSongs = typeof songs === 'string'
      ? this.parseSongInsertJson(songs)
      : songs;

    return parsedSongs.map(song => this.buildSongInsertPayload(song));
  }

  private parseSongInsertJson(json: string): ModelSongInsert[] {
    const normalized = json.trim();

    if (normalized.length === 0) {
      return [];
    }

    const parsed = JSON.parse(normalized) as unknown;
    return this.extractCollection(parsed) as ModelSongInsert[];
  }

  private buildSongInsertPayload(song: ModelSongInsert): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      Title: song.Title,
      Artist: song.Artist,
      ArtistType: song.ArtistType,
      Genre: song.Genre,
      Subgenre: song.Subgenre,
      Mood: song.Mood,
      Tempo: song.Tempo,
      ReleaseYear: song.ReleaseYear,
      Decade: song.Decade,
      Era: song.Era,
      BingoCategory: song.BingoCategory,
      Difficulty: song.Difficulty,
      ChartPeakPosition: song.ChartPeakPosition,
      ChartCountry: song.ChartCountry,
      SpotifyPopularity: song.SpotifyPopularity,
      DurationSeconds: song.DurationSeconds,
      Active: song.Active
    };

    if (song.song_id !== undefined && song.song_id !== null) {
      payload['song_id'] = song.song_id;
    }

    return payload;
  }

  private parseXmlDocument(xml: string): Document | null {
    const parser = new DOMParser();
    const document = parser.parseFromString(xml, 'application/xml');

    return document.querySelector('parsererror') ? null : document;
  }

  private xmlNodeToRecord(node: Element): Record<string, unknown> {
    return Array.from(node.children).reduce<Record<string, unknown>>((record, child) => {
      const isNil = child.getAttributeNS('http://www.w3.org/2001/XMLSchema-instance', 'nil') === 'true';
      record[child.tagName] = isNil ? null : child.textContent?.trim() ?? null;
      return record;
    }, {});
  }

  private extractCollection(response: unknown): unknown[] {
    const candidates = ['value', 'Value', 'data', 'Data', 'items', 'Items', 'result', 'Result', 'payload', 'Payload'];
    const record = this.asRecord(response);
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

  private extractRecord(response: unknown): Record<string, unknown> | null {
    const candidates = ['data', 'Data', 'item', 'Item', 'result', 'Result', 'payload', 'Payload'];
    const record = this.asRecord(response);

    if (!record) {
      return null;
    }

    const nestedRecord = candidates
      .map(key => this.asRecord(record[key]))
      .find((value): value is Record<string, unknown> => value !== null);

    return nestedRecord ?? record;
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    return value !== null && typeof value === 'object' ? value as Record<string, unknown> : null;
  }

  private asString(value: unknown, fallback = ''): string {
    return typeof value === 'string' ? value : fallback;
  }

  private asNullableString(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value : null;
  }

  private asCallListNullableString(value: unknown): string | null {
    if (value === null) {
      return null;
    }

    return typeof value === 'string' ? value : null;
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
