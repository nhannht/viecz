import { Component, inject, OnInit, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { WalletService } from '../core/wallet.service';
import { AuthService } from '../core/auth.service';
import { Wallet, WalletTransaction, BankAccount } from '../core/models';
import { BankListService, VietQRBank } from '../core/bank-list';
import { VndPipe } from '../core/pipes';
import { EmptyStateComponent } from '../shared/components/empty-state.component';
import { ErrorFallbackComponent } from '../shared/components/error-fallback.component';
import { NhannhtMetroCardComponent } from '../shared/components/nhannht-metro-card.component';
import { NhannhtMetroButtonComponent } from '../shared/components/nhannht-metro-button.component';
import { NhannhtMetroInputComponent } from '../shared/components/nhannht-metro-input.component';
import { NhannhtMetroSpinnerComponent } from '../shared/components/nhannht-metro-spinner.component';
import { NhannhtMetroTransactionRowComponent } from '../shared/components/nhannht-metro-transaction-row.component';
import { NhannhtMetroBankSelectComponent } from '../shared/components/nhannht-metro-bank-select.component';
import { NhannhtMetroSnackbarService } from '../shared/services/nhannht-metro-snackbar.service';

@Component({
  selector: 'app-wallet',
  standalone: true,
  imports: [
    FormsModule,
    TranslocoDirective,
    VndPipe,
    EmptyStateComponent,
    ErrorFallbackComponent,
    NhannhtMetroCardComponent,
    NhannhtMetroButtonComponent,
    NhannhtMetroInputComponent,
    NhannhtMetroSpinnerComponent,
    NhannhtMetroTransactionRowComponent,
    NhannhtMetroBankSelectComponent,
  ],
  template: `
    <ng-container *transloco="let t">
      @if (loading()) {
        <div class="flex justify-center py-16">
          <nhannht-metro-spinner />
        </div>
      } @else if (error()) {
        <app-error-fallback [title]="t('wallet.failedToLoadTitle')"
          [message]="t('common.tryAgainLater')" [retryFn]="retryLoad" />
      } @else {
        <div class="flex flex-col gap-4">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <nhannht-metro-card>
              <div class="text-center">
                <div class="font-display text-[11px] tracking-[1px] text-muted">{{ t('wallet.availableBalance') }}</div>
                <div class="text-2xl font-bold font-body mt-1">{{ wallet()?.available_balance | vnd }}</div>
              </div>
            </nhannht-metro-card>
            <nhannht-metro-card>
              <div class="text-center">
                <div class="font-display text-[11px] tracking-[1px] text-muted">{{ t('wallet.totalBalance') }}</div>
                <div class="text-xl font-bold font-body mt-1">{{ wallet()?.balance | vnd }}</div>
              </div>
            </nhannht-metro-card>
            <nhannht-metro-card>
              <div class="text-center">
                <div class="font-display text-[11px] tracking-[1px] text-muted">{{ t('wallet.inEscrow') }}</div>
                <div class="text-xl font-bold font-body mt-1">{{ wallet()?.escrow_balance | vnd }}</div>
              </div>
            </nhannht-metro-card>
          </div>

          <nhannht-metro-card>
            <h3 class="font-display text-[11px] tracking-[2px] text-fg m-0 mb-3">{{ t('wallet.depositTitle') }}</h3>
            <div class="flex gap-3 items-end">
              <nhannht-metro-input [label]="t('wallet.amountLabel')" type="number"
                [step]="1000" [min]="2000"
                [(ngModel)]="depositAmount" name="depositAmount"
                [error]="depositError" />
              @if (depositing()) {
                <nhannht-metro-spinner size="sm" [label]="t('wallet.depositing')" />
              } @else {
                <nhannht-metro-button variant="primary" [label]="t('wallet.depositButton')"
                  (clicked)="deposit()" />
              }
            </div>
            <p class="font-body text-[11px] text-muted mt-1">{{ t('wallet.depositHint') }}</p>
          </nhannht-metro-card>

          <nhannht-metro-card>
            <h3 class="font-display text-[11px] tracking-[2px] text-fg m-0 mb-3">{{ t('wallet.withdrawalTitle') }}</h3>
            <div class="flex gap-3 items-end flex-wrap">
              <div class="flex-1 min-w-[200px]">
                <label class="font-display text-[10px] tracking-[1px] text-muted block mb-1">{{ t('wallet.selectBankAccount') }}</label>
                <select class="w-full border border-border bg-bg text-fg font-body text-sm px-3 py-2 focus:outline-none focus:border-fg"
                  [(ngModel)]="selectedBankAccountId" name="selectedBankAccountId">
                  <option [ngValue]="0" disabled>{{ t('wallet.bankAccountPlaceholder') }}</option>
                  @for (ba of bankAccounts(); track ba.id) {
                    <option [ngValue]="ba.id">{{ ba.bank_name }} - {{ ba.account_number }} ({{ ba.account_holder_name }})</option>
                  }
                </select>
              </div>
              <nhannht-metro-input [label]="t('wallet.amountLabel')" type="number"
                [step]="1000" [min]="10000"
                [(ngModel)]="withdrawAmount" name="withdrawAmount"
                [error]="withdrawError" />
              @if (withdrawing()) {
                <nhannht-metro-spinner size="sm" [label]="t('wallet.withdrawing')" />
              } @else {
                <nhannht-metro-button variant="primary" [label]="t('wallet.withdrawButton')"
                  (clicked)="withdraw()" />
              }
            </div>
            <p class="font-body text-[11px] text-muted mt-1">{{ t('wallet.withdrawalHint', { min: '10,000', available: (wallet()?.available_balance | vnd) || '0' }) }}</p>
            <div class="mt-3">
              <nhannht-metro-button variant="secondary" [label]="showBankAccountForm() ? t('common.close') : t('wallet.manageBankAccounts')"
                (clicked)="toggleBankAccountForm()" />
            </div>

            @if (showBankAccountForm()) {
              <div class="mt-4 border-t border-border pt-4">
                <h4 class="font-display text-[10px] tracking-[2px] text-fg m-0 mb-3">{{ t('wallet.manageBankAccounts') }}</h4>
                @if (bankAccounts().length === 0) {
                  <p class="font-body text-[11px] text-muted">{{ t('wallet.noBankAccounts') }}</p>
                } @else {
                  @for (ba of bankAccounts(); track ba.id) {
                    <div class="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                      <div>
                        <span class="font-body text-sm font-semibold">{{ ba.bank_name }}</span>
                        <span class="font-body text-[11px] text-muted ml-2">{{ ba.account_number }}</span>
                        <span class="font-body text-[11px] text-muted ml-2">({{ ba.account_holder_name }})</span>
                      </div>
                      <nhannht-metro-button variant="secondary" [label]="t('common.delete')"
                        (clicked)="deleteBankAccount(ba.id)" />
                    </div>
                  }
                }

                <div class="mt-4">
                  <h4 class="font-display text-[10px] tracking-[2px] text-fg m-0 mb-3">{{ t('wallet.addBankAccount') }}</h4>
                  <div class="flex flex-col gap-3">
                    <nhannht-metro-bank-select
                      [label]="t('wallet.bankName')"
                      [placeholder]="t('wallet.bankAccountPlaceholder')"
                      [banks]="vietnamBanks()"
                      [(ngModel)]="newBankBin"
                      name="newBankBin" />
                    <nhannht-metro-input [label]="t('wallet.accountNumber')" type="text"
                      [(ngModel)]="newBankAccountNumber" name="newBankAccountNumber" />
                    <nhannht-metro-input [label]="t('wallet.accountHolderName')" type="text"
                      [(ngModel)]="newBankAccountHolderName" name="newBankAccountHolderName" />
                    @if (addingBankAccount()) {
                      <nhannht-metro-spinner size="sm" />
                    } @else {
                      <nhannht-metro-button variant="primary" [label]="t('wallet.addBankAccount')"
                        (clicked)="addBankAccount()" />
                    }
                  </div>
                </div>
              </div>
            }
          </nhannht-metro-card>

          <nhannht-metro-card>
            <div class="flex gap-8 justify-center flex-wrap">
              <div class="text-center">
                <span class="font-display text-[10px] tracking-[1px] text-muted block">{{ t('wallet.totalDeposited') }}</span>
                <span class="font-body font-semibold mt-1 block">{{ wallet()?.total_deposited | vnd }}</span>
              </div>
              <div class="text-center">
                <span class="font-display text-[10px] tracking-[1px] text-muted block">{{ t('wallet.totalWithdrawn') }}</span>
                <span class="font-body font-semibold mt-1 block">{{ wallet()?.total_withdrawn | vnd }}</span>
              </div>
              <div class="text-center">
                <span class="font-display text-[10px] tracking-[1px] text-muted block">{{ t('wallet.totalEarned') }}</span>
                <span class="font-body font-semibold mt-1 block">{{ wallet()?.total_earned | vnd }}</span>
              </div>
              <div class="text-center">
                <span class="font-display text-[10px] tracking-[1px] text-muted block">{{ t('wallet.totalSpent') }}</span>
                <span class="font-body font-semibold mt-1 block">{{ wallet()?.total_spent | vnd }}</span>
              </div>
            </div>
          </nhannht-metro-card>

          <nhannht-metro-card>
            <h3 class="font-display text-[11px] tracking-[2px] text-fg m-0 mb-3">{{ t('wallet.transactionHistory') }}</h3>
            @if (transactions().length === 0) {
              <app-empty-state icon="receipt_long" [title]="t('wallet.noTransactions')"
                [message]="t('wallet.noTransactionsHint')" />
            } @else {
              @for (tx of transactions(); track tx.id) {
                <nhannht-metro-transaction-row [transaction]="tx" />
              }
              @if (hasMore()) {
                <div class="text-center pt-3">
                  <nhannht-metro-button variant="secondary" [label]="t('common.loadMore')"
                    (clicked)="loadMore()" />
                </div>
              }
            }
          </nhannht-metro-card>
        </div>
      }
    </ng-container>
  `,
})
export class WalletComponent implements OnInit {
  private walletService = inject(WalletService);
  private auth = inject(AuthService);
  private bankListService = inject(BankListService);
  private snackbar = inject(NhannhtMetroSnackbarService);
  private platformId = inject(PLATFORM_ID);
  private transloco = inject(TranslocoService);

  wallet = signal<Wallet | null>(null);
  transactions = signal<WalletTransaction[]>([]);
  loading = signal(true);
  error = signal(false);
  depositing = signal(false);
  depositAmount = 0;
  depositError = '';
  txOffset = 0;
  hasMore = signal(false);

  bankAccounts = signal<BankAccount[]>([]);
  withdrawAmount = 0;
  withdrawError = '';
  withdrawing = signal(false);
  showBankAccountForm = signal(false);
  selectedBankAccountId = 0;
  newBankBin = '';
  newBankAccountNumber = '';
  newBankAccountHolderName = '';
  addingBankAccount = signal(false);
  vietnamBanks = signal<VietQRBank[]>([]);

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
    this.loadBankAccounts();
    this.bankListService.getBanks().subscribe(banks => this.vietnamBanks.set(banks));
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
    if (this.auth.needsPhoneVerification()) {
      this.snackbar.show(this.transloco.translate('wallet.phoneRequired'), undefined, { duration: 5000 });
      return;
    }
    const amount = Number(this.depositAmount);
    if (amount < 2000) {
      this.depositError = this.transloco.translate('wallet.minDeposit');
      return;
    }
    if (amount % 1000 !== 0) {
      this.depositError = this.transloco.translate('wallet.amountMultiple');
      return;
    }
    this.depositError = '';
    this.depositing.set(true);
    this.walletService.deposit(Number(this.depositAmount)).subscribe({
      next: res => {
        this.depositing.set(false);
        const url = res.checkout_url;
        if (url && isPlatformBrowser(this.platformId)) {
          if (url.includes('localhost')) {
            this.snackbar.show(this.transloco.translate('wallet.depositCompleted'), undefined, { duration: 3000 });
            setTimeout(() => this.ngOnInit(), 2000);
          } else {
            window.location.href = url;
          }
        }
      },
      error: err => {
        this.depositing.set(false);
        this.snackbar.show(err.error?.error || this.transloco.translate('wallet.depositFailed'), undefined, { duration: 3000 });
      },
    });
  }

  loadBankAccounts() {
    this.walletService.getBankAccounts().subscribe({
      next: accounts => this.bankAccounts.set(accounts || []),
    });
  }

  withdraw() {
    if (this.auth.needsPhoneVerification()) {
      this.snackbar.show(this.transloco.translate('wallet.phoneRequired'), undefined, { duration: 5000 });
      return;
    }
    const amount = Number(this.withdrawAmount);
    if (amount < 10000) {
      this.withdrawError = this.transloco.translate('wallet.minWithdrawal', { min: '10,000' });
      return;
    }
    if (amount % 1000 !== 0) {
      this.withdrawError = this.transloco.translate('wallet.amountMultiple');
      return;
    }
    const available = this.wallet()?.available_balance ?? 0;
    if (amount > available) {
      this.withdrawError = this.transloco.translate('wallet.insufficientBalance');
      return;
    }
    if (!this.selectedBankAccountId) {
      this.withdrawError = this.transloco.translate('wallet.bankAccountPlaceholder');
      return;
    }
    this.withdrawError = '';
    this.withdrawing.set(true);
    this.walletService.withdraw(amount, this.selectedBankAccountId).subscribe({
      next: () => {
        this.withdrawing.set(false);
        this.snackbar.show(this.transloco.translate('wallet.withdrawalSuccess'), undefined, { duration: 3000 });
        this.withdrawAmount = 0;
        this.ngOnInit();
      },
      error: err => {
        this.withdrawing.set(false);
        this.snackbar.show(err.error?.error || this.transloco.translate('common.errorOccurred'), undefined, { duration: 3000 });
      },
    });
  }

  addBankAccount() {
    if (!this.newBankBin || !this.newBankAccountNumber || !this.newBankAccountHolderName) {
      return;
    }
    const bank = this.vietnamBanks().find(b => b.bin === this.newBankBin);
    if (!bank) return;
    this.addingBankAccount.set(true);
    this.walletService.addBankAccount({
      bank_bin: this.newBankBin,
      bank_name: bank.shortName,
      account_number: this.newBankAccountNumber,
      account_holder_name: this.newBankAccountHolderName,
    }).subscribe({
      next: () => {
        this.addingBankAccount.set(false);
        this.snackbar.show(this.transloco.translate('wallet.bankAccountAdded'), undefined, { duration: 3000 });
        this.newBankBin = '';
        this.newBankAccountNumber = '';
        this.newBankAccountHolderName = '';
        this.loadBankAccounts();
      },
      error: err => {
        this.addingBankAccount.set(false);
        this.snackbar.show(err.error?.error || this.transloco.translate('common.errorOccurred'), undefined, { duration: 3000 });
      },
    });
  }

  deleteBankAccount(id: number) {
    this.walletService.deleteBankAccount(id).subscribe({
      next: () => {
        this.snackbar.show(this.transloco.translate('wallet.bankAccountDeleted'), undefined, { duration: 3000 });
        this.loadBankAccounts();
      },
      error: err => {
        this.snackbar.show(err.error?.error || this.transloco.translate('common.errorOccurred'), undefined, { duration: 3000 });
      },
    });
  }

  toggleBankAccountForm() {
    this.showBankAccountForm.update(v => !v);
  }
}
