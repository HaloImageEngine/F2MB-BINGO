import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { AuditRecord } from '../models/audit-record.model';
import {
  GamePacketIdSetByGci,
  GamePacketIdSetByGciRequest,
  PacketDetail,
  PacketMaster
} from '../models/packet.model';

@Injectable({ providedIn: 'root' })
export class PacketService {
  private readonly http = inject(HttpClient);
  private readonly latest20AuditRecordsApiUrl = environment.packetLatest20AuditRecordsApiUrl;
  private readonly gamePacketIdSetByGciApiUrl = environment.packetGamePacketIdSetByGciApiUrl;

  /**
   * `GET …/Packet/Get_Latest20_Audit_Records`
   * Returns the 20 most recent audit log entries.
   */
  getLatest20AuditRecords(): Observable<AuditRecord[]> {
    return this.http.get<unknown>(this.latest20AuditRecordsApiUrl).pipe(
      map(response => this.normalizeAuditRecords(response))
    );
  }

  /**
   * `POST …/Packet/Get_Game_PacketID_Set_byGCI`
   * Body: `{ Game_ID, Call_List_ID }`
   */
  getGamePacketIdSetByGci(payload: GamePacketIdSetByGciRequest): Observable<GamePacketIdSetByGci> {
    return this.http.post<unknown>(this.gamePacketIdSetByGciApiUrl, payload).pipe(
      map(response => this.normalizeGamePacketIdSetByGci(response))
    );
  }

  // ── Normalizers ───────────────────────────────────────────────────────────

  private normalizeGamePacketIdSetByGci(response: unknown): GamePacketIdSetByGci {
    return {
      PacketMasters: this.unwrapNamedArray(response, ['PacketMasters', 'packetMasters', 'packet_masters'])
        .map(item => this.mapPacketMaster(item))
        .filter((item): item is PacketMaster => item !== null),
      PacketDetails: this.unwrapNamedArray(response, ['PacketDetails', 'packetDetails', 'packet_details'])
        .map(item => this.mapPacketDetail(item))
        .filter((item): item is PacketDetail => item !== null)
    };
  }

  private mapPacketMaster(item: unknown): PacketMaster | null {
    const record = this.asRecord(item);
    if (!record) return null;

    const pmId = this.asNullableNumber(record['PM_ID'] ?? record['pmId'] ?? record['pm_id']);
    const pidt = this.asNullableNumber(record['PIDT'] ?? record['pidt']);
    const gameId = this.asNullableNumber(record['Game_ID'] ?? record['gameId'] ?? record['game_id']);
    const callListId = this.asNullableNumber(
      record['Call_List_ID'] ?? record['callListId'] ?? record['call_list_id']
    );
    const inning = this.asNullableNumber(record['Inning'] ?? record['inning']);
    const userId = this.asNullableNumber(record['User_ID'] ?? record['userId'] ?? record['user_id']);
    const cardCount = this.asNullableNumber(record['CardCount'] ?? record['cardCount'] ?? record['card_count']);

    if (
      pmId === null ||
      pidt === null ||
      gameId === null ||
      callListId === null ||
      inning === null ||
      userId === null ||
      cardCount === null
    ) {
      return null;
    }

    return {
      PM_ID: pmId,
      PIDT: pidt,
      Game_ID: gameId,
      Call_List_ID: callListId,
      Inning: inning,
      User_ID: userId,
      GPCode: this.asOptionalString(record['GPCode'] ?? record['gpCode'] ?? record['gp_code']),
      GPDescription: this.asOptionalString(
        record['GPDescription'] ?? record['gpDescription'] ?? record['gp_description']
      ),
      Comment: this.asOptionalString(record['Comment'] ?? record['comment']),
      Created: this.asOptionalString(record['Created'] ?? record['created']),
      Updated: this.asOptionalString(record['Updated'] ?? record['updated']),
      CardCount: cardCount
    };
  }

