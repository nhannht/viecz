import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TaskService } from './task.service';
import { Task, TaskListResponse, TaskApplication } from './models';

const mockTask: Task = {
  id: 1,
  requester_id: 1,
  category_id: 2,
  title: 'Deliver lunch',
  description: 'Need help delivering lunch',
  price: 20000,
  location: 'Cafeteria',
  status: 'open',
  created_at: '2026-02-14T10:00:00Z',
  updated_at: '2026-02-14T10:00:00Z',
};

const mockTaskList: TaskListResponse = {
  data: [mockTask],
  total: 1,
  page: 1,
  limit: 20,
};

const mockApplication: TaskApplication = {
  id: 1,
  task_id: 1,
  tasker_id: 2,
  proposed_price: 18000,
  message: 'I can do it',
  status: 'pending',
  created_at: '2026-02-14T10:30:00Z',
  updated_at: '2026-02-14T10:30:00Z',
};

describe('TaskService', () => {
  let service: TaskService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TaskService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('list()', () => {
    it('should GET /api/v1/tasks with no params', () => {
      service.list().subscribe();
      const req = httpTesting.expectOne('/api/v1/tasks');
      expect(req.request.method).toBe('GET');
      req.flush(mockTaskList);
    });

    it('should pass query params when provided', () => {
      service.list({ search: 'lunch', category_id: 2, page: 1, limit: 20 }).subscribe();
      const req = httpTesting.expectOne(r => r.url === '/api/v1/tasks');
      expect(req.request.params.get('search')).toBe('lunch');
      expect(req.request.params.get('category_id')).toBe('2');
      expect(req.request.params.get('page')).toBe('1');
      expect(req.request.params.get('limit')).toBe('20');
      req.flush(mockTaskList);
    });

    it('should skip undefined/null/empty params', () => {
      service.list({ search: '', category_id: undefined, page: 1 }).subscribe();
      const req = httpTesting.expectOne(r => r.url === '/api/v1/tasks');
      expect(req.request.params.has('search')).toBe(false);
      expect(req.request.params.has('category_id')).toBe(false);
      expect(req.request.params.get('page')).toBe('1');
      req.flush(mockTaskList);
    });

    it('should return task list response', () => {
      const spy = vi.fn();
      service.list().subscribe(spy);
      httpTesting.expectOne('/api/v1/tasks').flush(mockTaskList);
      expect(spy).toHaveBeenCalledWith(mockTaskList);
    });
  });

  describe('get()', () => {
    it('should GET /api/v1/tasks/:id', () => {
      service.get(1).subscribe();
      const req = httpTesting.expectOne('/api/v1/tasks/1');
      expect(req.request.method).toBe('GET');
      req.flush(mockTask);
    });

    it('should return the task', () => {
      const spy = vi.fn();
      service.get(1).subscribe(spy);
      httpTesting.expectOne('/api/v1/tasks/1').flush(mockTask);
      expect(spy).toHaveBeenCalledWith(mockTask);
    });
  });

  describe('create()', () => {
    it('should POST to /api/v1/tasks', () => {
      const body = { title: 'New task', description: 'Desc', category_id: 1, price: 50000, location: 'Here' };
      service.create(body).subscribe();
      const req = httpTesting.expectOne('/api/v1/tasks');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(body);
      req.flush({ ...mockTask, ...body });
    });
  });

  describe('update()', () => {
    it('should PUT to /api/v1/tasks/:id', () => {
      const body = { title: 'Updated' };
      service.update(1, body).subscribe();
      const req = httpTesting.expectOne('/api/v1/tasks/1');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(body);
      req.flush({ ...mockTask, ...body });
    });
  });

  describe('delete()', () => {
    it('should DELETE /api/v1/tasks/:id', () => {
      service.delete(1).subscribe();
      const req = httpTesting.expectOne('/api/v1/tasks/1');
      expect(req.request.method).toBe('DELETE');
      req.flush({ message: 'task cancelled successfully' });
    });

    it('should return the message', () => {
      const spy = vi.fn();
      service.delete(1).subscribe(spy);
      httpTesting.expectOne('/api/v1/tasks/1').flush({ message: 'task cancelled successfully' });
      expect(spy).toHaveBeenCalledWith({ message: 'task cancelled successfully' });
    });
  });

  describe('apply()', () => {
    it('should POST to /api/v1/tasks/:id/applications', () => {
      const body = { proposed_price: 18000, message: 'I can do it' };
      service.apply(1, body).subscribe();
      const req = httpTesting.expectOne('/api/v1/tasks/1/applications');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(body);
      req.flush(mockApplication);
    });
  });

  describe('getApplications()', () => {
    it('should GET /api/v1/tasks/:id/applications', () => {
      service.getApplications(1).subscribe();
      const req = httpTesting.expectOne('/api/v1/tasks/1/applications');
      expect(req.request.method).toBe('GET');
      req.flush([mockApplication]);
    });
  });

  describe('acceptApplication()', () => {
    it('should POST to /api/v1/applications/:id/accept', () => {
      service.acceptApplication(1).subscribe();
      const req = httpTesting.expectOne('/api/v1/applications/1/accept');
      expect(req.request.method).toBe('POST');
      req.flush({ message: 'application accepted successfully' });
    });
  });

  describe('complete()', () => {
    it('should POST to /api/v1/tasks/:id/complete', () => {
      service.complete(1).subscribe();
      const req = httpTesting.expectOne('/api/v1/tasks/1/complete');
      expect(req.request.method).toBe('POST');
      req.flush({ message: 'task completed successfully' });
    });
  });

  describe('error handling', () => {
    it('should propagate HTTP errors', () => {
      const errorSpy = vi.fn();
      service.get(999).subscribe({ error: errorSpy });
      httpTesting.expectOne('/api/v1/tasks/999').flush(
        { error: 'Task not found' },
        { status: 404, statusText: 'Not Found' },
      );
      expect(errorSpy).toHaveBeenCalled();
    });
  });
});
