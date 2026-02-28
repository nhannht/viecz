import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import * as Sentry from '@sentry/angular';
import { NhannhtMetroSnackbarService } from '../shared/services/nhannht-metro-snackbar.service';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  // Skip error handling for external API calls (MapTiler, Nominatim, etc.)
  const isExternal = req.url.startsWith('http') && !req.url.includes('/api/');
  if (isExternal) {
    return next(req);
  }

  const snackbar = inject(NhannhtMetroSnackbarService);
  const transloco = inject(TranslocoService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      // Report server errors to Sentry
      if (err.status >= 500) {
        Sentry.captureException(err);
      }

      if (err.status !== 401) {
        const message = err.error?.error || err.error?.message || transloco.translate('common.errorOccurred');
        snackbar.show(message, transloco.translate('common.close'), { duration: 4000 });
      }
      return throwError(() => err);
    }),
  );
};
