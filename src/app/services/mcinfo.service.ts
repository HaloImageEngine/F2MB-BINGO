import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { McInfoArtistTypeCount } from '../models/mcinfo.model';

@Injectable({ providedIn: 'root' })
export class McInfoService {
  private readonly http = inject(HttpClient);
  private readonly countArtistTypeApiUrl = environment.bingoCountArtistTypeApiUrl;

  getCountByArtistType(): Observable<McInfoArtistTypeCount[]> {
    return this.http.get<unknown>(this.countArtistTypeApiUrl).pipe(
      map(response => this.normalizeArtistTypeCounts(response))
    );
  }

  // ── Normalizers ───────────────────────────────────────────────────────────

  private normalizeArtistTypeCounts(response: unknown): McInfoArtistTypeCount[] {
    const arr = this.unwrapArray(response);
    return arr
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

  private asNullableNumber(value: unknown): number | null {
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && value.trim() !== '') {
      const n = Number(value);
      return isNaN(n) ? null : n;
    }
    return null;
  }
}
