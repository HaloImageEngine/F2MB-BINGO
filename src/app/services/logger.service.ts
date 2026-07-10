import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class LoggerService {
  private readonly isDebugEnabled = environment.debugLogging;

  log(prefix: string, message: string, data?: unknown): void {
    if (this.isDebugEnabled) {
      console.log(`${prefix} ${message}`, data ?? '');
    }
  }

  error(prefix: string, message: string, data?: unknown): void {
    // Always log errors, regardless of debug setting
    console.error(`${prefix} ${message}`, data ?? '');
  }

  group(label: string): void {
    if (this.isDebugEnabled) {
      console.group(label);
    }
  }

  groupEnd(): void {
    if (this.isDebugEnabled) {
      console.groupEnd();
    }
  }
}
