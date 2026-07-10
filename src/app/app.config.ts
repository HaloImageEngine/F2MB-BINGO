import { APP_INITIALIZER, ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { routes } from './app.routes';
import { ConsoleContextService } from './services/console-context.service';

function initConsoleContextFromApi(consoleContext: ConsoleContextService): () => Promise<unknown> {
  return () => firstValueFrom(consoleContext.initializeFromApiAndStorage());
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    {
      provide: APP_INITIALIZER,
      useFactory: initConsoleContextFromApi,
      deps: [ConsoleContextService],
      multi: true
    }
  ]
};
