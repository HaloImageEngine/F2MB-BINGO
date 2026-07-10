import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  // Static flag to allow explicit logout
  private static isLoggedOut = false;

  constructor(private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    if (AuthGuard.isLoggedOut) {
      // If explicitly logged out, require login
      localStorage.removeItem('authToken');
      localStorage.setItem('postLoginRedirect', state.url);
      this.router.navigate(['/login']);
      return false;
    }
    const token = localStorage.getItem('authToken');
    if (token) {
      return true;
    }
    // Store the attempted URL for redirect after login
    localStorage.setItem('postLoginRedirect', state.url);
    this.router.navigate(['/login']);
    return false;
  }

  /** Call after a successful login so guarded routes accept the new session. */
  static login(): void {
    AuthGuard.isLoggedOut = false;
  }

  static isAuthenticated(): boolean {
    if (AuthGuard.isLoggedOut) {
      return false;
    }

    if (typeof window === 'undefined') {
      return false;
    }

    return !!localStorage.getItem('authToken');
  }

  /** Keys cleared on logoff (no server logout API). */
  private static readonly localSessionKeys = [
    'authToken',
    'bingo_auth_user_v1',
    'UserInfo',
    'postLoginRedirect',
    'bingo_console_context_v1',
    'bingo_console_winning_card_v1',
    'gogi.activeGameState',
    'gogi.currentOrderId',
    'gogi.currentOrderDetail'
  ] as const;

  private static readonly sessionTabKeys = ['bingo_console_top_cards_v1'] as const;

  /** Log off by clearing local/session storage (client-only). */
  static logout(): void {
    AuthGuard.isLoggedOut = true;
    if (typeof window === 'undefined') {
      return;
    }

    for (const key of AuthGuard.localSessionKeys) {
      window.localStorage.removeItem(key);
    }
    for (const key of AuthGuard.sessionTabKeys) {
      window.sessionStorage.removeItem(key);
    }
  }
}
