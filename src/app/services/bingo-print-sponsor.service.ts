import { Injectable, signal } from '@angular/core';

const DEFAULT_SPONSOR_BANNER_TEXT = 'Everyone Have Fun!';

@Injectable({ providedIn: 'root' })
export class BingoPrintSponsorService {
  readonly sponsorBannerText = signal(DEFAULT_SPONSOR_BANNER_TEXT);

  updateSponsorBannerText(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.sponsorBannerText.set(input?.value.trim() || DEFAULT_SPONSOR_BANNER_TEXT);
  }
}
