import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatDivider } from '@angular/material/divider';
import { NotificationService } from '../core/notification.service';
import { Notification } from '../core/models';
import { TimeAgoPipe } from '../core/pipes';

@Component({
  selector: 'app-notification-list',
  standalone: true,
  imports: [
    DatePipe,
    MatCard,
    MatCardContent,
    MatCardHeader,
    MatCardTitle,
    MatButton,
    MatIcon,
    MatProgressSpinner,
    MatDivider,
    TimeAgoPipe,
  ],
  template: `
    <div class="notif-page">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Notifications</mat-card-title>
          @if (notifications().length > 0) {
            <button mat-button (click)="markAllRead()" class="mark-all-btn">
              <mat-icon>done_all</mat-icon> Mark all read
            </button>
          }
        </mat-card-header>
        <mat-card-content>
          @if (loading()) {
            <div class="loading"><mat-spinner diameter="40"></mat-spinner></div>
          } @else if (notifications().length === 0) {
            <div class="empty">
              <mat-icon>notifications_off</mat-icon>
              <p>No notifications yet</p>
            </div>
          } @else {
            @for (n of notifications(); track n.id) {
              <div class="notif-item" [class.unread]="!n.is_read"
                   (click)="onNotificationClick(n)">
                <mat-icon class="notif-type-icon">{{ getTypeIcon(n.type) }}</mat-icon>
                <div class="notif-content">
                  <span class="notif-title">{{ n.title }}</span>
                  <span class="notif-message">{{ n.message }}</span>
                  <span class="notif-time">{{ n.created_at | timeAgo }}</span>
                </div>
                <button mat-icon-button (click)="deleteNotification($event, n.id)"
                        class="delete-btn">
                  <mat-icon>close</mat-icon>
                </button>
              </div>
              <mat-divider></mat-divider>
            }
            @if (hasMore()) {
              <button mat-button (click)="loadMore()" class="load-more">
                Load more
              </button>
            }
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: `
    .notif-page { max-width: 700px; margin: 0 auto; }
    mat-card-header { display: flex; align-items: center; }
    .mark-all-btn { margin-left: auto; }
    .loading { display: flex; justify-content: center; padding: 32px; }
    .empty {
      display: flex; flex-direction: column; align-items: center;
      padding: 48px 0; color: var(--mat-sys-on-surface-variant);
    }
    .empty mat-icon { font-size: 48px; width: 48px; height: 48px; margin-bottom: 8px; }
    .notif-item {
      display: flex; align-items: flex-start; gap: 12px;
      padding: 12px 0; cursor: pointer; transition: background 0.15s;
    }
    .notif-item:hover { background: var(--mat-sys-surface-variant); }
    .notif-item.unread { background: rgba(var(--mat-sys-primary-rgb, 103, 80, 164), 0.08); }
    .notif-item.unread .notif-title { font-weight: 700; }
    .notif-type-icon { color: var(--mat-sys-primary); margin-top: 2px; }
    .notif-content { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .notif-title { font-size: 0.875rem; font-weight: 500; }
    .notif-message { font-size: 0.8rem; color: var(--mat-sys-on-surface-variant); }
    .notif-time { font-size: 0.7rem; color: var(--mat-sys-on-surface-variant); }
    .delete-btn { opacity: 0.5; }
    .delete-btn:hover { opacity: 1; }
    .load-more { width: 100%; margin-top: 8px; }
  `,
})
export class NotificationListComponent implements OnInit {
  private notifService = inject(NotificationService);
  private router = inject(Router);

  notifications = signal<Notification[]>([]);
  loading = signal(true);
  total = signal(0);
  offset = 0;
  readonly limit = 20;

  hasMore() {
    return this.notifications().length < this.total();
  }

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.notifService.list(this.limit, this.offset).subscribe({
      next: res => {
        this.notifications.set(
          this.offset === 0 ? res.notifications : [...this.notifications(), ...res.notifications],
        );
        this.total.set(res.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
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
