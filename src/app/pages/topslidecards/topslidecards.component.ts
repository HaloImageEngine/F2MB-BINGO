import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, startWith, switchMap, timer } from 'rxjs';

import { PrintedCard } from '../../models/printed-card.model';
import { CallListIdFieldComponent } from '../../shared/call-list-id-field/call-list-id-field.component';
import { ActiveGameService } from '../../services/active-game.service';
import { AuthUserService } from '../../services/auth-user.service';
import { BingoGameService } from '../../services/bingo-game.service';
import { ConsoleContextService } from '../../services/console-context.service';
import { BingoPrintQrSettingsService } from '../../services/bingo-print-qr-settings.service';
import { BingoPrintSponsorService } from '../../services/bingo-print-sponsor.service';
import { PrintService } from '../../services/print.service';
import { environment } from '../../../environments/environment';

interface TopslidecardsState {
  cards: PrintedCard[];
  loading: boolean;
  error: string | null;
}

@Component({
  selector: 'app-topslidecards',
  standalone: true,
  imports: [CommonModule, RouterLink, CallListIdFieldComponent],
  templateUrl: './topslidecards.component.html',
  styleUrls: ['../slidecardsw/slidecardsw.component.scss', '../slidecardsw/slidecards-chrome.scss']
})
export class TopslidecardsComponent {
  private readonly activeGameService = inject(ActiveGameService);
  private readonly authUserService = inject(AuthUserService);
  private readonly bingoGameService = inject(BingoGameService);
  private readonly consoleContextService = inject(ConsoleContextService);
  private readonly printService = inject(PrintService);
  readonly qrSettings = inject(BingoPrintQrSettingsService);
  readonly sponsorSettings = inject(BingoPrintSponsorService);
  private readonly refreshIntervalMs = Math.max(environment.slidecardRefreshIntervalSeconds, 1) * 1000;

  @ViewChild('sliderViewport')
  private sliderViewport?: ElementRef<HTMLElement>;

  readonly gameIdInput = signal(26);
  readonly callListIdInput = signal(26);
  readonly inningInput = signal(1);
  readonly topNInput = signal(5);
  readonly gameId = signal(26);
  readonly callListId = signal(26);
  readonly inning = signal(1);
  readonly topN = signal(5);
  readonly showPrintCardMeta = signal(false);
  readonly currentUser = this.authUserService.user;
  readonly currentSlideIndex = signal(0);
  readonly refreshEnabled = this.activeGameService.activeGame;
  private readonly queryParams = computed(() => ({
    gameId: this.gameId(),
    callListId: this.callListId(),
    inning: this.inning(),
    topN: this.topN(),
    refreshEnabled: this.refreshEnabled()
  }));

  constructor() {
    const ctx = this.consoleContextService.getContext();

    if (!ctx) return;

    const hasAllValues =
      ctx.Game_ID !== null &&
      ctx.Call_List_ID !== null &&
      ctx.Inning !== null;

    if (ctx.Game_ID !== null) this.gameIdInput.set(ctx.Game_ID);
    if (ctx.Call_List_ID !== null) this.callListIdInput.set(ctx.Call_List_ID);
    if (ctx.Inning !== null) this.inningInput.set(ctx.Inning);

    if (hasAllValues) this.loadCards(false);
  }

  readonly state = toSignal(
    toObservable(this.queryParams).pipe(
      switchMap(({ gameId, callListId, inning, topN, refreshEnabled }) => {
        if (!refreshEnabled) {
          return of({
            cards: [],
            loading: false,
            error: 'Refresh is waiting for ActiveGame to be enabled in the console.'
          } satisfies TopslidecardsState);
        }

        return timer(0, this.refreshIntervalMs).pipe(
          switchMap(() =>
            this.bingoGameService.getTopCardsAsPrintedCards(gameId, callListId, inning, topN).pipe(
              map(cards => ({ cards, loading: false, error: null } satisfies TopslidecardsState)),
              catchError(error => {
                console.error('Top slide cards load failed', error);
                return of({
                  cards: [],
                  loading: false,
                  error: 'Unable to load top slide cards right now.'
                } satisfies TopslidecardsState);
              })
            )
          ),
          startWith({ cards: [], loading: true, error: null } satisfies TopslidecardsState)
        );
      })
    ),
    { initialValue: { cards: [], loading: true, error: null } }
  );

