import { Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogTitle,
} from '@angular/material/dialog';
import { VndPipe } from '../core/pipes';

@Component({
  selector: 'app-confirm-escrow-dialog',
  standalone: true,
  imports: [MatButton, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogTitle, VndPipe],
  template: `
    <h2 mat-dialog-title>Confirm Escrow Payment</h2>
    <mat-dialog-content>
      <p>Accept this application and create an escrow payment?</p>
      <div class="escrow-amount">
        <span class="label">Escrow amount:</span>
        <span class="amount">{{ data.amount | vnd }}</span>
      </div>
      <p class="info">This amount will be held in escrow until the task is completed.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="false">Cancel</button>
      <button mat-raised-button [mat-dialog-close]="true">Confirm & Pay</button>
    </mat-dialog-actions>
  `,
  styles: `
    .escrow-amount {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      background: var(--mat-sys-surface-variant, #f5f5f5);
      border-radius: 8px;
      margin: 12px 0;
    }
    .label { font-weight: 500; }
    .amount {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--mat-sys-primary);
    }
    .info {
      font-size: 0.875rem;
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class ConfirmEscrowDialogComponent {
  data = inject<{ amount: number }>(MAT_DIALOG_DATA);
}
