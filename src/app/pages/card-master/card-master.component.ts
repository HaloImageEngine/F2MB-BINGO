import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';

import {
  BingoCallListDropdownByUser,
  BingoGenerateBingoCardsFromClSongsResult
} from '../../models/bingo-game.model';
import { genreEnumToLookupOption } from '../../models/genre-enum-dropdown.model';
import { LookupOption } from '../../models/lookup-option.model';
import { PrintedCard, PrintedCardSquare } from '../../models/printed-card.model';
import { AuthUserService } from '../../services/auth-user.service';
import { CallListService } from '../../services/calllist.service';
import { ConsoleContextService } from '../../services/console-context.service';
import { PrintedCardsService } from '../../services/printed-cards.service';
import { SongService } from '../../services/song.service';
import { numericDraftFromValue, parsePositiveInteger } from '../../shared/numeric-input-draft';

export type CardMasterTab = 'tab1' | 'tab2' | 'tab3';

const CARD_MASTER_DEFAULT_CARD_COUNT = 100;
const CARD_MASTER_DEFAULT_PLAYLIST_SIZE = 30;

@Component({
  selector: 'app-card-master',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './card-master.component.html',
  styleUrl: './card-master.component.scss'
})
export class CardMasterComponent implements OnInit {
  /** Angular templates cannot reference global `Math`; expose if bindings use `Math.*`. */
  readonly Math = Math;

  private readonly destroyRef = inject(DestroyRef);
  private readonly printedCardsService = inject(PrintedCardsService);
  private readonly callListService = inject(CallListService);
  private readonly consoleContextService = inject(ConsoleContextService);
  private readonly songService = inject(SongService);
  private readonly authUserService = inject(AuthUserService);

  readonly currentUser = this.authUserService.user;
  readonly callListDropdownByUser = signal<BingoCallListDropdownByUser[]>([]);
  readonly callListDropdownReady = signal(false);
  /** From `GET …/Get_DropDown_CallList_ByUserID/{User_ID}`. */
  readonly callListIdSelectOptions = computed(() =>
    CallListService.callListIdsFromDropdown(this.callListDropdownByUser())
  );
  readonly gameId = signal(1);
  readonly callListId = signal<number | null>(null);
  readonly inning = signal(1);
  readonly genre = signal('Pop');
  readonly genreOptions = signal<LookupOption[]>([]);
  readonly cardCount = signal(CARD_MASTER_DEFAULT_CARD_COUNT);
  readonly playlistSize = signal(CARD_MASTER_DEFAULT_PLAYLIST_SIZE);
  readonly gameIdDraft = signal('1');
  readonly inningDraft = signal('1');
  readonly cardCountDraft = signal(String(CARD_MASTER_DEFAULT_CARD_COUNT));
  readonly playlistSizeDraft = signal(String(CARD_MASTER_DEFAULT_PLAYLIST_SIZE));

  readonly cards = signal<PrintedCard[]>([]);
  readonly loading = signal(false);
  readonly generatingCards = signal(false);
  readonly error = signal<string | null>(null);
  readonly generateNotice = signal<string | null>(null);
  readonly hasQueried = signal(false);
  readonly activeTab = signal<CardMasterTab>('tab1');
  readonly expandedCardId = signal<number | null>(null);

  readonly trackByCardId = (_index: number, card: PrintedCard) => card.CardID;
  selectTab(tab: CardMasterTab): void {
    this.activeTab.set(tab);
  }

  toggleCardRow(card: PrintedCard, event?: Event): void {
    event?.stopPropagation();
    this.expandedCardId.update(id => (id === card.CardID ? null : card.CardID));
  }

  isCardExpanded(cardId: number): boolean {
    return this.expandedCardId() === cardId;
  }

  /** 5×5 rows in `SquarePosition` order (1–25). */
  getSquareGrid(card: PrintedCard): PrintedCardSquare[][] {
    const sorted = [...card.Squares].sort((a, b) => a.SquarePosition - b.SquarePosition);
    const grid: PrintedCardSquare[][] = [];

    for (let i = 0; i < sorted.length; i += 5) {
      grid.push(sorted.slice(i, i + 5));
    }

    return grid;
  }

  songNumberLabel(square: PrintedCardSquare): string {
    if (square.IsFreeSpace) {
      return 'FREE';
    }

    const songId = square.Song?.SongID;
    if (typeof songId === 'number' && Number.isFinite(songId)) {
      return String(songId);
    }

    return '—';
  }

  onGameIdDraftInput(value: unknown): void {
    this.gameIdDraft.set(value != null && value !== '' ? String(value) : '');
  }

