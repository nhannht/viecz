import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { NhannhtMetroSnackbarService } from '../shared/services/nhannht-metro-snackbar.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const snackbar = inject(NhannhtMetroSnackbarService);
  const token = auth.getAccessToken();

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
