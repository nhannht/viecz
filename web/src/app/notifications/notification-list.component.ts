import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { NhannhtMetroIconComponent } from '../shared/components/nhannht-metro-icon.component';
import { NhannhtMetroSpinnerComponent } from '../shared/components/nhannht-metro-spinner.component';
import { NhannhtMetroDividerComponent } from '../shared/components/nhannht-metro-divider.component';
import { NhannhtMetroButtonComponent } from '../shared/components/nhannht-metro-button.component';
import { NotificationService } from '../core/notification.service';
import { Notification } from '../core/models';
import { resolveNotification } from '../core/notification-i18n';
import { TimeAgoPipe } from '../core/pipes';
import { EmptyStateComponent } from '../shared/components/empty-state.component';
import { ErrorFallbackComponent } from '../shared/components/error-fallback.component';

@Component({
  selector: 'app-notification-list',
  standalone: true,
  imports: [
    TranslocoDirective,
    NhannhtMetroIconComponent,
    NhannhtMetroSpinnerComponent,
    NhannhtMetroDividerComponent,
    NhannhtMetroButtonComponent,
    TimeAgoPipe,
    EmptyStateComponent,
    ErrorFallbackComponent,
  ],
  template: `
    <ng-container *transloco="let t">
      <div class="max-w-[700px] mx-auto">
        <div class="bg-card border border-border">
          <div class="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 class="font-display text-[13px] tracking-[2px] text-fg m-0">{{ t('notifications.title') }}</h2>
            @if (notifications().length > 0) {
              <button class="flex items-center gap-1 bg-transparent border-none cursor-pointer
                             font-body text-[13px] text-muted hover:text-fg transition-colors"
                      (click)="markAllRead()">
                <nhannht-metro-icon name="done_all" [size]="16" /> {{ t('notifications.markAllRead') }}
              </button>
            }
          </div>

          @if (loading()) {
            <div class="flex justify-center py-8">
              <nhannht-metro-spinner [size]="40" />
            </div>
          } @else if (error()) {
            <app-error-fallback [title]="t('notifications.failedToLoadTitle')"
              [message]="t('common.tryAgainLater')" [retryFn]="retryLoad" />
          } @else if (notifications().length === 0) {
            <app-empty-state icon="notifications_off" [title]="t('notifications.noNotifications')"
              [message]="t('notifications.noNotificationsHint')" />
          } @else {
            @for (n of notifications(); track n.id) {
              <div class="notif-item flex items-start gap-3 px-6 py-3 cursor-pointer
                          hover:bg-bg transition-colors duration-150"
                   [class.unread]="!n.is_read"
                   (click)="onNotificationClick(n)">
                <nhannht-metro-icon [name]="getTypeIcon(n.type)" [size]="20" />
                <div class="flex-1 flex flex-col gap-0.5">
                  <span class="notif-title font-body text-[13px] text-fg"
                        [class.font-bold]="!n.is_read">{{ resolveTitle(n) }}</span>
                  <span class="font-body text-[12px] text-muted">{{ resolveMessage(n) }}</span>
                  <span class="font-body text-[11px] text-muted">{{ n.created_at | timeAgo }}</span>
                </div>
                <button class="delete-btn bg-transparent border-none cursor-pointer text-muted
                               opacity-50 hover:opacity-100 transition-opacity p-1"
                        (click)="deleteNotification($event, n.id)">
                  <nhannht-metro-icon name="close" [size]="16" />
                </button>
              </div>
              <nhannht-metro-divider />
            }
            @if (hasMore()) {
              <div class="px-6 py-3">
                <nhannht-metro-button variant="secondary" [label]="t('common.loadMore')" [fullWidth]="true" (clicked)="loadMore()" />
              </div>
            }
          }
        </div>
      </div>
    </ng-container>
  `,
  styles: `
    .notif-item.unread { background-color: rgba(26, 26, 26, 0.04); }
  `,
})
export class NotificationListComponent implements OnInit {
  private notifService = inject(NotificationService);
  private transloco = inject(TranslocoService);
  private router = inject(Router);

  notifications = signal<Notification[]>([]);
  loading = signal(true);
  error = signal(false);
  total = signal(0);
  offset = 0;
  readonly limit = 20;

  hasMore() {
    return this.notifications().length < this.total();
  }

  ngOnInit() {
    this.load();
  }

  retryLoad = () => {
    this.offset = 0;
    this.load();
  };

  load() {
    this.loading.set(true);
    this.error.set(false);
    this.notifService.list(this.limit, this.offset).subscribe({
      next: res => {
        this.notifications.set(
          this.offset === 0 ? res.notifications : [...this.notifications(), ...res.notifications],
        );
        this.total.set(res.total);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  loadMore() {
    this.offset += this.limit;
    this.load();
  }

  markAllRead() {
    this.notifService.markAllAsRead().subscribe({
      next: () => {
        this.notifications.update(list => list.map(n => ({ ...n, is_read: true })));
      },
    });
  }

  onNotificationClick(n: Notification) {
    if (!n.is_read) {
      this.notifService.markAsRead(n.id).subscribe({
        next: () => {
          this.notifications.update(list =>
            list.map(item => (item.id === n.id ? { ...item, is_read: true } : item)),
          );
        },
      });
    }
    if (n.task_id) {
      this.router.navigate(['/tasks', n.task_id]);
    }
  }

  deleteNotification(event: Event, id: number) {
    event.stopPropagation();
    this.notifService.remove(id).subscribe({
      next: () => {
        this.notifications.update(list => list.filter(n => n.id !== id));
        this.total.update(t => t - 1);
      },
    });
  }

  resolveTitle(n: Notification): string {
    return resolveNotification(this.transloco, n).title;
  }

  resolveMessage(n: Notification): string {
    return resolveNotification(this.transloco, n).message;
  }

  getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      application_received: 'person_add',
      application_accepted: 'check_circle',
      application_rejected: 'cancel',
      task_completed: 'task_alt',
      payment_received: 'payments',
      message: 'chat',
      task_cancelled: 'block',
    };
    return icons[type] || 'notifications';
  }
}
