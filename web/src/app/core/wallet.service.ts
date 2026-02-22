import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Wallet, WalletTransaction, DepositResponse } from './models';

@Injectable({ providedIn: 'root' })
export class WalletService {
  private http = inject(HttpClient);

  get() {
    return this.http.get<Wallet>('/api/v1/wallet');
  }

  deposit(amount: number, description = 'Wallet deposit') {
    const return_url =
      typeof window !== 'undefined'
        ? `${window.location.origin}/payment/return`
        : undefined;
    return this.http.post<DepositResponse>('/api/v1/wallet/deposit', {
      amount,
      description,
      return_url,
    });
  }

  getTransactions(limit = 20, offset = 0) {
    const params = new HttpParams().set('limit', limit).set('offset', offset);
    return this.http.get<WalletTransaction[]>('/api/v1/wallet/transactions', { params });
  }

  createEscrow(taskId: number) {
    return this.http.post('/api/v1/payments/escrow', { task_id: taskId });
  }

  releasePayment(taskId: number) {
    return this.http.post('/api/v1/payments/release', { task_id: taskId });
  }

  refundPayment(taskId: number, reason: string) {
    return this.http.post('/api/v1/payments/refund', { task_id: taskId, reason });
  }
}
