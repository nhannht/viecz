import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { PLATFORM_ID, signal } from '@angular/core';
import { of } from 'rxjs';
import { ShellComponent } from './shell.component';
import { AuthService } from '../core/auth.service';
import { NotificationService } from '../core/notification.service';
import { WebSocketService } from '../core/websocket.service';

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
      logout: vi.fn(),
    };
    notifSpy = {
      getUnreadCount: vi.fn().mockReturnValue(of({ unread_count: 3 })),
      list: vi.fn().mockReturnValue(
        of({
          notifications: [
            { id: 1, title: 'Test', message: 'Test notification' },
          ],
          total: 1,
        }),
      ),
      markAllAsRead: vi.fn().mockReturnValue(of({ message: 'ok' })),
    };
    wsSpy = {
      connect: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideAnimationsAsync(),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: AuthService, useValue: authSpy },
        { provide: NotificationService, useValue: notifSpy },
        { provide: WebSocketService, useValue: wsSpy },
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
    const icons = compiled.querySelectorAll('mat-icon');
    const notifIcon = Array.from(icons).find((el) =>
      el.textContent?.includes('notifications'),
    );
    expect(notifIcon).toBeTruthy();
  });

  it('should have user menu with profile and logout', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const icons = compiled.querySelectorAll('mat-icon');
    const accountIcon = Array.from(icons).find((el) =>
      el.textContent?.includes('account_circle'),
    );
    expect(accountIcon).toBeTruthy();
  });
});
