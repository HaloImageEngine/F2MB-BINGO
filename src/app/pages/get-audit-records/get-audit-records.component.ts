import { CommonModule, DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';

import { AuditRecord } from '../../models/audit-record.model';
import { PacketService } from '../../services/packet.service';

@Component({
  selector: 'app-get-audit-records',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink],
  templateUrl: './get-audit-records.component.html',
  styleUrl: './get-audit-records.component.scss'
})
export class GetAuditRecordsComponent implements OnInit {
  private readonly packetService = inject(PacketService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly records = signal<AuditRecord[]>([]);

  readonly recordCount = computed(() => this.records().length);

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
          this.error.set('Unable to load audit records. Please try again.');
          console.error('Get_Latest20_Audit_Records failed', err);
          return of<AuditRecord[]>([]);
        }),
        finalize(() => this.loading.set(false))
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
