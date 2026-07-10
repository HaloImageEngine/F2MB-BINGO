import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';

interface PrintOptions {
  bodyClass?: string;
  title?: string;
}

@Injectable({ providedIn: 'root' })
export class PrintService {
  private readonly document = inject(DOCUMENT);

  print(options: PrintOptions = {}): void {
    const view = this.document.defaultView;

    if (!view) {
      return;
    }

    const bodyClass = options.bodyClass?.trim() || null;
    const previousTitle = this.document.title;
    const mediaQuery = typeof view.matchMedia === 'function' ? view.matchMedia('print') : null;
    let cleanedUp = false;

    const cleanup = (): void => {
      if (cleanedUp) {
        return;
      }

      cleanedUp = true;

      if (bodyClass) {
        this.document.body.classList.remove(bodyClass);
      }

      this.document.title = previousTitle;
      view.removeEventListener('afterprint', cleanup);

      if (mediaQuery) {
        if (typeof mediaQuery.removeEventListener === 'function') {
          mediaQuery.removeEventListener('change', handlePrintChange);
        } else if (typeof mediaQuery.removeListener === 'function') {
          mediaQuery.removeListener(handleLegacyPrintChange);
        }
      }
    };

    const handlePrintChange = (event: MediaQueryListEvent): void => {
      if (!event.matches) {
        cleanup();
      }
    };

    const handleLegacyPrintChange = (event: MediaQueryListEvent): void => {
      handlePrintChange(event);
    };

    if (bodyClass) {
      this.document.body.classList.add(bodyClass);
    }

    if (options.title?.trim()) {
      this.document.title = options.title.trim();
    }

    view.addEventListener('afterprint', cleanup, { once: true });

    if (mediaQuery) {
      if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', handlePrintChange);
      } else if (typeof mediaQuery.addListener === 'function') {
        mediaQuery.addListener(handleLegacyPrintChange);
      }
    }

    this.document.body.offsetHeight;

    view.requestAnimationFrame(() => {
      view.requestAnimationFrame(() => {
        view.focus();
        view.print();
      });
    });
  }
}
