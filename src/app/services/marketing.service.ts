import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  MarketingQrAdPosition,
  MarketingQrSponsor,
  MarketingQrSponsorUpsert,
  MarketingQrSponsorUpsertResult
} from '../models/marketing-qr-sponsor.model';

export interface BuildQrSponsorUpsertOptions {
  qrid?: number;
  title: string;
  url: string;
  adPosition: MarketingQrAdPosition;
  contact?: string | null;
  phone?: string | null;
  contactUrl?: string | null;
  enterDate?: string;
  activeStartDate?: string;
  activeEndDate?: string;
}

const AD_POSITIONS: readonly MarketingQrAdPosition[] = ['AD1', 'AD2', 'AD3'];

@Injectable({ providedIn: 'root' })
export class MarketingService {
  private readonly http = inject(HttpClient);
  private readonly qrSponsorsApiUrl = environment.marketingQrSponsorsApiUrl;
  private readonly qrSponsorsUpsertApiUrl = environment.marketingQrSponsorsUpsertApiUrl;

  /**
   * `GET …/Marketing/qr-sponsors?qrid=0` returns all sponsors.
   * Pass a specific `qrid` to fetch one record.
   */
  getQrSponsors(qrid = 0): Observable<MarketingQrSponsor[]> {
    const params = new HttpParams().set('qrid', String(qrid));

    return this.http.get<unknown>(this.qrSponsorsApiUrl, { params }).pipe(
      map(response => this.normalizeQrSponsorList(response))
    );
  }

  /** Latest sponsor per ad position (by EnterDate, then QRID). */
  getLatestQrSponsorsByAdPosition(qrid = 0): Observable<Partial<Record<MarketingQrAdPosition, MarketingQrSponsor>>> {
    return this.getQrSponsors(qrid).pipe(
      map(sponsors => this.pickLatestByAdPosition(sponsors))
    );
  }

  /**
   * `POST …/Marketing/qr-sponsors/upsert`
   * Inserts when `QRID` is 0; updates when `QRID` is an existing id.
   */
  upsertQrSponsor(payload: MarketingQrSponsorUpsert): Observable<MarketingQrSponsorUpsertResult> {
    return this.http.post<unknown>(this.qrSponsorsUpsertApiUrl, payload).pipe(
      map(response => this.normalizeQrSponsorUpsertResult(response))
    );
  }

  /** Builds the JSON body expected by `qr-sponsors/upsert` (see `MarketingQrSponsorUpsert`). */
  buildQrSponsorUpsertPayload(options: BuildQrSponsorUpsertOptions): MarketingQrSponsorUpsert {
    const now = new Date().toISOString();
    const title = options.title.trim();
    const url = options.url.trim();

    return {
      QRID: options.qrid ?? 0,
      Title: title,
      URL: url,
      EnterDate: options.enterDate ?? now,
      ActiveStartDate: options.activeStartDate ?? now,
      ActiveEndDate: options.activeEndDate ?? now,
      Contact: options.contact?.trim() || title,
      Phone: options.phone?.trim() || null,
      ContactURL: options.contactUrl?.trim() || url,
      AdPosition: options.adPosition
    };
  }

  pickLatestByAdPosition(
    sponsors: MarketingQrSponsor[]
  ): Partial<Record<MarketingQrAdPosition, MarketingQrSponsor>> {
    const latest: Partial<Record<MarketingQrAdPosition, MarketingQrSponsor>> = {};

    for (const position of AD_POSITIONS) {
      const matches = sponsors.filter(
        (sponsor) => this.normalizeAdPosition(sponsor.AdPosition) === position
      );

      if (matches.length === 0) {
        continue;
      }

      matches.sort((left, right) => {
        const dateDiff =
          new Date(right.EnterDate).getTime() - new Date(left.EnterDate).getTime();
        if (dateDiff !== 0) {
          return dateDiff;
        }

        return right.QRID - left.QRID;
      });

      latest[position] = matches[0];
    }

    return latest;
  }

  private normalizeQrSponsorList(response: unknown): MarketingQrSponsor[] {
    return this.unwrapArray(response)
      .map(item => this.mapQrSponsor(item))
      .filter((item): item is MarketingQrSponsor => item !== null);
  }

  private mapQrSponsor(item: unknown): MarketingQrSponsor | null {
    const record = this.asRecord(item);
    if (!record) {
      return null;
    }

    const qrid = this.asNumber(record['QRID'] ?? record['qrid'], 0);
    const title = this.asString(record['Title'] ?? record['title']);
    const url = this.asString(record['URL'] ?? record['url']);

    if (!title || !url) {
      return null;
    }

    return {
      QRID: qrid,
      Title: title,
      URL: url,
      EnterDate: this.asString(record['EnterDate'] ?? record['enterDate']),
      ActiveStartDate: this.asString(record['ActiveStartDate'] ?? record['activeStartDate']),
      ActiveEndDate: this.asString(record['ActiveEndDate'] ?? record['activeEndDate']),
      Contact: this.asNullableString(record['Contact'] ?? record['contact']),
      Phone: this.asNullableString(record['Phone'] ?? record['phone']),
      ContactURL: this.asNullableString(record['ContactURL'] ?? record['contactURL'] ?? record['contactUrl']),
      AdPosition: this.normalizeAdPosition(record['AdPosition'] ?? record['adPosition'])
    };
  }

  private normalizeAdPosition(value: unknown): MarketingQrAdPosition | null {
    const raw = this.asString(value).toUpperCase();
    if (raw === 'AD1' || raw === 'AD2' || raw === 'AD3') {
      return raw;
    }

    return null;
  }

  private normalizeQrSponsorUpsertResult(response: unknown): MarketingQrSponsorUpsertResult {
    const record = this.unwrapRecord(response) ?? {};

    return {
      NewQRID: this.asNumber(record['NewQRID'] ?? record['newQRID'] ?? record['newQrId'], 0),
      RowsAffected: this.asNumber(record['RowsAffected'] ?? record['rowsAffected'], 0),
      IsInsert: this.asBoolean(record['IsInsert'] ?? record['isInsert'], false)
    };
  }

  private unwrapArray(response: unknown): unknown[] {
    if (Array.isArray(response)) {
      return response;
    }

    const record = this.asRecord(response);
    if (!record) {
      return [];
    }

    const nestedKeys = ['data', 'Data', 'items', 'Items', 'result', 'Result', 'payload', 'Payload'];
    const found = nestedKeys.map(key => record[key]).find(value => Array.isArray(value));
    return Array.isArray(found) ? found : [];
  }

  private unwrapRecord(response: unknown): Record<string, unknown> | null {
    if (Array.isArray(response)) {
      return this.asRecord(response[0]);
    }

    const record = this.asRecord(response);
    if (!record) {
      return null;
    }

    const nestedKeys = ['data', 'Data', 'result', 'Result', 'payload', 'Payload'];
    for (const key of nestedKeys) {
      const nested = this.asRecord(record[key]);
      if (nested) {
        return nested;
      }
    }

    return record;
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
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  private asNumber(value: unknown, fallback: number): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    }

    return fallback;
  }

  private asBoolean(value: unknown, fallback: boolean): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true' || normalized === '1') {
        return true;
      }
      if (normalized === 'false' || normalized === '0') {
        return false;
      }
    }

    if (typeof value === 'number') {
      return value !== 0;
    }

    return fallback;
  }
}
