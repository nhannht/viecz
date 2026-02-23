import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap, catchError, shareReplay } from 'rxjs';

export interface VietQRBank {
  id: number;
  name: string;
  code: string;
  bin: string;
  shortName: string;
  logo: string;
  transferSupported: number;
  lookupSupported: number;
}

@Injectable({ providedIn: 'root' })
export class BankListService {
  private http = inject(HttpClient);
  private cache$: Observable<VietQRBank[]> | null = null;

  getBanks(): Observable<VietQRBank[]> {
    if (!this.cache$) {
      this.cache$ = this.http.get<VietQRBank[]>('/api/v1/banks').pipe(
        catchError(() => of([])),
        shareReplay(1),
      );
    }
    return this.cache$;
  }
}
