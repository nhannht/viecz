import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(NotificationService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('list', () => {
    it('should fetch notifications with default params', () => {
      const mockResponse = {
        notifications: [{ id: 1, title: 'Test', message: 'Test msg' }],
        total: 1,
      };

      service.list().subscribe((res) => {
        expect(res.notifications.length).toBe(1);
        expect(res.total).toBe(1);
      });

      const req = httpTesting.expectOne(
        (r) => r.url === '/api/v1/notifications' && r.params.get('limit') === '20' && r.params.get('offset') === '0',
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should pass custom limit and offset', () => {
      service.list(10, 5).subscribe();

      const req = httpTesting.expectOne(
        (r) => r.url === '/api/v1/notifications' && r.params.get('limit') === '10' && r.params.get('offset') === '5',
      );
      req.flush({ notifications: [], total: 0 });
    });
  });

  describe('getUnreadCount', () => {
    it('should fetch unread count', () => {
      service.getUnreadCount().subscribe((res) => {
        expect(res.unread_count).toBe(5);
      });

      const req = httpTesting.expectOne('/api/v1/notifications/unread-count');
      expect(req.request.method).toBe('GET');
      req.flush({ unread_count: 5 });
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', () => {
      service.markAsRead(42).subscribe();

      const req = httpTesting.expectOne('/api/v1/notifications/42/read');
      expect(req.request.method).toBe('POST');
      req.flush({ message: 'notification marked as read' });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', () => {
      service.markAllAsRead().subscribe();

      const req = httpTesting.expectOne('/api/v1/notifications/read-all');
      expect(req.request.method).toBe('POST');
      req.flush({ message: 'all notifications marked as read' });
    });
  });

  describe('remove', () => {
    it('should delete a notification', () => {
      service.remove(7).subscribe();

      const req = httpTesting.expectOne('/api/v1/notifications/7');
      expect(req.request.method).toBe('DELETE');
      req.flush({ message: 'notification deleted' });
    });
  });
});
