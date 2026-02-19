import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface EscrowResponse {
  transaction: {
    id: number;
    task_id: number;
    payer_id: number;
    payee_id: number;
    amount: number;
    platform_fee: number;
    net_amount: number;
    type: string;
    status: string;
    description: string;
    created_at: string;
    updated_at: string;
  };
  checkout_url: string;
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private http = inject(HttpClient);

  createEscrow(taskId: number) {
    return this.http.post<EscrowResponse>('/api/v1/payments/escrow', { task_id: taskId });
  }

  release(taskId: number) {
    return this.http.post<{ message: string }>('/api/v1/payments/release', { task_id: taskId });
  }

  refund(taskId: number, reason: string) {
    return this.http.post<{ message: string }>('/api/v1/payments/refund', { task_id: taskId, reason });
  }
}
