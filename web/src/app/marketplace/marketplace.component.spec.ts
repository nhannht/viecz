import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MarketplaceComponent, MINIMUM_LOADING_MS } from './marketplace.component';
import { Task, TaskListResponse } from '../core/models';

const mockTask: Task = {
  id: 1,
  requester_id: 1,
  category_id: 2,
  title: 'Deliver lunch',
  description: 'Need help',
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

describe('MarketplaceComponent', () => {
  let component: MarketplaceComponent;
  let fixture: ComponentFixture<MarketplaceComponent>;
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MarketplaceComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync(),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: MINIMUM_LOADING_MS, useValue: 0 },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MarketplaceComponent);
    component = fixture.componentInstance;
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load tasks on init', () => {
    fixture.detectChanges();

    const catReq = httpTesting.match('/api/v1/categories');
    catReq.forEach(r => r.flush([]));

    const req = httpTesting.expectOne(r => r.url === '/api/v1/tasks');
    expect(req.request.method).toBe('GET');
    req.flush(mockTaskList);

    expect(component.tasks().length).toBe(1);
    expect(component.total()).toBe(1);
  });

  it('should set loading to false after tasks load', () => {
    fixture.detectChanges();
    httpTesting.match('/api/v1/categories').forEach(r => r.flush([]));
    const req = httpTesting.expectOne(r => r.url === '/api/v1/tasks');
    req.flush(mockTaskList);

    expect(component.loading()).toBe(false);
  });

  it('should set loading to false on error', () => {
    fixture.detectChanges();
    httpTesting.match('/api/v1/categories').forEach(r => r.flush([]));
    const req = httpTesting.expectOne(r => r.url === '/api/v1/tasks');
    req.flush(null, { status: 500, statusText: 'Server Error' });

    expect(component.loading()).toBe(false);
  });

  it('should reset page and reload on search', () => {
    fixture.detectChanges();
    httpTesting.match('/api/v1/categories').forEach(r => r.flush([]));
    httpTesting.expectOne(r => r.url === '/api/v1/tasks').flush(mockTaskList);

    component.search = 'lunch';
    component.onSearch();

    const req = httpTesting.expectOne(r => r.url === '/api/v1/tasks');
    expect(req.request.params.get('search')).toBe('lunch');
    req.flush(mockTaskList);
  });

  it('should reset page and reload on category change', () => {
    fixture.detectChanges();
    httpTesting.match('/api/v1/categories').forEach(r => r.flush([]));
    httpTesting.expectOne(r => r.url === '/api/v1/tasks').flush(mockTaskList);

    component.onCategoryChange(2);

    const req = httpTesting.expectOne(r => r.url === '/api/v1/tasks');
    expect(req.request.params.get('category_id')).toBe('2');
    req.flush(mockTaskList);
    expect(component.selectedCategory).toBe(2);
  });

  it('should show empty state when no tasks', () => {
    fixture.detectChanges();
    httpTesting.match('/api/v1/categories').forEach(r => r.flush([]));
    httpTesting.expectOne(r => r.url === '/api/v1/tasks').flush({ data: [], total: 0, page: 1, limit: 20 });
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('No tasks found');
  });

  it('should compute hasMore correctly', () => {
    fixture.detectChanges();
    httpTesting.match('/api/v1/categories').forEach(r => r.flush([]));

    httpTesting.expectOne(r => r.url === '/api/v1/tasks').flush({
      data: [mockTask],
      total: 1,
      page: 1,
      limit: 20,
    });
    expect(component.hasMore()).toBe(false);
  });

  it('should show "No more tasks" when hasMore is false', () => {
    fixture.detectChanges();
    httpTesting.match('/api/v1/categories').forEach(r => r.flush([]));
    httpTesting.expectOne(r => r.url === '/api/v1/tasks').flush(mockTaskList);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('No more tasks');
  });
});
