import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { TransactionListComponent } from './transaction-list.component';
import { WalletTransaction } from '../core/models';

describe('TransactionListComponent', () => {
  let component: TransactionListComponent;
  let fixture: ComponentFixture<TransactionListComponent>;

  const mockTxs: WalletTransaction[] = [
    {
      id: 1, wallet_id: 1, type: 'deposit', amount: 50000,
      balance_before: 0, balance_after: 50000, escrow_before: 0, escrow_after: 0,
      description: 'Wallet deposit', created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 2, wallet_id: 1, type: 'escrow_hold', amount: 20000,
      balance_before: 50000, balance_after: 30000, escrow_before: 0, escrow_after: 20000,
      description: 'Escrow for task #5', created_at: '2026-01-02T00:00:00Z',
    },
    {
      id: 3, wallet_id: 1, type: 'payment_received', amount: 30000,
      balance_before: 30000, balance_after: 60000, escrow_before: 20000, escrow_after: 20000,
      description: 'Payment for task #3', created_at: '2026-01-03T00:00:00Z',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransactionListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TransactionListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show "No transactions yet" when empty', () => {
    component.transactions = [];
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No transactions yet');
  });

  it('should render transaction descriptions', () => {
    component.transactions = mockTxs;
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Wallet deposit');
    expect(el.textContent).toContain('Escrow for task #5');
    expect(el.textContent).toContain('Payment for task #3');
  });

  it('should show Load More button when hasMore is true', () => {
    component.transactions = mockTxs;
    component.hasMore = true;
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Load More');
  });

  it('should not show Load More when hasMore is false', () => {
    component.transactions = mockTxs;
    component.hasMore = false;
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Load More');
  });

  it('should emit loadMore event', () => {
    const emitSpy = vi.spyOn(component.loadMore, 'emit');
    component.transactions = mockTxs;
    component.hasMore = true;
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('.load-more button');
    btn.click();
    expect(emitSpy).toHaveBeenCalled();
  });

  it('should return correct icons', () => {
    expect(component.txIcon('deposit')).toBe('arrow_downward');
    expect(component.txIcon('withdrawal')).toBe('arrow_upward');
    expect(component.txIcon('escrow_hold')).toBe('lock');
    expect(component.txIcon('escrow_release')).toBe('lock_open');
    expect(component.txIcon('escrow_refund')).toBe('undo');
    expect(component.txIcon('payment_received')).toBe('payments');
    expect(component.txIcon('platform_fee')).toBe('receipt');
    expect(component.txIcon('unknown_type')).toBe('swap_horiz');
  });

  it('should classify credit types correctly', () => {
    expect(component.isCredit('deposit')).toBe(true);
    expect(component.isCredit('escrow_refund')).toBe(true);
    expect(component.isCredit('payment_received')).toBe(true);
  });

  it('should classify debit types correctly', () => {
    expect(component.isCredit('escrow_hold')).toBe(false);
    expect(component.isCredit('withdrawal')).toBe(false);
    expect(component.isCredit('platform_fee')).toBe(false);
  });

  it('should return correct icon class', () => {
    expect(component.txIconClass('deposit')).toBe('credit');
    expect(component.txIconClass('escrow_hold')).toBe('debit');
  });
});
