import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { catchError, finalize, forkJoin, of } from 'rxjs';

import {
  BingoCheckCardsGameSummaryRow,
  BingoCheckCardsInningSummaryRow,
  BingoCheckCardsResult,
  BingoCheckCardsSongCountRow
} from '../../models/bingo-check-cards.model';
import {
  BingoExistingCardsByUser,
  BingoExistingCardsInningBreakdown
} from '../../models/bingo-game.model';
import {
  BingoGameSetupCardsByInningRow,
  BingoGameSetupCheckResult,
  BingoGameSetupInningComparisonRow,
  BingoGameSetupValidationRow
} from '../../models/bingo-game-setup.model';
import { CallListIdFieldComponent } from '../../shared/call-list-id-field/call-list-id-field.component';
import { AuthUserService } from '../../services/auth-user.service';
import { CallListService } from '../../services/calllist.service';
import { ConsoleContextService } from '../../services/console-context.service';
import { GameMgmtService } from '../../services/game-mgmt.service';
import { environment } from '../../../environments/environment';
import { numericDraftFromValue, parsePositiveInteger } from '../../shared/numeric-input-draft';
import { validationStatusClass } from '../../shared/validation-status';

@Component({
  selector: 'app-card-overview',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, CallListIdFieldComponent],
  templateUrl: './card-overview.component.html',
  styleUrl: './card-overview.component.scss'
})
export class CardOverviewComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly callListService = inject(CallListService);
  private readonly gameMgmtService = inject(GameMgmtService);
  private readonly authUserService = inject(AuthUserService);
  private readonly consoleContextService = inject(ConsoleContextService);

  readonly userIdInput = signal(1039);
  readonly gameIdInput = signal(1);
  readonly callListIdInput = signal<number | null>(null);
  readonly inningInput = signal(1);
  readonly userIdDraft = signal('1039');
  readonly gameIdDraft = signal('1');
  readonly inningDraft = signal('1');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly gameSetupError = signal<string | null>(null);
  readonly checkCardsError = signal<string | null>(null);
  readonly hasLoaded = signal(false);
  readonly data = signal<BingoExistingCardsByUser | null>(null);
  readonly gameSetup = signal<BingoGameSetupCheckResult | null>(null);
  readonly checkCards = signal<BingoCheckCardsResult | null>(null);

  readonly currentUser = this.authUserService.user;

  readonly summary = computed(() => this.data()?.Summary ?? null);
  readonly inningBreakdown = computed(() => this.data()?.InningBreakdown ?? []);
  readonly inningList = computed(() => this.data()?.InningList ?? []);

  readonly gameSetupHeader = computed(() => this.gameSetup()?.Header ?? null);
  readonly gameSetupSummary = computed(() => this.gameSetup()?.OverallSummary ?? null);
  readonly setupCardsByInning = computed(() => this.gameSetup()?.CardsByInning ?? []);
  readonly setupInningComparisons = computed(() => this.gameSetup()?.InningComparisons ?? []);
  readonly setupValidationReport = computed(() => this.gameSetup()?.ValidationReport ?? []);
  readonly gameSetupOverallStatus = computed(() => {
    const rows = this.setupValidationReport();
    const overall = rows.find(row => row.Component?.trim().toUpperCase().includes('OVERALL'));
    return overall?.Status ?? null;
  });

  readonly checkCardsGameSummary = computed(() => this.checkCards()?.GameSummary ?? []);
  readonly checkCardsInningSummary = computed(() => this.checkCards()?.InningSummary ?? []);
  readonly checkCardsSongCounts = computed(() => this.checkCards()?.SongCounts ?? []);
  readonly checkCardsTotalCards = computed(() =>
    this.checkCardsGameSummary().reduce((sum, row) => sum + (row.Total_Cards ?? 0), 0)
  );

  readonly trackByInning = (_index: number, row: BingoExistingCardsInningBreakdown) => row.Inning;
  readonly trackByCheckGame = (_index: number, row: BingoCheckCardsGameSummaryRow) => row.Game_ID;
  readonly trackByCheckInningRow = (_index: number, row: BingoCheckCardsInningSummaryRow) =>
    `${row.Game_ID}-${row.Inning}-${row.Call_List_ID}`;
  readonly trackByCheckSong = (_index: number, row: BingoCheckCardsSongCountRow) =>
    `${row.Game_ID}-${row.Call_List_ID}-${row.Inning}`;
  readonly trackByValidation = (_index: number, row: BingoGameSetupValidationRow) => row.Check_Number;
  readonly trackBySetupInning = (_index: number, row: BingoGameSetupInningComparisonRow) => row.Inning;
  readonly trackBySetupCardsInning = (_index: number, row: BingoGameSetupCardsByInningRow) => row.Inning;

  ngOnInit(): void {
    const user = this.currentUser();
    if (user?.UserId) {
      this.userIdInput.set(user.UserId);
    }

    const ctx = this.consoleContextService.getContext();
    if (ctx?.Game_ID) {
      this.gameIdInput.set(ctx.Game_ID);
    }
    if (ctx?.Call_List_ID) {
      this.callListIdInput.set(ctx.Call_List_ID);
    }
    if (ctx?.Inning) {
      this.inningInput.set(ctx.Inning);
    }

    this.syncNumericDrafts();
    this.load();
  }

  onUserIdDraftInput(value: string | number | null): void {
    this.userIdDraft.set(value != null && value !== '' ? String(value) : '');
  }

  commitUserIdFromDraft(): void {
    const parsed = parsePositiveInteger(this.userIdDraft());
    if (parsed !== null) {
      this.userIdInput.set(parsed);
      this.userIdDraft.set(String(parsed));
      return;
    }
    this.userIdDraft.set(String(this.userIdInput()));
  }

  onGameIdDraftInput(value: string | number | null): void {
    this.gameIdDraft.set(value != null && value !== '' ? String(value) : '');
  }

  commitGameIdFromDraft(): void {
    const parsed = parsePositiveInteger(this.gameIdDraft());
    if (parsed !== null) {
      this.gameIdInput.set(parsed);
      this.gameIdDraft.set(String(parsed));
      return;
    }
    this.gameIdDraft.set(String(this.gameIdInput()));
  }

  onInningDraftInput(value: string | number | null): void {
    this.inningDraft.set(value != null && value !== '' ? String(value) : '');
  }

  commitInningFromDraft(): void {
    const parsed = parsePositiveInteger(this.inningDraft());
    if (parsed !== null) {
      this.inningInput.set(parsed);
      this.inningDraft.set(String(parsed));
      return;
    }
    this.inningDraft.set(String(this.inningInput()));
  }

  setCallListIdFromInput(value: number | null): void {
    this.callListIdInput.set(value);
  }

  private syncNumericDrafts(): void {
    this.userIdDraft.set(String(this.userIdInput()));
    this.gameIdDraft.set(String(this.gameIdInput()));
    this.inningDraft.set(String(this.inningInput()));
  }

  private commitAllNumericDrafts(): void {
    this.commitUserIdFromDraft();
    this.commitGameIdFromDraft();
    this.commitInningFromDraft();
  }

  load(): void {
    this.commitAllNumericDrafts();
    const userId = this.userIdInput();
    const gameId = this.gameIdInput();
    if (!Number.isInteger(userId) || userId <= 0) {
      this.error.set('Enter a valid User_ID (positive integer).');
      return;
    }
    if (!Number.isInteger(gameId) || gameId <= 0) {
      this.gameSetupError.set('Enter a valid Game_ID (positive integer).');
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.gameSetupError.set(null);
    this.checkCardsError.set(null);
    this.hasLoaded.set(false);
    this.data.set(null);
    this.gameSetup.set(null);
    this.checkCards.set(null);

    const callListId = this.callListIdInput();
    const inning = this.inningInput();

    forkJoin({
      existing: this.callListService.getExistingCardsByUserId(userId).pipe(
        catchError(err => {
          console.error('Get_Existing_Cards_byUserID failed', err);
          this.error.set('Unable to load existing cards for this user right now.');
          return of(null);
        })
      ),
      gameSetup: this.gameMgmtService.checkGameSetup(gameId, callListId, inning).pipe(
        catchError((err: HttpErrorResponse) => {
          console.error('Check/Check_GameSetup failed', err);
          this.gameSetupError.set(this.formatApiError('Check/Check_GameSetup', err, gameId));
          return of(null);
        })
      ),
      checkCards: this.gameMgmtService.checkCards(userId).pipe(
        catchError((err: HttpErrorResponse) => {
          console.error('Check_Cards_byUser_ID failed', err);
          this.checkCardsError.set(this.formatApiError('Bingo/Check_Cards_byUser_ID', err, userId));
          return of(null);
        })
      )
    })
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(({ existing, gameSetup, checkCards }) => {
        this.hasLoaded.set(true);
        if (existing) {
          this.data.set(existing);
        }
        if (gameSetup) {
          this.gameSetup.set(gameSetup);
        }
        if (checkCards) {
          this.checkCards.set(checkCards);
        }
      });
  }

  readonly validationStatusClass = validationStatusClass;

  formatPct(value: number | null | undefined): string {
    if (value === null || value === undefined || !Number.isFinite(value)) {
      return '—';
    }
    return `${value}%`;
  }

  formatDate(value: string | null | undefined): string {
    if (!value) {
      return '—';
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
  }

  formatValue(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') {
      return '—';
    }
    return String(value);
  }

  private formatApiError(endpoint: string, err: HttpErrorResponse, id: number): string {
    const isCards = endpoint.includes('Check_Cards');
    const basePath = isCards
      ? `${environment.bingoCheckCardsApiBaseUrl}/${id}`
      : `${environment.bingoCheckGameSetupApiBaseUrl}/${id}`;
    const idLabel = isCards ? 'User_ID' : 'Game_ID';

    if (err.status === 404) {
      const deployHint = isCards
        ? `Confirm GET ${basePath} is registered`
        : 'Deploy sqlscript/usp_Check_GameSetup.sql';
      return `${endpoint} is not available on the API (404). ${deployHint}.`;
    }
    if (err.status === 500) {
      return `${endpoint} returned a server error (500) for ${idLabel} ${id}.`;
    }
    if (err.status === 0) {
      return `${endpoint} could not be reached (network/CORS). Expected route: ${basePath}`;
    }
    return `Unable to load ${endpoint} (HTTP ${err.status || 'unknown'}) for ${idLabel} ${id}.`;
  }
}
