import { Component, inject, OnInit, signal, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle, MatCardActions } from '@angular/material/card';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatDivider } from '@angular/material/divider';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatList, MatListItem } from '@angular/material/list';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TaskService } from '../core/task.service';
import { WalletService } from '../core/wallet.service';
import { AuthService } from '../core/auth.service';
import { Task, TaskApplication } from '../core/models';
import { VndPipe, TimeAgoPipe } from '../core/pipes';
import { ConfirmDeleteDialogComponent } from './confirm-delete-dialog.component';

@Component({
  selector: 'app-task-detail',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    MatCard,
    MatCardContent,
    MatCardHeader,
    MatCardTitle,
    MatCardActions,
    MatButton,
    MatIconButton,
    MatIcon,
    MatDivider,
    MatFormField,
    MatLabel,
    MatInput,
    MatList,
    MatListItem,
    MatProgressSpinner,
    MatDialogModule,
    VndPipe,
    TimeAgoPipe,
  ],
  template: `
    @if (loading()) {
      <div class="loading"><mat-spinner diameter="40"></mat-spinner></div>
    } @else if (task()) {
      <div class="detail-page">
        <div class="detail-main">
          <mat-card>
            <mat-card-header>
              <mat-card-title>{{ task()!.title }}</mat-card-title>
              @if (isRequester() && task()!.status === 'open') {
                <span class="header-actions">
                  <button mat-icon-button [routerLink]="['/tasks', task()!.id, 'edit']"
                          aria-label="Edit Task">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button color="warn" (click)="confirmDelete()"
                          aria-label="Delete Task">
                    <mat-icon>delete</mat-icon>
                  </button>
                </span>
              }
            </mat-card-header>
            <mat-card-content>
              <div class="detail-meta">
                <span class="status-chip" [class]="task()!.status">{{ task()!.status }}</span>
                <span class="detail-price">{{ task()!.price | vnd }}</span>
              </div>

              <mat-divider></mat-divider>

              <div class="detail-section">
                <h4>Description</h4>
                <p class="description">{{ task()!.description }}</p>
              </div>

              <div class="detail-info">
                <div class="info-row">
                  <mat-icon>location_on</mat-icon>
                  <span>{{ task()!.location }}</span>
                </div>
                @if (task()!.deadline) {
                  <div class="info-row">
                    <mat-icon>schedule</mat-icon>
                    <span>Deadline: {{ task()!.deadline | timeAgo }}</span>
                    @if (task()!.is_overdue) {
                      <span class="overdue-badge">OVERDUE</span>
                    }
                  </div>
                }
                <div class="info-row">
                  <mat-icon>calendar_today</mat-icon>
                  <span>Posted {{ task()!.created_at | timeAgo }}</span>
                </div>
              </div>

              @if (task()!.image_urls?.length) {
                <div class="images">
                  @for (url of task()!.image_urls; track url) {
                    <img [src]="url" alt="Task image" class="task-image">
                  }
                </div>
              }
            </mat-card-content>
            <mat-card-actions>
              @if (isRequester()) {
                @if (task()!.status === 'in_progress') {
                  <button mat-raised-button (click)="completeTask()">
                    <mat-icon>check_circle</mat-icon> Mark Complete
                  </button>
                }
              } @else if (task()!.status === 'open' && !task()!.user_has_applied && !task()!.is_overdue) {
                <button mat-raised-button (click)="showApplyForm.set(true)">
                  <mat-icon>send</mat-icon> Apply
                </button>
              } @else if (task()!.user_has_applied) {
                <span class="applied-badge">
                  <mat-icon>check</mat-icon> Applied
                </span>
              }
            </mat-card-actions>
          </mat-card>

          @if (showApplyForm()) {
            <mat-card class="apply-card">
              <mat-card-content>
                <h4>Apply for this task</h4>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Proposed Price (VND)</mat-label>
                  <input matInput type="number" [(ngModel)]="proposedPrice">
                </mat-form-field>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Message</mat-label>
                  <input matInput [(ngModel)]="applicationMessage"
                         placeholder="Why are you a good fit?">
                </mat-form-field>
                <div class="apply-actions">
                  <button mat-button (click)="showApplyForm.set(false)">Cancel</button>
                  <button mat-raised-button (click)="submitApplication()">Submit</button>
                </div>
              </mat-card-content>
            </mat-card>
          }
        </div>

        @if (isRequester() && applications().length > 0) {
          <div class="detail-sidebar">
            <mat-card>
              <mat-card-header>
                <mat-card-title>Applications ({{ applications().length }})</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <mat-list>
                  @for (app of applications(); track app.id) {
                    <mat-list-item class="application-item">
                      <div class="app-info">
                        <span class="app-tasker">
                          <a [routerLink]="['/profile', app.tasker_id]">Tasker #{{ app.tasker_id }}</a>
                        </span>
                        @if (app.proposed_price) {
                          <span class="app-price">{{ app.proposed_price | vnd }}</span>
                        }
                        @if (app.message) {
                          <span class="app-message">{{ app.message }}</span>
                        }
                        <span class="app-status status-chip" [class]="app.status">{{ app.status }}</span>
                      </div>
                      @if (app.status === 'pending' && task()!.status === 'open') {
                        <button mat-button (click)="acceptApp(app.id)">
                          <mat-icon>check</mat-icon> Accept
                        </button>
                      }
                    </mat-list-item>
                    <mat-divider></mat-divider>
                  }
                </mat-list>
              </mat-card-content>
            </mat-card>
          </div>
        }
      </div>
    }
  `,
  styles: `
    .loading { display: flex; justify-content: center; padding: 64px 0; }
    .detail-page {
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
    }
    @media (min-width: 960px) {
      .detail-page { grid-template-columns: 2fr 1fr; }
    }
    mat-card-header {
      display: flex;
      align-items: center;
    }
    .header-actions {
      margin-left: auto;
      display: flex;
      gap: 4px;
    }
    .detail-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .detail-price {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--mat-sys-primary);
    }
    .detail-section { margin: 16px 0; }
    .detail-section h4 { margin: 0 0 8px; color: var(--mat-sys-on-surface-variant); }
    .description { white-space: pre-wrap; line-height: 1.6; }
    .detail-info { display: flex; flex-direction: column; gap: 8px; margin-top: 16px; }
    .info-row {
      display: flex; align-items: center; gap: 8px;
      color: var(--mat-sys-on-surface-variant);
      font-size: 0.875rem;
    }
    .overdue-badge {
      background: #ffebee; color: #c62828;
      padding: 2px 8px; border-radius: 8px; font-size: 0.7rem; font-weight: 600;
    }
    .images { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px; }
    .task-image { width: 200px; height: 150px; object-fit: cover; border-radius: 8px; }
    .applied-badge {
      display: flex; align-items: center; gap: 4px;
      color: #2e7d32; font-weight: 500;
    }
    .apply-card { margin-top: 16px; }
    .full-width { width: 100%; }
    .apply-actions { display: flex; gap: 8px; justify-content: flex-end; }
    .application-item { height: auto !important; padding: 12px 0 !important; }
    .app-info {
      display: flex; flex-direction: column; gap: 4px; width: 100%;
    }
    .app-tasker { font-weight: 500; }
    .app-price { color: var(--mat-sys-primary); font-weight: 500; }
    .app-message { font-size: 0.875rem; color: var(--mat-sys-on-surface-variant); }
    .status-chip {
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
      text-transform: capitalize;
    }
    .status-chip.open { background: #e8f5e9; color: #2e7d32; }
    .status-chip.in_progress { background: #fff3e0; color: #e65100; }
    .status-chip.completed { background: #e3f2fd; color: #1565c0; }
    .status-chip.cancelled { background: #fbe9e7; color: #bf360c; }
    .status-chip.pending { background: #fff8e1; color: #f57f17; }
    .status-chip.accepted { background: #e8f5e9; color: #2e7d32; }
    .status-chip.rejected { background: #fbe9e7; color: #bf360c; }
  `,
})
export class TaskDetailComponent implements OnInit {
  id = input.required<string>();