  private mapPacketDetail(item: unknown): PacketDetail | null {
    const record = this.asRecord(item);
    if (!record) return null;

    const pdId = this.asNullableNumber(record['PD_ID'] ?? record['pdId'] ?? record['pd_id']);
    const pidt = this.asNullableNumber(record['PIDT'] ?? record['pidt']);
    const cardId = this.asNullableNumber(record['Card_ID'] ?? record['cardId'] ?? record['card_id']);

    if (pdId === null || pidt === null || cardId === null) {
      return null;
    }

    return {
      PD_ID: pdId,
      PIDT: pidt,
      Card_ID: cardId,
      Status: this.asOptionalString(record['Status'] ?? record['status']),
      Winner: this.asNullableBoolean(record['Winner'] ?? record['winner']),
      Created: this.asOptionalString(record['Created'] ?? record['created']),
      Updated: this.asOptionalString(record['Updated'] ?? record['updated'])
    };
  }

  private normalizeAuditRecords(response: unknown): AuditRecord[] {
    return this.unwrapArray(response)
      .map(item => this.mapAuditRecord(item))
      .filter((item): item is AuditRecord => item !== null);
  }

  private mapAuditRecord(item: unknown): AuditRecord | null {
    const record = this.asRecord(item);
    if (!record) return null;

    const auditId = this.asNullableNumber(record['AuditID'] ?? record['auditId'] ?? record['audit_id']);
    const userId = this.asNullableString(record['UserId'] ?? record['userId'] ?? record['user_id']);
    const origin = this.asNullableString(record['Origin'] ?? record['origin']);
    const eventType = this.asNullableString(record['EventType'] ?? record['eventType'] ?? record['event_type']);
    const commentShort = this.asNullableString(
      record['CommentShort'] ?? record['commentShort'] ?? record['comment_short']
    );
    const dateTimeStamp = this.asNullableString(
      record['DateTimeStamp'] ?? record['dateTimeStamp'] ?? record['date_time_stamp']
    );
    const severityCode = this.asNullableNumber(
      record['SeverityCode'] ?? record['severityCode'] ?? record['severity_code']
    );

    if (
      auditId === null ||
      !userId ||
      !origin ||
      !eventType ||
      !commentShort ||
      !dateTimeStamp ||
      severityCode === null
    ) {
      return null;
    }

    return {
      AuditID: auditId,
      UserId: userId,
      Origin: origin,
      EventType: eventType,
      ErrorCode: this.asNullableString(record['ErrorCode'] ?? record['errorCode'] ?? record['error_code']),
      CommentShort: commentShort,
      DateTimeStamp: dateTimeStamp,
      SeverityCode: severityCode
    };
  }

  // ── Utility helpers ───────────────────────────────────────────────────────

  private unwrapNamedArray(response: unknown, keys: string[]): unknown[] {
    if (Array.isArray(response)) return response;

    const record = this.asRecord(response);
    if (!record) return [];

    const found = keys.map(k => record[k]).find(v => Array.isArray(v));
    return Array.isArray(found) ? found : [];
  }

  private unwrapArray(response: unknown): unknown[] {
    if (Array.isArray(response)) return response;

    const record = this.asRecord(response);
    if (!record) return [];

    const candidates = [
      'AuditRecords',
      'auditRecords',
      'audit_records',
      'data',
      'Data',
      'items',
      'Items',
      'result',
      'Result',
      'payload',
      'Payload'
    ];
    const found = candidates.map(k => record[k]).find(v => Array.isArray(v));
    return Array.isArray(found) ? found : [];
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  }

  private asOptionalString(value: unknown): string | null {
    return typeof value === 'string' ? value : null;
  }

  private asNullableBoolean(value: unknown): boolean | null {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true' || normalized === '1') return true;
      if (normalized === 'false' || normalized === '0') return false;
    }
    if (typeof value === 'number') {
      if (value === 1) return true;
      if (value === 0) return false;
    }
    return null;
  }

  private asNullableString(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
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
