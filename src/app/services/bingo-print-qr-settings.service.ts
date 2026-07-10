import { Injectable, computed, signal } from '@angular/core';

import { environment } from '../../environments/environment';
import { MarketingQrAdPosition, MarketingQrSponsor } from '../models/marketing-qr-sponsor.model';
import { BingoPrintQrSlotIndex, buildQrCodeImageUrl } from '../utils/bingo-print-qr';
import { formatPhoneAsTyped } from '../utils/phone-format';

const SLOT_BY_AD_POSITION: Record<MarketingQrAdPosition, BingoPrintQrSlotIndex> = {
  AD1: 0,
  AD2: 1,
  AD3: 2
};

const DEFAULT_QR_LINK = 'https://ad.link.com';
const DEFAULT_QR_DISPLAY_LABELS = ['Ad space 1', 'Ad space 2', 'Ad space 3'] as const;
const DEFAULT_QR_LINKS = [DEFAULT_QR_LINK, DEFAULT_QR_LINK, DEFAULT_QR_LINK] as const;

@Injectable({ providedIn: 'root' })
export class BingoPrintQrSettingsService {
  /** Caption printed under the QR image on bingo cards. */
  readonly qrLabel1 = signal<string>(DEFAULT_QR_DISPLAY_LABELS[0]);
  readonly qrLabel2 = signal<string>(DEFAULT_QR_DISPLAY_LABELS[1]);
  readonly qrLabel3 = signal<string>(DEFAULT_QR_DISPLAY_LABELS[2]);

  /** URL or text encoded into the generated QR image. */
  readonly qrLink1 = signal<string>(DEFAULT_QR_LINKS[0]);
  readonly qrLink2 = signal<string>(DEFAULT_QR_LINKS[1]);
  readonly qrLink3 = signal<string>(DEFAULT_QR_LINKS[2]);

  /** Server `QRID` per ad slot (0 = insert on next save). */
  readonly qrId1 = signal(0);
  readonly qrId2 = signal(0);
  readonly qrId3 = signal(0);

  readonly qrContact1 = signal('');
  readonly qrContact2 = signal('');
  readonly qrContact3 = signal('');

  readonly qrPhone1 = signal('');
  readonly qrPhone2 = signal('');
  readonly qrPhone3 = signal('');

  readonly qrContactUrl1 = signal('');
  readonly qrContactUrl2 = signal('');
  readonly qrContactUrl3 = signal('');

  private readonly qrImageOverrideUrls = signal<[string | null, string | null, string | null]>([
    null,
    null,
    null
  ]);

  readonly qrImageUrls = computed(() => {
    const overrides = this.qrImageOverrideUrls();
    const links = [this.qrLink1(), this.qrLink2(), this.qrLink3()];
    const staticPaths = environment.bingoPrintQrImagePaths;

    return ([0, 1, 2] as const).map((index) => {
      if (overrides[index]) {
        return overrides[index]!;
      }

      const path = staticPaths[index]?.trim();
      if (path) {
        return path;
      }

      return buildQrCodeImageUrl(links[index]);
    });
  });

  updateQrLabel(index: BingoPrintQrSlotIndex, event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const value = input?.value.trim() || DEFAULT_QR_DISPLAY_LABELS[index];
    const labelSignal = [this.qrLabel1, this.qrLabel2, this.qrLabel3][index];
    labelSignal.set(value);
  }

  updateQrLink(index: BingoPrintQrSlotIndex, event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const value = input?.value.trim() || DEFAULT_QR_LINK;
    const linkSignal = [this.qrLink1, this.qrLink2, this.qrLink3][index];
    linkSignal.set(value);
  }

  updateQrContact(index: BingoPrintQrSlotIndex, event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const signal = [this.qrContact1, this.qrContact2, this.qrContact3][index];
    signal.set(input?.value.trim() ?? '');
  }

