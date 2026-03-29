import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { VieczSnackbarService } from '../shared/services/viecz-snackbar.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const snackbar = inject(VieczSnackbarService);
  const token = auth.getAccessToken();

  // Skip auth header and error handling for external API calls (MapTiler, Nominatim, etc.)
  const isExternal = req.url.startsWith('http') && !req.url.includes('/api/');
  if (isExternal) {
    return next(req);
  }

  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && auth.getRefreshToken() && !req.url.includes('/auth/')) {
        return auth.refresh().pipe(
          switchMap(() => {
            const newToken = auth.getAccessToken();
            return next(req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } }));
          }),
          catchError(() => {
            auth.logout();
            return throwError(() => err);
          }),
        );
      }
      if (err.status === 403 && err.error?.error === 'email_not_verified') {
        snackbar.show('Please verify your email before performing this action');
      }
      return throwError(() => err);
    }),
  );
};