  commitGameIdFromDraft(): void {
    const parsed = parsePositiveInteger(this.gameIdDraft());
    if (parsed !== null) {
      this.gameId.set(parsed);
      this.gameIdDraft.set(String(parsed));
      return;
    }
    this.gameIdDraft.set(String(this.gameId()));
  }

  onInningDraftInput(value: unknown): void {
    this.inningDraft.set(value != null && value !== '' ? String(value) : '');
  }

  commitInningFromDraft(): void {
    const parsed = parsePositiveInteger(this.inningDraft());
    if (parsed !== null) {
      this.inning.set(parsed);
      this.inningDraft.set(String(parsed));
      return;
    }
    this.inningDraft.set(String(this.inning()));
  }

  setGenreFromInput(value: unknown): void {
    const next = typeof value === 'string' ? value.trim() : '';
    this.genre.set(next || 'Pop');
  }

  onCardCountDraftInput(value: unknown): void {
    this.cardCountDraft.set(value != null && value !== '' ? String(value) : '');
  }

  commitCardCountFromDraft(): void {
    const parsed = parsePositiveInteger(this.cardCountDraft());
    if (parsed !== null) {
      this.cardCount.set(parsed);
      this.cardCountDraft.set(String(parsed));
      return;
    }
    this.cardCountDraft.set(String(this.cardCount()));
  }

  onPlaylistSizeDraftInput(value: unknown): void {
    this.playlistSizeDraft.set(value != null && value !== '' ? String(value) : '');
  }

  commitPlaylistSizeFromDraft(): void {
    const parsed = parsePositiveInteger(this.playlistSizeDraft());
    if (parsed !== null) {
      this.playlistSize.set(parsed);
      this.playlistSizeDraft.set(String(parsed));
      return;
    }
    this.playlistSizeDraft.set(String(this.playlistSize()));
  }

  private commitNumericDrafts(): void {
    this.commitGameIdFromDraft();
    this.commitInningFromDraft();
    this.commitCardCountFromDraft();
    this.commitPlaylistSizeFromDraft();
  }

  private syncNumericDrafts(): void {
    this.gameIdDraft.set(String(this.gameId()));
    this.inningDraft.set(String(this.inning()));
    this.cardCountDraft.set(String(this.cardCount()));
    this.playlistSizeDraft.set(String(this.playlistSize()));
  }

  ngOnInit(): void {
    this.loadGenreOptions();
    this.applyConsoleContext();
    this.loadCallListDropdown();
  }

  setCallListIdFromInput(value: unknown): void {
    if (value === null || value === undefined || value === '') {
      this.callListId.set(null);
      this.syncConsoleContext();
      return;
    }
    const n = typeof value === 'string' ? Number.parseInt(value, 10) : Number(value);
    if (!Number.isInteger(n) || n < 1) {
      this.callListId.set(null);
      this.syncConsoleContext();
      return;
    }
    this.callListId.set(n);
    this.syncConsoleContext();
  }

