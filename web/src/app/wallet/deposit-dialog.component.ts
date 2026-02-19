import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { WalletService } from '../core/wallet.service';

@Component({
  selector: 'app-deposit-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatDialogModule,
    MatFormField,
    MatLabel,
    MatInput,
    MatButton,
    MatProgressSpinner,
  ],
  template: `
    <h2 mat-dialog-title>Deposit Funds</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Amount (VND)</mat-label>
        <input matInput type="number" [(ngModel)]="amount" min="2000" max="200000">
      </mat-form-field>
      <p class="hint">Min 2,000 VND. Max balance: 200,000 VND</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button (click)="submit()" [disabled]="depositing()">
        @if (depositing()) {
          <mat-spinner diameter="20"></mat-spinner>
        } @else {
          Deposit
        }
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .full-width { width: 100%; }
    .hint { font-size: 0.75rem; color: var(--mat-sys-on-surface-variant); margin-top: -8px; }
  `,
})
export class DepositDialogComponent {
  private walletService = inject(WalletService);
  private dialogRef = inject(MatDialogRef<DepositDialogComponent>);
  private snackBar = inject(MatSnackBar);
  private platformId = inject(PLATFORM_ID);

  amount = 50000;
  depositing = signal(false);

  submit() {
    if (this.amount < 2000) {
      this.snackBar.open('Minimum deposit is 2,000 VND', 'Close', { duration: 3000 });
      return;
    }
    this.depositing.set(true);
    this.walletService.deposit(this.amount).subscribe({
      next: res => {
        this.depositing.set(false);
        if (res.checkout_url && isPlatformBrowser(this.platformId)) {
          window.open(res.checkout_url, '_blank');
        }
        this.dialogRef.close(true);
      },
      error: err => {
        this.depositing.set(false);
        this.snackBar.open(err.error?.error || 'Deposit failed', 'Close', { duration: 3000 });
      },
    });
  }
}
