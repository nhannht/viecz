import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Wallet, WalletTransaction, DepositResponse, BankAccount, WithdrawalResponse } from './models';

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

  getDepositStatus(orderCode: number) {
    return this.http.get<{ status: string }>(`/api/v1/wallet/deposit/status/${orderCode}`);
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

  withdraw(amount: number, bankAccountId: number) {
    return this.http.post<WithdrawalResponse>('/api/v1/wallet/withdraw', {
      amount,
      bank_account_id: bankAccountId,
    });
  }

  getBankAccounts() {
    return this.http.get<BankAccount[]>('/api/v1/wallet/bank-accounts');
  }

  addBankAccount(data: { bank_bin: string; bank_name: string; account_number: string; account_holder_name: string }) {
    return this.http.post<BankAccount>('/api/v1/wallet/bank-accounts', data);
  }

  deleteBankAccount(id: number) {
    return this.http.delete(`/api/v1/wallet/bank-accounts/${id}`);
  }
}
