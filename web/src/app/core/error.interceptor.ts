import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { NhannhtMetroSnackbarService } from '../shared/services/nhannht-metro-snackbar.service';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const snackbar = inject(NhannhtMetroSnackbarService);
  const transloco = inject(TranslocoService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401) {
        const message = err.error?.error || err.error?.message || transloco.translate('common.errorOccurred');
        snackbar.show(message, transloco.translate('common.close'), { duration: 4000 });
      }
      return throwError(() => err);
    }),
  );
};
