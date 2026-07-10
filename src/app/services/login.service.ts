import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';

import { environment } from '../../environments/environment';
import { LoginCreateRequest, LoginCreateResult } from '../models/login-create.model';
import { LoginVerifyAliasRequest, LoginVerifyAliasResult } from '../models/login-verify-alias.model';
import { ActiveGameService } from './active-game.service';
import { AuthGuard } from './auth.guard';
import { AuthUserService } from './auth-user.service';
import { ConsoleContextService } from './console-context.service';
import { CurrentOrderService } from './current-order.service';
import { LoggerService } from './logger.service';

@Injectable({ providedIn: 'root' })
export class LoginService {
  private readonly http = inject(HttpClient);
  private readonly authUserService = inject(AuthUserService);
  private readonly consoleContextService = inject(ConsoleContextService);
  private readonly activeGameService = inject(ActiveGameService);
  private readonly currentOrderService = inject(CurrentOrderService);
  private readonly logger = inject(LoggerService);
  private readonly verifyAliasApiUrl = environment.rapidCmsVerifyAliasApiUrl;
  private readonly createLoginApiUrl = environment.rapidCmsCreateLoginApiUrl;

  /**
   * Client logoff: clears auth and app session from localStorage/sessionStorage.
   * No REST call — login uses `verify-alias` only.
   */
  logoff(): void {
    AuthGuard.logout();
    this.authUserService.clearUser();
    this.consoleContextService.clear();
    this.activeGameService.setActive(false);
    this.currentOrderService.clearSession();
  }

  /**
   * `POST …/RapidCMS/login/verify-alias`
   * Body: `{ Alias, Password }` (alias length 6–20 per API validation).
   */
  /**
   * `POST …/RapidCMS/login/create`
   * Body: `LoginCreateRequest` (FirstName, UserAlias, Password, UserType, etc.).
   */
  createLogin(payload: LoginCreateRequest): Observable<LoginCreateResult> {
    const requestBody: LoginCreateRequest = {
      FirstName: payload.FirstName.trim(),
      MiddleInitial: payload.MiddleInitial.trim(),
      LastName: payload.LastName.trim(),
      Email: payload.Email.trim(),
      UserAlias: payload.UserAlias.trim(),
      Password: payload.Password,
      UserType: payload.UserType.trim(),
      Zip: payload.Zip.trim(),
      PhoneNum: payload.PhoneNum.trim()
    };

    this.logger.group('RapidCMS/login/create request');
    this.logger.log('[LoginService]', `POST ${this.createLoginApiUrl}`);
    this.logger.log('[LoginService]', 'Request JSON:', JSON.stringify(requestBody, null, 2));
    this.logger.log('[LoginService]', 'Request body:', requestBody);
    this.logger.groupEnd();

    return this.http.post<unknown>(this.createLoginApiUrl, requestBody).pipe(
      tap(response => {
        this.logger.log('[LoginService]', 'create response:', response);
      }),
      map(response => this.normalizeCreateLoginResponse(response)),
      catchError(error => {
        if (error instanceof HttpErrorResponse) {
          this.logger.error('[LoginService]', 'create error:', {
            status: error.status,
            body: error.error
          });
        }
        return of(this.normalizeCreateLoginError(error));
      })
    );
  }

  verifyAlias(alias: string, password: string): Observable<LoginVerifyAliasResult> {
    const requestBody: LoginVerifyAliasRequest = {
      Alias: alias.trim(),
      Password: password
    };

    return this.http.post<unknown>(this.verifyAliasApiUrl, requestBody).pipe(
      map(response => this.normalizeVerifyAliasResponse(response)),
      catchError(error => of(this.normalizeVerifyAliasError(error)))
    );
  }

  private normalizeCreateLoginError(error: unknown): LoginCreateResult {
    if (error instanceof HttpErrorResponse) {
      const fromBody = this.normalizeCreateLoginResponse(error.error);
      if (fromBody.error || !fromBody.ok) {
        return fromBody;
      }

      if (typeof error.error === 'string' && error.error.trim().length > 0) {
        return this.failedCreateResult(error.error);
      }
    }

    return this.failedCreateResult('Unable to reach the registration service. Please try again.');
  }

  private failedCreateResult(message: string): LoginCreateResult {
    return {
      ok: false,
      userId: null,
      userInfoId: null,
      error: message
    };
  }

  private normalizeCreateLoginResponse(response: unknown): LoginCreateResult {
    const record = this.asRecord(response) ?? {};
    const ok = this.asBoolean(record['ok'] ?? record['Ok']);
    const userId = this.asNullableNumber(record['userId'] ?? record['UserId']);
    const userInfoId = this.asNullableNumber(record['userInfoId'] ?? record['UserInfoId']);
    const modelState = this.asRecord(record['ModelState']);
    const modelStateMessage = modelState ? this.formatModelStateErrors(modelState) : null;

    // API returns HTTP 200 with ok:true and userId/userInfoId 0 when alias already exists.
    if (ok && userId === 0 && userInfoId === 0) {
      return this.failedCreateResult('That user alias is already taken. Choose a different alias.');
    }

    if (ok && (userId === null || userId <= 0)) {
      return this.failedCreateResult('That user alias is already taken. Choose a different alias.');
    }

    return {
      ok,
      userId,
      userInfoId,
      error: this.extractApiError(record, modelStateMessage)
    };
  }

  private normalizeVerifyAliasError(error: unknown): LoginVerifyAliasResult {
    if (error instanceof HttpErrorResponse) {
      const fromBody = this.normalizeVerifyAliasResponse(error.error);
      if (fromBody.error || !fromBody.ok) {
        return fromBody;
      }

      if (typeof error.error === 'string' && error.error.trim().length > 0) {
        return this.failedResult(error.error);
      }
    }

    return this.failedResult('Unable to reach the login service. Please try again.');
  }

  private failedResult(message: string): LoginVerifyAliasResult {
    return {
      ok: false,
      userId: null,
      userEmail: null,
      userPhone: null,
      error: message
    };
  }

  private normalizeVerifyAliasResponse(response: unknown): LoginVerifyAliasResult {
    const record = this.asRecord(response) ?? {};

    const ok = this.asBoolean(record['ok'] ?? record['Ok']);
    const modelState = this.asRecord(record['ModelState']);
    const modelStateMessage = modelState ? this.formatModelStateErrors(modelState) : null;

    return {
      ok,
      userId: this.asNullableNumber(record['userId'] ?? record['UserId']),
      userEmail: this.asNullableString(record['userEmail'] ?? record['UserEmail']),
      userPhone: this.asNullableString(record['userPhone'] ?? record['UserPhone']),
      error: this.extractApiError(record, modelStateMessage)
    };
  }

  private extractApiError(
    record: Record<string, unknown>,
    modelStateMessage: string | null
  ): string | null {
    return (
      this.asNullableString(record['error'] ?? record['Error']) ??
      modelStateMessage ??
      this.asNullableString(record['Message'])
    );
  }

  private formatModelStateErrors(modelState: Record<string, unknown>): string | null {
    const messages = Object.values(modelState)
      .flatMap(value => (Array.isArray(value) ? value : []))
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0);

    return messages.length > 0 ? messages.join(' ') : null;
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : null;
  }

  private asNullableString(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
  }

  private asNullableNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  private asBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      return value !== 0;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      return normalized === 'true' || normalized === '1';
    }

    return false;
  }
}
