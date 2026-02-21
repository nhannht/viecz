import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { WalletComponent } from './wallet.component';
import { WalletService } from '../core/wallet.service';
import { Wallet, WalletTransaction } from '../core/models';
import { NhannhtMetroSnackbarService } from '../shared/services/nhannht-metro-snackbar.service';

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
    };
    snackbarMock = { show: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [WalletComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: WalletService, useValue: walletServiceMock },
        { provide: NhannhtMetroSnackbarService, useValue: snackbarMock },
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
    expect(snackbarMock.show).toHaveBeenCalledWith('Minimum deposit is 2,000 VND', undefined, { duration: 3000 });
    expect(walletServiceMock.deposit).not.toHaveBeenCalled();
  });

  it('should call deposit service', () => {
    fixture.detectChanges();
    walletServiceMock.deposit.mockReturnValue(of({ checkout_url: 'https://pay.test', order_code: 1 }));
    component.depositAmount = 50000;
    component.deposit();
    expect(walletServiceMock.deposit).toHaveBeenCalledWith(50000);
    expect(component.depositing()).toBe(false);
    expect(snackbarMock.show).toHaveBeenCalledWith('Deposit initiated', undefined, { duration: 3000 });
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
    component.deposit();
    expect(snackbarMock.show).toHaveBeenCalledWith('Deposit failed', undefined, { duration: 3000 });
  });

  it('should render transaction descriptions', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Wallet deposit');
    expect(el.textContent).toContain('Escrow for task');
  });
});
