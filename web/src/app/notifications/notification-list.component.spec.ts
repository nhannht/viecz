import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { of, throwError } from 'rxjs';
import { NotificationListComponent } from './notification-list.component';
import { NotificationService } from '../core/notification.service';
import { Notification } from '../core/models';

const mockNotifications: Notification[] = [
  {
    id: 1, user_id: 1, type: 'application_received', title: 'New Application',
    message: 'Someone applied', task_id: 5, is_read: false, created_at: new Date().toISOString(),
  },
  {
    id: 2, user_id: 1, type: 'payment_received', title: 'Payment',
    message: 'You received payment', task_id: 3, is_read: true, created_at: new Date().toISOString(),
  },
];

describe('NotificationListComponent', () => {
  let component: NotificationListComponent;
  let fixture: ComponentFixture<NotificationListComponent>;
  let notifSpy: any;
  let router: Router;

  beforeEach(async () => {
    notifSpy = {
      list: vi.fn().mockReturnValue(of({ notifications: mockNotifications, total: 2 })),
      markAsRead: vi.fn().mockReturnValue(of({ message: 'ok' })),
      markAllAsRead: vi.fn().mockReturnValue(of({ message: 'ok' })),
      remove: vi.fn().mockReturnValue(of({ message: 'ok' })),
    };

    await TestBed.configureTestingModule({
      imports: [NotificationListComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideAnimationsAsync(),
        { provide: NotificationService, useValue: notifSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationListComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load notifications on init', () => {
    expect(notifSpy.list).toHaveBeenCalledWith(20, 0);
    expect(component.notifications().length).toBe(2);
    expect(component.total()).toBe(2);
    expect(component.loading()).toBe(false);
  });

  it('should render notification items', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('New Application');
    expect(el.textContent).toContain('Someone applied');
  });

  it('should highlight unread notifications', () => {
    const el = fixture.nativeElement as HTMLElement;
    const unread = el.querySelectorAll('.notif-item.unread');
    expect(unread.length).toBe(1);
  });

  it('should mark all as read', () => {
    component.markAllRead();
    expect(notifSpy.markAllAsRead).toHaveBeenCalled();
    expect(component.notifications().every(n => n.is_read)).toBe(true);
  });

  it('should mark single notification as read on click', () => {
    const unread = component.notifications()[0];
    component.onNotificationClick(unread);
    expect(notifSpy.markAsRead).toHaveBeenCalledWith(1);
    expect(router.navigate).toHaveBeenCalledWith(['/tasks', 5]);
  });

  it('should not call markAsRead for already read notification', () => {
    const read = component.notifications()[1];
    component.onNotificationClick(read);
    expect(notifSpy.markAsRead).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/tasks', 3]);
  });

  it('should delete notification', () => {
    const event = { stopPropagation: vi.fn() } as any;
    component.deleteNotification(event, 1);
    expect(event.stopPropagation).toHaveBeenCalled();
    expect(notifSpy.remove).toHaveBeenCalledWith(1);
    expect(component.notifications().length).toBe(1);
    expect(component.total()).toBe(1);
  });

  it('should show load more when hasMore', () => {
    notifSpy.list.mockReturnValue(of({ notifications: mockNotifications, total: 50 }));
    component.offset = 0;
    component.load();
    expect(component.hasMore()).toBe(true);
  });

  it('should load more notifications', () => {
    notifSpy.list.mockReturnValue(of({ notifications: [], total: 50 }));
    component.total.set(50);
    component.loadMore();
    expect(component.offset).toBe(20);
    expect(notifSpy.list).toHaveBeenCalledWith(20, 20);
  });

  it('should handle load error', () => {
    notifSpy.list.mockReturnValue(throwError(() => new Error('fail')));
    component.load();
    expect(component.loading()).toBe(false);
  });

  it('should return correct type icons', () => {
    expect(component.getTypeIcon('application_received')).toBe('person_add');
    expect(component.getTypeIcon('payment_received')).toBe('payments');
    expect(component.getTypeIcon('task_completed')).toBe('task_alt');
    expect(component.getTypeIcon('unknown')).toBe('notifications');
  });

  it('should show empty state when no notifications', () => {
    notifSpy.list.mockReturnValue(of({ notifications: [], total: 0 }));
    component.offset = 0;
    component.load();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('No notifications yet');
  });

  it('should not navigate if no task_id', () => {
    const n: Notification = {
      id: 99, user_id: 1, type: 'message', title: 'Test',
      message: 'msg', is_read: true, created_at: new Date().toISOString(),
    };
    component.onNotificationClick(n);
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
