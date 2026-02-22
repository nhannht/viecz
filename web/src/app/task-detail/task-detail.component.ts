import { Component, inject, OnInit, signal, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TaskService } from '../core/task.service';
import { ApplicationService } from '../core/application.service';
import { PaymentService } from '../core/payment.service';
import { AuthService } from '../core/auth.service';
import { Task, TaskApplication } from '../core/models';
import { VndPipe, TimeAgoPipe } from '../core/pipes';
import { NhannhtMetroCardComponent } from '../shared/components/nhannht-metro-card.component';
import { NhannhtMetroButtonComponent } from '../shared/components/nhannht-metro-button.component';
import { NhannhtMetroIconComponent } from '../shared/components/nhannht-metro-icon.component';
import { NhannhtMetroDividerComponent } from '../shared/components/nhannht-metro-divider.component';
import { NhannhtMetroSpinnerComponent } from '../shared/components/nhannht-metro-spinner.component';
import { NhannhtMetroDialogComponent } from '../shared/components/nhannht-metro-dialog.component';
import { NhannhtMetroBadgeComponent } from '../shared/components/nhannht-metro-badge.component';
import { NhannhtMetroApplicationCardComponent } from '../shared/components/nhannht-metro-application-card.component';
import { NhannhtMetroSnackbarService } from '../shared/services/nhannht-metro-snackbar.service';