  readonly slides = computed(() => this.chunkCards(this.state().cards, 2));
  readonly canGoPrevious = computed(() => this.currentSlideIndex() > 0);
  readonly canGoNext = computed(() => this.currentSlideIndex() < this.slides().length - 1);

  goToPreviousSlide(): void {
    if (!this.canGoPrevious()) {
      return;
    }

    this.scrollToSlide(this.currentSlideIndex() - 1);
  }

  goToNextSlide(): void {
    if (!this.canGoNext()) {
      return;
    }

    this.scrollToSlide(this.currentSlideIndex() + 1);
  }

  printAllCards(): void {
    this.printCards(false);
  }

  printAllCardsWithMeta(): void {
    this.printCards(true);
  }

  updateGameIdInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const val = parseInt(input?.value ?? '', 10);
    if (!isNaN(val) && val > 0) this.gameIdInput.set(val);
  }

  setCallListIdInput(value: number | null): void {
    if (value !== null && value > 0) {
      this.callListIdInput.set(value);
    }
  }

  updateInningInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const val = parseInt(input?.value ?? '', 10);
    if (!isNaN(val) && val > 0) this.inningInput.set(val);
  }

  updateTopNInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const val = parseInt(input?.value ?? '', 10);
    if (!isNaN(val) && val >= 1 && val <= 99) {
      this.topNInput.set(val);
    }
  }

  loadCards(syncToStorage = true): void {
    this.gameId.set(this.gameIdInput());
    this.callListId.set(this.callListIdInput());
    this.inning.set(this.inningInput());
    this.topN.set(this.topNInput());

    if (syncToStorage) {
      this.consoleContextService.setContext({
        Game_ID: this.gameId(),
        Call_List_ID: this.callListId(),
        Inning: this.inning()
      });
    }
  }

  private printCards(showMeta: boolean): void {
    if (this.state().loading || this.state().error || this.slides().length === 0) {
      return;
    }

    this.showPrintCardMeta.set(showMeta);

    const view = globalThis.window;
    const resetMeta = (): void => this.showPrintCardMeta.set(false);

    if (showMeta && view) {
      view.addEventListener('afterprint', resetMeta, { once: true });
    }

    this.printService.print({
      bodyClass: 'print-slidecardsw'
    });

    if (!showMeta) {
      resetMeta();
    }
  }

  onSliderScroll(): void {
    const viewport = this.sliderViewport?.nativeElement;

    if (!viewport) {
      return;
    }

    const slideWidth = viewport.clientWidth;

    if (slideWidth <= 0) {
      return;
    }

    const nextIndex = Math.round(viewport.scrollLeft / slideWidth);

    if (nextIndex !== this.currentSlideIndex()) {
      this.currentSlideIndex.set(nextIndex);
    }
  }

  private chunkCards(cards: PrintedCard[], size: number): PrintedCard[][] {
    const chunks: PrintedCard[][] = [];

    for (let index = 0; index < cards.length; index += size) {
      chunks.push(cards.slice(index, index + size));
    }

    return chunks;
  }

  private scrollToSlide(slideIndex: number): void {
    const viewport = this.sliderViewport?.nativeElement;

    if (!viewport) {
      this.currentSlideIndex.set(slideIndex);
      return;
    }

    const boundedIndex = Math.max(0, Math.min(slideIndex, this.slides().length - 1));
    viewport.scrollTo({
      left: boundedIndex * viewport.clientWidth,
      behavior: 'smooth'
    });
    this.currentSlideIndex.set(boundedIndex);
  }
}
