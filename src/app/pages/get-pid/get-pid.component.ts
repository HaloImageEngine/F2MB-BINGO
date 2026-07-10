import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';

import { PacketDetail, PacketMaster } from '../../models/packet.model';
import { ConsoleContextService } from '../../services/console-context.service';
import { PacketService } from '../../services/packet.service';
import { PrintService } from '../../services/print.service';
import { numericDraftFromValue, parsePositiveInteger } from '../../shared/numeric-input-draft';

const BINGO_CARD_SIZE = 25;

@Component({
  selector: 'app-get-pid',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './get-pid.component.html',
  styleUrl: './get-pid.component.scss'
})
export class GetPidComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly packetService = inject(PacketService);
  private readonly consoleContextService = inject(ConsoleContextService);
  private readonly printService = inject(PrintService);

  readonly gameIdDraft = signal('');
  readonly callListIdDraft = signal('');
  readonly QR_URL = signal('https://play.djgogi.com/slidecardbypid/');

  readonly packetMasters = signal<PacketMaster[]>([]);
  readonly packetDetails = signal<PacketDetail[]>([]);
  readonly loading = signal(false);
  readonly printingQrMst = signal(false);
  readonly error = signal<string | null>(null);
  readonly hasQueried = signal(false);

  readonly pidCount = computed(() => this.packetMasters().length);
  readonly detailCount = computed(() => this.packetDetails().length);
  readonly printPages = computed(() => this.buildPrintPages(this.packetMasters()));
  readonly bingoColumnLabels = ['B', 'I', 'N', 'G', 'O'] as const;

  readonly trackByPidt = (_index: number, row: PacketMaster) => row.PIDT;
  readonly trackByPdId = (_index: number, row: PacketDetail) => row.PD_ID;
  readonly trackByPrintCell = (index: number, cell: PacketMaster | null) =>
    cell?.PIDT ?? `empty-${index}`;

  ngOnInit(): void {
    this.applyConsoleContext();
  }

  onGameIdDraftInput(value: unknown): void {
    this.gameIdDraft.set(value != null && value !== '' ? String(value) : '');
  }

  onCallListIdDraftInput(value: unknown): void {
    this.callListIdDraft.set(value != null && value !== '' ? String(value) : '');
  }

  onQrUrlInput(value: unknown): void {
    this.QR_URL.set(typeof value === 'string' ? value : value != null ? String(value) : '');
  }

  buildQrLink(pidt: number): string {
    return `${this.QR_URL().trim()}${pidt}`;
  }

  qrCodeImageUrl(qrLink: string): string {
    return `https://api.qrserver.com/v1/create-qr-code/?size=140x140&format=png&data=${encodeURIComponent(qrLink)}`;
  }

  async printQrMasters(): Promise<void> {
    if (this.packetMasters().length === 0) {
      this.error.set('Load the PID list before printing.');
      return;
    }

    if (!this.QR_URL().trim()) {
      this.error.set('Enter a QR URL before printing.');
      return;
    }

    this.printingQrMst.set(true);
    this.error.set(null);

    await new Promise<void>(resolve => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    await this.waitForPrintImages();

    this.printService.print({
      bodyClass: 'print-qr-mst',
      title: 'QR MST'
    });
    this.printingQrMst.set(false);
  }

  loadPidList(): void {
    const gameId = parsePositiveInteger(this.gameIdDraft());
    const callListId = parsePositiveInteger(this.callListIdDraft());

    if (gameId === null || callListId === null) {
      this.error.set('Enter valid Game_ID and Call_List_ID (positive integers).');
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.hasQueried.set(true);

    this.packetService
      .getGamePacketIdSetByGci({ Game_ID: gameId, Call_List_ID: callListId })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(err => {
          this.error.set('Unable to load PID list. Please try again.');
          console.error('Get_Game_PacketID_Set_byGCI failed', err);
          return of({ PacketMasters: [], PacketDetails: [] });
        }),
        finalize(() => this.loading.set(false))
      )
      .subscribe(result => {
        this.packetMasters.set(result.PacketMasters);
        this.packetDetails.set(result.PacketDetails);
      });
  }

  private applyConsoleContext(): void {
    const ctx = this.consoleContextService.getContext();
    if (!ctx) {
      return;
    }

    if (ctx.Game_ID != null) {
      this.gameIdDraft.set(numericDraftFromValue(ctx.Game_ID));
    }
    if (ctx.Call_List_ID != null) {
      this.callListIdDraft.set(numericDraftFromValue(ctx.Call_List_ID));
    }
  }

  private buildPrintPages(masters: PacketMaster[]): (PacketMaster | null)[][] {
    if (masters.length === 0) {
      return [];
    }

    const pages: (PacketMaster | null)[][] = [];

    for (let index = 0; index < masters.length; index += BINGO_CARD_SIZE) {
      const page: (PacketMaster | null)[] = masters.slice(index, index + BINGO_CARD_SIZE);
      while (page.length < BINGO_CARD_SIZE) {
        page.push(null);
      }
      pages.push(page);
    }

    return pages;
  }

  private waitForPrintImages(): Promise<void> {
    const images = Array.from(document.querySelectorAll<HTMLImageElement>('.qr-mst-print__qr'));
    if (images.length === 0) {
      return Promise.resolve();
    }

    return Promise.all(
      images.map(
        image =>
          new Promise<void>(resolve => {
            if (image.complete) {
              resolve();
              return;
            }

            image.addEventListener('load', () => resolve(), { once: true });
            image.addEventListener('error', () => resolve(), { once: true });
          })
      )
    ).then(() => undefined);
  }
}
