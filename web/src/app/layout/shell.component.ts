import { Component, inject, OnInit, OnDestroy, signal, computed, effect, PLATFORM_ID, HostListener, afterNextRender, ElementRef, ViewChild } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { VieczIconComponent } from '../shared/components/viecz-icon.component';
import { VieczMenuComponent } from '../shared/components/viecz-menu.component';

import { VieczSnackbarComponent } from '../shared/components/viecz-snackbar.component';
import { VieczSpinnerComponent } from '../shared/components/viecz-spinner.component';
import { ProfileCompletionDrawerComponent } from '../shared/components/profile-completion-drawer.component';
import { VieczSnackbarService } from '../shared/services/viecz-snackbar.service';
import { Subscription, filter } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { NotificationService } from '../core/notification.service';
import { WebSocketService } from '../core/websocket.service';
import { ThemeService } from '../core/theme.service';
import { LanguageService } from '../core/language.service';
import { Notification } from '../core/models';
import { resolveNotification } from '../core/notification-i18n';
import { TimeAgoPipe } from '../core/pipes';

/**
 * App shell with floating capsule nav (desktop) and bottom tab bar (mobile).
 *
 * Desktop (>=768px): Frosted-glass pill centered at top, shrinks on scroll,
 * sliding pill indicator behind active link.
 *
 * Mobile (<768px): Slim top bar (logo + notifications) + floating bottom tab bar
 * with 5 tabs (Marketplace, Wallet, Create, Chat, Profile).
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    TranslocoDirective,
    VieczIconComponent,
    VieczMenuComponent,
    VieczSnackbarComponent,
    VieczSpinnerComponent,
    ProfileCompletionDrawerComponent,
    TimeAgoPipe,
  ],
  template: `
    <ng-container *transloco="let t">

      <!-- ===== MOBILE: Slim top bar (logo + notifications) ===== -->
      <header class="mobile-top-bar md:hidden fixed top-0 left-0 right-0 z-50
                     flex items-center justify-between px-4 py-3"
              [class.nav-visible]="navVisible()">
        <a routerLink="/marketplace" class="logo font-display text-[14px] tracking-[2px] text-fg no-underline">
          {{ t('common.viecz') }}
        </a>
        @if (auth.isAuthenticated()) {
          <div class="flex items-center gap-2">
            <!-- Language toggle -->
            <button class="bg-transparent border border-border/60 text-fg px-2 py-1
                           font-display text-[9px] tracking-[1px] cursor-pointer
                           rounded-lg hover:bg-fg/5 transition-colors"
                    (click)="lang.toggle()"
                    [attr.title]="lang.activeLang === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'">
              {{ lang.activeLang === 'vi' ? '\uD83C\uDDFB\uD83C\uDDF3 VI' : '\uD83C\uDDEC\uD83C\uDDE7 EN' }}
            </button>
            <!-- Notification bell -->
            <div class="relative">
              <button class="bg-transparent border-none cursor-pointer text-fg p-1 relative"
                      (click)="$event.stopPropagation(); toggleNotifMenu()"
                      [attr.aria-label]="t('shell.notifications')">
                <viecz-icon name="notifications" [size]="22" />
                @if (unreadCount() > 0) {
                  <span class="notif-badge absolute -top-1 -right-1 bg-fg text-bg font-display
                               text-[8px] w-4 h-4 flex items-center justify-center rounded-sm">
                    {{ unreadCount() }}
                  </span>
                }
              </button>

              <!-- Custom notification panel -->
              @if (notifMenuOpen()) {
                <div class="notif-panel" (click)="$event.stopPropagation()">
                  @if (notifLoading()) {
                    <div class="notif-empty">
                      <viecz-spinner />
                    </div>
                  } @else if (notifications().length === 0) {
                    <div class="notif-empty">
                      <viecz-icon name="notifications_off" [size]="32" />
                      <span class="font-body text-[13px] text-muted mt-2">{{ t('shell.noNotifications') }}</span>
                    </div>
                  } @else {
                    <div class="notif-scroll">
                      @for (n of notifications(); track n.id; let i = $index) {
                        <div class="notif-row"
                             [class.unread]="!n.is_read"
                             [style.animation-delay]="(i * 40) + 'ms'"
                             (click)="onNotifClick(n)">
                          <div class="notif-icon-wrap">
                            <viecz-icon [name]="getTypeIcon(n.type)" [size]="18" />
                          </div>
                          <div class="notif-body">
                            <div class="notif-header-row">
                              <span class="notif-title" [class.font-bold]="!n.is_read">{{ resolveTitle(n) }}</span>
                              <span class="notif-time">{{ n.created_at | timeAgo }}</span>
                            </div>
                            <span class="notif-msg">{{ resolveMessage(n) }}</span>
                          </div>
                        </div>
                      }
                    </div>
                  }
                  <a routerLink="/notifications" class="notif-footer"
                     (click)="notifMenuOpen.set(false)">
                    <viecz-icon name="list" [size]="16" /> {{ t('shell.viewAllNotifications') }}
                  </a>
                </div>
              }
            </div>
          </div>
        } @else {
          <div class="flex items-center gap-2">
            <button class="bg-transparent border border-border/60 text-fg px-2 py-1
                           font-display text-[9px] tracking-[1px] cursor-pointer
                           rounded-lg hover:bg-fg/5 transition-colors"
                    (click)="lang.toggle()">
              {{ lang.activeLang === 'vi' ? '\uD83C\uDDFB\uD83C\uDDF3 VI' : '\uD83C\uDDEC\uD83C\uDDE7 EN' }}
            </button>
            <a routerLink="/login" class="no-underline px-3 py-1.5 bg-fg text-bg rounded-lg
                                          font-display text-[10px] tracking-[1px]">
              {{ t('common.signIn') }}
            </a>
          </div>
        }
      </header>

      <!-- ===== DESKTOP: Floating capsule nav ===== -->
      <nav class="desktop-nav hidden md:flex fixed top-4 left-1/2 z-50
                  items-center gap-2 rounded-2xl border border-border/60"
           [class.scrolled]="scrolled()"
           [class.nav-visible]="navVisible()">

        <!-- Logo -->
        <a routerLink="/marketplace" class="logo font-display text-[13px] tracking-[2px] text-fg no-underline px-1">
          {{ t('common.viecz') }}
        </a>

        <!-- Divider -->
        <span class="w-px h-4 bg-border/80 mx-1"></span>

        @if (auth.isAuthenticated()) {
          <!-- Center nav links with sliding pill -->
          <div class="nav-links-group relative flex items-center" #navLinksGroup>
            <span class="active-pill" #navPill style="opacity:0"></span>

            <a routerLink="/marketplace" routerLinkActive="rla-active"
               class="nav-icon-link" [attr.title]="t('shell.marketplace')">
              <viecz-icon name="storefront" [size]="16" />
              <span class="nav-label">{{ t('shell.marketplace') }}</span>
            </a>
            <a routerLink="/wallet" routerLinkActive="rla-active"
               class="nav-icon-link" [attr.title]="t('shell.wallet')">
              <viecz-icon name="account_balance_wallet" [size]="16" />
              <span class="nav-label">{{ t('shell.wallet') }}</span>
            </a>
            <a routerLink="/messages" routerLinkActive="rla-active"
               class="nav-icon-link" [attr.title]="t('shell.chat')">
              <viecz-icon name="chat" [size]="16" />
              <span class="nav-label">{{ t('shell.chat') }}</span>
            </a>
          </div>

          <!-- Divider -->
          <span class="w-px h-4 bg-border/80 mx-1"></span>

          <!-- Actions: theme, lang toggle, notification, user menu -->
          <div class="flex items-center gap-1">
            <!-- Language toggle -->
            <button class="bg-transparent border border-border/60 text-fg px-2 py-1
                           font-display text-[9px] tracking-[1px] cursor-pointer
                           rounded-lg hover:bg-fg/5 transition-colors"
                    (click)="lang.toggle()"
                    [attr.title]="lang.activeLang === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'">
              {{ lang.activeLang === 'vi' ? '\uD83C\uDDFB\uD83C\uDDF3 VI' : '\uD83C\uDDEC\uD83C\uDDE7 EN' }}
            </button>

            <!-- Notification bell -->
            <div class="relative">
              <button class="bg-transparent border-none cursor-pointer text-fg p-1.5
                             rounded-xl hover:bg-fg/5 transition-colors relative"
                      (click)="$event.stopPropagation(); toggleNotifMenu()"
                      [attr.aria-label]="t('shell.notifications')">
                <viecz-icon name="notifications" [size]="20" />
                @if (unreadCount() > 0) {
                  <span class="notif-badge absolute -top-0.5 -right-0.5 bg-fg text-bg
                               font-display text-[8px] w-4 h-4 flex items-center justify-center rounded-sm">
                    {{ unreadCount() }}
                  </span>
                }
              </button>

              <!-- Custom notification panel -->
              @if (notifMenuOpen()) {
                <div class="notif-panel" (click)="$event.stopPropagation()">
                  @if (notifLoading()) {
                    <div class="notif-empty">
                      <viecz-spinner />
                    </div>
                  } @else if (notifications().length === 0) {
                    <div class="notif-empty">
                      <viecz-icon name="notifications_off" [size]="32" />
                      <span class="font-body text-[13px] text-muted mt-2">{{ t('shell.noNotifications') }}</span>
                    </div>
                  } @else {
                    <div class="notif-scroll">
                      @for (n of notifications(); track n.id; let i = $index) {
                        <div class="notif-row"
                             [class.unread]="!n.is_read"
                             [style.animation-delay]="(i * 40) + 'ms'"
                             (click)="onNotifClick(n)">
                          <div class="notif-icon-wrap">
                            <viecz-icon [name]="getTypeIcon(n.type)" [size]="18" />
                          </div>
                          <div class="notif-body">
                            <div class="notif-header-row">
                              <span class="notif-title" [class.font-bold]="!n.is_read">{{ resolveTitle(n) }}</span>
                              <span class="notif-time">{{ n.created_at | timeAgo }}</span>
                            </div>
                            <span class="notif-msg">{{ resolveMessage(n) }}</span>
                          </div>
                        </div>
                      }
                    </div>
                  }
                  <a routerLink="/notifications" class="notif-footer"
                     (click)="notifMenuOpen.set(false)">
                    <viecz-icon name="list" [size]="16" /> {{ t('shell.viewAllNotifications') }}
                  </a>
                </div>
              }
            </div>

            <!-- User menu -->
            <div class="relative">
              <button class="bg-transparent border-none cursor-pointer text-fg p-1.5
                             rounded-xl hover:bg-fg/5 transition-colors"
                      (click)="toggleUserMenu()"
                      [attr.aria-label]="t('shell.account')">
                <viecz-icon name="account_circle" [size]="20" />
              </button>
              <viecz-menu [open]="userMenuOpen()" (closed)="userMenuOpen.set(false)">
                <a [routerLink]="['/profile', auth.currentUser()?.id]"
                   class="viecz-menu-item flex items-center gap-2"
                   (click)="userMenuOpen.set(false)">
                  <viecz-icon name="person" [size]="16" /> {{ t('shell.profile') }}
                </a>
                <button class="viecz-menu-item flex items-center gap-2"
                        (click)="auth.logout(); userMenuOpen.set(false)">
                  <viecz-icon name="logout" [size]="16" /> {{ t('shell.logout') }}
                </button>
              </viecz-menu>
            </div>
          </div>

        } @else {
          <!-- Unauthenticated desktop -->
          <div class="flex items-center gap-1">
            <a routerLink="/marketplace" routerLinkActive="rla-active"
               class="nav-icon-link" [attr.title]="t('shell.marketplace')">
              <viecz-icon name="storefront" [size]="16" />
              <span class="nav-label">{{ t('shell.marketplace') }}</span>
            </a>
            <button class="bg-transparent border border-border/60 text-fg px-2 py-1
                           font-display text-[9px] tracking-[1px] cursor-pointer
                           rounded-lg hover:bg-fg/5 transition-colors"
                    (click)="lang.toggle()">
              {{ lang.activeLang === 'vi' ? '\uD83C\uDDFB\uD83C\uDDF3 VI' : '\uD83C\uDDEC\uD83C\uDDE7 EN' }}
            </button>
            <a routerLink="/login"
               class="flex items-center px-3 py-1.5 bg-fg text-bg no-underline font-display
                      text-[10px] tracking-[1px] rounded-xl hover:opacity-90 transition-opacity">
              {{ t('common.signIn') }}
            </a>
          </div>
        }
      </nav>

      <!-- ===== MOBILE: Floating bottom tab bar (authenticated only) ===== -->
      @if (auth.isAuthenticated()) {
        <nav class="bottom-bar md:hidden fixed bottom-3 left-2 right-2 z-50
                    flex items-stretch rounded-xl border border-border/60"
             [class.nav-visible]="navVisible()">

          <a routerLink="/marketplace"
             class="bottom-tab flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5
                    font-body text-[10px] no-underline rounded-l-xl"
             [class.bottom-tab-active]="activeTab() === 'marketplace'">
            <viecz-icon name="storefront" [size]="22" />
            <span>{{ t('shell.marketplace') }}</span>
          </a>

          <a routerLink="/wallet"
             class="bottom-tab flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5
                    font-body text-[10px] no-underline"
             [class.bottom-tab-active]="activeTab() === 'wallet'">
            <viecz-icon name="account_balance_wallet" [size]="22" />
            <span>{{ t('shell.wallet') }}</span>
          </a>

          <a routerLink="/tasks/new"
             class="bottom-tab flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5
                    font-body text-[10px] no-underline"
             [class.bottom-tab-active]="activeTab() === 'create'">
            <viecz-icon name="add_circle" [size]="22" />
            <span>{{ t('marketplace.createTask') }}</span>
          </a>

          <a routerLink="/messages"
             class="bottom-tab flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5
                    font-body text-[10px] no-underline"
             [class.bottom-tab-active]="activeTab() === 'chat'">
            <viecz-icon name="chat" [size]="22" />
            <span>{{ t('shell.chat') }}</span>
          </a>

          <a [routerLink]="['/profile', auth.currentUser()?.id]"
             class="bottom-tab flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5
                    font-body text-[10px] no-underline rounded-r-xl"
             [class.bottom-tab-active]="activeTab() === 'profile'">
            <viecz-icon name="account_circle" [size]="22" />
            <span>{{ t('shell.profile') }}</span>
          </a>
        </nav>
      }

      <!-- ===== Main content ===== -->
      <main class="shell-content max-w-[1200px] mx-auto p-4 pt-16 md:pt-20 pb-24 md:pb-4 min-h-screen">
        <router-outlet />
      </main>

      <viecz-snackbar [visible]="snackbarService.visible()" [message]="snackbarService.message()" />
      <app-profile-completion-drawer />
    </ng-container>
  `,
  styles: `
    /* === Desktop Floating Capsule === */
    .desktop-nav {
      background: color-mix(in srgb, var(--color-bg) 85%, transparent);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      padding: 8px 16px;
      box-shadow: 0 2px 12px color-mix(in srgb, var(--color-fg) 8%, transparent);
      opacity: 0;
      transform: translateX(-50%) translateY(-12px);
      transition: padding 300ms ease, box-shadow 300ms ease,
                  opacity 400ms ease, transform 400ms ease;
    }
    .desktop-nav.nav-visible {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
    .desktop-nav.scrolled {
      padding: 6px 14px;
      box-shadow: 0 4px 24px color-mix(in srgb, var(--color-fg) 16%, transparent);
    }

    /* === Nav links (icon-only on md, icon+text on lg+) === */
    .nav-icon-link {
      position: relative;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      width: 36px;
      height: 36px;
      color: var(--color-muted);
      text-decoration: none;
      border-radius: 10px;
      transition: color 200ms ease;
      font-family: var(--font-body);
      font-size: 12px;
      white-space: nowrap;
    }
    .nav-icon-link:hover { color: var(--color-fg); }
    .nav-icon-link.rla-active { color: var(--color-fg); font-weight: 600; }
    .nav-label { display: none; }
    @media (min-width: 1024px) {
      .nav-icon-link {
        width: auto;
        padding: 0 12px;
      }
      .nav-label { display: inline; }
    }

    /* === Active-Link Sliding Pill === */
    .nav-links-group { position: relative; }
    .active-pill {
      position: absolute;
      top: 2px;
      height: calc(100% - 4px);
      background: color-mix(in srgb, var(--color-fg) 8%, transparent);
      border-radius: 10px;
      transition: left 300ms cubic-bezier(0.34, 1.56, 0.64, 1),
                  width 300ms cubic-bezier(0.34, 1.56, 0.64, 1),
                  opacity 200ms ease;
      pointer-events: none;
      z-index: 0;
    }

    /* === Mobile Top Bar === */
    .mobile-top-bar {
      background: color-mix(in srgb, var(--color-bg) 85%, transparent);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid color-mix(in srgb, var(--color-border) 60%, transparent);
      opacity: 0;
      transform: translateY(-12px);
      transition: opacity 400ms ease, transform 400ms ease;
    }
    .mobile-top-bar.nav-visible {
      opacity: 1;
      transform: translateY(0);
    }

    /* === Mobile Bottom Tab Bar === */
    .bottom-bar {
      background: color-mix(in srgb, var(--color-bg) 85%, transparent);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      box-shadow: 0 -2px 16px color-mix(in srgb, var(--color-fg) 8%, transparent);
      opacity: 0;
      transform: translateY(16px);
      transition: opacity 400ms ease 100ms, transform 400ms ease 100ms;
    }
    .bottom-bar.nav-visible {
      opacity: 1;
      transform: translateY(0);
    }
    .bottom-tab {
      color: var(--color-muted);
      transition: color 200ms ease, transform 200ms ease;
    }
    .bottom-tab:hover { background: color-mix(in srgb, var(--color-fg) 3%, transparent); }
    .bottom-tab-active {
      color: var(--color-fg) !important;
      font-weight: 600;
    }

    /* === Notification Badge Pulse === */
    @keyframes badge-pulse {
      0%   { transform: scale(1); }
      50%  { transform: scale(1.3); }
      100% { transform: scale(1); }
    }
    .notif-badge { animation: badge-pulse 0.4s ease-out; }

    /* === Notification Panel === */
    @keyframes notif-panel-enter {
      from { opacity: 0; transform: translateY(-8px) scale(0.96); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes notif-row-enter {
      from { opacity: 0; transform: translateX(12px); }
      to   { opacity: 1; transform: translateX(0); }
    }

    .notif-panel {
      position: absolute;
      top: calc(100% + 8px);
      right: -8px;
      width: 360px;
      max-width: calc(100vw - 32px);
      background: color-mix(in srgb, var(--color-bg) 95%, transparent);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid color-mix(in srgb, var(--color-border) 80%, transparent);
      border-radius: 12px;
      box-shadow: 0 8px 32px color-mix(in srgb, var(--color-fg) 12%, transparent), 0 2px 8px color-mix(in srgb, var(--color-fg) 6%, transparent);
      z-index: 100;
      animation: notif-panel-enter 200ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
      overflow: hidden;
    }

    .notif-scroll {
      max-height: 380px;
      overflow-y: auto;
      overscroll-behavior: contain;
    }
    .notif-scroll::-webkit-scrollbar { width: 4px; }
    .notif-scroll::-webkit-scrollbar-thumb {
      background: color-mix(in srgb, var(--color-fg) 15%, transparent);
      border-radius: 2px;
    }

    .notif-row {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px 16px;
      cursor: pointer;
      border-bottom: 1px solid color-mix(in srgb, var(--color-border) 40%, transparent);
      transition: background 150ms ease;
      opacity: 0;
      animation: notif-row-enter 250ms ease forwards;
    }
    .notif-row:last-child { border-bottom: none; }
    .notif-row:hover { background: color-mix(in srgb, var(--color-fg) 4%, transparent); }
    .notif-row.unread {
      background: color-mix(in srgb, var(--color-fg) 5%, transparent);
      border-left: 2px solid var(--color-fg);
      padding-left: 14px;
    }

    .notif-icon-wrap {
      flex-shrink: 0;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: color-mix(in srgb, var(--color-fg) 7%, transparent);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: 2px;
    }

    .notif-body {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .notif-header-row {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 8px;
    }
    .notif-title {
      font-family: var(--font-body);
      font-size: 13px;
      color: var(--color-fg);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .notif-time {
      font-family: var(--font-body);
      font-size: 11px;
      color: var(--color-muted);
      white-space: nowrap;
      flex-shrink: 0;
    }
    .notif-msg {
      font-family: var(--font-body);
      font-size: 12px;
      color: var(--color-muted);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .notif-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 32px 16px;
      color: var(--color-muted);
    }

    .notif-footer {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 10px 16px;
      border-top: 1px solid color-mix(in srgb, var(--color-border) 60%, transparent);
      font-family: var(--font-body);
      font-size: 13px;
      color: var(--color-fg);
      text-decoration: none;
      transition: background 150ms ease;
    }
    .notif-footer:hover { background: color-mix(in srgb, var(--color-fg) 4%, transparent); }
  `,
})
export class ShellComponent implements OnInit, OnDestroy {
  auth = inject(AuthService);
  lang = inject(LanguageService);
  themeService = inject(ThemeService);
  snackbarService = inject(VieczSnackbarService);
  private notifService = inject(NotificationService);
  private transloco = inject(TranslocoService);
  private wsService = inject(WebSocketService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private wsSub?: Subscription;
  private routerSub?: Subscription;

  @ViewChild('navPill') navPill?: ElementRef<HTMLElement>;
  @ViewChild('navLinksGroup') navLinksGroup?: ElementRef<HTMLElement>;


  unreadCount = signal(0);
  notifications = signal<Notification[]>([]);
  notifMenuOpen = signal(false);
  userMenuOpen = signal(false);
  notifLoading = signal(false);
  resendingEmail = signal(false);

  /** Scroll state — toggles capsule shrink on desktop. */
  scrolled = signal(false);

  /** Current route path for pill indicator and bottom tab highlight. */
  activeRoute = signal('/');

  /** Entrance animation trigger — set true after first browser render. */
  navVisible = signal(false);

  /** Maps current route to a tab name for active state styling. */
  activeTab = computed(() => {
    const url = this.activeRoute();
    if (url === '/marketplace' || url === '/' || url === '') return 'marketplace';
    if (url.startsWith('/wallet')) return 'wallet';
    if (url.startsWith('/messages') || url.startsWith('/chat')) return 'chat';
    if (url.startsWith('/profile')) return 'profile';
    if (url.startsWith('/tasks/new')) return 'create';
    return 'other';
  });

  constructor() {
    afterNextRender(() => {
      this.navVisible.set(true);
      this.themeService.init();
      // Initial pill position after DOM is ready
      setTimeout(() => this.updatePill(), 50);
    });

    // Reposition pill when active tab changes
    effect(() => {
      this.activeTab(); // track dependency
      // Double-rAF ensures Angular has applied rla-active class
      requestAnimationFrame(() => requestAnimationFrame(() => this.updatePill()));
    });
  }

  @HostListener('window:scroll')
  onWindowScroll() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.scrolled.set(window.scrollY > 20);
  }

  @HostListener('window:resize')
  onWindowResize() {
    this.updatePill();
  }

  /** Position the sliding pill behind the active nav link. */
  private updatePill(): void {
    const pill = this.navPill?.nativeElement;
    const group = this.navLinksGroup?.nativeElement;
    if (!pill || !group) return;

    const tab = this.activeTab();
    if (['create', 'profile', 'other'].includes(tab)) {
      pill.style.opacity = '0';
      return;
    }

    const activeLink = group.querySelector('.rla-active') as HTMLElement | null;
    if (!activeLink) {
      pill.style.opacity = '0';
      return;
    }

    const groupRect = group.getBoundingClientRect();
    const linkRect = activeLink.getBoundingClientRect();
    pill.style.left = (linkRect.left - groupRect.left) + 'px';
    pill.style.width = linkRect.width + 'px';
    pill.style.opacity = '1';
  }

  /** Close notification panel when clicking outside. */
  @HostListener('document:click', ['$event'])
  onDocumentClick(_event: Event) {
    if (this.notifMenuOpen()) {
      this.notifMenuOpen.set(false);
    }
  }

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

    this.activeRoute.set(this.router.url);
    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(e => this.activeRoute.set(e.urlAfterRedirects));
  }

  ngOnDestroy() {
    this.wsSub?.unsubscribe();
    this.routerSub?.unsubscribe();
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

  resendVerification() {
    this.resendingEmail.set(true);
    this.auth.resendVerification().subscribe({
      next: () => {
        this.resendingEmail.set(false);
        this.snackbarService.show('Verification email sent!');
      },
      error: err => {
        this.resendingEmail.set(false);
        this.snackbarService.show(err.error?.error || 'Failed to send verification email');
      },
    });
  }

  resolveTitle(n: Notification): string {
    return resolveNotification(this.transloco, n).title;
  }

  resolveMessage(n: Notification): string {
    return resolveNotification(this.transloco, n).message;
  }

  /** Navigate to the related task and mark notification as read. */
  onNotifClick(n: Notification) {
    if (!n.is_read) {
      this.notifService.markAsRead(n.id).subscribe({
        next: () => {
          this.notifications.update(list =>
            list.map(item => (item.id === n.id ? { ...item, is_read: true } : item)),
          );
        },
      });
    }
    this.notifMenuOpen.set(false);
    if (n.task_id) {
      this.router.navigate(['/tasks', n.task_id]);
    }
  }

  /** Map notification type to a Material icon name. */
  getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      task_created: 'post_add',
      application_received: 'person_add',
      application_sent: 'send',
      application_accepted: 'check_circle',
      application_rejected: 'cancel',
      task_completed: 'task_alt',
      payment_received: 'payments',
      message: 'chat',
      task_cancelled: 'block',
    };
    return icons[type] || 'notifications';
  }

  loadNotifications() {
    this.notifLoading.set(true);
    this.notifService.list(10).subscribe({
      next: res => {
        this.notifications.set(res.notifications ?? []);
        this.notifLoading.set(false);
        this.notifService.markAllAsRead().subscribe({
          next: () => this.unreadCount.set(0),
        });
      },
      error: () => {
        this.notifLoading.set(false);
      },
    });
  }
}
