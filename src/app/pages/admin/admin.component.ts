import { CommonModule, DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, of } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuditRecord } from '../../models/audit-record.model';
import { PacketService } from '../../services/packet.service';

interface StatusReportItem {
  label: string;
  value: string;
  tone?: 'ok' | 'warn' | 'error' | 'muted';
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent implements OnInit {
  private readonly packetService = inject(PacketService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly records = signal<AuditRecord[]>([]);
  readonly lastRefreshed = signal<Date | null>(null);

  readonly errorRecords = computed(() =>
    this.records().filter(
      record => record.SeverityCode >= 2 || record.ErrorCode !== null
    )
  );

  readonly statusItems = computed((): StatusReportItem[] => {
    const records = this.records();
    const errorCount = records.filter(r => r.SeverityCode >= 3 || r.ErrorCode !== null).length;
    const warningCount = records.filter(r => r.SeverityCode === 2).length;
    const infoCount = records.filter(r => r.SeverityCode <= 1 && r.ErrorCode === null).length;
    const origins = new Set(records.map(r => r.Origin));
    const latest = records[0];
    const apiStatus = this.error() ? 'Unreachable' : this.loading() ? 'Checking…' : 'Connected';
    const apiTone: StatusReportItem['tone'] = this.error()
      ? 'error'
      : this.loading()
        ? 'muted'
        : 'ok';

    return [
      { label: 'Application', value: environment.version, tone: 'muted' },
      { label: 'Build', value: environment.production ? 'Production' : 'Development', tone: 'muted' },
      { label: 'Audit API', value: apiStatus, tone: apiTone },
      {
        label: 'Last refreshed',
        value: this.lastRefreshed()?.toLocaleString() ?? '—',
        tone: 'muted'
      },
      { label: 'Audit entries loaded', value: String(records.length), tone: 'muted' },
      { label: 'Errors', value: String(errorCount), tone: errorCount > 0 ? 'error' : 'ok' },
      { label: 'Warnings', value: String(warningCount), tone: warningCount > 0 ? 'warn' : 'ok' },
      { label: 'Info / low', value: String(infoCount), tone: 'ok' },
      { label: 'Unique origins', value: String(origins.size), tone: 'muted' },
      {
        label: 'Latest event',
        value: latest ? `${latest.EventType} · ${latest.Origin}` : '—',
        tone: 'muted'
      }
    ];
  });

  readonly trackByAuditId = (_index: number, record: AuditRecord) => record.AuditID;

  ngOnInit(): void {
    this.loadRecords();
  }

  loadRecords(): void {
    this.loading.set(true);
    this.error.set(null);

    this.packetService
      .getLatest20AuditRecords()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(err => {
          this.error.set('Unable to load audit records.');
          console.error('Admin audit load failed', err);
          return of<AuditRecord[]>([]);
        }),
        finalize(() => {
          this.loading.set(false);
          this.lastRefreshed.set(new Date());
        })
      )
      .subscribe(items => this.records.set(items));
  }

  severityLabel(code: number): string {
    switch (code) {
      case 0:
        return 'Info';
      case 1:
        return 'Low';
      case 2:
        return 'Warning';
      case 3:
        return 'Error';
      default:
        return `Level ${code}`;
    }
  }

  severityClass(code: number): string {
    switch (code) {
      case 0:
        return 'severity--info';
      case 1:
        return 'severity--low';
      case 2:
        return 'severity--warning';
      case 3:
        return 'severity--error';
      default:
        return 'severity--unknown';
    }
  }
}
