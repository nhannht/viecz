import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationService } from './application.service';
import { TaskApplication } from './models';

const mockApplication: TaskApplication = {
  id: 1,
  task_id: 10,
  tasker_id: 2,
  proposed_price: 18000,
  message: 'I can do it',
  status: 'pending',
  created_at: '2026-02-14T10:30:00Z',
  updated_at: '2026-02-14T10:30:00Z',
};

const mockApplicationList: TaskApplication[] = [
  mockApplication,
  {
    id: 2,
    task_id: 10,
    tasker_id: 3,
    proposed_price: 15000,
    message: 'Happy to help',
    status: 'pending',
    created_at: '2026-02-14T11:00:00Z',
    updated_at: '2026-02-14T11:00:00Z',
  },
];

describe('ApplicationService', () => {
  let service: ApplicationService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ApplicationService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('apply()', () => {
    it('should POST to /api/v1/tasks/:taskId/applications with body', () => {
      const body = { proposed_price: 18000, message: 'I can do it' };
      service.apply(10, body).subscribe();
      const req = httpTesting.expectOne('/api/v1/tasks/10/applications');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(body);
      req.flush(mockApplication);
    });

    it('should send body with only proposed_price', () => {
      const body = { proposed_price: 25000 };
      service.apply(5, body).subscribe();
      const req = httpTesting.expectOne('/api/v1/tasks/5/applications');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(body);
      req.flush({ ...mockApplication, proposed_price: 25000, task_id: 5 });
    });

    it('should send body with only message', () => {
      const body = { message: 'Interested in this task' };
      service.apply(7, body).subscribe();
      const req = httpTesting.expectOne('/api/v1/tasks/7/applications');
      expect(req.request.body).toEqual(body);
      req.flush({ ...mockApplication, message: body.message, task_id: 7 });
    });

    it('should send empty body when no optional fields provided', () => {
      const body = {};
      service.apply(3, body).subscribe();
      const req = httpTesting.expectOne('/api/v1/tasks/3/applications');
      expect(req.request.body).toEqual({});
      req.flush({ ...mockApplication, task_id: 3 });
    });

    it('should return the created application', () => {
      const spy = vi.fn();
      const body = { proposed_price: 18000, message: 'I can do it' };
      service.apply(10, body).subscribe(spy);
      httpTesting.expectOne('/api/v1/tasks/10/applications').flush(mockApplication);
      expect(spy).toHaveBeenCalledWith(mockApplication);
    });

    it('should propagate HTTP errors on apply', () => {
      const errorSpy = vi.fn();
      service.apply(10, { message: 'test' }).subscribe({ error: errorSpy });
      httpTesting.expectOne('/api/v1/tasks/10/applications').flush(
        { error: 'insufficient balance' },
        { status: 400, statusText: 'Bad Request' },
      );
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('getForTask()', () => {
    it('should GET /api/v1/tasks/:taskId/applications', () => {
      service.getForTask(10).subscribe();
      const req = httpTesting.expectOne('/api/v1/tasks/10/applications');
      expect(req.request.method).toBe('GET');
      req.flush(mockApplicationList);
    });

    it('should return the application list', () => {
      const spy = vi.fn();
      service.getForTask(10).subscribe(spy);
      httpTesting.expectOne('/api/v1/tasks/10/applications').flush(mockApplicationList);
      expect(spy).toHaveBeenCalledWith(mockApplicationList);
    });

    it('should return empty array when no applications exist', () => {
      const spy = vi.fn();
      service.getForTask(99).subscribe(spy);
      httpTesting.expectOne('/api/v1/tasks/99/applications').flush([]);
      expect(spy).toHaveBeenCalledWith([]);
    });

    it('should propagate HTTP errors on getForTask', () => {
      const errorSpy = vi.fn();
      service.getForTask(999).subscribe({ error: errorSpy });
      httpTesting.expectOne('/api/v1/tasks/999/applications').flush(
        { error: 'task not found' },
        { status: 404, statusText: 'Not Found' },
      );
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('accept()', () => {
    it('should POST to /api/v1/applications/:applicationId/accept', () => {
      service.accept(1).subscribe();
      const req = httpTesting.expectOne('/api/v1/applications/1/accept');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush({ message: 'application accepted successfully' });
    });

    it('should return the success message', () => {
      const spy = vi.fn();
      service.accept(1).subscribe(spy);
      httpTesting.expectOne('/api/v1/applications/1/accept').flush({ message: 'application accepted successfully' });
      expect(spy).toHaveBeenCalledWith({ message: 'application accepted successfully' });
    });

    it('should use correct application ID in URL', () => {
      service.accept(42).subscribe();
      const req = httpTesting.expectOne('/api/v1/applications/42/accept');
      expect(req.request.method).toBe('POST');
      req.flush({ message: 'application accepted successfully' });
    });

    it('should propagate HTTP errors on accept', () => {
      const errorSpy = vi.fn();
      service.accept(999).subscribe({ error: errorSpy });
      httpTesting.expectOne('/api/v1/applications/999/accept').flush(
        { error: 'application not found' },
        { status: 404, statusText: 'Not Found' },
      );
      expect(errorSpy).toHaveBeenCalled();
    });

    it('should propagate 403 when user is not authorized to accept', () => {
      const errorSpy = vi.fn();
      service.accept(5).subscribe({ error: errorSpy });
      httpTesting.expectOne('/api/v1/applications/5/accept').flush(
        { error: 'not authorized to accept this application' },
        { status: 403, statusText: 'Forbidden' },
      );
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should propagate 401 Unauthorized', () => {
      const errorSpy = vi.fn();
      service.apply(1, { message: 'test' }).subscribe({ error: errorSpy });
      httpTesting.expectOne('/api/v1/tasks/1/applications').flush(
        { error: 'unauthorized' },
        { status: 401, statusText: 'Unauthorized' },
      );
      expect(errorSpy).toHaveBeenCalled();
    });

    it('should propagate 500 Internal Server Error', () => {
      const errorSpy = vi.fn();
      service.getForTask(1).subscribe({ error: errorSpy });
      httpTesting.expectOne('/api/v1/tasks/1/applications').flush(
        { error: 'internal server error' },
        { status: 500, statusText: 'Internal Server Error' },
      );
      expect(errorSpy).toHaveBeenCalled();
    });
  });
});