  private taskService = inject(TaskService);
  private walletService = inject(WalletService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  task = signal<Task | null>(null);
  applications = signal<TaskApplication[]>([]);
  loading = signal(true);
  showApplyForm = signal(false);
  proposedPrice: number | null = null;
  applicationMessage = '';

  get isRequester() {
    return () => this.task()?.requester_id === this.auth.currentUser()?.id;
  }

  ngOnInit() {
    const taskId = Number(this.id());
    this.taskService.get(taskId).subscribe({
      next: task => {
        this.task.set(task);
        this.loading.set(false);
        if (task.requester_id === this.auth.currentUser()?.id) {
          this.taskService.getApplications(taskId).subscribe({
            next: apps => this.applications.set(apps),
          });
        }
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Task not found', 'Close', { duration: 3000 });
        this.router.navigate(['/']);
      },
    });
  }

  confirmDelete() {
    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      data: { taskTitle: this.task()!.title },
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.deleteTask();
      }
    });
  }

  private deleteTask() {
    this.taskService.delete(this.task()!.id).subscribe({
      next: () => {
        this.snackBar.open('Task cancelled', 'Close', { duration: 3000 });
        this.router.navigate(['/']);
      },
      error: err => this.snackBar.open(err.error?.error || 'Failed', 'Close', { duration: 3000 }),
    });
  }

  submitApplication() {
    const body: { proposed_price?: number; message?: string } = {};
    if (this.proposedPrice) body.proposed_price = this.proposedPrice;
    if (this.applicationMessage) body.message = this.applicationMessage;
    this.taskService.apply(this.task()!.id, body).subscribe({
      next: () => {
        this.showApplyForm.set(false);
        this.task.update(t => t ? { ...t, user_has_applied: true } : t);
        this.snackBar.open('Application submitted!', 'Close', { duration: 3000 });
      },
      error: err => this.snackBar.open(err.error?.error || 'Failed', 'Close', { duration: 3000 }),
    });
  }

  acceptApp(appId: number) {
    this.taskService.acceptApplication(appId).subscribe({
      next: () => {
        this.snackBar.open('Application accepted', 'Close', { duration: 3000 });
        this.walletService.createEscrow(this.task()!.id).subscribe({
          next: () => {
            this.snackBar.open('Escrow created', 'Close', { duration: 3000 });
            this.ngOnInit();
          },
          error: err =>
            this.snackBar.open(err.error?.error || 'Escrow failed', 'Close', { duration: 3000 }),
        });
      },
      error: err => this.snackBar.open(err.error?.error || 'Failed', 'Close', { duration: 3000 }),
    });
  }

  completeTask() {
    this.taskService.complete(this.task()!.id).subscribe({
      next: () => {
        this.snackBar.open('Task completed!', 'Close', { duration: 3000 });
        this.walletService.releasePayment(this.task()!.id).subscribe({
          next: () => this.snackBar.open('Payment released', 'Close', { duration: 3000 }),
        });
        this.ngOnInit();
      },
      error: err => this.snackBar.open(err.error?.error || 'Failed', 'Close', { duration: 3000 }),
    });
  }
}
