import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const snackBar = inject(MatSnackBar);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401) {
        const message = err.error?.error || err.error?.message || 'An error occurred';
        snackBar.open(message, 'Close', { duration: 4000, panelClass: 'error-snackbar' });
      }
      return throwError(() => err);
    }),
  );
};
