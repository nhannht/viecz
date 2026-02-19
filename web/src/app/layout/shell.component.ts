import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbar } from '@angular/material/toolbar';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatBadge } from '@angular/material/badge';
import { AuthService } from '../core/auth.service';
import { NotificationService } from '../core/notification.service';
import { WebSocketService } from '../core/websocket.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbar,
    MatButton,
    MatIconButton,
    MatIcon,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger,
    MatBadge,
  ],
  template: `
    <mat-toolbar class="navbar">
      <a routerLink="/" class="logo">Viecz</a>
      <span class="spacer"></span>
      <nav class="nav-links">
        <a mat-button routerLink="/" routerLinkActive="active-link"
           [routerLinkActiveOptions]="{ exact: true }">
          <mat-icon>storefront</mat-icon>
          <span class="nav-label">Marketplace</span>
        </a>
        <a mat-button routerLink="/wallet" routerLinkActive="active-link">
          <mat-icon>account_balance_wallet</mat-icon>
          <span class="nav-label">Wallet</span>
        </a>
        <a mat-button routerLink="/chat" routerLinkActive="active-link">
          <mat-icon>chat</mat-icon>
          <span class="nav-label">Chat</span>
        </a>
      </nav>
      <button mat-icon-button (click)="loadNotifications()"
              [matMenuTriggerFor]="notifMenu">
        <mat-icon [matBadge]="unreadCount() > 0 ? unreadCount() : null"
                  matBadgeColor="warn" matBadgeSize="small">
          notifications
        </mat-icon>
      </button>
      <mat-menu #notifMenu="matMenu" class="notif-menu">
        @if (notifications().length === 0) {
          <div class="notif-empty">No notifications</div>
        }
        @for (n of notifications(); track n.id) {
          <button mat-menu-item class="notif-item">
            <span class="notif-title">{{ n.title }}</span>
            <span class="notif-msg">{{ n.message }}</span>
          </button>
        }
      </mat-menu>
      <button mat-icon-button [matMenuTriggerFor]="userMenu">
        <mat-icon>account_circle</mat-icon>
      </button>
      <mat-menu #userMenu="matMenu">
        <a mat-menu-item [routerLink]="['/profile', auth.currentUser()?.id]">
          <mat-icon>person</mat-icon> Profile
        </a>
        <button mat-menu-item (click)="auth.logout()">
          <mat-icon>logout</mat-icon> Logout
        </button>
      </mat-menu>
    </mat-toolbar>
    <main class="shell-content">
      <router-outlet />
    </main>
  `,
  styles: `
    .navbar {
      position: sticky;
      top: 0;
      z-index: 100;
      background: var(--mat-sys-primary);
      color: var(--mat-sys-on-primary);
      gap: 8px;
    }
    .logo {
      font-size: 1.4rem;
      font-weight: 700;
      text-decoration: none;
      color: inherit;
      letter-spacing: -0.5px;
    }
    .spacer { flex: 1; }
    .nav-links { display: flex; gap: 4px; }
    .nav-links a {
      color: inherit;
      --mdc-text-button-label-text-color: var(--mat-sys-on-primary);
    }
    .active-link { opacity: 1; font-weight: 600; }
    .shell-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 16px;
      min-height: calc(100vh - 64px);
    }
    .notif-empty { padding: 16px; color: var(--mat-sys-on-surface-variant); }
    .notif-item { display: flex; flex-direction: column; align-items: flex-start; }
    .notif-title { font-weight: 500; font-size: 0.875rem; }
    .notif-msg { font-size: 0.75rem; color: var(--mat-sys-on-surface-variant); }
    @media (max-width: 600px) {
      .nav-label { display: none; }
      .shell-content { padding: 8px; }
    }
  `,
})
export class ShellComponent implements OnInit {
  auth = inject(AuthService);
  private notifService = inject(NotificationService);
  private wsService = inject(WebSocketService);

  unreadCount = signal(0);
  notifications = signal<{ id: number; title: string; message: string }[]>([]);

  ngOnInit() {
    this.wsService.connect();
    this.notifService.getUnreadCount().subscribe({
      next: res => this.unreadCount.set(res.unread_count),
    });
  }

  loadNotifications() {
    this.notifService.list(10).subscribe({
      next: res => {
        this.notifications.set(res.notifications);
        this.notifService.markAllAsRead().subscribe({
          next: () => this.unreadCount.set(0),
        });
      },
    });
  }
}
