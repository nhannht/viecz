import { Component, inject, OnInit, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatDivider } from '@angular/material/divider';
import { MatList, MatListItem } from '@angular/material/list';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { WalletService } from '../core/wallet.service';
import { Wallet, WalletTransaction } from '../core/models';
import { VndPipe, TimeAgoPipe } from '../core/pipes';

@Component({
  selector: 'app-wallet',
  standalone: true,
  imports: [
    FormsModule,
    MatCard,
    MatCardContent,
    MatCardHeader,
    MatCardTitle,
    MatButton,
    MatIcon,
    MatFormField,
    MatLabel,
    MatInput,
    MatDivider,
    MatList,
    MatListItem,
    MatProgressSpinner,
    VndPipe,
    TimeAgoPipe,
  ],
  template: `
    @if (loading()) {
      <div class="loading"><mat-spinner diameter="40"></mat-spinner></div>
    } @else {
      <div class="wallet-page">
        <div class="balance-cards">
          <mat-card class="balance-card primary-card">
            <mat-card-content>
              <div class="balance-label">Available Balance</div>
              <div class="balance-value">{{ wallet()?.available_balance | vnd }}</div>
            </mat-card-content>
          </mat-card>
          <mat-card class="balance-card">
            <mat-card-content>
              <div class="balance-label">Total Balance</div>
              <div class="balance-value secondary">{{ wallet()?.balance | vnd }}</div>
            </mat-card-content>
          </mat-card>
          <mat-card class="balance-card">
            <mat-card-content>
              <div class="balance-label">In Escrow</div>
              <div class="balance-value secondary">{{ wallet()?.escrow_balance | vnd }}</div>
            </mat-card-content>
          </mat-card>
        </div>

        <mat-card class="deposit-card">
          <mat-card-header>
            <mat-card-title>Deposit Funds</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="deposit-form">
              <mat-form-field appearance="outline">
                <mat-label>Amount (VND)</mat-label>
                <input matInput type="number" [(ngModel)]="depositAmount" min="2000">
              </mat-form-field>
              <button mat-raised-button (click)="deposit()" [disabled]="depositing()">
                @if (depositing()) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  Deposit
                }
              </button>
            </div>
            <div class="deposit-hint">Min 2,000 VND. Max balance: 200,000 VND</div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stats-card">
          <mat-card-content>
            <div class="stats-grid">
              <div class="stat">
                <span class="stat-label">Total Deposited</span>
                <span class="stat-value">{{ wallet()?.total_deposited | vnd }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Total Earned</span>
                <span class="stat-value">{{ wallet()?.total_earned | vnd }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Total Spent</span>
                <span class="stat-value">{{ wallet()?.total_spent | vnd }}</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-header>
            <mat-card-title>Transaction History</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @if (transactions().length === 0) {
              <p class="no-data">No transactions yet</p>
            } @else {
              <mat-list>
                @for (tx of transactions(); track tx.id) {
                  <mat-list-item class="tx-item">
                    <mat-icon class="tx-icon" [class]="txIconClass(tx.type)">
                      {{ txIcon(tx.type) }}
                    </mat-icon>
                    <div class="tx-info">
                      <span class="tx-desc">{{ tx.description }}</span>
                      <span class="tx-time">{{ tx.created_at | timeAgo }}</span>
                    </div>
                    <span class="tx-amount" [class.positive]="isCredit(tx.type)"
                          [class.negative]="!isCredit(tx.type)">
                      {{ isCredit(tx.type) ? '+' : '-' }}{{ tx.amount | vnd }}
                    </span>
                  </mat-list-item>
                  <mat-divider></mat-divider>
                }
              </mat-list>
              @if (hasMore()) {
                <div class="load-more">
                  <button mat-button (click)="loadMore()">Load More</button>
                </div>
              }
            }
          </mat-card-content>
        </mat-card>
      </div>
    }
  `,
  styles: `
    .loading { display: flex; justify-content: center; padding: 64px 0; }
    .wallet-page { display: flex; flex-direction: column; gap: 16px; }
    .balance-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }
    .balance-card { text-align: center; }
    .primary-card {
      background: var(--mat-sys-primary-container);
      color: var(--mat-sys-on-primary-container);
    }
    .balance-label { font-size: 0.875rem; margin-bottom: 4px; }
    .balance-value { font-size: 1.5rem; font-weight: 700; }
    .balance-value.secondary { font-size: 1.25rem; }
    .deposit-form {
      display: flex; gap: 12px; align-items: flex-start;
      margin-top: 8px;
    }
    .deposit-hint {
      font-size: 0.75rem;
      color: var(--mat-sys-on-surface-variant);
      margin-top: -8px;
    }
    .stats-grid { display: flex; gap: 32px; justify-content: center; flex-wrap: wrap; }
    .stat { text-align: center; }
    .stat-label { display: block; font-size: 0.8rem; color: var(--mat-sys-on-surface-variant); }
    .stat-value { display: block; font-weight: 600; margin-top: 4px; }
    .no-data { text-align: center; color: var(--mat-sys-on-surface-variant); padding: 24px; }
    .tx-item {
      height: auto !important;
      padding: 12px 0 !important;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .tx-icon { margin-right: 8px; }
    .tx-icon.credit { color: #2e7d32; }
    .tx-icon.debit { color: #d32f2f; }
    .tx-info { flex: 1; display: flex; flex-direction: column; }
    .tx-desc { font-size: 0.875rem; }
    .tx-time { font-size: 0.75rem; color: var(--mat-sys-on-surface-variant); }
    .tx-amount { font-weight: 600; white-space: nowrap; }
    .tx-amount.positive { color: #2e7d32; }
    .tx-amount.negative { color: #d32f2f; }
    .load-more { text-align: center; padding: 8px; }
  `,
})
export class WalletComponent implements OnInit {
  private walletService = inject(WalletService);
  private snackBar = inject(MatSnackBar);
  private platformId = inject(PLATFORM_ID);

