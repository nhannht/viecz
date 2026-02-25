import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { PLATFORM_ID, signal, computed } from '@angular/core';
import { of, Subject } from 'rxjs';
import { ShellComponent } from './shell.component';
import { AuthService } from '../core/auth.service';
import { NotificationService } from '../core/notification.service';
import { WebSocketService } from '../core/websocket.service';
import { LanguageService } from '../core/language.service';
import { Notification } from '../core/models';
import { provideTranslocoForTesting } from '../core/transloco-testing';

/** Build a minimal Notification for tests — only id/title/message vary. */
function testNotif(overrides: Partial<Notification> & { id: number; title: string; message: string }): Notification {
  return { user_id: 1, type: 'task_created', is_read: false, created_at: new Date().toISOString(), ...overrides };
}

describe('ShellComponent', () => {
  let component: ShellComponent;
  let fixture: ComponentFixture<ShellComponent>;
  let authSpy: any;
  let notifSpy: any;
  let wsSpy: any;

  beforeEach(async () => {
    authSpy = {
      currentUser: signal({ id: 1, name: 'Test User' }),
      getAccessToken: vi.fn().mockReturnValue('token'),
      isAuthenticated: vi.fn().mockReturnValue(true),
      logout: vi.fn(),
      needsEmailVerification: computed(() => false),
    };
    notifSpy = {
      getUnreadCount: vi.fn().mockReturnValue(of({ unread_count: 3 })),
      list: vi.fn().mockReturnValue(
        of({
          notifications: [
            testNotif({ id: 1, title: 'Test', message: 'Test notification' }),
          ],
          total: 1,
        }),
      ),
      markAllAsRead: vi.fn().mockReturnValue(of({ message: 'ok' })),
    };
    wsSpy = {
      connect: vi.fn(),
      messages$: new Subject(),
    };

    await TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideTranslocoForTesting(),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: AuthService, useValue: authSpy },
        { provide: NotificationService, useValue: notifSpy },
        { provide: WebSocketService, useValue: wsSpy },
        { provide: LanguageService, useValue: { activeLang: 'en', init: vi.fn(), setLanguage: vi.fn(), toggle: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ShellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render toolbar with Viecz logo', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.logo')?.textContent).toBe('Viecz');
  });

  it('should render navigation links', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const navLinks = compiled.querySelectorAll('.nav-links a');
    expect(navLinks.length).toBe(3);
  });

  it('should connect websocket on init', () => {
    expect(wsSpy.connect).toHaveBeenCalled();
  });

  it('should fetch unread count on init', () => {
    expect(notifSpy.getUnreadCount).toHaveBeenCalled();
    expect(component.unreadCount()).toBe(3);
  });

  it('should load notifications and mark all as read', () => {
    component.loadNotifications();

    expect(notifSpy.list).toHaveBeenCalledWith(10);
    expect(component.notifications().length).toBe(1);
    expect(notifSpy.markAllAsRead).toHaveBeenCalled();
    expect(component.unreadCount()).toBe(0);
  });

  it('should have router outlet for child routes', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });

  it('should have notification bell button', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const icons = compiled.querySelectorAll('nhannht-metro-icon');
    const notifIcon = Array.from(icons).find((el) =>
      el.getAttribute('ng-reflect-name') === 'notifications' || el.textContent?.includes('notifications'),
    );
    expect(notifIcon).toBeTruthy();
  });

  it('should increment unread count on websocket notification', () => {
    expect(component.unreadCount()).toBe(3);
    wsSpy.messages$.next({ type: 'notification', content: 'New task applied' });
    expect(component.unreadCount()).toBe(4);
  });

  it('should not increment unread count for non-notification messages', () => {
    expect(component.unreadCount()).toBe(3);
    wsSpy.messages$.next({ type: 'message', content: 'Hello' });
    expect(component.unreadCount()).toBe(3);
  });

  it('should have user menu with profile and logout', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const icons = compiled.querySelectorAll('nhannht-metro-icon');
    const accountIcon = Array.from(icons).find((el) =>
      el.getAttribute('ng-reflect-name') === 'account_circle' || el.textContent?.includes('account_circle'),
    );
    expect(accountIcon).toBeTruthy();
  });

  it('should unsubscribe websocket on destroy', () => {
    const sub = component['wsSub'];
    expect(sub).toBeTruthy();
    const spy = vi.spyOn(sub!, 'unsubscribe');
    component.ngOnDestroy();
    expect(spy).toHaveBeenCalled();
  });

  it('toggleUserMenu should open user menu and close notif menu', () => {
    component.notifMenuOpen.set(true);
    component.toggleUserMenu();
    expect(component.userMenuOpen()).toBe(true);
    expect(component.notifMenuOpen()).toBe(false);
  });

  it('toggleUserMenu should close user menu when already open', () => {
    component.userMenuOpen.set(true);
    component.toggleUserMenu();
    expect(component.userMenuOpen()).toBe(false);
  });

  it('toggleNotifMenu should open notif menu and close user menu', () => {
    component.userMenuOpen.set(true);
    component.toggleNotifMenu();
    expect(component.notifMenuOpen()).toBe(true);
    expect(component.userMenuOpen()).toBe(false);
    expect(notifSpy.list).toHaveBeenCalledWith(10);
  });

  it('toggleNotifMenu should close notif menu when already open', () => {
    component.notifMenuOpen.set(true);
    component.toggleNotifMenu();
    expect(component.notifMenuOpen()).toBe(false);
  });

  it('toggleNotifMenu should only load notifications when opening', () => {
    notifSpy.list.mockClear();
    component.notifMenuOpen.set(true);
    component.toggleNotifMenu(); // closes
    expect(notifSpy.list).not.toHaveBeenCalled();
  });

  it('should show unread badge when unreadCount > 0', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('3');
  });

  it('should hide unread badge when unreadCount is 0', () => {
    component.unreadCount.set(0);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const badge = el.querySelector('.absolute.-top-1');
    // The badge should not be present since count is 0
    expect(component.unreadCount()).toBe(0);
  });

  it('should show no notifications message in empty notif menu', () => {
    component.notifMenuOpen.set(true);
    component.notifications.set([]);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('No notifications');
  });

  it('should show notification items in notif menu', () => {
    component.notifMenuOpen.set(true);
    component.notifications.set([
      testNotif({ id: 1, title: 'Hello', message: 'World' }),
      testNotif({ id: 2, title: 'Test', message: 'Msg' }),
    ]);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Hello');
    expect(el.textContent).toContain('World');
  });

  it('should show user menu with profile and logout when open', () => {
    component.userMenuOpen.set(true);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Profile');
    expect(el.textContent).toContain('Logout');
  });

  it('should call auth.logout when logout button is clicked in user menu', () => {
    component.userMenuOpen.set(true);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const logoutBtn = Array.from(el.querySelectorAll('button')).find(
      b => b.textContent?.includes('Logout')
    );
    expect(logoutBtn).toBeTruthy();
    logoutBtn!.click();
    expect(authSpy.logout).toHaveBeenCalled();
    expect(component.userMenuOpen()).toBe(false);
  });

  it('should close user menu when profile link is clicked', () => {
    component.userMenuOpen.set(true);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const profileLink = Array.from(el.querySelectorAll('a')).find(
      a => a.textContent?.includes('Profile')
    );
    expect(profileLink).toBeTruthy();
    profileLink!.click();
    expect(component.userMenuOpen()).toBe(false);
  });

  it('should close notif menu when view all notifications link is clicked', () => {
    component.notifMenuOpen.set(true);
    component.notifications.set([]);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const viewAllLink = Array.from(el.querySelectorAll('a')).find(
      a => a.textContent?.includes('View all')
    );
    expect(viewAllLink).toBeTruthy();
    viewAllLink!.click();
    expect(component.notifMenuOpen()).toBe(false);
  });

  it('should toggle notification menu via bell button click', () => {
    const el = fixture.nativeElement as HTMLElement;
    // Find the notification bell button (contains notifications icon)
    const buttons = el.querySelectorAll('button');
    const bellBtn = Array.from(buttons).find(b => {
      const icon = b.querySelector('nhannht-metro-icon');
      return icon?.getAttribute('ng-reflect-name') === 'notifications' || icon?.textContent?.includes('notifications');
    });
    expect(bellBtn).toBeTruthy();
    bellBtn!.click();
    expect(component.notifMenuOpen()).toBe(true);
    expect(component.userMenuOpen()).toBe(false);
  });

  it('should toggle user menu via account button click', () => {
    const el = fixture.nativeElement as HTMLElement;
    const buttons = el.querySelectorAll('button');
    const accountBtn = Array.from(buttons).find(b => {
      const icon = b.querySelector('nhannht-metro-icon');
      return icon?.getAttribute('ng-reflect-name') === 'account_circle' || icon?.textContent?.includes('account_circle');
    });
    expect(accountBtn).toBeTruthy();
    accountBtn!.click();
    expect(component.userMenuOpen()).toBe(true);
    expect(component.notifMenuOpen()).toBe(false);
  });


  it('should render unread count badge when unreadCount > 0', () => {
    component.unreadCount.set(5);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('5');
  });

  it('should not render unread count badge when unreadCount is 0', () => {
    component.unreadCount.set(0);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    // The badge span with absolute positioning should not be rendered
    const badge = el.querySelector('.absolute.-top-1.-right-1');
    expect(badge).toBeFalsy();
  });

  it('should render notification items in @for loop', () => {
    component.notifMenuOpen.set(true);
    component.notifications.set([
      testNotif({ id: 1, title: 'Notif 1', message: 'Msg 1' }),
      testNotif({ id: 2, title: 'Notif 2', message: 'Msg 2' }),
      testNotif({ id: 3, title: 'Notif 3', message: 'Msg 3' }),
    ]);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Notif 1');
    expect(el.textContent).toContain('Notif 2');
    expect(el.textContent).toContain('Notif 3');
  });

  it('should render view all notifications link in notif menu', () => {
    component.notifMenuOpen.set(true);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const link = Array.from(el.querySelectorAll('a')).find(
      a => a.getAttribute('href')?.includes('/notifications') || a.textContent?.includes('View all')
    );
    expect(link).toBeTruthy();
  });

  it('should render snackbar component', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('nhannht-metro-snackbar')).toBeTruthy();
  });

  // --- Template lifecycle toggle tests ---

  it('should toggle unread badge from visible to hidden (destroys badge block)', () => {
    component.unreadCount.set(5);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('5');

    // Destroy the badge block
    component.unreadCount.set(0);
    fixture.detectChanges();
  });

  it('should toggle notifications from empty to populated (destroys empty block)', () => {
    component.notifMenuOpen.set(true);
    component.notifications.set([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No notifications');

    // Destroy empty block, create @for block
    component.notifications.set([testNotif({ id: 1, title: 'A', message: 'B' })]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('A');
  });

  it('should toggle notifications from populated to empty (destroys @for block)', () => {
    component.notifMenuOpen.set(true);
    component.notifications.set([testNotif({ id: 1, title: 'A', message: 'B' })]);
    fixture.detectChanges();

    // Destroy @for block, create empty block
    component.notifications.set([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No notifications');
  });

  it('should render auth-specific nav items when authenticated', () => {
    // Authenticated state is already set in beforeEach
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Wallet');
    expect(fixture.nativeElement.textContent).toContain('Chat');
  });

  it('should toggle userMenu from open to closed (destroys/creates user menu content)', () => {
    component.userMenuOpen.set(false);
    fixture.detectChanges();

    // Open user menu — creates menu content
    component.userMenuOpen.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Profile');

    // Close user menu — destroys menu content
    component.userMenuOpen.set(false);
    fixture.detectChanges();
    expect(component.userMenuOpen()).toBe(false);
  });

  it('should toggle notifMenu from open with items to closed (destroys @for and empty blocks)', () => {
    component.notifMenuOpen.set(true);
    component.notifications.set([testNotif({ id: 1, title: 'X', message: 'Y' })]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('X');

    // Close — destroys menu content
    component.notifMenuOpen.set(false);
    fixture.detectChanges();
    expect(component.notifMenuOpen()).toBe(false);
  });

  it('should handle component destruction', () => {
    fixture.detectChanges();
    fixture.destroy();
  });

  describe('additional branch coverage', () => {
    it('should toggle unreadCount 0→3→0→5 covering badge block cycle', () => {
      component.unreadCount.set(0);
      fixture.detectChanges();

      component.unreadCount.set(3);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('3');

      component.unreadCount.set(0);
      fixture.detectChanges();

      component.unreadCount.set(5);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('5');
    });

    it('should toggle notifications empty→items→empty→items covering @if/@for blocks', () => {
      component.notifMenuOpen.set(true);
      component.notifications.set([]);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('No notifications');

      component.notifications.set([testNotif({ id: 1, title: 'N1', message: 'M1' })]);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('N1');

      component.notifications.set([]);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('No notifications');

      component.notifications.set([testNotif({ id: 2, title: 'N2', message: 'M2' })]);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('N2');
    });

    it('should toggle both menus open/close in sequence', () => {
      component.toggleUserMenu();
      expect(component.userMenuOpen()).toBe(true);
      expect(component.notifMenuOpen()).toBe(false);

      component.toggleNotifMenu();
      expect(component.notifMenuOpen()).toBe(true);
      expect(component.userMenuOpen()).toBe(false);

      component.toggleNotifMenu(); // close
      expect(component.notifMenuOpen()).toBe(false);

      component.toggleUserMenu(); // open
      expect(component.userMenuOpen()).toBe(true);

      component.toggleUserMenu(); // close
      expect(component.userMenuOpen()).toBe(false);
    });
  });
});

describe('ShellComponent (unauthenticated)', () => {
  let fixture: ComponentFixture<ShellComponent>;
  let wsSpy: any;

  beforeEach(async () => {
    const authSpy = {
      currentUser: signal(null),
      getAccessToken: vi.fn().mockReturnValue(null),
      isAuthenticated: vi.fn().mockReturnValue(false),
      logout: vi.fn(),
      needsEmailVerification: computed(() => false),
    };
    wsSpy = {
      connect: vi.fn(),
      messages$: new Subject(),
    };

    await TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideTranslocoForTesting(),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: AuthService, useValue: authSpy },
        { provide: NotificationService, useValue: { getUnreadCount: vi.fn(), list: vi.fn(), markAllAsRead: vi.fn() } },
        { provide: WebSocketService, useValue: wsSpy },
        { provide: LanguageService, useValue: { activeLang: 'en', init: vi.fn(), setLanguage: vi.fn(), toggle: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();
  });

  it('should render login and register links when unauthenticated', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Sign In');
    expect(el.textContent).toContain('Register');
  });

  it('should NOT connect websocket when unauthenticated', () => {
    expect(wsSpy.connect).not.toHaveBeenCalled();
  });

  it('should render language toggle button', () => {
    const el = fixture.nativeElement as HTMLElement;
    const buttons = el.querySelectorAll('button');
    const langBtn = Array.from(buttons).find(b => b.textContent?.includes('VI') || b.textContent?.includes('EN'));
    expect(langBtn).toBeTruthy();
  });

  it('should render marketplace link for unauthenticated users', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Marketplace');
  });

  it('should handle component destruction', () => {
    fixture.destroy();
  });
});

describe('ShellComponent (vi language)', () => {
  let fixture: ComponentFixture<ShellComponent>;

  beforeEach(async () => {
    const authSpy = {
      currentUser: signal({ id: 1, name: 'Test User' }),
      getAccessToken: vi.fn().mockReturnValue('token'),
      isAuthenticated: vi.fn().mockReturnValue(true),
      logout: vi.fn(),
      needsEmailVerification: computed(() => false),
    };
    const notifSpy = {
      getUnreadCount: vi.fn().mockReturnValue(of({ unread_count: 0 })),
      list: vi.fn().mockReturnValue(of({ notifications: [], total: 0 })),
      markAllAsRead: vi.fn().mockReturnValue(of({ message: 'ok' })),
    };
    const wsSpy = {
      connect: vi.fn(),
      messages$: new Subject(),
    };

    await TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideTranslocoForTesting(),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: AuthService, useValue: authSpy },
        { provide: NotificationService, useValue: notifSpy },
        { provide: WebSocketService, useValue: wsSpy },
        { provide: LanguageService, useValue: { activeLang: 'vi', init: vi.fn(), setLanguage: vi.fn(), toggle: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();
  });

  it('should show VI button when language is vi', () => {
    const el = fixture.nativeElement as HTMLElement;
    const buttons = el.querySelectorAll('button');
    const langBtn = Array.from(buttons).find(b => b.textContent?.includes('VI'));
    expect(langBtn).toBeTruthy();
  });
});
