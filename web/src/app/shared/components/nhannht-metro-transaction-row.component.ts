import { Component, input, computed } from '@angular/core';
import { NhannhtMetroIconComponent } from './nhannht-metro-icon.component';
import { VndPipe, TimeAgoPipe } from '../../core/pipes';
import type { WalletTransaction } from '../../core/models';

/**
 * Single row displaying a wallet transaction with icon, description, and amount.
 *
 * Icon and color are determined by transaction type:
 * - **Credit** (deposit, escrow_refund, payment_received): positive amount
 * - **Debit** (withdrawal, escrow_hold, platform_fee): negative amount
 *
 * Replaces `MatListItem` in the transaction list.
 *
 * @example
 * ```html
 * <nhannht-metro-transaction-row [transaction]="tx" />
 * ```
 */
@Component({
  selector: 'nhannht-metro-transaction-row',
  standalone: true,
  imports: [NhannhtMetroIconComponent, VndPipe, TimeAgoPipe],
  template: `
    <div class="flex items-center gap-4 py-3 border-b border-border font-body">
      <nhannht-metro-icon [name]="iconName()" [size]="24" />

      <div class="flex-1">
        <p class="text-[13px] text-fg">{{ transaction().description }}</p>
        <p class="text-[11px] text-muted">{{ transaction().created_at | timeAgo }}</p>
      </div>

      <span class="text-[13px] font-bold"
            [class.text-fg]="isCredit()"
            [class.text-muted]="!isCredit()">
        {{ isCredit() ? '+' : '-' }}{{ transaction().amount | vnd }}
      </span>
    </div>
  `,
})
export class NhannhtMetroTransactionRowComponent {
  /** Transaction data object. */
  transaction = input.required<WalletTransaction>();

  isCredit = computed(() => {
    const t = this.transaction().type;
    return t === 'deposit' || t === 'escrow_refund' || t === 'payment_received';
  });

  iconName = computed(() => {
    switch (this.transaction().type) {
      case 'deposit': return 'arrow_downward';
      case 'escrow_refund': return 'undo';
      case 'payment_received': return 'payments';
      case 'withdrawal': return 'arrow_upward';
      case 'escrow_hold': return 'lock';
      case 'platform_fee': return 'receipt';
      default: return 'swap_horiz';
    }
  });
}
