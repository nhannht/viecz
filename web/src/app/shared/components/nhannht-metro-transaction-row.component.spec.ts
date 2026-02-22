import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { PLATFORM_ID } from '@angular/core';
import { NhannhtMetroTransactionRowComponent } from './nhannht-metro-transaction-row.component';
import { WalletTransaction } from '../../core/models';
import { provideTranslocoForTesting } from '../../core/transloco-testing';

const baseTx: WalletTransaction = {
  id: 1,
  wallet_id: 1,
  type: 'deposit',
  amount: 50000,
  balance_before: 0,
  balance_after: 50000,
  escrow_before: 0,
  escrow_after: 0,
  description: 'Deposit via PayOS',
  created_at: '2026-02-14T10:00:00Z',
};

@Component({
  standalone: true,
  imports: [NhannhtMetroTransactionRowComponent],
  template: `<nhannht-metro-transaction-row [transaction]="tx()" />`,
})
class TestHostComponent {
  tx = signal(baseTx);
}

describe('NhannhtMetroTransactionRowComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [
        provideTranslocoForTesting(),
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render description', () => {
    expect(fixture.nativeElement.textContent).toContain('Deposit via PayOS');
  });

  it('should show + prefix for credit transactions', () => {
    expect(fixture.nativeElement.textContent).toContain('+');
  });

  it('should show - prefix for debit transactions', () => {
    host.tx.set({ ...baseTx, type: 'withdrawal' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('-');
  });

  it('should identify deposit as credit', () => {
    host.tx.set({ ...baseTx, type: 'deposit' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('+');
  });

  it('should identify escrow_refund as credit', () => {
    host.tx.set({ ...baseTx, type: 'escrow_refund' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('+');
  });

  it('should identify payment_received as credit', () => {
    host.tx.set({ ...baseTx, type: 'payment_received' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('+');
  });

  it('should show arrow_downward icon for deposit', () => {
    const icon = fixture.nativeElement.querySelector('nhannht-metro-icon');
    expect(icon.textContent.trim()).toBe('arrow_downward');
  });

  it('should show lock icon for escrow_hold', () => {
    host.tx.set({ ...baseTx, type: 'escrow_hold' });
    fixture.detectChanges();
    const icon = fixture.nativeElement.querySelector('nhannht-metro-icon');
    expect(icon.textContent.trim()).toBe('lock');
  });

  it('should show swap_horiz icon for unknown type', () => {
    host.tx.set({ ...baseTx, type: 'unknown_type' });
    fixture.detectChanges();
    const icon = fixture.nativeElement.querySelector('nhannht-metro-icon');
    expect(icon.textContent.trim()).toBe('swap_horiz');
  });

  it('should handle component destruction', () => {
    fixture.detectChanges();
    fixture.destroy();
  });

  describe('template conditional toggles — isCredit class bindings', () => {
    it('should apply text-fg class for credit transaction (deposit)', () => {
      host.tx.set({ ...baseTx, type: 'deposit' });
      fixture.detectChanges();
      const amountSpan = fixture.nativeElement.querySelector('span.text-\\[13px\\]');
      expect(amountSpan.classList.contains('text-fg')).toBe(true);
      expect(amountSpan.classList.contains('text-muted')).toBe(false);
    });

    it('should apply text-muted class for debit transaction (withdrawal)', () => {
      host.tx.set({ ...baseTx, type: 'withdrawal' });
      fixture.detectChanges();
      const amountSpan = fixture.nativeElement.querySelector('span.text-\\[13px\\]');
      expect(amountSpan.classList.contains('text-muted')).toBe(true);
      expect(amountSpan.classList.contains('text-fg')).toBe(false);
    });

    it('should toggle from credit to debit (changes CSS class)', () => {
      host.tx.set({ ...baseTx, type: 'deposit' });
      fixture.detectChanges();
      let amountSpan = fixture.nativeElement.querySelector('span.text-\\[13px\\]');
      expect(amountSpan.classList.contains('text-fg')).toBe(true);

      host.tx.set({ ...baseTx, type: 'escrow_hold' });
      fixture.detectChanges();
      amountSpan = fixture.nativeElement.querySelector('span.text-\\[13px\\]');
      expect(amountSpan.classList.contains('text-muted')).toBe(true);
    });

    it('should toggle from debit to credit (changes CSS class)', () => {
      host.tx.set({ ...baseTx, type: 'escrow_hold' });
      fixture.detectChanges();
      let amountSpan = fixture.nativeElement.querySelector('span.text-\\[13px\\]');
      expect(amountSpan.classList.contains('text-muted')).toBe(true);

      host.tx.set({ ...baseTx, type: 'payment_received' });
      fixture.detectChanges();
      amountSpan = fixture.nativeElement.querySelector('span.text-\\[13px\\]');
      expect(amountSpan.classList.contains('text-fg')).toBe(true);
    });

    it('should show undo icon for escrow_refund', () => {
      host.tx.set({ ...baseTx, type: 'escrow_refund' });
      fixture.detectChanges();
      const icon = fixture.nativeElement.querySelector('nhannht-metro-icon');
      expect(icon.textContent.trim()).toBe('undo');
    });

    it('should show payments icon for payment_received', () => {
      host.tx.set({ ...baseTx, type: 'payment_received' });
      fixture.detectChanges();
      const icon = fixture.nativeElement.querySelector('nhannht-metro-icon');
      expect(icon.textContent.trim()).toBe('payments');
    });

    it('should show arrow_upward icon for withdrawal', () => {
      host.tx.set({ ...baseTx, type: 'withdrawal' });
      fixture.detectChanges();
      const icon = fixture.nativeElement.querySelector('nhannht-metro-icon');
      expect(icon.textContent.trim()).toBe('arrow_upward');
    });

    it('should show receipt icon for platform_fee', () => {
      host.tx.set({ ...baseTx, type: 'platform_fee' });
      fixture.detectChanges();
      const icon = fixture.nativeElement.querySelector('nhannht-metro-icon');
      expect(icon.textContent.trim()).toBe('receipt');
    });
  });
});
