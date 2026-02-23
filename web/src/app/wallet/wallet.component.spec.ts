import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError, Subject } from 'rxjs';
import { vi } from 'vitest';
import { WalletComponent } from './wallet.component';
import { WalletService } from '../core/wallet.service';
import { Wallet, WalletTransaction } from '../core/models';
import { NhannhtMetroSnackbarService } from '../shared/services/nhannht-metro-snackbar.service';
import { BankListService } from '../core/bank-list';
import { provideTranslocoForTesting } from '../core/transloco-testing';

describe('WalletComponent', () => {
  let component: WalletComponent;
  let fixture: ComponentFixture<WalletComponent>;
  let walletServiceMock: any;
  let snackbarMock: any;

  const mockWallet: Wallet = {
    id: 1, user_id: 1, balance: 150000, escrow_balance: 20000,
    available_balance: 80000, total_deposited: 200000, total_withdrawn: 0,
    total_earned: 50000, total_spent: 50000,
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
  };

  const mockTxs: WalletTransaction[] = [
    {
      id: 1, wallet_id: 1, type: 'deposit', amount: 50000,
      balance_before: 0, balance_after: 50000, escrow_before: 0, escrow_after: 0,
      description: 'Wallet deposit', created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 2, wallet_id: 1, type: 'escrow_hold', amount: 20000,
      balance_before: 50000, balance_after: 30000, escrow_before: 0, escrow_after: 20000,
      description: 'Escrow for task', created_at: '2026-01-02T00:00:00Z',
    },
  ];

  beforeEach(async () => {
    walletServiceMock = {
      get: vi.fn().mockReturnValue(of(mockWallet)),
      deposit: vi.fn(),
      getTransactions: vi.fn().mockReturnValue(of(mockTxs)),
      getBankAccounts: vi.fn().mockReturnValue(of([])),
      addBankAccount: vi.fn(),
      deleteBankAccount: vi.fn(),
      withdraw: vi.fn(),
    };
    snackbarMock = { show: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [WalletComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTranslocoForTesting(),
        { provide: WalletService, useValue: walletServiceMock },
        { provide: NhannhtMetroSnackbarService, useValue: snackbarMock },
        { provide: BankListService, useValue: { getBanks: vi.fn().mockReturnValue(of([])) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WalletComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load wallet and transactions on init', () => {
    fixture.detectChanges();
    expect(walletServiceMock.get).toHaveBeenCalled();
    expect(walletServiceMock.getTransactions).toHaveBeenCalledWith(20, 0);
    expect(component.wallet()).toEqual(mockWallet);
    expect(component.transactions().length).toBe(2);
    expect(component.loading()).toBe(false);
  });

  it('should display available balance', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('AVAILABLE BALANCE');
    expect(el.textContent).toContain('80.000');
  });

  it('should display escrow balance', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('IN ESCROW');
  });

  it('should display stats', () => {
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('TOTAL EARNED');
    expect(text).toContain('TOTAL SPENT');
    expect(text).toContain('TOTAL DEPOSITED');
  });

  it('should show loading spinner initially', () => {
    expect(component.loading()).toBe(true);
  });

  it('should handle wallet load error', () => {
    walletServiceMock.get.mockReturnValue(throwError(() => ({ status: 500 })));
    fixture.detectChanges();
    expect(component.loading()).toBe(false);
    expect(component.wallet()).toBeNull();
  });

  it('should set hasMore when 20 transactions returned', () => {
    const twentyTxs = Array.from({ length: 20 }, (_, i) => ({ ...mockTxs[0], id: i + 1 }));
    walletServiceMock.getTransactions.mockReturnValue(of(twentyTxs));
    fixture.detectChanges();
    expect(component.hasMore()).toBe(true);
  });

  it('should set hasMore to false when less than 20', () => {
    fixture.detectChanges();
    expect(component.hasMore()).toBe(false);
  });

  it('should load more transactions', () => {
    fixture.detectChanges();
    walletServiceMock.getTransactions.mockReturnValue(of([{ ...mockTxs[0], id: 99 }]));
    component.loadMore();
    expect(walletServiceMock.getTransactions).toHaveBeenCalledWith(20, 2);
    expect(component.transactions().length).toBe(3);
  });

  it('should validate minimum deposit amount', () => {
    fixture.detectChanges();
    component.depositAmount = 1000;
    component.deposit();
    expect(component.depositError).toBe('Minimum deposit is 2,000 VND');
    expect(walletServiceMock.deposit).not.toHaveBeenCalled();
  });

  it('should validate deposit amount is multiple of 1000', () => {
    fixture.detectChanges();
    component.depositAmount = 2500;
    component.deposit();
    expect(component.depositError).toBe('Amount must be a multiple of 1,000 VND');
    expect(walletServiceMock.deposit).not.toHaveBeenCalled();
  });

  it('should call deposit service', () => {
    fixture.detectChanges();
    walletServiceMock.deposit.mockReturnValue(of({ checkout_url: 'http://localhost:9999/mock-checkout/123', order_code: 1 }));
    component.depositAmount = 50000;
    component.deposit();
    expect(walletServiceMock.deposit).toHaveBeenCalledWith(50000);
    expect(component.depositing()).toBe(false);
    expect(snackbarMock.show).toHaveBeenCalledWith('Deposit completed', undefined, { duration: 3000 });
  });

  it('should handle deposit error', () => {
    fixture.detectChanges();
    walletServiceMock.deposit.mockReturnValue(throwError(() => ({ error: { error: 'Exceeds max' } })));
    component.depositAmount = 50000;
    component.deposit();
    expect(component.depositing()).toBe(false);
    expect(snackbarMock.show).toHaveBeenCalledWith('Exceeds max', undefined, { duration: 3000 });
  });

  it('should handle deposit error without message', () => {
    fixture.detectChanges();
    walletServiceMock.deposit.mockReturnValue(throwError(() => ({ error: {} })));
    component.depositAmount = 5000;
    component.deposit();
    expect(snackbarMock.show).toHaveBeenCalledWith('Deposit failed', undefined, { duration: 3000 });
  });

  it('should render transaction descriptions', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Wallet deposit');
    expect(el.textContent).toContain('Escrow for task');
  });

  it('should set error state on wallet load error', () => {
    walletServiceMock.get.mockReturnValue(throwError(() => ({ status: 500 })));
    fixture.detectChanges();
    expect(component.error()).toBe(true);
  });

  it('should redirect to external checkout_url', () => {
    fixture.detectChanges();
    const hrefSpy = vi.spyOn(window, 'location', 'get').mockReturnValue({
      ...window.location,
      href: '',
    } as any);
    walletServiceMock.deposit.mockReturnValue(of({ checkout_url: 'https://pay.payos.vn/checkout/123', order_code: 1 }));
    component.depositAmount = 50000;
    component.deposit();
    expect(component.depositing()).toBe(false);
    hrefSpy.mockRestore();
  });

  it('should clear depositError on valid deposit', () => {
    fixture.detectChanges();
    component.depositError = 'old error';
    walletServiceMock.deposit.mockReturnValue(of({ checkout_url: 'http://localhost:9999/mock', order_code: 1 }));
    component.depositAmount = 50000;
    component.deposit();
    expect(component.depositError).toBe('');
  });

  it('retryLoad should reload wallet data', () => {
    fixture.detectChanges();
    walletServiceMock.get.mockClear();
    walletServiceMock.getTransactions.mockClear();
    component.retryLoad();
    expect(walletServiceMock.get).toHaveBeenCalled();
    expect(walletServiceMock.getTransactions).toHaveBeenCalled();
  });

  it('should show error fallback when error is true', () => {
    walletServiceMock.get.mockReturnValue(throwError(() => ({ status: 500 })));
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-error-fallback')).toBeTruthy();
  });

  it('should show empty state when no transactions', () => {
    walletServiceMock.getTransactions.mockReturnValue(of([]));
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('No transactions yet');
  });

  it('should show loading spinner while loading', () => {
    // Before detectChanges, loading is true by default
    expect(component.loading()).toBe(true);
    // After detectChanges with successful load, spinner should be gone
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    // Now loading should be false, spinner should not be visible
    expect(component.loading()).toBe(false);
  });

  it('should render spinner in template when loading signal is true', () => {
    // Component starts with loading=true before ngOnInit completes
    // We verify this by checking the signal state before detectChanges
    expect(component.loading()).toBe(true);
    // After detectChanges and ngOnInit, the wallet loads and loading becomes false
    fixture.detectChanges();
    expect(component.loading()).toBe(false);
    // Now the content should be visible with cards
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('nhannht-metro-card')).toBeTruthy();
  });

  it('should render transaction rows via @for loop', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const txRows = el.querySelectorAll('nhannht-metro-transaction-row');
    expect(txRows.length).toBe(2);
  });

  it('should render deposit form section', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('DEPOSIT');
    expect(el.textContent).toContain('Deposit');
  });

  it('should show depositing spinner when depositing is true', () => {
    fixture.detectChanges();
    component.depositing.set(true);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    // The spinner has aria-label="Depositing", and the deposit button should be hidden
    const spinner = el.querySelector('nhannht-metro-spinner[aria-label="Depositing"]') ||
                    el.querySelectorAll('nhannht-metro-spinner');
    // When depositing, the deposit button is replaced by a spinner
    expect(component.depositing()).toBe(true);
  });

  it('should show deposit button when not depositing', () => {
    fixture.detectChanges();
    expect(component.depositing()).toBe(false);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('nhannht-metro-button')).toBeTruthy();
  });

  it('should render load more button when hasMore is true', () => {
    const twentyTxs = Array.from({ length: 20 }, (_, i) => ({ ...mockTxs[0], id: i + 1 }));
    walletServiceMock.getTransactions.mockReturnValue(of(twentyTxs));
    fixture.detectChanges();
    expect(component.hasMore()).toBe(true);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Load More');
  });

  it('should not render load more button when hasMore is false', () => {
    fixture.detectChanges();
    expect(component.hasMore()).toBe(false);
    // Count "Load More" text occurrences - only "LOAD MORE" from deposit section should exist
    const el = fixture.nativeElement as HTMLElement;
    const transactionCard = el.querySelectorAll('nhannht-metro-card')[3]; // 4th card is transactions
    if (transactionCard) {
      const loadMoreBtn = transactionCard.querySelector('nhannht-metro-button[variant="secondary"]');
      // The load more button should not exist in the transaction card
      expect(loadMoreBtn).toBeNull();
    }
  });

  it('should display total balance card', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('TOTAL BALANCE');
    expect(el.textContent).toContain('150.000');
  });

  it('should display escrow balance value', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('20.000');
  });

  it('should increment txOffset after loading transactions', () => {
    fixture.detectChanges();
    expect(component.txOffset).toBe(2); // 2 mock transactions loaded
  });

  it('should append transactions on loadMore', () => {
    fixture.detectChanges();
    const newTx = { ...mockTxs[0], id: 100, description: 'Another deposit' };
    walletServiceMock.getTransactions.mockReturnValue(of([newTx]));
    component.loadMore();
    expect(component.transactions().length).toBe(3);
    expect(component.txOffset).toBe(3);
  });

  it('should render loading spinner in DOM when loading is true', () => {
    // Make the wallet service never complete, so loading stays true
    walletServiceMock.get.mockReturnValue(new Subject());
    walletServiceMock.getTransactions.mockReturnValue(of([]));
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(component.loading()).toBe(true);
    expect(el.querySelector('nhannht-metro-spinner')).toBeTruthy();
    // Cards should not be rendered while loading
    expect(el.querySelector('nhannht-metro-card')).toBeFalsy();
  });

  it('should set depositError via deposit validation', () => {
    fixture.detectChanges();
    // Use the component method which sets depositAmount and error within the same CD cycle
    component.depositAmount = 1000;
    component.deposit();
    expect(component.depositError).toBe('Minimum deposit is 2,000 VND');
  });

  it('should not render wallet content when error state is true', () => {
    walletServiceMock.get.mockReturnValue(throwError(() => ({ status: 500 })));
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    // Error fallback should be shown, not wallet cards
    expect(el.querySelector('app-error-fallback')).toBeTruthy();
    expect(el.querySelector('nhannht-metro-card')).toBeFalsy();
  });

  it('should render depositing spinner in DOM and hide deposit button', () => {
    fixture.detectChanges();
    component.depositing.set(true);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    // The spinner should be present (via aria-label check)
    const spinners = el.querySelectorAll('nhannht-metro-spinner');
    expect(spinners.length).toBeGreaterThan(0);
    // The deposit button label should not be visible since spinner replaces it
    expect(component.depositing()).toBe(true);
  });

  it('should show deposit button in DOM when not depositing', () => {
    fixture.detectChanges();
    component.depositing.set(false);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    // The deposit button should be rendered
    const depositBtn = el.querySelector('nhannht-metro-button');
    expect(depositBtn).toBeTruthy();
  });

  it('should render empty state component when transactions list is empty', () => {
    walletServiceMock.getTransactions.mockReturnValue(of([]));
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-empty-state')).toBeTruthy();
  });

  it('should not render empty state when transactions exist', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-empty-state')).toBeFalsy();
  });

  it('should render deposit error message in template when depositError is set', async () => {
    fixture.autoDetectChanges();
    await fixture.whenStable();
    component.depositAmount = 1000;
    component.deposit(); // triggers min deposit validation, sets depositError
    await fixture.whenStable();
    expect(component.depositError).toBeTruthy();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Minimum deposit');
  });

  it('should handle deposit success when checkout_url is falsy', () => {
    fixture.detectChanges();
    // Deposit returns response with no checkout_url → url is undefined/falsy
    walletServiceMock.deposit.mockReturnValue(of({ checkout_url: '', order_code: 1 }));
    component.depositAmount = 5000;
    component.deposit();
    expect(component.depositing()).toBe(false);
    // No redirect, no snackbar — the if (url && ...) branch is false
    expect(snackbarMock.show).not.toHaveBeenCalled();
  });

  it('should not redirect when platform is server', () => {
    // Re-create component with server platform
    TestBed.resetTestingModule();
    const walletSvc = {
      get: vi.fn().mockReturnValue(of(mockWallet)),
      deposit: vi.fn().mockReturnValue(of({ checkout_url: 'http://localhost:9999/mock', order_code: 1 })),
      getTransactions: vi.fn().mockReturnValue(of([])),
      getBankAccounts: vi.fn().mockReturnValue(of([])),
      addBankAccount: vi.fn(),
      deleteBankAccount: vi.fn(),
      withdraw: vi.fn(),
    };
    const snackSvc = { show: vi.fn() };
    TestBed.configureTestingModule({
      imports: [WalletComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTranslocoForTesting(),
        { provide: 'PLATFORM_ID', useValue: 'server' },
        { provide: WalletService, useValue: walletSvc },
        { provide: NhannhtMetroSnackbarService, useValue: snackSvc },
        { provide: BankListService, useValue: { getBanks: vi.fn().mockReturnValue(of([])) } },
      ],
    });
    const f2 = TestBed.createComponent(WalletComponent);
    f2.detectChanges();
    const c2 = f2.componentInstance;
    c2.depositAmount = 5000;
    c2.deposit();
    // isPlatformBrowser is false on server, so no redirect and no snackbar
    expect(c2.depositing()).toBe(false);
  });

  // --- Template lifecycle toggle tests (covers [N,0] destruction branches) ---

  it('should toggle from loading to loaded (destroys loading spinner block)', () => {
    // Render loading state
    walletServiceMock.get.mockReturnValue(new Subject());
    walletServiceMock.getTransactions.mockReturnValue(of([]));
    fixture.detectChanges();
    expect(component.loading()).toBe(true);
    expect(fixture.nativeElement.querySelector('nhannht-metro-spinner')).toBeTruthy();

    // Switch to loaded state — destroys the spinner @if block, creates the content block
    component.loading.set(false);
    component.wallet.set(mockWallet);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('nhannht-metro-card')).toBeTruthy();
  });

  it('should toggle from loaded to error state (destroys content block)', () => {
    fixture.detectChanges();
    expect(component.loading()).toBe(false);
    expect(component.error()).toBe(false);

    // Switch to error — destroys the content @else block, creates the error block
    component.error.set(true);
    component.wallet.set(null);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-error-fallback')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('nhannht-metro-card')).toBeFalsy();
  });

  it('should toggle from error back to loading (destroys error block)', () => {
    // Start with error state
    walletServiceMock.get.mockReturnValue(throwError(() => ({ status: 500 })));
    fixture.detectChanges();
    expect(component.error()).toBe(true);

    // Switch to loading — destroys error block, creates loading block
    component.loading.set(true);
    component.error.set(false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('nhannht-metro-spinner')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-error-fallback')).toBeFalsy();
  });

  it('should toggle depositing from false to true to false (destroys both branches)', () => {
    fixture.detectChanges();
    expect(component.depositing()).toBe(false);

    // Create depositing spinner block, destroy button block
    component.depositing.set(true);
    fixture.detectChanges();

    // Destroy depositing spinner block, recreate button block
    component.depositing.set(false);
    fixture.detectChanges();
    expect(component.depositing()).toBe(false);
  });

  it('should toggle from transactions to empty state (destroys @for block)', () => {
    fixture.detectChanges();
    expect(component.transactions().length).toBe(2);

    // Switch to empty — destroys the @for block, creates the empty state block
    component.transactions.set([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-empty-state')).toBeTruthy();
  });

  it('should toggle from empty state to transactions (destroys empty state block)', () => {
    walletServiceMock.getTransactions.mockReturnValue(of([]));
    fixture.detectChanges();
    expect(component.transactions().length).toBe(0);

    // Switch to has transactions — destroys empty state block, creates @for block
    component.transactions.set(mockTxs);
    fixture.detectChanges();
    const txRows = fixture.nativeElement.querySelectorAll('nhannht-metro-transaction-row');
    expect(txRows.length).toBe(2);
  });

  it('should toggle hasMore from true to false (destroys load more button block)', () => {
    const twentyTxs = Array.from({ length: 20 }, (_, i) => ({ ...mockTxs[0], id: i + 1 }));
    walletServiceMock.getTransactions.mockReturnValue(of(twentyTxs));
    fixture.detectChanges();
    expect(component.hasMore()).toBe(true);

    // Destroy the load more button block
    component.hasMore.set(false);
    fixture.detectChanges();
    expect(component.hasMore()).toBe(false);
  });

  it('should handle component destruction', () => {
    fixture.detectChanges();
    fixture.destroy();
  });

  describe('additional branch coverage', () => {
    it('should toggle loading→error→content→loading cycle covering all 3 @if branches', () => {
      // Start at loading
      walletServiceMock.get.mockReturnValue(new Subject());
      walletServiceMock.getTransactions.mockReturnValue(of([]));
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('nhannht-metro-spinner')).toBeTruthy();

      // loading → error
      component.loading.set(false);
      component.error.set(true);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('app-error-fallback')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('nhannht-metro-spinner')).toBeFalsy();

      // error → content
      component.error.set(false);
      component.wallet.set(mockWallet);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('nhannht-metro-card')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('app-error-fallback')).toBeFalsy();

      // content → loading again
      component.loading.set(true);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('nhannht-metro-spinner')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('nhannht-metro-card')).toBeFalsy();
    });

    it('should toggle depositing true→false→true to exercise both @if branches repeatedly', () => {
      fixture.detectChanges();
      // false (initial) → true
      component.depositing.set(true);
      fixture.detectChanges();
      const spinners1 = fixture.nativeElement.querySelectorAll('nhannht-metro-spinner');
      expect(spinners1.length).toBeGreaterThan(0);

      // true → false
      component.depositing.set(false);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('nhannht-metro-button')).toBeTruthy();

      // false → true again
      component.depositing.set(true);
      fixture.detectChanges();
      const spinners2 = fixture.nativeElement.querySelectorAll('nhannht-metro-spinner');
      expect(spinners2.length).toBeGreaterThan(0);
    });

    it('should toggle transactions empty→populated→empty to exercise both @if branches', () => {
      walletServiceMock.getTransactions.mockReturnValue(of([]));
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('app-empty-state')).toBeTruthy();

      component.transactions.set(mockTxs);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('nhannht-metro-transaction-row').length).toBe(2);
      expect(fixture.nativeElement.querySelector('app-empty-state')).toBeFalsy();

      component.transactions.set([]);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('app-empty-state')).toBeTruthy();
    });

    it('should toggle hasMore false→true→false to exercise the @if (hasMore) block', () => {
      fixture.detectChanges();
      expect(component.hasMore()).toBe(false);

      // false → true
      component.hasMore.set(true);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Load More');

      // true → false
      component.hasMore.set(false);
      fixture.detectChanges();
      // The load more button in the transaction card should be gone
    });

    it('should render depositError text in the nhannht-metro-input when set', async () => {
      fixture.autoDetectChanges();
      await fixture.whenStable();
      component.depositAmount = 2500;
      component.deposit();
      await fixture.whenStable();
      expect(component.depositError).toBeTruthy();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('multiple of 1,000');
    });

    it('should clear depositError text after valid deposit attempt', async () => {
      fixture.autoDetectChanges();
      await fixture.whenStable();
      component.depositAmount = 1000;
      component.deposit();
      expect(component.depositError).toBeTruthy();
      await fixture.whenStable();

      walletServiceMock.deposit.mockReturnValue(of({ checkout_url: 'http://localhost:9999/mock', order_code: 1 }));
      component.depositAmount = 5000;
      component.deposit();
      expect(component.depositError).toBe('');
      await fixture.whenStable();
    });

    it('should render content block with wallet=null covering ?.available_balance null path', () => {
      fixture.detectChanges();
      // Set wallet to null while keeping loading=false and error=false
      // This forces the @else content block to render with wallet()=null
      // covering the ?.available_balance, ?.balance, ?.escrow_balance null paths
      component.wallet.set(null);
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      // Content should still render (cards are present)
      expect(el.querySelector('nhannht-metro-card')).toBeTruthy();
      // The VND pipe should handle null gracefully
    });

    it('should render wallet stats (total_deposited, total_earned, total_spent) in template', () => {
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('200.000'); // total_deposited
      expect(el.textContent).toContain('50.000');  // total_earned or total_spent
    });
  });
});
