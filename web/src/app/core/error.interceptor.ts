import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { NhannhtMetroSnackbarService } from '../shared/services/nhannht-metro-snackbar.service';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const snackbar = inject(NhannhtMetroSnackbarService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401) {
        const message = err.error?.error || err.error?.message || 'An error occurred';
        snackbar.show(message, 'Close', { duration: 4000 });
      }
      return throwError(() => err);
    }),
  );
};
