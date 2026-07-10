import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  computed,
  inject,
  input,
  signal
} from '@angular/core';
import { numericDraftFromValue, parsePositiveInteger } from '../numeric-input-draft';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { catchError, distinctUntilChanged, finalize, of } from 'rxjs';

import { AuthUserService } from '../../services/auth-user.service';
import { CallListService } from '../../services/calllist.service';

/**
 * Call_List_ID picker backed by `GET …/Get_DropDown_CallList_ByUserID/{User_ID}`.
 * Renders a &lt;select&gt; when the API returns rows; otherwise a number input.
 */
@Component({
  selector: 'app-call-list-id-field',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styleUrl: './call-list-id-field.component.css',
  template: `
    @if (forceSelect() || callListIdOptions().length > 0) {
      <select
        [ngModel]="value"
        (ngModelChange)="emitValue($event)"
        [ngModelOptions]="{ standalone: true }"
        [class]="selectClass()"
        [attr.aria-label]="ariaLabel()"
        [disabled]="disabled() || optionsLoading() || callListIdOptions().length === 0">
        @if (optionsLoading()) {
          <option [ngValue]="null" disabled>Loading call lists…</option>
        } @else if (callListIdOptions().length === 0) {
          <option [ngValue]="null" disabled>
            {{ optionsLoadFailed() ? 'Failed to load call lists' : 'No call lists for this user' }}
          </option>
        } @else {
          @if (allowEmpty()) {
            <option [ngValue]="null">{{ emptyLabel() }}</option>
          }
          @for (id of callListIdOptions(); track id) {
            <option [ngValue]="id">{{ id }}</option>
          }
        }
      </select>
    } @else {
      <input
        type="number"
        min="1"
        step="1"
        [ngModel]="numberDraft()"
        (ngModelChange)="onNumberDraftInput($event)"
        (blur)="commitNumberDraft()"
        (keydown.enter)="commitNumberDraft(); $event.preventDefault()"
        [ngModelOptions]="{ standalone: true }"
        [class]="inputClass()"
        [placeholder]="placeholder()"
        [attr.aria-label]="ariaLabel()"
        [disabled]="disabled()" />
    }
  `
})
export class CallListIdFieldComponent implements OnChanges {
  private readonly destroyRef = inject(DestroyRef);
  private readonly callListService = inject(CallListService);
  private readonly authUserService = inject(AuthUserService);
  private lastFetchedUserId: number | null = null;
  private fetchGeneration = 0;

  @Input() value: number | null = null;
  @Output() valueChange = new EventEmitter<number | null>();

  readonly ariaLabel = input('Call List ID');
  readonly placeholder = input('Call list ID');
  readonly emptyLabel = input('Select call list…');
  readonly allowEmpty = input(true);
  readonly disabled = input(false);
  readonly selectClass = input('');
  readonly inputClass = input('');
  /** Override logged-in user; defaults to AuthUserService UserId. */
  readonly userId = input<number | null>(null);
  /** Emit first option when value is null and options load. */
  readonly autoSelectFirst = input(false);
  /** Always render a &lt;select&gt; (never fall back to number input). */
  readonly forceSelect = input(false);

  readonly callListIdOptions = signal<number[]>([]);
  readonly optionsLoading = signal(false);
  readonly optionsUserId = signal<number | null>(null);
  readonly optionsLoadFailed = signal(false);
  /** Draft for number-input mode; committed to parent on blur or Enter. */
  readonly numberDraft = signal('');

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) {
      this.numberDraft.set(numericDraftFromValue(this.value));
    }
  }

  private readonly resolvedUserId = computed(
    () => this.userId() ?? this.authUserService.user()?.UserId ?? null
  );

  constructor() {
    toObservable(this.resolvedUserId)
      .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(userId => this.onResolvedUserIdChanged(userId));
  }

  onNumberDraftInput(raw: unknown): void {
    this.numberDraft.set(raw != null && raw !== '' ? String(raw) : '');
  }

  commitNumberDraft(): void {
    const parsed = parsePositiveInteger(this.numberDraft());
    if (parsed !== null) {
      this.valueChange.emit(parsed);
      this.numberDraft.set(String(parsed));
      return;
    }

    if (this.allowEmpty() && !this.numberDraft().trim()) {
      this.valueChange.emit(null);
      this.numberDraft.set('');
      return;
    }

    this.numberDraft.set(numericDraftFromValue(this.value));
  }

  emitValue(raw: unknown): void {
    if (raw === null || raw === undefined || raw === '') {
      if (this.allowEmpty()) {
        this.valueChange.emit(null);
      }
      return;
    }

    const parsed = typeof raw === 'string' ? Number.parseInt(raw, 10) : Number(raw);
    if (Number.isInteger(parsed) && parsed > 0) {
      this.valueChange.emit(parsed);
    } else if (this.allowEmpty()) {
      this.valueChange.emit(null);
    }
  }

  private onResolvedUserIdChanged(resolvedUserId: number | null): void {
    if (!resolvedUserId || resolvedUserId <= 0) {
      this.lastFetchedUserId = null;
      this.optionsUserId.set(null);
      this.callListIdOptions.set([]);
      this.optionsLoading.set(false);
      this.optionsLoadFailed.set(false);
      return;
    }

    if (this.lastFetchedUserId === resolvedUserId) {
      return;
    }

    this.loadOptions(resolvedUserId);
  }

  private loadOptions(resolvedUserId: number): void {
    const generation = ++this.fetchGeneration;
    this.lastFetchedUserId = resolvedUserId;
    this.optionsUserId.set(resolvedUserId);
    this.optionsLoadFailed.set(false);
    this.optionsLoading.set(true);

    this.callListService
      .getDropDownCallListByUserId(resolvedUserId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(err => {
          console.error('Get_DropDown_CallList_ByUserID failed', err);
          this.optionsLoadFailed.set(true);
          return of([]);
        }),
        finalize(() => {
          if (generation === this.fetchGeneration) {
            this.optionsLoading.set(false);
          }
        })
      )
      .subscribe(rows => {
        if (generation !== this.fetchGeneration) {
          return;
        }

        const ids = CallListService.callListIdsFromDropdown(rows);
        this.callListIdOptions.set(ids);
        this.syncValueWithOptions(ids);
      });
  }

  private syncValueWithOptions(ids: number[]): void {
    if (ids.length === 0) {
      return;
    }

    const current = this.value;
    const currentValid =
      typeof current === 'number' && Number.isInteger(current) && current > 0 && ids.includes(current);

    if (currentValid) {
      return;
    }

    if (this.autoSelectFirst() || !this.allowEmpty()) {
      this.valueChange.emit(ids[0]);
    }
  }
}
