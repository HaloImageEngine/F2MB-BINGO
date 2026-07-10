import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, distinctUntilChanged, map, of, startWith, switchMap, timer } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PrintedCard } from '../../models/printed-card.model';
import { ActiveGameService } from '../../services/active-game.service';
import { AuthUserService } from '../../services/auth-user.service';
import { BingoGameService } from '../../services/bingo-game.service';
import { BingoConsoleContext, ConsoleContextService } from '../../services/console-context.service';
import { BingoPrintQrSettingsService } from '../../services/bingo-print-qr-settings.service';
import { PrintService } from '../../services/print.service';
import { PrintedCardsService } from '../../services/printed-cards.service';

interface SlidecardoneState {
  cards: PrintedCard[];
  loading: boolean;
  error: string | null;
}

@Component({
  selector: 'app-slidecardone',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './slidecardone.component.html',
  styleUrls: ['../slidecardsw/slidecardsw.component.scss', '../slidecardsw/slidecards-chrome.scss', './slidecardone.component.scss']
})
export class SlidecardoneComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly activeGameService = inject(ActiveGameService);
  private readonly authUserService = inject(AuthUserService);
  private readonly printService = inject(PrintService);
  private readonly printedCardsService = inject(PrintedCardsService);
  readonly qrSettings = inject(BingoPrintQrSettingsService);
  private readonly bingoGameService = inject(BingoGameService);
  private readonly consoleContextService = inject(ConsoleContextService);
  private readonly route = inject(ActivatedRoute);
  private readonly refreshIntervalMs = Math.max(environment.slidecardRefreshIntervalSeconds, 1) * 1000;

  /** Saved console selection (`bingo_console_context_v1`); drives first-card lookup. */
  readonly consoleContext = signal<BingoConsoleContext | null>(this.consoleContextService.getContext());

  readonly cardId = signal(87);
  /** Text in the Card ID field; committed to `cardId` on blur or Enter (not every keystroke). */
  readonly cardIdDraft = signal('87');
  readonly showPrintCardMeta = signal(false);
  readonly currentUser = this.authUserService.user;
  readonly refreshEnabled = this.activeGameService.activeGame;
  readonly state = toSignal(
    toObservable(computed(() => ({ cardId: this.cardId(), refreshEnabled: this.refreshEnabled() }))).pipe(
      distinctUntilChanged((left, right) => left.cardId === right.cardId && left.refreshEnabled === right.refreshEnabled),
      switchMap(({ cardId, refreshEnabled }) => {
        if (!refreshEnabled) {
          return of({
            cards: [],
            loading: false,
            error: 'Refresh is waiting for ActiveGame to be enabled in the console.'
          } satisfies SlidecardoneState);
        }

        return timer(0, this.refreshIntervalMs).pipe(
          switchMap(() =>
            this.printedCardsService.getPrintedCardsByCardId(cardId).pipe(
              map(cards => ({ cards, loading: false, error: null } satisfies SlidecardoneState)),
              catchError(error => {
                console.error('Printed card load failed', error);
                return of({
                  cards: [],
                  loading: false,
                  error: 'Unable to load the bingo card right now.'
                } satisfies SlidecardoneState);
              })
            )
          ),
          startWith({ cards: [], loading: true, error: null } satisfies SlidecardoneState)
        );
      })
    ),
    { initialValue: { cards: [], loading: true, error: null } }
  );

  readonly card = computed(() => this.state().cards[0] ?? null);

  readonly callListId = computed(() => this.consoleContext()?.Call_List_ID ?? null);
  readonly inning = computed(() => this.consoleContext()?.Inning ?? null);

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      const fromQuery = this.parseCardIdParam(params.get('cardId'));

      if (fromQuery !== null) {
        this.setCardId(fromQuery);
        return;
      }

      this.applyDefaultCardIdFromContext();
    });
  }

  private parseCardIdParam(value: string | null): number | null {
    if (value === null || value.trim() === '') {
      return null;
    }

    const parsed = Number(value);

    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }

  private applyDefaultCardIdFromContext(): void {
    const ctx = this.consoleContext();
    const gameId = ctx?.Game_ID ?? null;
    const callListId = ctx?.Call_List_ID ?? null;
    const inning = ctx?.Inning ?? null;

    if (gameId === null || callListId === null || inning === null) {
      return;
    }

    const storedWinningCardId = this.consoleContextService.getWinningCardIdForContext(
      gameId,
      callListId,
      inning
    );
    if (storedWinningCardId !== null) {
      this.setCardId(storedWinningCardId);
      return;
    }

    this.bingoGameService
      .getMaxGameCardFirstCard(gameId, callListId, inning)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: card => {
          if (typeof card.Card_ID === 'number' && Number.isFinite(card.Card_ID) && card.Card_ID > 0) {
            this.setCardId(card.Card_ID);
          }
        },
        error: err => console.error('Get_MaxGameCard_FirstCard failed', err)
      });
  }

  printCard(): void {
    this.printCurrentCard(false);
  }

  printCardWithMeta(): void {
    this.printCurrentCard(true);
  }

  private setCardId(id: number): void {
    this.cardId.set(id);
    this.cardIdDraft.set(String(id));
  }

  onCardIdDraftInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.cardIdDraft.set(input?.value ?? '');
  }

  commitCardIdFromDraft(): void {
    const parsed = this.parseCardIdParam(this.cardIdDraft().trim());
    if (parsed !== null) {
      this.setCardId(parsed);
      return;
    }
    this.cardIdDraft.set(String(this.cardId()));
  }

  onCardIdDraftKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter') {
      return;
    }
    event.preventDefault();
    (event.target as HTMLInputElement | null)?.blur();
    this.commitCardIdFromDraft();
  }

  private printCurrentCard(showMeta: boolean): void {
    if (this.state().loading || this.state().error || !this.card()) {
      return;
    }

    this.showPrintCardMeta.set(showMeta);

    const view = globalThis.window;
    const resetMeta = (): void => this.showPrintCardMeta.set(false);

    if (showMeta && view) {
      view.addEventListener('afterprint', resetMeta, { once: true });
    }

    this.printService.print({
      bodyClass: 'print-slidecardone'
    });

    if (!showMeta) {
      resetMeta();
    }
  }
}
