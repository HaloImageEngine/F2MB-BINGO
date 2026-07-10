import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { map, Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  McInfoArtistTypeCount,
  McInfoDecadeCount,
  McInfoEraCount,
  McInfoGenreCount,
  McInfoSongDuplicate
} from '../models/mcinfo.model';
import { OrderListItem } from '../models/order-list-item.model';

import { CallListSongCount } from '../models/calllist-song-count.model';

@Injectable({ providedIn: 'root' })
export class DashboardSummaryService {
  private readonly http = inject(HttpClient);
  private readonly countArtistTypeApiUrl = environment.bingoCountArtistTypeApiUrl;
  private readonly countDecadeApiUrl = environment.bingoCountDecadeApiUrl;
  private readonly countEraApiUrl = environment.bingoCountEraApiUrl;
  private readonly countGenreApiUrl = environment.bingoCountGenreApiUrl;
  private readonly checkSongDuplicateApiUrl = environment.bingoCheckSongDuplicateApiUrl;
  private readonly callListSongCountApiBaseUrl = environment.bingoCountCLIDApiUrl;
  private readonly liveOrdersCount = signal(0);
  private readonly totalSalesAmount = signal(0);
  private readonly activeDiscountsCount = signal(0);

  readonly liveOrders = computed(() => this.liveOrdersCount());
  readonly avgTicket = computed(() => {
    const liveOrders = this.liveOrdersCount();
    if (liveOrders <= 0) {
      return 0;
    }

    return this.totalSalesAmount() / liveOrders;
  });
  readonly marketingPushCount = computed(() => this.activeDiscountsCount());

  updateOrders(items: OrderListItem[]): void {
    const list = Array.isArray(items) ? items : [];
    this.liveOrdersCount.set(list.length);
    this.totalSalesAmount.set(list.reduce((sum, order) => sum + (order.TotalAmount || 0), 0));
  }

  updateActiveDiscountsCount(count: number): void {
    this.activeDiscountsCount.set(Math.max(0, count));
  }

  // ── Bingo count endpoints ─────────────────────────────────────────────────

  getCountByArtistType(): Observable<McInfoArtistTypeCount[]> {
    return this.http.get<unknown>(this.countArtistTypeApiUrl).pipe(
      map(response => this.normalizeArtistTypeCounts(response))
    );
  }

  getCountByDecade(): Observable<McInfoDecadeCount[]> {
    return this.http.get<unknown>(this.countDecadeApiUrl).pipe(
      map(response => this.normalizeDecadeCounts(response))
    );
  }

  getCountByEra(): Observable<McInfoEraCount[]> {
    return this.http.get<unknown>(this.countEraApiUrl).pipe(
      map(response => this.normalizeEraCounts(response))
    );
  }

  getCountByGenre(): Observable<McInfoGenreCount[]> {
    return this.http.get<unknown>(this.countGenreApiUrl).pipe(
      map(response => this.normalizeGenreCounts(response))
    );
  }

  getSongDuplicateCheck(): Observable<McInfoSongDuplicate[]> {
    return this.http.get<unknown>(this.checkSongDuplicateApiUrl).pipe(
      map(response => this.normalizeSongDuplicates(response))
    );
  }

  /**
   * Get the song count for a given CallListID and Inning.
   * @param callListId The CallListID (number)
   * @param inning The Inning (number)
   * @returns Observable<CallListSongCount>
   */
  getCallListSongCount(callListId: number, inning: number): Observable<CallListSongCount> {
    const url = `${this.callListSongCountApiBaseUrl}/${callListId}/${inning}`;
    return this.http.get<CallListSongCount>(url);
  }

  // ── Normalizers ───────────────────────────────────────────────────────────

  private normalizeSongDuplicates(response: unknown): McInfoSongDuplicate[] {
    return this.unwrapArray(response)
      .map(item => this.mapSongDuplicate(item))
      .filter((item): item is McInfoSongDuplicate => item !== null);
  }