  generateCards(): void {
    this.commitNumericDrafts();
    const callListId = this.callListId();
    const gameId = this.gameId();
    const inning = this.inning();

    if (callListId === null || !Number.isInteger(callListId) || callListId < 1) {
      this.generateNotice.set(null);
      this.error.set('Select a Call_List_ID before generating cards.');
      return;
    }

    if (!Number.isFinite(gameId) || gameId < 1) {
      this.generateNotice.set(null);
      this.error.set('Enter a valid Game_ID before generating cards.');
      return;
    }

    if (!Number.isFinite(inning) || inning < 1) {
      this.generateNotice.set(null);
      this.error.set('Enter a valid Inning before generating cards.');
      return;
    }

    const genre = this.genre().trim();
    if (!genre) {
      this.generateNotice.set(null);
      this.error.set('Select a genre before generating cards.');
      return;
    }

    this.error.set(null);
    this.generateNotice.set(null);
    this.generatingCards.set(true);

    this.callListService
      .generateBingoCardsFromClSongs(callListId, gameId, inning, {
        genre,
        cardCount: this.cardCount(),
        playlistSize: this.playlistSize()
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(err => {
          console.error('GenerateBingoCards_From_CLSongs failed', err);
          const status = typeof err?.status === 'number' ? err.status : null;
          this.error.set(
            status === 500
              ? 'Card generation returned a server error (500). Confirm call list songs exist for this inning.'
              : 'Unable to generate bingo cards right now.'
          );
          return of(null as BingoGenerateBingoCardsFromClSongsResult | null);
        }),
        finalize(() => this.generatingCards.set(false))
      )
      .subscribe(result => {
        if (!result) {
          return;
        }

        const note = result.GuaranteedWinnerNote?.trim();
        const summary =
          `Generated ${result.CardsGenerated} card(s) (${genre}) — ` +
          `game ${result.Game_ID} (#${result.Game_Number}), call list ${result.Call_List_ID}, inning ${result.Inning}. ` +
          `Pool ${result.SongPoolSize}, playlist ${result.PlaylistSize}, hot songs ${result.HotSongsInPlaylist}.`;
        this.generateNotice.set(note ? `${summary} ${note}` : summary);

        this.consoleContextService.setContext({
          Game_ID: gameId,
          Call_List_ID: callListId,
          Inning: inning
        });

        this.loadCards();
      });
  }

  loadCards(): void {
    this.commitNumericDrafts();
    const gid = this.gameId();
    if (!Number.isFinite(gid) || gid < 1) {
      this.error.set('Enter a valid Game_ID (1 or greater).');
      return;
    }

    const clid = this.callListId();
    const inn = this.inning();

    this.error.set(null);
    this.loading.set(true);
    this.hasQueried.set(true);
    this.expandedCardId.set(null);
    this.activeTab.set('tab1');

    this.printedCardsService
      .getPrintedCardsByGameId(gid, {
        callListId: clid !== null && clid > 0 ? clid : undefined,
        inning: Number.isFinite(inn) && inn > 0 ? inn : undefined
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(err => {
          console.error('Card master load failed', err);
          const status = typeof err?.status === 'number' ? err.status : null;
          this.error.set(
            status === 500
              ? 'Get_Printed_Cards returned a server error (500). Check calllistid and inning, then try again.'
              : 'Unable to load printed cards right now.'
          );
          return of<PrintedCard[]>([]);
        }),
        finalize(() => this.loading.set(false))
      )
      .subscribe(list => {
        this.cards.set(list);
        this.consoleContextService.setContext({
          Game_ID: gid,
          Call_List_ID: clid !== null && clid > 0 ? clid : null,
          Inning: Number.isFinite(inn) && inn > 0 ? inn : null
        });
      });
  }

  private applyConsoleContext(): void {
    const ctx = this.consoleContextService.getContext();
    if (!ctx) {
      return;
    }
    if (ctx.Game_ID) {
      this.gameId.set(ctx.Game_ID);
    }
    if (ctx.Call_List_ID !== null && ctx.Call_List_ID !== undefined) {
      this.callListId.set(ctx.Call_List_ID);
    }
    if (ctx.Inning !== null && ctx.Inning !== undefined) {
      this.inning.set(ctx.Inning);
    }
    this.syncNumericDrafts();
  }

  private loadCallListDropdown(): void {
    const userId = this.currentUser()?.UserId ?? null;
    if (!userId || userId <= 0) {
      this.callListDropdownByUser.set([]);
      this.callListDropdownReady.set(true);
      return;
    }

    this.callListDropdownReady.set(false);
    this.callListService
      .getDropDownCallListByUserId(userId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(err => {
          console.error('[Card Master] Get_DropDown_CallList_ByUserID failed', err);
          return of([] as BingoCallListDropdownByUser[]);
        }),
        finalize(() => this.callListDropdownReady.set(true))
      )
      .subscribe(rows => {
        this.callListDropdownByUser.set(rows);
        this.applyCallListIdFromDropdown(rows);
      });
  }

  private applyCallListIdFromDropdown(rows: BingoCallListDropdownByUser[]): void {
    const ids = CallListService.callListIdsFromDropdown(rows);
    if (ids.length === 0) {
      return;
    }

    const current = this.callListId();
    if (current !== null && ids.includes(current)) {
      return;
    }

    this.callListId.set(ids[0]);
    this.syncConsoleContext();
  }

  private syncConsoleContext(): void {
    this.consoleContextService.setContext({
      Game_ID: this.gameId(),
      Call_List_ID: this.callListId(),
      Inning: this.inning()
    });
  }

  private loadGenreOptions(): void {
    this.songService
      .getDropDownGenreEnum()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(err => {
          console.error('Get_DropDown_Genre_Enum failed', err);
          return of([]);
        })
      )
      .subscribe(items => {
        const options = items.map(genreEnumToLookupOption);
        const hasPop = options.some(option => (option.Name ?? '').trim().toLowerCase() === 'pop');
        this.genreOptions.set(hasPop ? options : [{ Id: 0, Name: 'Pop' }, ...options]);
      });
  }

}
