import { Component, inject, OnInit, OnDestroy, signal, input, ElementRef, ViewChild, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { TaskService } from '../core/task.service';
import { ApplicationService } from '../core/application.service';
import { PaymentService } from '../core/payment.service';
import { AuthService } from '../core/auth.service';
import { Task, TaskApplication } from '../core/models';
import { environment } from '../environments/environment';
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
    TranslocoDirective,
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
    <ng-container *transloco="let t">
    @if (loading()) {
      <div class="flex justify-center py-16">
        <nhannht-metro-spinner />
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
                          [attr.aria-label]="t('task.editTask')">
                    <nhannht-metro-icon name="edit" [size]="20" />
                  </button>
                  <button class="text-muted hover:text-fg transition-colors duration-200"
                          (click)="confirmDelete()"
                          [attr.aria-label]="t('task.deleteTask')">
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
              <h4 class="font-display text-[11px] tracking-[1px] text-muted mb-2">{{ t('task.description') }}</h4>
              <p class="font-body text-[13px] leading-[1.7] whitespace-pre-wrap">{{ task()!.description }}</p>
            </div>

            <div class="flex flex-col gap-2 mt-4">
              <div class="flex items-center gap-2 text-[13px] text-muted">
                <nhannht-metro-icon name="location_on" [size]="18" />
                <span>{{ task()!.location }}</span>
              </div>
              @if (task()!.latitude && task()!.longitude) {
                <div #detailMap class="w-full h-[200px] border border-border"></div>
                <span class="font-mono text-[11px] text-muted">
                  {{ task()!.latitude!.toFixed(6) }}, {{ task()!.longitude!.toFixed(6) }}
                </span>
              }
              @if (task()!.deadline) {
                <div class="flex items-center gap-2 text-[13px] text-muted">
                  <nhannht-metro-icon name="schedule" [size]="18" />
                  <span>{{ t('task.deadline') }} {{ task()!.deadline | timeAgo }}</span>
                  @if (task()!.is_overdue) {
                    <nhannht-metro-badge [label]="t('task.overdue')" status="cancelled" />
                  }
                </div>
              }
              <div class="flex items-center gap-2 text-[13px] text-muted">
                <nhannht-metro-icon name="calendar_today" [size]="18" />
                <span>{{ t('task.posted') }} {{ task()!.created_at | timeAgo }}</span>
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
                  <h4 class="font-display text-[12px] tracking-[2px] mb-3">{{ t('task.ctaTitle') }}</h4>
                  <p class="font-body text-[13px] text-muted mb-3">{{ t('task.ctaSubtitle') }}</p>
                  <ul class="list-none p-0 m-0 mb-4 flex flex-col gap-2">
                    <li class="flex items-center gap-2 font-body text-[13px]">
                      <nhannht-metro-icon name="check" [size]="16" />
                      {{ t('task.ctaBenefit1') }}
                    </li>
                    <li class="flex items-center gap-2 font-body text-[13px]">
                      <nhannht-metro-icon name="check" [size]="16" />
                      {{ t('task.ctaBenefit2') }}
                    </li>
                    <li class="flex items-center gap-2 font-body text-[13px]">
                      <nhannht-metro-icon name="check" [size]="16" />
                      {{ t('task.ctaBenefit3') }}
                    </li>
                  </ul>
                  <div class="flex gap-4 items-center">
                    <a routerLink="/phone">
                      <nhannht-metro-button variant="primary" [label]="t('task.registerToApply')" />
                    </a>
                    <a routerLink="/phone" class="font-body text-[13px] text-fg hover:opacity-70 transition-opacity">
                      {{ t('task.signInLink') }}
                    </a>
                  </div>
                </div>
              } @else if (isRequester()) {
                @if (task()!.status === 'in_progress') {
                  <nhannht-metro-button variant="primary" [label]="t('task.markComplete')" (clicked)="completeTask()" />
                }
              } @else if (task()!.status === 'open' && !task()!.user_has_applied && !task()!.is_overdue) {
                <nhannht-metro-button variant="primary" [label]="t('task.apply')" (clicked)="navigateToApply()" />
              } @else if (task()!.user_has_applied) {
                <span class="flex items-center gap-1 text-[13px] text-muted font-bold">
                  <nhannht-metro-icon name="check" [size]="18" /> {{ t('task.applied') }}
                </span>
              }
            </div>
          </nhannht-metro-card>
        </div>

        @if (isRequester() && applications().length > 0) {
          <div>
            <nhannht-metro-card>
              <h3 class="font-display text-[11px] tracking-[1px] mb-4">{{ t('task.applications') }} ({{ applications().length }})</h3>
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
      <nhannht-metro-dialog [open]="showDeleteDialog()" [title]="t('task.cancelDialogTitle')"
        [confirmLabel]="t('task.cancelConfirm')" [cancelLabel]="t('task.cancelDeny')"
        (confirmed)="deleteTask(); showDeleteDialog.set(false)"
        (cancelled)="showDeleteDialog.set(false)">
        <p>{{ t('task.cancelMessage') }} <strong>{{ task()!.title }}</strong>?</p>
        <p class="text-[13px] text-red-700 mt-2">{{ t('task.cancelWarning') }}</p>
      </nhannht-metro-dialog>

      <!-- Escrow confirmation dialog -->
      <nhannht-metro-dialog [open]="showEscrowDialog()" [title]="t('task.escrowDialogTitle')"
        [confirmLabel]="t('task.escrowConfirm')" [cancelLabel]="t('common.cancel')"
        (confirmed)="executeAcceptApp(); showEscrowDialog.set(false)"
        (cancelled)="showEscrowDialog.set(false)">
        <p>{{ t('task.escrowMessage') }}</p>
        <div class="flex justify-between items-center p-4 bg-card border border-border my-3">
          <span class="font-bold text-[13px]">{{ t('task.escrowAmount') }}</span>
          <span class="text-[16px] font-bold">{{ task()!.price | vnd }}</span>
        </div>
        <p class="text-[13px] text-muted">{{ t('task.escrowHint') }}</p>
      </nhannht-metro-dialog>
    }
    </ng-container>
  `,
})
export class TaskDetailComponent implements OnInit, OnDestroy {
  id = input.required<string>();

  @ViewChild('detailMap', { static: false }) mapContainer?: ElementRef<HTMLDivElement>;

  private taskService = inject(TaskService);
  private applicationService = inject(ApplicationService);
  private paymentService = inject(PaymentService);
  auth = inject(AuthService);
  private router = inject(Router);
  private snackbar = inject(NhannhtMetroSnackbarService);
  private transloco = inject(TranslocoService);
  private platformId = inject(PLATFORM_ID);

  task = signal<Task | null>(null);
  applications = signal<TaskApplication[]>([]);
  loading = signal(true);
  showDeleteDialog = signal(false);
  showEscrowDialog = signal(false);
  pendingAppId = signal(0);
  private map: any = null;

  get isRequester() {
    return () => this.task()?.requester_id === this.auth.currentUser()?.id;
  }

  badgeStatus(): 'open' | 'in_progress' | 'completed' | 'cancelled' | 'default' {
    const s = this.task()?.status;
    if (s === 'open' || s === 'in_progress' || s === 'completed' || s === 'cancelled') return s;
    return 'default';
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  private initDetailMap(lat: number, lng: number) {
    if (!isPlatformBrowser(this.platformId)) return;
    // Wait for ViewChild to be available after template re-render
    setTimeout(async () => {
      if (!this.mapContainer) return;
      try {
        const mod = await import('maplibre-gl');
        const maplibregl = mod.default || mod;

        this.map = new maplibregl.Map({
          container: this.mapContainer.nativeElement,
          style: `https://api.maptiler.com/maps/streets/style.json?key=${environment.mapTilerApiKey}`,
          center: [lng, lat],
          zoom: 16,
          attributionControl: false,
          interactive: false,
        });

        this.map.on('load', () => {
          new maplibregl.Marker().setLngLat([lng, lat]).addTo(this.map);
        });
      } catch {
        // WebGL not available
      }
    }, 0);
  }

  ngOnInit() {
    const taskId = Number(this.id());
    this.taskService.get(taskId).subscribe({
      next: task => {
        this.task.set(task);
        this.loading.set(false);
        if (task.latitude && task.longitude) {
          this.initDetailMap(task.latitude, task.longitude);
        }
        if (task.requester_id === this.auth.currentUser()?.id) {
          this.applicationService.getForTask(taskId).subscribe({
            next: apps => this.applications.set(apps),
          });
        }
      },
      error: () => {
        this.loading.set(false);
        this.snackbar.show(this.transloco.translate('task.taskNotFound'), this.transloco.translate('common.close'), { duration: 3000 });
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
        this.snackbar.show(this.transloco.translate('task.taskCancelled'), this.transloco.translate('common.close'), { duration: 3000 });
        this.router.navigate(['/']);
      },
      error: err => this.snackbar.show(err.error?.error || this.transloco.translate('common.failed'), this.transloco.translate('common.close'), { duration: 3000 }),
    });
  }

  acceptApp(appId: number) {
    if (this.auth.needsPhoneVerification()) {
      this.snackbar.show(this.transloco.translate('wallet.phoneRequired'), this.transloco.translate('common.close'), { duration: 5000 });
      return;
    }
    this.pendingAppId.set(appId);
    this.showEscrowDialog.set(true);
  }

  executeAcceptApp() {
    const appId = this.pendingAppId();
    this.applicationService.accept(appId).subscribe({
      next: () => {
        this.snackbar.show(this.transloco.translate('task.applicationAccepted'), this.transloco.translate('common.close'), { duration: 3000 });
        this.paymentService.createEscrow(this.task()!.id).subscribe({
          next: () => {
            this.snackbar.show(this.transloco.translate('task.escrowCreated'), this.transloco.translate('common.close'), { duration: 3000 });
            this.ngOnInit();
          },
          error: err =>
            this.snackbar.show(err.error?.error || this.transloco.translate('task.escrowFailed'), this.transloco.translate('common.close'), { duration: 3000 }),
        });
      },
      error: err => this.snackbar.show(err.error?.error || this.transloco.translate('common.failed'), this.transloco.translate('common.close'), { duration: 3000 }),
    });
  }

  navigateToApply() {
    this.router.navigate(['/tasks', this.task()!.id, 'apply']);
  }

  completeTask() {
    this.taskService.complete(this.task()!.id).subscribe({
      next: () => {
        this.snackbar.show(this.transloco.translate('task.taskCompleted'), this.transloco.translate('common.close'), { duration: 3000 });
        this.ngOnInit();
      },
      error: err => this.snackbar.show(err.error?.error || this.transloco.translate('task.completeFailed'), this.transloco.translate('common.close'), { duration: 3000 }),
    });
  }
}
