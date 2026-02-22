import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { NhannhtMetroIconComponent } from '../shared/components/nhannht-metro-icon.component';
import { NhannhtMetroMenuComponent } from '../shared/components/nhannht-metro-menu.component';
import { NhannhtMetroDividerComponent } from '../shared/components/nhannht-metro-divider.component';
import { NhannhtMetroSnackbarComponent } from '../shared/components/nhannht-metro-snackbar.component';
import { NhannhtMetroSnackbarService } from '../shared/services/nhannht-metro-snackbar.service';
import { Subscription } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { NotificationService } from '../core/notification.service';
import { WebSocketService } from '../core/websocket.service';
import { LanguageService } from '../core/language.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    TranslocoDirective,
    NhannhtMetroIconComponent,
    NhannhtMetroMenuComponent,
    NhannhtMetroDividerComponent,
    NhannhtMetroSnackbarComponent,
  ],
  template: `
    <ng-container *transloco="let t">
      <nav class="navbar sticky top-0 z-50 flex items-center gap-2 px-6 py-3 bg-fg text-bg border-b border-fg">
        <a routerLink="/" class="logo font-display text-[14px] tracking-[2px] text-bg no-underline">{{ t('common.viecz') }}</a>
        <span class="flex-1"></span>

        @if (auth.isAuthenticated()) {
          <!-- Authenticated navbar -->
          <div class="nav-links flex gap-1">
            <a routerLink="/" routerLinkActive="active-link"
               [routerLinkActiveOptions]="{ exact: true }"
               class="flex items-center gap-1 px-3 py-2 text-bg no-underline font-body text-[13px] hover:opacity-80 transition-opacity">
              <nhannht-metro-icon name="storefront" [size]="20" />
              <span class="nav-label">{{ t('shell.marketplace') }}</span>
            </a>
            <a routerLink="/wallet" routerLinkActive="active-link"
               class="flex items-center gap-1 px-3 py-2 text-bg no-underline font-body text-[13px] hover:opacity-80 transition-opacity">
              <nhannht-metro-icon name="account_balance_wallet" [size]="20" />
              <span class="nav-label">{{ t('shell.wallet') }}</span>
            </a>
            <a routerLink="/messages" routerLinkActive="active-link"
               class="flex items-center gap-1 px-3 py-2 text-bg no-underline font-body text-[13px] hover:opacity-80 transition-opacity">
              <nhannht-metro-icon name="chat" [size]="20" />
              <span class="nav-label">{{ t('shell.chat') }}</span>
            </a>
          </div>

          <!-- Language toggle -->
          <button class="bg-transparent border border-bg/40 text-bg px-2 py-1 font-display text-[10px] tracking-[1px] cursor-pointer hover:bg-bg/20 transition-colors"
                  (click)="lang.toggle()">
            {{ lang.activeLang === 'vi' ? 'EN' : 'VI' }}
          </button>

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
                <div class="px-4 py-3 font-body text-[13px] text-muted">{{ t('shell.noNotifications') }}</div>
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
                <nhannht-metro-icon name="list" [size]="16" /> {{ t('shell.viewAllNotifications') }}
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
                <nhannht-metro-icon name="person" [size]="16" /> {{ t('shell.profile') }}
              </a>
              <button class="nhannht-metro-menu-item flex items-center gap-2"
                      (click)="auth.logout(); userMenuOpen.set(false)">
                <nhannht-metro-icon name="logout" [size]="16" /> {{ t('shell.logout') }}
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
              <span class="nav-label">{{ t('shell.marketplace') }}</span>
            </a>
            <!-- Language toggle -->
            <button class="bg-transparent border border-bg/40 text-bg px-2 py-1 font-display text-[10px] tracking-[1px] cursor-pointer hover:bg-bg/20 transition-colors"
                    (click)="lang.toggle()">
              {{ lang.activeLang === 'vi' ? 'EN' : 'VI' }}
            </button>
            <a routerLink="/login"
               class="flex items-center gap-1 px-3 py-2 text-bg no-underline font-body text-[13px] hover:opacity-80 transition-opacity">
              {{ t('common.signIn') }}
            </a>
            <a routerLink="/register"
               class="flex items-center px-4 py-2 bg-bg text-fg no-underline font-display text-[11px] tracking-[1px] border border-bg hover:opacity-90 transition-opacity">
              {{ t('common.register') }}
            </a>
          </div>
        }
      </nav>
      <main class="shell-content max-w-[1200px] mx-auto p-4 min-h-[calc(100vh-64px)]">
        <router-outlet />
      </main>
      <nhannht-metro-snackbar [visible]="snackbarService.visible()" [message]="snackbarService.message()" />
    </ng-container>
  `,
  styles: `
    .active-link { opacity: 1; font-weight: 600; }
    @media (max-width: 600px) {
      .nav-label { display: none; }
      .shell-content { padding: 8px; }
    }
  `,
})
export class ShellComponent implements OnInit, OnDestroy {
  auth = inject(AuthService);
  lang = inject(LanguageService);
  snackbarService = inject(NhannhtMetroSnackbarService);
  private notifService = inject(NotificationService);
  private wsService = inject(WebSocketService);
  private wsSub?: Subscription;

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
      this.wsSub = this.wsService.messages$.subscribe(msg => {
        if (msg.type === 'notification') {
          this.unreadCount.update(c => c + 1);
        }
      });
    }
  }

  ngOnDestroy() {
    this.wsSub?.unsubscribe();
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
