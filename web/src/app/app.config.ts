import { APP_INITIALIZER, ApplicationConfig, ErrorHandler, isDevMode, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideTransloco } from '@jsverse/transloco';
import * as Sentry from '@sentry/angular';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth.interceptor';
import { errorInterceptor } from './core/error.interceptor';
import { TranslocoHttpLoader } from './core/transloco-loader';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: ErrorHandler, useValue: Sentry.createErrorHandler({ showDialog: false }) },
    { provide: Sentry.TraceService, deps: [Router] },
    { provide: APP_INITIALIZER, useFactory: () => () => {}, deps: [Sentry.TraceService], multi: true },
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor]), withFetch()),
    provideClientHydration(withEventReplay()),
    provideTransloco({
      config: {
        availableLangs: ['vi', 'en'],
        defaultLang: 'vi',
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: TranslocoHttpLoader,
    }),
  ],
};