  wallet = signal<Wallet | null>(null);
  transactions = signal<WalletTransaction[]>([]);
  loading = signal(true);
  depositing = signal(false);
  depositAmount = 50000;
  txOffset = 0;
  hasMore = signal(false);

  ngOnInit() {
    this.walletService.get().subscribe({
      next: w => {
        this.wallet.set(w);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.loadTransactions();
  }

  loadTransactions() {
    this.walletService.getTransactions(20, this.txOffset).subscribe({
      next: txs => {
        this.transactions.update(existing => [...existing, ...txs]);
        this.hasMore.set(txs.length === 20);
        this.txOffset += txs.length;
      },
    });
  }

  loadMore() {
    this.loadTransactions();
  }

  deposit() {
    if (this.depositAmount < 2000) {
      this.snackBar.open('Minimum deposit is 2,000 VND', 'Close', { duration: 3000 });
      return;
    }
    this.depositing.set(true);
    this.walletService.deposit(this.depositAmount).subscribe({
      next: res => {
        this.depositing.set(false);
        if (res.checkout_url && isPlatformBrowser(this.platformId)) {
          window.open(res.checkout_url, '_blank');
        }
        this.snackBar.open('Deposit initiated', 'Close', { duration: 3000 });
        setTimeout(() => this.ngOnInit(), 2000);
      },
      error: err => {
        this.depositing.set(false);
        this.snackBar.open(err.error?.error || 'Deposit failed', 'Close', { duration: 3000 });
      },
    });
  }

  txIcon(type: string): string {
    const icons: Record<string, string> = {
      deposit: 'arrow_downward',
      withdrawal: 'arrow_upward',
      escrow_hold: 'lock',
      escrow_release: 'lock_open',
      escrow_refund: 'undo',
      payment_received: 'payments',
      platform_fee: 'receipt',
    };
    return icons[type] || 'swap_horiz';
  }

  txIconClass(type: string): string {
    return this.isCredit(type) ? 'credit' : 'debit';
  }

  isCredit(type: string): boolean {
    return ['deposit', 'escrow_refund', 'payment_received'].includes(type);
  }
}
