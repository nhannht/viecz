import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { NhannhtMetroIconComponent } from '../shared/components/nhannht-metro-icon.component';
import { NhannhtMetroMenuComponent } from '../shared/components/nhannht-metro-menu.component';
import { NhannhtMetroDividerComponent } from '../shared/components/nhannht-metro-divider.component';
import { NhannhtMetroSnackbarComponent } from '../shared/components/nhannht-metro-snackbar.component';
import { NhannhtMetroSnackbarService } from '../shared/services/nhannht-metro-snackbar.service';
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
    NhannhtMetroIconComponent,
    NhannhtMetroMenuComponent,
    NhannhtMetroDividerComponent,
    NhannhtMetroSnackbarComponent,
  ],
  template: `
    <nav class="navbar sticky top-0 z-50 flex items-center gap-2 px-6 py-3 bg-fg text-bg border-b border-fg">
      <a routerLink="/" class="logo font-display text-[14px] tracking-[2px] text-bg no-underline">Viecz</a>
      <span class="flex-1"></span>

      @if (auth.isAuthenticated()) {
        <!-- Authenticated navbar -->
        <div class="nav-links flex gap-1">
          <a routerLink="/" routerLinkActive="active-link"
             [routerLinkActiveOptions]="{ exact: true }"
             class="flex items-center gap-1 px-3 py-2 text-bg no-underline font-body text-[13px] hover:opacity-80 transition-opacity">
            <nhannht-metro-icon name="storefront" [size]="20" />
            <span class="nav-label">Marketplace</span>
          </a>
          <a routerLink="/wallet" routerLinkActive="active-link"
             class="flex items-center gap-1 px-3 py-2 text-bg no-underline font-body text-[13px] hover:opacity-80 transition-opacity">
            <nhannht-metro-icon name="account_balance_wallet" [size]="20" />
            <span class="nav-label">Wallet</span>
          </a>
          <a routerLink="/messages" routerLinkActive="active-link"
             class="flex items-center gap-1 px-3 py-2 text-bg no-underline font-body text-[13px] hover:opacity-80 transition-opacity">
            <nhannht-metro-icon name="chat" [size]="20" />
            <span class="nav-label">Chat</span>
          </a>
        </div>

        <!-- Notification bell -->
        <div class="relative">
          <button class="bg-transparent border-none cursor-pointer text-bg p-1 hover:opacity-80 transition-opacity relative"
                  (click)="toggleNotifMenu()">
            <nhannht-metro-icon name="notifications" [size]="24" />
            @if (unreadCount() > 0) {
              <span class="absolute -top-1 -right-1 bg-bg text-fg font-display text-[8px] w-4 h-4 flex items-center justify-center border border-fg">
                {{ unreadCount() }}
              </span>
            }
          </button>
          <nhannht-metro-menu [open]="notifMenuOpen()" (closed)="notifMenuOpen.set(false)">
            @if (notifications().length === 0) {
              <div class="px-4 py-3 font-body text-[13px] text-muted">No notifications</div>
            }
            @for (n of notifications(); track n.id) {
              <div class="nhannht-metro-menu-item flex flex-col items-start gap-0.5">
                <span class="font-body text-[13px] font-bold">{{ n.title }}</span>
                <span class="font-body text-[11px] text-muted">{{ n.message }}</span>
              </div>
            }
            <nhannht-metro-divider />
            <a routerLink="/notifications" class="nhannht-metro-menu-item flex items-center gap-2"
               (click)="notifMenuOpen.set(false)">
              <nhannht-metro-icon name="list" [size]="16" /> View all notifications
            </a>
          </nhannht-metro-menu>
        </div>

        <!-- User menu -->
        <div class="relative">
          <button class="bg-transparent border-none cursor-pointer text-bg p-1 hover:opacity-80 transition-opacity"
                  (click)="toggleUserMenu()">
            <nhannht-metro-icon name="account_circle" [size]="24" />
          </button>
          <nhannht-metro-menu [open]="userMenuOpen()" (closed)="userMenuOpen.set(false)">
            <a [routerLink]="['/profile', auth.currentUser()?.id]"
               class="nhannht-metro-menu-item flex items-center gap-2"
               (click)="userMenuOpen.set(false)">
              <nhannht-metro-icon name="person" [size]="16" /> Profile
            </a>
            <button class="nhannht-metro-menu-item flex items-center gap-2"
                    (click)="auth.logout(); userMenuOpen.set(false)">
              <nhannht-metro-icon name="logout" [size]="16" /> Logout
            </button>
          </nhannht-metro-menu>
        </div>
      } @else {
        <!-- Unauthenticated navbar -->
        <div class="nav-links flex gap-1 items-center">
          <a routerLink="/" routerLinkActive="active-link"
             [routerLinkActiveOptions]="{ exact: true }"
             class="flex items-center gap-1 px-3 py-2 text-bg no-underline font-body text-[13px] hover:opacity-80 transition-opacity">
            <nhannht-metro-icon name="storefront" [size]="20" />
            <span class="nav-label">Marketplace</span>
          </a>
          <a routerLink="/login"
             class="flex items-center gap-1 px-3 py-2 text-bg no-underline font-body text-[13px] hover:opacity-80 transition-opacity">
            Sign In
          </a>
          <a routerLink="/register"
             class="flex items-center px-4 py-2 bg-bg text-fg no-underline font-display text-[11px] tracking-[1px] border border-bg hover:opacity-90 transition-opacity">
            Register
          </a>
        </div>
      }
    </nav>
    <main class="shell-content max-w-[1200px] mx-auto p-4 min-h-[calc(100vh-64px)]">
      <router-outlet />
    </main>
    <nhannht-metro-snackbar [visible]="snackbarService.visible()" [message]="snackbarService.message()" />
  `,
  styles: `
    .active-link { opacity: 1; font-weight: 600; }
    @media (max-width: 600px) {
      .nav-label { display: none; }
      .shell-content { padding: 8px; }
    }
  `,
})
export class ShellComponent implements OnInit {
  auth = inject(AuthService);
  snackbarService = inject(NhannhtMetroSnackbarService);
  private notifService = inject(NotificationService);
  private wsService = inject(WebSocketService);

  unreadCount = signal(0);
  notifications = signal<{ id: number; title: string; message: string }[]>([]);
  notifMenuOpen = signal(false);
  userMenuOpen = signal(false);

  ngOnInit() {
    if (this.auth.isAuthenticated()) {
      this.wsService.connect();
      this.notifService.getUnreadCount().subscribe({
        next: res => this.unreadCount.set(res.unread_count),
      });
    }
  }

  toggleNotifMenu() {
    this.userMenuOpen.set(false);
    this.notifMenuOpen.update(v => !v);
    if (this.notifMenuOpen()) {
      this.loadNotifications();
    }
  }

  toggleUserMenu() {
    this.notifMenuOpen.set(false);
    this.userMenuOpen.update(v => !v);
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