@Component({
  selector: 'app-task-detail',
  standalone: true,
  imports: [
    RouterLink,
    VndPipe,
    TimeAgoPipe,
    NhannhtMetroCardComponent,
    NhannhtMetroButtonComponent,
    NhannhtMetroIconComponent,
    NhannhtMetroDividerComponent,
    NhannhtMetroSpinnerComponent,
    NhannhtMetroDialogComponent,
    NhannhtMetroBadgeComponent,
    NhannhtMetroApplicationCardComponent,
  ],
  template: `
    @if (loading()) {
      <div class="flex justify-center py-16">
        <nhannht-metro-spinner [size]="40" />
      </div>
    } @else if (task()) {
      <div class="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4">
        <div>
          <nhannht-metro-card>
            <div class="flex items-center mb-4">
              <h2 class="font-display text-[13px] tracking-[1px]">{{ task()!.title }}</h2>
              @if (isRequester() && task()!.status === 'open') {
                <span class="ml-auto flex gap-1">
                  <button class="text-muted hover:text-fg transition-colors duration-200"
                          [routerLink]="['/tasks', task()!.id, 'edit']"
                          aria-label="Edit Task">
                    <nhannht-metro-icon name="edit" [size]="20" />
                  </button>
                  <button class="text-muted hover:text-fg transition-colors duration-200"
                          (click)="confirmDelete()"
                          aria-label="Delete Task">
                    <nhannht-metro-icon name="delete" [size]="20" />
                  </button>
                </span>
              }
            </div>

            <div class="flex justify-between items-center mb-4">
              <nhannht-metro-badge [label]="task()!.status.toUpperCase()" [status]="badgeStatus()" />
              <span class="text-2xl font-bold font-body">{{ task()!.price | vnd }}</span>
            </div>

            <nhannht-metro-divider />

            <div class="my-4">
              <h4 class="font-display text-[11px] tracking-[1px] text-muted mb-2">DESCRIPTION</h4>
              <p class="font-body text-[13px] leading-[1.7] whitespace-pre-wrap">{{ task()!.description }}</p>
            </div>

            <div class="flex flex-col gap-2 mt-4">
              <div class="flex items-center gap-2 text-[13px] text-muted">
                <nhannht-metro-icon name="location_on" [size]="18" />
                <span>{{ task()!.location }}</span>
              </div>
              @if (task()!.deadline) {
                <div class="flex items-center gap-2 text-[13px] text-muted">
                  <nhannht-metro-icon name="schedule" [size]="18" />
                  <span>Deadline: {{ task()!.deadline | timeAgo }}</span>
                  @if (task()!.is_overdue) {
                    <nhannht-metro-badge label="OVERDUE" status="cancelled" />
                  }
                </div>
              }
              <div class="flex items-center gap-2 text-[13px] text-muted">
                <nhannht-metro-icon name="calendar_today" [size]="18" />
                <span>Posted {{ task()!.created_at | timeAgo }}</span>
              </div>
            </div>

            @if (task()!.image_urls?.length) {
              <div class="flex gap-2 flex-wrap mt-4">
                @for (url of task()!.image_urls; track url) {
                  <img [src]="url" alt="Task image" class="w-[200px] h-[150px] object-cover border border-border">
                }
              </div>
            }

            <div class="mt-6 flex gap-4">
              @if (!auth.isAuthenticated()) {
                <div class="border-2 border-fg p-6 w-full">
                  <h4 class="font-display text-[12px] tracking-[2px] mb-3">WANT TO APPLY FOR THIS TASK?</h4>
                  <p class="font-body text-[13px] text-muted mb-3">Create a free account to:</p>
                  <ul class="list-none p-0 m-0 mb-4 flex flex-col gap-2">
                    <li class="flex items-center gap-2 font-body text-[13px]">
                      <nhannht-metro-icon name="check" [size]="16" />
                      Apply with your proposed price
                    </li>
                    <li class="flex items-center gap-2 font-body text-[13px]">
                      <nhannht-metro-icon name="check" [size]="16" />
                      Chat directly with the requester
                    </li>
                    <li class="flex items-center gap-2 font-body text-[13px]">
                      <nhannht-metro-icon name="check" [size]="16" />
                      Get paid via secure escrow
                    </li>
                  </ul>
                  <div class="flex gap-4 items-center">
                    <a routerLink="/register">
                      <nhannht-metro-button variant="primary" label="Register to Apply" />
                    </a>
                    <a routerLink="/login" class="font-body text-[13px] text-fg hover:opacity-70 transition-opacity">
                      Sign In &gt;
                    </a>
                  </div>
                </div>
              } @else if (isRequester()) {
                @if (task()!.status === 'in_progress') {
                  <nhannht-metro-button variant="primary" label="Mark Complete" (clicked)="completeTask()" />
                }
              } @else if (task()!.status === 'open' && !task()!.user_has_applied && !task()!.is_overdue) {
                <nhannht-metro-button variant="primary" label="Apply" (clicked)="navigateToApply()" />
              } @else if (task()!.user_has_applied) {
                <span class="flex items-center gap-1 text-[13px] text-muted font-bold">
                  <nhannht-metro-icon name="check" [size]="18" /> Applied
                </span>
              }
            </div>
          </nhannht-metro-card>
        </div>

        @if (isRequester() && applications().length > 0) {
          <div>
            <nhannht-metro-card>
              <h3 class="font-display text-[11px] tracking-[1px] mb-4">APPLICATIONS ({{ applications().length }})</h3>
              <div class="flex flex-col gap-3">
                @for (app of applications(); track app.id) {
                  <nhannht-metro-application-card
                    [application]="app"
                    [showAccept]="task()!.status === 'open'"
                    (acceptClick)="acceptApp($event)"
                  />
                }
              </div>
            </nhannht-metro-card>
          </div>
        }
      </div>

      <!-- Delete confirmation dialog -->
      <nhannht-metro-dialog [open]="showDeleteDialog()" title="CANCEL TASK"
        confirmLabel="Yes, Cancel Task" cancelLabel="No, Keep It"
        (confirmed)="deleteTask(); showDeleteDialog.set(false)"
        (cancelled)="showDeleteDialog.set(false)">
        <p>Are you sure you want to cancel <strong>{{ task()!.title }}</strong>?</p>
        <p class="text-[13px] text-red-700 mt-2">This will reject all pending applications.</p>
      </nhannht-metro-dialog>

      <!-- Escrow confirmation dialog -->
      <nhannht-metro-dialog [open]="showEscrowDialog()" title="CONFIRM ESCROW PAYMENT"
        confirmLabel="Confirm & Pay" cancelLabel="Cancel"
        (confirmed)="executeAcceptApp(); showEscrowDialog.set(false)"
        (cancelled)="showEscrowDialog.set(false)">
        <p>Accept this application and create an escrow payment?</p>
        <div class="flex justify-between items-center p-4 bg-card border border-border my-3">
          <span class="font-bold text-[13px]">Escrow amount:</span>
          <span class="text-[16px] font-bold">{{ task()!.price | vnd }}</span>
        </div>
        <p class="text-[13px] text-muted">This amount will be held in escrow until the task is completed.</p>
      </nhannht-metro-dialog>
    }
  `,
})
export class TaskDetailComponent implements OnInit {
  id = input.required<string>();

