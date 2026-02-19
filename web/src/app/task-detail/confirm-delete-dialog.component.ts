import { Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogTitle,
} from '@angular/material/dialog';

@Component({
  selector: 'app-confirm-delete-dialog',
  standalone: true,
  imports: [MatButton, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogTitle],
  template: `
    <h2 mat-dialog-title>Cancel Task</h2>
    <mat-dialog-content>
      <p>Are you sure you want to cancel <strong>{{ data.taskTitle }}</strong>?</p>
      <p class="warning">This will reject all pending applications and notify applicants.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="false">No, Keep It</button>
      <button mat-raised-button color="warn" [mat-dialog-close]="true">Yes, Cancel Task</button>
    </mat-dialog-actions>
  `,
  styles: `
    .warning {
      color: var(--mat-sys-error, #c62828);
      font-size: 0.875rem;
    }
  `,
})
export class ConfirmDeleteDialogComponent {
  data = inject<{ taskTitle: string }>(MAT_DIALOG_DATA);
}
