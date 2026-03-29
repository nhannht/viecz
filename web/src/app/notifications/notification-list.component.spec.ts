import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { NotificationListComponent } from './notification-list.component';
import { NotificationService } from '../core/notification.service';
import { Notification } from '../core/models';
import { provideTranslocoForTesting } from '../core/transloco-testing';

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
        provideTranslocoForTesting(),
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

  it('retryLoad should reset offset and reload', () => {
    component.offset = 40;
    notifSpy.list.mockClear();
    component.retryLoad();
    expect(component.offset).toBe(0);
    expect(notifSpy.list).toHaveBeenCalledWith(20, 0);
  });

  it('should set error state on load failure', () => {
    notifSpy.list.mockReturnValue(throwError(() => new Error('fail')));
    component.load();
    expect(component.error()).toBe(true);
  });

  it('should append notifications on loadMore (non-zero offset)', () => {
    // Set up initial notifications
    component.notifications.set(mockNotifications);
    component.total.set(50);
    const moreNotifications: Notification[] = [
      { id: 3, user_id: 1, type: 'message', title: 'New', message: 'new one', is_read: false, created_at: new Date().toISOString() },
    ];
    notifSpy.list.mockReturnValue(of({ notifications: moreNotifications, total: 50 }));
    component.loadMore();
    expect(component.notifications().length).toBe(3);
  });

  it('should return all type icons', () => {
    expect(component.getTypeIcon('application_accepted')).toBe('check_circle');
    expect(component.getTypeIcon('application_rejected')).toBe('cancel');
    expect(component.getTypeIcon('message')).toBe('chat');
    expect(component.getTypeIcon('task_cancelled')).toBe('block');
  });

  it('should render loading spinner when loading is true', () => {
    component.loading.set(true);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('viecz-spinner')).toBeTruthy();
  });

  it('should render error fallback when error is true', () => {
    component.loading.set(false);
    component.error.set(true);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-error-fallback')).toBeTruthy();
  });

  it('should render notification list with dividers', () => {
    const el = fixture.nativeElement as HTMLElement;
    const dividers = el.querySelectorAll('viecz-divider');
    expect(dividers.length).toBe(2); // one per notification
  });

  it('should render delete buttons for each notification', () => {
    const el = fixture.nativeElement as HTMLElement;
    const deleteButtons = el.querySelectorAll('.delete-btn');
    expect(deleteButtons.length).toBe(2);
  });

  it('should not render mark all read button when no notifications', () => {
    component.notifications.set([]);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    // The "Mark all read" button only shows when notifications().length > 0
    expect(el.textContent).not.toContain('Mark all read');
  });

  it('should render mark all read button when notifications exist', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Mark all read');
  });

  it('should update notification to read after click', () => {
    const unread = component.notifications()[0];
    expect(unread.is_read).toBe(false);
    component.onNotificationClick(unread);
    const updated = component.notifications().find(n => n.id === unread.id);
    expect(updated?.is_read).toBe(true);
  });

  it('hasMore should be false when notifications length equals total', () => {
    expect(component.notifications().length).toBe(2);
    expect(component.total()).toBe(2);
    expect(component.hasMore()).toBe(false);
  });

  it('hasMore should be true when total exceeds notifications length', () => {
    component.total.set(10);
    expect(component.hasMore()).toBe(true);
  });

  it('should not render load more button when hasMore is false', () => {
    component.total.set(2); // matches length
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).not.toContain('Load More');
  });

  describe('Template branch coverage', () => {
    it('should toggle from loading to notifications list (destroys spinner block)', () => {
      component.loading.set(true);
      component.notifications.set([]);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('viecz-spinner')).toBeTruthy();

      // Switch to loaded with notifications — destroys spinner, creates @for block
      component.loading.set(false);
      component.notifications.set(mockNotifications);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('viecz-spinner')).toBeFalsy();
      expect(fixture.nativeElement.textContent).toContain('New Application');
    });

    it('should toggle from loading to error state (destroys spinner, creates error block)', () => {
      component.loading.set(true);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('viecz-spinner')).toBeTruthy();

      // Switch to error
      component.loading.set(false);
      component.error.set(true);
      component.notifications.set([]);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('app-error-fallback')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('viecz-spinner')).toBeFalsy();
    });

    it('should toggle from error to empty state (destroys error block, creates empty block)', () => {
      component.error.set(true);
      component.loading.set(false);
      component.notifications.set([]);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('app-error-fallback')).toBeTruthy();

      // Clear error — destroys error block, creates empty state block
      component.error.set(false);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('app-error-fallback')).toBeFalsy();
      expect(fixture.nativeElement.querySelector('app-empty-state')).toBeTruthy();
    });

    it('should toggle from empty to notifications list (destroys empty state block)', () => {
      component.loading.set(false);
      component.error.set(false);
      component.notifications.set([]);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('app-empty-state')).toBeTruthy();

      // Add notifications — destroys empty state block, creates @for block
      component.notifications.set(mockNotifications);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('app-empty-state')).toBeFalsy();
      expect(fixture.nativeElement.textContent).toContain('New Application');
    });

    it('should toggle from notifications list to empty state (destroys @for block)', () => {
      component.loading.set(false);
      component.error.set(false);
      component.notifications.set(mockNotifications);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('New Application');

      // Clear notifications — destroys @for block, creates empty state block
      component.notifications.set([]);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('app-empty-state')).toBeTruthy();
    });

    it('should toggle hasMore load more button from hidden to visible (destroys/creates button)', () => {
      component.loading.set(false);
      component.error.set(false);
      component.notifications.set(mockNotifications);
      component.total.set(2); // hasMore = false
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).not.toContain('Load More');

      // Make hasMore true — creates load more button block
      component.total.set(50);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Load More');
    });

    it('should toggle hasMore from visible to hidden (destroys load more button block)', () => {
      component.loading.set(false);
      component.error.set(false);
      component.notifications.set(mockNotifications);
      component.total.set(50); // hasMore = true
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Load More');

      // Make hasMore false — destroys load more button block
      component.total.set(2);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).not.toContain('Load More');
    });

    it('should toggle mark all read button visibility (destroys/creates button block)', () => {
      component.notifications.set([]);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).not.toContain('Mark all read');

      // Add notifications — creates mark all read button
      component.notifications.set(mockNotifications);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Mark all read');

      // Remove — destroys button
      component.notifications.set([]);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).not.toContain('Mark all read');
    });
  });
});
