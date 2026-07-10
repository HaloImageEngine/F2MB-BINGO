import { Injectable, signal } from '@angular/core';

interface StoredActiveGameState {
  active: boolean;
  expiresAt: number | null;
}

@Injectable({ providedIn: 'root' })
export class ActiveGameService {
  private readonly storageKey = 'gogi.activeGameState';
  private readonly inactivityWindowMs = 2 * 60 * 60 * 1000;
  private readonly syncIntervalMs = 60 * 1000;
  private readonly initialState = this.readStoredState();

  readonly activeGame = signal(this.initialState.active);
  readonly expiresAt = signal<number | null>(this.initialState.expiresAt);

  constructor() {
    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener('storage', this.handleStorageChange);
    window.setInterval(() => this.syncFromStorage(), this.syncIntervalMs);
  }

  setActive(active: boolean): void {
    if (!active) {
      this.activeGame.set(false);
      this.expiresAt.set(null);
      this.removeStoredState();
      return;
    }

    const expiresAt = Date.now() + this.inactivityWindowMs;
    this.activeGame.set(true);
    this.expiresAt.set(expiresAt);
    this.writeStoredState({ active: true, expiresAt });
  }

  touch(): void {
    if (!this.activeGame()) {
      return;
    }

    this.setActive(true);
  }

  private readonly handleStorageChange = (event: StorageEvent): void => {
    if (event.key !== this.storageKey) {
      return;
    }

    this.syncFromStorage();
  };

  private syncFromStorage(): void {
    const nextState = this.readStoredState();
    this.activeGame.set(nextState.active);
    this.expiresAt.set(nextState.expiresAt);
  }

  private readStoredState(): StoredActiveGameState {
    try {
      const raw = localStorage.getItem(this.storageKey);

      if (!raw) {
        return { active: false, expiresAt: null };
      }

      const parsed = JSON.parse(raw) as StoredActiveGameState;
      if (!parsed.active || !parsed.expiresAt || parsed.expiresAt <= Date.now()) {
        this.removeStoredState();
        return { active: false, expiresAt: null };
      }

      return { active: true, expiresAt: parsed.expiresAt };
    } catch {
      return { active: false, expiresAt: null };
    }
  }

  private writeStoredState(state: StoredActiveGameState): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(state));
    } catch {
      // Ignore storage write failures.
    }
  }

  private removeStoredState(): void {
    try {
      localStorage.removeItem(this.storageKey);
    } catch {
      // Ignore storage remove failures.
    }
  }
}
