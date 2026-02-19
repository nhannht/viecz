import { Component, inject, OnInit, signal, input } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle, MatCardActions } from '@angular/material/card';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TaskService } from '../core/task.service';
import { ApplicationService } from '../core/application.service';
import { Task } from '../core/models';
import { VndPipe } from '../core/pipes';

@Component({
  selector: 'app-apply-task',
  standalone: true,
  imports: [
    FormsModule,
    MatCard, MatCardContent, MatCardHeader, MatCardTitle, MatCardActions,
    MatButton, MatIcon, MatFormField, MatLabel, MatInput, MatProgressSpinner,
    VndPipe,
  ],
  template: `
    @if (loading()) {
      <div class="loading"><mat-spinner diameter="40"></mat-spinner></div>
    } @else if (task()) {
      <div class="apply-page">
        <mat-card>
          <mat-card-header>
            <mat-card-title>Apply for: {{ task()!.title }}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="task-summary">
              <span class="task-price">Task price: {{ task()!.price | vnd }}</span>
            </div>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Proposed Price (VND)</mat-label>
              <input matInput type="number" [(ngModel)]="proposedPrice" min="1">
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Message</mat-label>
              <textarea matInput [(ngModel)]="message" rows="4"
                        placeholder="Why are you a good fit for this task?"></textarea>
            </mat-form-field>
          </mat-card-content>
          <mat-card-actions align="end">
            <button mat-button (click)="cancel()">Cancel</button>
            <button mat-raised-button (click)="submit()" [disabled]="submitting()">
              @if (submitting()) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                <ng-container><mat-icon>send</mat-icon></ng-container> Submit Application
              }
            </button>
          </mat-card-actions>
        </mat-card>
      </div>
    }
  `,
  styles: `
    .loading { display: flex; justify-content: center; padding: 64px 0; }
    .apply-page { max-width: 600px; margin: 0 auto; }
    .task-summary {
      margin-bottom: 16px;
      padding: 12px;
      background: var(--mat-sys-surface-variant, #f5f5f5);
      border-radius: 8px;
    }
    .task-price { font-weight: 500; color: var(--mat-sys-primary); }
    .full-width { width: 100%; }
  `,
})
export class ApplyTaskComponent implements OnInit {
  id = input.required<string>();

  private taskService = inject(TaskService);
  private applicationService = inject(ApplicationService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  task = signal<Task | null>(null);
  loading = signal(true);
  submitting = signal(false);
  proposedPrice: number | null = null;
  message = '';

  ngOnInit() {
    const taskId = Number(this.id());
    this.taskService.get(taskId).subscribe({
      next: task => {
        this.task.set(task);
        this.proposedPrice = task.price;
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Task not found', 'Close', { duration: 3000 });
        this.router.navigate(['/']);
      },
    });
  }

  submit() {
    const body: { proposed_price?: number; message?: string } = {};
    if (this.proposedPrice) body.proposed_price = this.proposedPrice;
    if (this.message) body.message = this.message;

    this.submitting.set(true);
    this.applicationService.apply(this.task()!.id, body).subscribe({
      next: () => {
        this.snackBar.open('Application submitted!', 'Close', { duration: 3000 });
        this.router.navigate(['/tasks', this.task()!.id]);
      },
      error: err => {
        this.submitting.set(false);
        this.snackBar.open(err.error?.error || 'Failed to submit application', 'Close', { duration: 3000 });
      },
    });
  }

  cancel() {
    this.router.navigate(['/tasks', this.task()!.id]);
  }
}
