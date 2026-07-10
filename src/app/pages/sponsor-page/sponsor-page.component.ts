import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import { BingoPrintQrSlotIndex } from '../../utils/bingo-print-qr';
import { MarketingQrAdPosition } from '../../models/marketing-qr-sponsor.model';
import { AuthUserService } from '../../services/auth-user.service';
import { BingoPrintQrSettingsService } from '../../services/bingo-print-qr-settings.service';
import { BingoPrintSponsorService } from '../../services/bingo-print-sponsor.service';
import { MarketingService } from '../../services/marketing.service';

const AD_POSITIONS: readonly MarketingQrAdPosition[] = ['AD1', 'AD2', 'AD3'];

@Component({
  selector: 'app-sponsor-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sponsor-page.component.html',
  styleUrl: './sponsor-page.component.scss'
})
export class SponsorPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly authUserService = inject(AuthUserService);
  private readonly marketingService = inject(MarketingService);

  readonly sponsorSettings = inject(BingoPrintSponsorService);
  readonly qrSettings = inject(BingoPrintQrSettingsService);
  readonly currentUser = this.authUserService.user;

  readonly loadingSponsors = signal(true);
  readonly loadSponsorsError = signal<string | null>(null);

  readonly savingSlot = signal<BingoPrintQrSlotIndex | null>(null);
  readonly slotErrors = signal<[string | null, string | null, string | null]>([null, null, null]);
  readonly slotSuccessMessages = signal<[string | null, string | null, string | null]>([null, null, null]);

  ngOnInit(): void {
    this.loadLatestSponsors();
  }

  loadLatestSponsors(): void {
    this.loadingSponsors.set(true);
    this.loadSponsorsError.set(null);

    this.marketingService
      .getLatestQrSponsorsByAdPosition(0)
      .pipe(
        finalize(() => this.loadingSponsors.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (latest) => {
          this.qrSettings.loadLatestSponsorsByAdPosition(latest);
        },
        error: () => {
          this.loadSponsorsError.set('Unable to load saved ad spaces from the server.');
        }
      });
  }

  saveAdSpace(index: BingoPrintQrSlotIndex): void {
    const title = this.qrSettings.labelForSlot(index).trim();
    const url = this.qrSettings.linkForSlot(index).trim();

    if (!title || !url) {
      this.setSlotError(index, 'Label and Link are required before saving.');
      this.setSlotSuccess(index, null);
      return;
    }

    const payload = this.marketingService.buildQrSponsorUpsertPayload({
      qrid: this.qrSettings.qrIdForSlot(index),
      title,
      url,
      adPosition: AD_POSITIONS[index],
      contact: this.qrSettings.contactForSlot(index),
      phone: this.qrSettings.phoneForSlot(index),
      contactUrl: this.qrSettings.contactUrlForSlot(index)
    });

    this.savingSlot.set(index);
    this.setSlotError(index, null);
    this.setSlotSuccess(index, null);

    this.marketingService
      .upsertQrSponsor(payload)
      .pipe(
        finalize(() => this.savingSlot.set(null)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (result) => {
          if (result.IsInsert && result.NewQRID > 0) {
            this.qrSettings.setQrIdForSlot(index, result.NewQRID);
          } else if (!result.IsInsert && result.RowsAffected > 0) {
            // QRID already set from load or prior save
          }

          const action = result.IsInsert ? 'Saved (new)' : 'Updated';
          this.setSlotSuccess(
            index,
            `${action} · QRID ${result.IsInsert ? result.NewQRID : this.qrSettings.qrIdForSlot(index)} · AdPosition ${AD_POSITIONS[index]}`
          );
        },
        error: () => {
          this.setSlotError(index, 'Unable to save this ad space right now.');
        }
      });
  }

  isSavingSlot(index: BingoPrintQrSlotIndex): boolean {
    return this.savingSlot() === index;
  }

  slotError(index: BingoPrintQrSlotIndex): string | null {
    return this.slotErrors()[index];
  }

  slotSuccessMessage(index: BingoPrintQrSlotIndex): string | null {
    return this.slotSuccessMessages()[index];
  }

  private setSlotError(index: BingoPrintQrSlotIndex, message: string | null): void {
    this.slotErrors.update((current) => {
      const next = [...current] as [string | null, string | null, string | null];
      next[index] = message;
      return next;
    });
  }

  private setSlotSuccess(index: BingoPrintQrSlotIndex, message: string | null): void {
    this.slotSuccessMessages.update((current) => {
      const next = [...current] as [string | null, string | null, string | null];
      next[index] = message;
      return next;
    });
  }
}
