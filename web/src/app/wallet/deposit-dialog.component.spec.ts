import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { DepositDialogComponent } from './deposit-dialog.component';
import { WalletService } from '../core/wallet.service';

describe('DepositDialogComponent', () => {
  let component: DepositDialogComponent;
  let fixture: ComponentFixture<DepositDialogComponent>;
  let walletServiceMock: any;
  let dialogRefMock: any;
  let snackBarMock: any;

  beforeEach(async () => {
    walletServiceMock = { deposit: vi.fn() };
    dialogRefMock = { close: vi.fn() };
    snackBarMock = { open: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [DepositDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: WalletService, useValue: walletServiceMock },
        { provide: MatDialogRef, useValue: dialogRefMock },
        { provide: MatSnackBar, useValue: snackBarMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DepositDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default amount of 50000', () => {
    expect(component.amount).toBe(50000);
  });

  it('should reject amount below 2000', () => {
    component.amount = 1000;
    component.submit();
    expect(snackBarMock.open).toHaveBeenCalledWith('Minimum deposit is 2,000 VND', 'Close', { duration: 3000 });
    expect(walletServiceMock.deposit).not.toHaveBeenCalled();
  });

  it('should call deposit and close dialog on success', () => {
    walletServiceMock.deposit.mockReturnValue(of({ checkout_url: 'https://pay.test', order_code: 1 }));
    component.amount = 50000;
    component.submit();
    expect(walletServiceMock.deposit).toHaveBeenCalledWith(50000);
    expect(component.depositing()).toBe(false);
    expect(dialogRefMock.close).toHaveBeenCalledWith(true);
  });

  it('should handle deposit error', () => {
    walletServiceMock.deposit.mockReturnValue(throwError(() => ({ error: { error: 'Max exceeded' } })));
    component.submit();
    expect(component.depositing()).toBe(false);
    expect(snackBarMock.open).toHaveBeenCalledWith('Max exceeded', 'Close', { duration: 3000 });
  });

  it('should show generic error when no message', () => {
    walletServiceMock.deposit.mockReturnValue(throwError(() => ({ error: {} })));
    component.submit();
    expect(snackBarMock.open).toHaveBeenCalledWith('Deposit failed', 'Close', { duration: 3000 });
  });

  it('should display dialog title', () => {
    expect(fixture.nativeElement.textContent).toContain('Deposit Funds');
  });

  it('should display hint text', () => {
    expect(fixture.nativeElement.textContent).toContain('Min 2,000 VND');
  });
});
