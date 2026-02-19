import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MatList, MatListItem } from '@angular/material/list';
import { MatIcon } from '@angular/material/icon';
import { MatDivider } from '@angular/material/divider';
import { MatButton } from '@angular/material/button';
import { WalletTransaction } from '../core/models';
import { VndPipe, TimeAgoPipe } from '../core/pipes';

@Component({
  selector: 'app-transaction-list',
  standalone: true,
  imports: [MatList, MatListItem, MatIcon, MatDivider, MatButton, VndPipe, TimeAgoPipe],
  template: `
    @if (transactions.length === 0) {
      <p class="no-data">No transactions yet</p>
    } @else {
      <mat-list>
        @for (tx of transactions; track tx.id) {
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
      @if (hasMore) {
        <div class="load-more">
          <button mat-button (click)="loadMore.emit()">Load More</button>
        </div>
      }
    }
  `,
  styles: `
    .no-data { text-align: center; color: var(--mat-sys-on-surface-variant); padding: 24px; }
    .tx-item {
      height: auto !important; padding: 12px 0 !important;
      display: flex; align-items: center; gap: 12px;
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
export class TransactionListComponent {
  @Input() transactions: WalletTransaction[] = [];
  @Input() hasMore = false;
  @Output() loadMore = new EventEmitter<void>();

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
