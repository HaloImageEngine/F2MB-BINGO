import { Injectable, signal } from '@angular/core';

export interface AuthUser {
  UserId: number;
  UserAlias: string;
  UserEmail?: string | null;
  UserPhone?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthUserService {
  private readonly storageKey = 'bingo_auth_user_v1';
  private readonly userInfoStorageKey = 'UserInfo';
  private readonly userSignal = signal<AuthUser | null>(this.readStoredUser());

  readonly user = this.userSignal.asReadonly();

  setUser(user: AuthUser): void {
    const normalized = this.normalizeUser(user);
    if (!normalized) {
      return;
    }

    this.userSignal.set(normalized);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(this.storageKey, JSON.stringify(normalized));
      window.localStorage.setItem(
        this.userInfoStorageKey,
        JSON.stringify({
          UserAlias: normalized.UserAlias,
          UserId: normalized.UserId,
          UserEmail: normalized.UserEmail ?? null
        })
      );
    }
  }

  clearUser(): void {
    this.userSignal.set(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(this.storageKey);
      window.localStorage.removeItem(this.userInfoStorageKey);
    }
  }

  private readStoredUser(): AuthUser | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const raw = window.localStorage.getItem(this.storageKey);
    const rawUserInfo = window.localStorage.getItem(this.userInfoStorageKey);
    if (!raw) {
      if (!rawUserInfo) {
        return null;
      }

      try {
        const userInfoRecord = JSON.parse(rawUserInfo) as Record<string, unknown>;
        const userId = this.asOptionalNumber(userInfoRecord['UserId']);
        return this.normalizeUser({
          UserId: userId ?? undefined,
          UserAlias: this.asOptionalString(userInfoRecord['UserAlias']) ?? '',
          UserEmail: this.asOptionalString(userInfoRecord['UserEmail'])
        });
      } catch {
        return null;
      }
    }

    try {
      return this.normalizeUser(JSON.parse(raw) as Partial<AuthUser>);
    } catch {
      return null;
    }
  }

  private normalizeUser(value: Partial<AuthUser> | null): AuthUser | null {
    if (!value) {
      return null;
    }

    const userId =
      typeof value.UserId === 'number' && Number.isFinite(value.UserId)
        ? Math.trunc(value.UserId)
        : null;
    const userAlias = typeof value.UserAlias === 'string' ? value.UserAlias.trim() : '';

    if (userId === null || userAlias.length === 0) {
      return null;
    }

    return {
      UserId: userId,
      UserAlias: userAlias,
      UserEmail: this.asOptionalString(value.UserEmail),
      UserPhone: this.asOptionalString(value.UserPhone)
    };
  }

  private asOptionalString(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
  }

  private asOptionalNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Math.trunc(value);
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
    }

    return null;
  }
}
