import { Component, inject, OnInit, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WalletService } from '../core/wallet.service';
import { Wallet, WalletTransaction } from '../core/models';
import { VndPipe } from '../core/pipes';
import { EmptyStateComponent } from '../shared/components/empty-state.component';
import { ErrorFallbackComponent } from '../shared/components/error-fallback.component';
import { NhannhtMetroCardComponent } from '../shared/components/nhannht-metro-card.component';
import { NhannhtMetroButtonComponent } from '../shared/components/nhannht-metro-button.component';
import { NhannhtMetroInputComponent } from '../shared/components/nhannht-metro-input.component';
import { NhannhtMetroSpinnerComponent } from '../shared/components/nhannht-metro-spinner.component';
import { NhannhtMetroTransactionRowComponent } from '../shared/components/nhannht-metro-transaction-row.component';
import { NhannhtMetroSnackbarService } from '../shared/services/nhannht-metro-snackbar.service';

@Component({
  selector: 'app-wallet',
  standalone: true,
  imports: [
    FormsModule,
    VndPipe,
    EmptyStateComponent,
    ErrorFallbackComponent,
    NhannhtMetroCardComponent,
    NhannhtMetroButtonComponent,
    NhannhtMetroInputComponent,
    NhannhtMetroSpinnerComponent,
    NhannhtMetroTransactionRowComponent,
  ],
  template: `
    @if (loading()) {
      <div class="flex justify-center py-16">
        <nhannht-metro-spinner [size]="40" />
      </div>
    } @else if (error()) {
      <app-error-fallback title="Failed to load wallet"
        message="Please try again later." [retryFn]="retryLoad" />
    } @else {
      <div class="flex flex-col gap-4">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <nhannht-metro-card>
            <div class="text-center">
              <div class="font-display text-[11px] tracking-[1px] text-muted">AVAILABLE BALANCE</div>
              <div class="text-2xl font-bold font-body mt-1">{{ wallet()?.available_balance | vnd }}</div>
            </div>
          </nhannht-metro-card>
          <nhannht-metro-card>
            <div class="text-center">
              <div class="font-display text-[11px] tracking-[1px] text-muted">TOTAL BALANCE</div>
              <div class="text-xl font-bold font-body mt-1">{{ wallet()?.balance | vnd }}</div>
            </div>
          </nhannht-metro-card>
          <nhannht-metro-card>
            <div class="text-center">
              <div class="font-display text-[11px] tracking-[1px] text-muted">IN ESCROW</div>
              <div class="text-xl font-bold font-body mt-1">{{ wallet()?.escrow_balance | vnd }}</div>
            </div>
          </nhannht-metro-card>
        </div>

        <nhannht-metro-card>
          <h3 class="font-display text-[11px] tracking-[2px] text-fg m-0 mb-3">DEPOSIT FUNDS</h3>
          <div class="flex gap-3 items-end">
            <nhannht-metro-input label="AMOUNT (VND)" type="number"
              [(ngModel)]="depositAmount" name="depositAmount" />
            @if (depositing()) {
              <nhannht-metro-spinner [size]="20" label="Depositing" />
            } @else {
              <nhannht-metro-button variant="primary" label="Deposit"
                (clicked)="deposit()" />
            }
          </div>
          <p class="font-body text-[11px] text-muted mt-1">Min 2,000 VND. Max balance: 200,000 VND</p>
        </nhannht-metro-card>

        <nhannht-metro-card>
          <div class="flex gap-8 justify-center flex-wrap">
            <div class="text-center">
              <span class="font-display text-[10px] tracking-[1px] text-muted block">TOTAL DEPOSITED</span>
              <span class="font-body font-semibold mt-1 block">{{ wallet()?.total_deposited | vnd }}</span>
            </div>
            <div class="text-center">
              <span class="font-display text-[10px] tracking-[1px] text-muted block">TOTAL EARNED</span>
              <span class="font-body font-semibold mt-1 block">{{ wallet()?.total_earned | vnd }}</span>
            </div>
            <div class="text-center">
              <span class="font-display text-[10px] tracking-[1px] text-muted block">TOTAL SPENT</span>
              <span class="font-body font-semibold mt-1 block">{{ wallet()?.total_spent | vnd }}</span>
            </div>
          </div>
        </nhannht-metro-card>

        <nhannht-metro-card>
          <h3 class="font-display text-[11px] tracking-[2px] text-fg m-0 mb-3">TRANSACTION HISTORY</h3>
          @if (transactions().length === 0) {
            <app-empty-state icon="receipt_long" title="No transactions yet"
              message="Deposit funds to get started" />
          } @else {
            @for (tx of transactions(); track tx.id) {
              <nhannht-metro-transaction-row [transaction]="tx" />
            }
            @if (hasMore()) {
              <div class="text-center pt-3">
                <nhannht-metro-button variant="secondary" label="Load More"
                  (clicked)="loadMore()" />
              </div>
            }
          }
        </nhannht-metro-card>
      </div>
    }
  `,
})
export class WalletComponent implements OnInit {
  private walletService = inject(WalletService);
  private snackbar = inject(NhannhtMetroSnackbarService);
  private platformId = inject(PLATFORM_ID);

  wallet = signal<Wallet | null>(null);
  transactions = signal<WalletTransaction[]>([]);
  loading = signal(true);
  error = signal(false);
  depositing = signal(false);
  depositAmount = 0;
  txOffset = 0;
  hasMore = signal(false);

  retryLoad = () => this.ngOnInit();

  ngOnInit() {
    this.loading.set(true);
    this.error.set(false);
    this.walletService.get().subscribe({
      next: w => {
        this.wallet.set(w);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
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
    if (Number(this.depositAmount) < 2000) {
      this.snackbar.show('Minimum deposit is 2,000 VND', undefined, { duration: 3000 });
      return;
    }
    this.depositing.set(true);
    this.walletService.deposit(Number(this.depositAmount)).subscribe({
      next: res => {
        this.depositing.set(false);
        const url = res.checkout_url;
        if (url && isPlatformBrowser(this.platformId) && !url.includes('localhost')) {
          window.open(url, '_blank');
        }
        this.snackbar.show(url?.includes('localhost') ? 'Deposit completed' : 'Deposit initiated', undefined, { duration: 3000 });
        setTimeout(() => this.ngOnInit(), 2000);
      },
      error: err => {
        this.depositing.set(false);
        this.snackbar.show(err.error?.error || 'Deposit failed', undefined, { duration: 3000 });
      },
    });
  }
}