  private mapSongDuplicate(item: unknown): McInfoSongDuplicate | null {
    const record = this.asRecord(item);
    if (!record) return null;

    return {
      song_id: this.asNullableNumber(record['song_id'] ?? record['SongID'] ?? record['songId']),
      title: this.asNullableString(record['title'] ?? record['Title']),
      artist: this.asNullableString(record['artist'] ?? record['Artist']),
      featured_artist: this.asNullableString(record['featured_artist'] ?? record['FeaturedArtist'] ?? record['featuredArtist']),
      lead_vocalist: this.asNullableString(record['lead_vocalist'] ?? record['LeadVocalist'] ?? record['leadVocalist']),
      genre: this.asNullableString(record['genre'] ?? record['Genre']),
      subgenre: this.asNullableString(record['subgenre'] ?? record['Subgenre']),
      release_year: this.asNullableNumber(record['release_year'] ?? record['ReleaseYear'] ?? record['releaseYear']),
      decade: this.asNullableString(record['decade'] ?? record['Decade']),
      bingo_category: this.asNullableString(record['bingo_category'] ?? record['BingoCategory'] ?? record['bingoCategory']),
      active: this.asNullableBoolean(record['active'] ?? record['Active']),
      created_at: this.asNullableString(record['created_at'] ?? record['CreatedAt'] ?? record['createdAt']),
      updated_at: this.asNullableString(record['updated_at'] ?? record['UpdatedAt'] ?? record['updatedAt']),
      Duplicate_Count: this.asNullableNumber(record['Duplicate_Count'] ?? record['duplicate_count'] ?? record['duplicateCount']),
      Match_Type: this.asNullableString(record['Match_Type'] ?? record['match_type'] ?? record['matchType'])
    };
  }

  private normalizeEraCounts(response: unknown): McInfoEraCount[] {
    return this.unwrapArray(response)
      .map(item => this.mapEraCount(item))
      .filter((item): item is McInfoEraCount => item !== null);
  }

  private mapEraCount(item: unknown): McInfoEraCount | null {
    const record = this.asRecord(item);
    if (!record) return null;

    const era = this.asString(record['Era'] ?? record['era']);
    const songCount = this.asNullableNumber(record['SongCount'] ?? record['songCount'] ?? record['song_count']);

    if (!era || songCount === null) return null;

    return { Era: era, SongCount: songCount };
  }

  private normalizeGenreCounts(response: unknown): McInfoGenreCount[] {
    return this.unwrapArray(response)
      .map(item => this.mapGenreCount(item))
      .filter((item): item is McInfoGenreCount => item !== null);
  }

  private mapGenreCount(item: unknown): McInfoGenreCount | null {
    const record = this.asRecord(item);
    if (!record) return null;

    const genre = this.asString(record['Genre'] ?? record['genre']);
    const songCount = this.asNullableNumber(record['SongCount'] ?? record['songCount'] ?? record['song_count']);

    if (!genre || songCount === null) return null;

    return { Genre: genre, SongCount: songCount };
  }

  private normalizeDecadeCounts(response: unknown): McInfoDecadeCount[] {
    return this.unwrapArray(response)
      .map(item => this.mapDecadeCount(item))
      .filter((item): item is McInfoDecadeCount => item !== null);
  }

  private mapDecadeCount(item: unknown): McInfoDecadeCount | null {
    const record = this.asRecord(item);
    if (!record) return null;

    const decade = this.asString(record['Decade'] ?? record['decade']);
    const songCount = this.asNullableNumber(record['SongCount'] ?? record['songCount'] ?? record['song_count']);

    if (!decade || songCount === null) return null;

    return { Decade: decade, SongCount: songCount };
  }

  private normalizeArtistTypeCounts(response: unknown): McInfoArtistTypeCount[] {
    return this.unwrapArray(response)
      .map(item => this.mapArtistTypeCount(item))
      .filter((item): item is McInfoArtistTypeCount => item !== null);
  }

  private mapArtistTypeCount(item: unknown): McInfoArtistTypeCount | null {
    const record = this.asRecord(item);
    if (!record) return null;

    const artistType = this.asString(record['ArtistType'] ?? record['artistType'] ?? record['artist_type']);
    const songCount = this.asNullableNumber(record['SongCount'] ?? record['songCount'] ?? record['song_count']);

    if (!artistType || songCount === null) return null;

    return { ArtistType: artistType, SongCount: songCount };
  }

  // ── Utility helpers ───────────────────────────────────────────────────────

  private unwrapArray(response: unknown): unknown[] {
    if (Array.isArray(response)) return response;

    const record = this.asRecord(response);
    if (!record) return [];

    const candidates = ['data', 'Data', 'items', 'Items', 'result', 'Result', 'payload', 'Payload'];
    const found = candidates.map(k => record[k]).find(v => Array.isArray(v));
    return Array.isArray(found) ? found : [];
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  }

  private asString(value: unknown, fallback = ''): string {
    return typeof value === 'string' ? value : fallback;
  }

  private asNullableString(value: unknown): string | null {
    return typeof value === 'string' ? value : null;
  }

  private asNullableBoolean(value: unknown): boolean | null {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true') return true;
      if (normalized === 'false') return false;
    }
    if (typeof value === 'number') {
      if (value === 1) return true;
      if (value === 0) return false;
    }
    return null;
  }

  private asNullableNumber(value: unknown): number | null {
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && value.trim() !== '') {
      const n = Number(value);
      return isNaN(n) ? null : n;
    }
    return null;
  }
}