  private taskService = inject(TaskService);
  private applicationService = inject(ApplicationService);
  private paymentService = inject(PaymentService);
  auth = inject(AuthService);
  private router = inject(Router);
  private snackbar = inject(NhannhtMetroSnackbarService);

  task = signal<Task | null>(null);
  applications = signal<TaskApplication[]>([]);
  loading = signal(true);
  showDeleteDialog = signal(false);
  showEscrowDialog = signal(false);
  pendingAppId = signal(0);

  get isRequester() {
    return () => this.task()?.requester_id === this.auth.currentUser()?.id;
  }

  badgeStatus(): 'open' | 'in_progress' | 'completed' | 'cancelled' | 'default' {
    const s = this.task()?.status;
    if (s === 'open' || s === 'in_progress' || s === 'completed' || s === 'cancelled') return s;
    return 'default';
  }

  ngOnInit() {
    const taskId = Number(this.id());
    this.taskService.get(taskId).subscribe({
      next: task => {
        this.task.set(task);
        this.loading.set(false);
        if (task.requester_id === this.auth.currentUser()?.id) {
          this.applicationService.getForTask(taskId).subscribe({
            next: apps => this.applications.set(apps),
          });
        }
      },
      error: () => {
        this.loading.set(false);
        this.snackbar.show('Task not found', 'Close', { duration: 3000 });
        this.router.navigate(['/']);
      },
    });
  }

  confirmDelete() {
    this.showDeleteDialog.set(true);
  }

  deleteTask() {
    this.taskService.delete(this.task()!.id).subscribe({
      next: () => {
        this.snackbar.show('Task cancelled', 'Close', { duration: 3000 });
        this.router.navigate(['/']);
      },
      error: err => this.snackbar.show(err.error?.error || 'Failed', 'Close', { duration: 3000 }),
    });
  }

  acceptApp(appId: number) {
    this.pendingAppId.set(appId);
    this.showEscrowDialog.set(true);
  }

  executeAcceptApp() {
    const appId = this.pendingAppId();
    this.applicationService.accept(appId).subscribe({
      next: () => {
        this.snackbar.show('Application accepted', 'Close', { duration: 3000 });
        this.paymentService.createEscrow(this.task()!.id).subscribe({
          next: () => {
            this.snackbar.show('Escrow created', 'Close', { duration: 3000 });
            this.ngOnInit();
          },
          error: err =>
            this.snackbar.show(err.error?.error || 'Escrow failed', 'Close', { duration: 3000 }),
        });
      },
      error: err => this.snackbar.show(err.error?.error || 'Failed', 'Close', { duration: 3000 }),
    });
  }

  navigateToApply() {
    this.router.navigate(['/tasks', this.task()!.id, 'apply']);
  }

  completeTask() {
    this.taskService.complete(this.task()!.id).subscribe({
      next: () => {
        this.snackbar.show('Task completed & payment released!', 'Close', { duration: 3000 });
        this.ngOnInit();
      },
      error: err => this.snackbar.show(err.error?.error || 'Failed to complete task', 'Close', { duration: 3000 }),
    });
  }
}