  updateQrPhone(index: BingoPrintQrSlotIndex, event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const formatted = formatPhoneAsTyped(input?.value ?? '');
    const signal = [this.qrPhone1, this.qrPhone2, this.qrPhone3][index];
    signal.set(formatted);

    if (input && input.value !== formatted) {
      input.value = formatted;
    }
  }

  updateQrContactUrl(index: BingoPrintQrSlotIndex, event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const signal = [this.qrContactUrl1, this.qrContactUrl2, this.qrContactUrl3][index];
    signal.set(input?.value.trim() ?? '');
  }

  onQrImageFileSelected(index: BingoPrintQrSlotIndex, event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) {
      return;
    }

    this.qrImageOverrideUrls.update((current) => {
      const next = [...current] as [string | null, string | null, string | null];
      if (next[index]) {
        URL.revokeObjectURL(next[index]!);
      }
      next[index] = URL.createObjectURL(file);
      return next;
    });

    if (input) {
      input.value = '';
    }
  }

  qrIdForSlot(index: BingoPrintQrSlotIndex): number {
    return [this.qrId1, this.qrId2, this.qrId3][index]();
  }

  setQrIdForSlot(index: BingoPrintQrSlotIndex, qrid: number): void {
    const idSignal = [this.qrId1, this.qrId2, this.qrId3][index];
    idSignal.set(Number.isInteger(qrid) && qrid > 0 ? qrid : 0);
  }

  labelForSlot(index: BingoPrintQrSlotIndex): string {
    return [this.qrLabel1, this.qrLabel2, this.qrLabel3][index]();
  }

  linkForSlot(index: BingoPrintQrSlotIndex): string {
    return [this.qrLink1, this.qrLink2, this.qrLink3][index]();
  }

  contactForSlot(index: BingoPrintQrSlotIndex): string {
    return [this.qrContact1, this.qrContact2, this.qrContact3][index]();
  }

  phoneForSlot(index: BingoPrintQrSlotIndex): string {
    return [this.qrPhone1, this.qrPhone2, this.qrPhone3][index]();
  }

  contactUrlForSlot(index: BingoPrintQrSlotIndex): string {
    return [this.qrContactUrl1, this.qrContactUrl2, this.qrContactUrl3][index]();
  }

  applySponsorFromApi(sponsor: MarketingQrSponsor): void {
    const position = this.normalizeAdPosition(sponsor.AdPosition);
    if (!position) {
      return;
    }

    const index = SLOT_BY_AD_POSITION[position];
    [this.qrLabel1, this.qrLabel2, this.qrLabel3][index].set(sponsor.Title);
    [this.qrLink1, this.qrLink2, this.qrLink3][index].set(sponsor.URL);
    [this.qrContact1, this.qrContact2, this.qrContact3][index].set(sponsor.Contact ?? '');
    [this.qrPhone1, this.qrPhone2, this.qrPhone3][index].set(
      formatPhoneAsTyped(sponsor.Phone ?? '')
    );
    [this.qrContactUrl1, this.qrContactUrl2, this.qrContactUrl3][index].set(sponsor.ContactURL ?? '');
    this.setQrIdForSlot(index, sponsor.QRID);
  }

  loadLatestSponsorsByAdPosition(
    latest: Partial<Record<MarketingQrAdPosition, MarketingQrSponsor>>
  ): void {
    (['AD1', 'AD2', 'AD3'] as const).forEach((position) => {
      const sponsor = latest[position];
      if (sponsor) {
        this.applySponsorFromApi(sponsor);
      }
    });
  }

  private normalizeAdPosition(value: MarketingQrSponsor['AdPosition']): MarketingQrAdPosition | null {
    const raw = String(value ?? '').trim().toUpperCase();
    if (raw === 'AD1' || raw === 'AD2' || raw === 'AD3') {
      return raw;
    }

    return null;
  }

  clearQrImageOverride(index: BingoPrintQrSlotIndex): void {
    this.qrImageOverrideUrls.update((current) => {
      const next = [...current] as [string | null, string | null, string | null];
      if (next[index]) {
        URL.revokeObjectURL(next[index]!);
      }
      next[index] = null;
      return next;
    });
  }
}
