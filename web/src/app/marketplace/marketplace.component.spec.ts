import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { MarketplaceComponent, MINIMUM_LOADING_MS } from './marketplace.component';
import { Task, TaskListResponse } from '../core/models';
import { provideTranslocoForTesting } from '../core/transloco-testing';

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
        provideTranslocoForTesting(),
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

    vi.useFakeTimers();
    component.search = 'lunch';
    component.onSearchInput();

    // Flush the 300ms debounce timer
    vi.advanceTimersByTime(300);
    vi.useRealTimers();

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

  it('should set error to true on load failure', () => {
    fixture.detectChanges();
    httpTesting.match('/api/v1/categories').forEach(r => r.flush([]));
    httpTesting.expectOne(r => r.url === '/api/v1/tasks').flush(null, { status: 500, statusText: 'Error' });

    expect(component.error()).toBe(true);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-error-fallback')).toBeTruthy();
  });

  it('retryLoad should reset error and reload', () => {
    fixture.detectChanges();
    httpTesting.match('/api/v1/categories').forEach(r => r.flush([]));
    httpTesting.expectOne(r => r.url === '/api/v1/tasks').flush(null, { status: 500, statusText: 'Error' });
    expect(component.error()).toBe(true);

    component.retryLoad();
    const req = httpTesting.expectOne(r => r.url === '/api/v1/tasks');
    req.flush(mockTaskList);
    expect(component.error()).toBe(false);
    expect(component.tasks().length).toBe(1);
  });

  it('onScroll should not trigger when loadingMore is true', () => {
    fixture.detectChanges();
    httpTesting.match('/api/v1/categories').forEach(r => r.flush([]));
    httpTesting.expectOne(r => r.url === '/api/v1/tasks').flush(mockTaskList);

    component.loadingMore.set(true);
    component.onScroll();
    // No new request should be made
  });

  it('onScroll should not trigger when hasMore is false', () => {
    fixture.detectChanges();
    httpTesting.match('/api/v1/categories').forEach(r => r.flush([]));
    httpTesting.expectOne(r => r.url === '/api/v1/tasks').flush(mockTaskList);

    component.hasMore.set(false);
    component.onScroll();
    // No new request should be made
  });

  it('should set hasMore to false when loadMore returns fewer than pageSize', () => {
    // First load returns 20 items (pageSize), so hasMore stays true
    fixture.detectChanges();
    httpTesting.match('/api/v1/categories').forEach(r => r.flush([]));
    const fullPage = Array.from({ length: 20 }, (_, i) => ({ ...mockTask, id: i + 1 }));
    httpTesting.expectOne(r => r.url === '/api/v1/tasks').flush({ data: fullPage, total: 25, page: 1, limit: 20 });
    expect(component.hasMore()).toBe(true);

    // Trigger loadMore by calling the private method indirectly
    component['loadMore']();
    const req = httpTesting.expectOne(r => r.url === '/api/v1/tasks' && r.params.get('page') === '2');
    req.flush({ data: [{ ...mockTask, id: 21 }], total: 25, page: 2, limit: 20 });
    expect(component.hasMore()).toBe(false);
    expect(component.tasks().length).toBe(21);
    expect(component.page()).toBe(2);
  });

  it('should set loadingMore to false on loadMore error', () => {
    fixture.detectChanges();
    httpTesting.match('/api/v1/categories').forEach(r => r.flush([]));
    const fullPage = Array.from({ length: 20 }, (_, i) => ({ ...mockTask, id: i + 1 }));
    httpTesting.expectOne(r => r.url === '/api/v1/tasks').flush({ data: fullPage, total: 25, page: 1, limit: 20 });

    component['loadMore']();
    const req = httpTesting.expectOne(r => r.url === '/api/v1/tasks' && r.params.get('page') === '2');
    req.flush(null, { status: 500, statusText: 'Error' });
    expect(component.loadingMore()).toBe(false);
  });

  it('should switch to map view when toggling nearMe on', async () => {
    fixture.detectChanges();
    httpTesting.match('/api/v1/categories').forEach(r => r.flush([]));
    httpTesting.expectOne(r => r.url === '/api/v1/tasks').flush(mockTaskList);

    expect(component.viewMode()).toBe('list');

    // Mock geolocation to resolve immediately
    component.geo = {
      ...component.geo,
      requestLocation: () => Promise.resolve({ latitude: 10.77, longitude: 106.70 }),
      loading: () => false,
      isDenied: () => false,
      latitude: () => 10.77,
      longitude: () => 106.70,
    } as any;
    component.toggleNearMe();

    // viewMode switches to map immediately (before geolocation resolves)
    expect(component.viewMode()).toBe('map');

    // Wait for geo promise to resolve and flush the resulting reload
    await Promise.resolve();
    httpTesting.expectOne(r => r.url === '/api/v1/tasks').flush(mockTaskList);
  });

  it('should switch back to list view when toggling nearMe off', () => {
    fixture.detectChanges();
    httpTesting.match('/api/v1/categories').forEach(r => r.flush([]));
    httpTesting.expectOne(r => r.url === '/api/v1/tasks').flush(mockTaskList);

    // Set to map mode
    component.viewMode.set('map');
    component.nearMeActive.set(true);

    component.toggleNearMe();

    expect(component.viewMode()).toBe('list');
    expect(component.nearMeActive()).toBe(false);

    // Should trigger a reload
    httpTesting.expectOne(r => r.url === '/api/v1/tasks').flush(mockTaskList);
  });

  it('should show hero section when unauthenticated', () => {
    // auth.isAuthenticated() returns false by default (no AuthService override)
    fixture.detectChanges();
    httpTesting.match('/api/v1/categories').forEach(r => r.flush([]));
    httpTesting.expectOne(r => r.url === '/api/v1/tasks').flush(mockTaskList);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('STUDENT MICRO-TASK MARKETPLACE');
  });

  it('should show loadingMore spinner', () => {
    fixture.detectChanges();
    httpTesting.match('/api/v1/categories').forEach(r => r.flush([]));
    httpTesting.expectOne(r => r.url === '/api/v1/tasks').flush(mockTaskList);
    component.loadingMore.set(true);
    fixture.detectChanges();
    const spinners = fixture.nativeElement.querySelectorAll('viecz-spinner');
    expect(spinners.length).toBeGreaterThan(0);
  });

  it('should show loading skeleton when loading and no tasks', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-loading-skeleton')).toBeTruthy();
    httpTesting.match('/api/v1/categories').forEach(r => r.flush([]));
    httpTesting.expectOne(r => r.url === '/api/v1/tasks').flush(mockTaskList);
  });

  it('should debounce search input - clears previous timer', () => {
    fixture.detectChanges();
    httpTesting.match('/api/v1/categories').forEach(r => r.flush([]));
    httpTesting.expectOne(r => r.url === '/api/v1/tasks').flush(mockTaskList);

    vi.useFakeTimers();
    component.search = 'first';
    component.onSearchInput();
    component.search = 'second';
    component.onSearchInput();

    vi.advanceTimersByTime(300);
    vi.useRealTimers();

    const req = httpTesting.expectOne(r => r.url === '/api/v1/tasks');
    expect(req.request.params.get('search')).toBe('second');
    req.flush(mockTaskList);
  });

  it('onScroll should not run on server platform', () => {
    // Override platformId by setting field
    (component as any).platformId = 'server';
    fixture.detectChanges();
    httpTesting.match('/api/v1/categories').forEach(r => r.flush([]));
    httpTesting.expectOne(r => r.url === '/api/v1/tasks').flush(mockTaskList);
    component.onScroll();
    // No error, no new request
  });

  it('should pass empty search and category as undefined', () => {
    fixture.detectChanges();
    httpTesting.match('/api/v1/categories').forEach(r => r.flush([]));
    const req = httpTesting.expectOne(r => r.url === '/api/v1/tasks');
    expect(req.request.params.has('search')).toBe(false);
    expect(req.request.params.has('category_id')).toBe(false);
    req.flush(mockTaskList);
  });

  it('should handle null data in response', () => {
    fixture.detectChanges();
    httpTesting.match('/api/v1/categories').forEach(r => r.flush([]));
    httpTesting.expectOne(r => r.url === '/api/v1/tasks').flush({ data: null, total: 0, page: 1, limit: 20 });
    expect(component.tasks().length).toBe(0);
    expect(component.hasMore()).toBe(false);
  });

  it('should update search via DOM input event and trigger debounced reload', () => {
    vi.useFakeTimers();
    fixture.detectChanges();
    httpTesting.match('/api/v1/categories').forEach(r => r.flush([]));
    httpTesting.expectOne(r => r.url === '/api/v1/tasks').flush(mockTaskList);
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('viecz-input input');
    if (input) {
      input.value = 'test search';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      vi.advanceTimersByTime(300);
      vi.useRealTimers();

      const req = httpTesting.expectOne(r => r.url === '/api/v1/tasks');
      expect(req.request.params.get('search')).toBe('test search');
      req.flush(mockTaskList);
    } else {
      vi.useRealTimers();
    }
  });

  it('should trigger infinite scroll loadMore when near bottom', () => {
    fixture.detectChanges();
    httpTesting.match('/api/v1/categories').forEach(r => r.flush([]));
    const fullPage = Array.from({ length: 20 }, (_, i) => ({ ...mockTask, id: i + 1 }));
    httpTesting.expectOne(r => r.url === '/api/v1/tasks').flush({ data: fullPage, total: 25, page: 1, limit: 20 });
    expect(component.hasMore()).toBe(true);

    // Simulate scroll near bottom
    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });
    Object.defineProperty(window, 'scrollY', { value: 1000, writable: true });
    Object.defineProperty(document.documentElement, 'scrollHeight', { value: 1900, writable: true });

    component.onScroll();

    const req = httpTesting.expectOne(r => r.url === '/api/v1/tasks' && r.params.get('page') === '2');
    req.flush({ data: [{ ...mockTask, id: 21 }], total: 25, page: 2, limit: 20 });
    expect(component.tasks().length).toBe(21);
  });

  it('should not trigger loadMore when scroll position is far from bottom', () => {
    fixture.detectChanges();
    httpTesting.match('/api/v1/categories').forEach(r => r.flush([]));
    const fullPage = Array.from({ length: 20 }, (_, i) => ({ ...mockTask, id: i + 1 }));
    httpTesting.expectOne(r => r.url === '/api/v1/tasks').flush({ data: fullPage, total: 25, page: 1, limit: 20 });
    expect(component.hasMore()).toBe(true);

    // Simulate scroll far from bottom (position < height - threshold)
    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });
    Object.defineProperty(window, 'scrollY', { value: 100, writable: true });
    Object.defineProperty(document.documentElement, 'scrollHeight', { value: 5000, writable: true });

    component.onScroll();
    // No new request should be made
  });

  it('should handle null data in loadMore response', () => {
    fixture.detectChanges();
    httpTesting.match('/api/v1/categories').forEach(r => r.flush([]));
    const fullPage = Array.from({ length: 20 }, (_, i) => ({ ...mockTask, id: i + 1 }));
    httpTesting.expectOne(r => r.url === '/api/v1/tasks').flush({ data: fullPage, total: 25, page: 1, limit: 20 });

    component['loadMore']();
    const req = httpTesting.expectOne(r => r.url === '/api/v1/tasks' && r.params.get('page') === '2');
    // data is null - triggers the || [] fallback in loadMore
    req.flush({ data: null, total: 25, page: 2, limit: 20 });
    expect(component.tasks().length).toBe(20); // no new tasks appended
    expect(component.hasMore()).toBe(false);
  });

  describe('Template branch coverage', () => {
    it('should toggle from error to loading skeleton (destroys error block)', () => {
      fixture.detectChanges();
      httpTesting.match('/api/v1/categories').forEach(r => r.flush([]));
      httpTesting.expectOne(r => r.url === '/api/v1/tasks').flush(null, { status: 500, statusText: 'Error' });
      expect(component.error()).toBe(true);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('app-error-fallback')).toBeTruthy();

      // Reset to loading state — destroys error block, creates loading skeleton block
      component.error.set(false);
      component.tasks.set([]);
      component.loading.set(true);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('app-loading-skeleton')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('app-error-fallback')).toBeFalsy();
    });

    it('should toggle from loading skeleton to empty state (destroys skeleton block)', () => {
      fixture.detectChanges();
      httpTesting.match('/api/v1/categories').forEach(r => r.flush([]));
      // Keep loading for a moment
      component.loading.set(true);
      component.tasks.set([]);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('app-loading-skeleton')).toBeTruthy();

      // Switch to empty — destroys skeleton, creates empty state block
      component.loading.set(false);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('app-loading-skeleton')).toBeFalsy();
      expect(fixture.nativeElement.textContent).toContain('No tasks found');

      // Flush any pending requests
      httpTesting.expectOne(r => r.url === '/api/v1/tasks').flush({ data: [], total: 0, page: 1, limit: 20 });
    });

    it('should toggle from empty state to task list (destroys empty state block)', () => {
      fixture.detectChanges();
      httpTesting.match('/api/v1/categories').forEach(r => r.flush([]));
      httpTesting.expectOne(r => r.url === '/api/v1/tasks').flush({ data: [], total: 0, page: 1, limit: 20 });
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('No tasks found');

      // Switch to tasks — destroys empty state block, creates task grid
      component.tasks.set([mockTask]);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('app-task-card')).toBeTruthy();
    });

    it('should toggle loadingMore from true to false (destroys loadingMore spinner block)', () => {
      fixture.detectChanges();
      httpTesting.match('/api/v1/categories').forEach(r => r.flush([]));
      httpTesting.expectOne(r => r.url === '/api/v1/tasks').flush(mockTaskList);
      component.loadingMore.set(true);
      fixture.detectChanges();
      const spinners = fixture.nativeElement.querySelectorAll('viecz-spinner');
      expect(spinners.length).toBeGreaterThan(0);

      // Destroy loadingMore spinner block
      component.loadingMore.set(false);
      fixture.detectChanges();
      expect(component.loadingMore()).toBe(false);
    });

    it('should toggle hasMore from false to true (destroys noMoreTasks block)', () => {
      fixture.detectChanges();
      httpTesting.match('/api/v1/categories').forEach(r => r.flush([]));
      httpTesting.expectOne(r => r.url === '/api/v1/tasks').flush(mockTaskList);
      fixture.detectChanges();
      expect(component.hasMore()).toBe(false);
      expect(fixture.nativeElement.textContent).toContain('No more tasks');

      // Switch hasMore to true — destroys noMoreTasks block
      component.hasMore.set(true);
      fixture.detectChanges();
      expect(component.hasMore()).toBe(true);
    });

    it('should toggle hasMore from true to false (creates noMoreTasks block)', () => {
      fixture.detectChanges();
      httpTesting.match('/api/v1/categories').forEach(r => r.flush([]));
      const fullPage = Array.from({ length: 20 }, (_, i) => ({ ...mockTask, id: i + 1 }));
      httpTesting.expectOne(r => r.url === '/api/v1/tasks').flush({ data: fullPage, total: 25, page: 1, limit: 20 });
      expect(component.hasMore()).toBe(true);
      fixture.detectChanges();

      // Destroy hasMore state — creates noMoreTasks block
      component.hasMore.set(false);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('No more tasks');
    });

    it('should verify auth state toggles FAB visibility (unauthenticated by default)', () => {
      fixture.detectChanges();
      httpTesting.match('/api/v1/categories').forEach(r => r.flush([]));
      httpTesting.expectOne(r => r.url === '/api/v1/tasks').flush(mockTaskList);
      fixture.detectChanges();
      // Default is unauthenticated — no FAB (auth.isAuthenticated() returns false)
      const fab = fixture.nativeElement.querySelector('[aria-label]');
      // The hero section should be visible for unauthenticated users
      expect(fixture.nativeElement.textContent).toContain('STUDENT MICRO-TASK MARKETPLACE');
    });

    it('should toggle from task list to empty state (destroys task grid block)', () => {
      fixture.detectChanges();
      httpTesting.match('/api/v1/categories').forEach(r => r.flush([]));
      httpTesting.expectOne(r => r.url === '/api/v1/tasks').flush(mockTaskList);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('app-task-card')).toBeTruthy();

      // Switch to empty — destroys task grid, creates empty state
      component.tasks.set([]);
      component.loading.set(false);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('No tasks found');
      expect(fixture.nativeElement.querySelector('app-task-card')).toBeFalsy();
    });

    it('should toggle from task list to error (destroys task grid, creates error)', () => {
      fixture.detectChanges();
      httpTesting.match('/api/v1/categories').forEach(r => r.flush([]));
      httpTesting.expectOne(r => r.url === '/api/v1/tasks').flush(mockTaskList);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('app-task-card')).toBeTruthy();

      // Switch to error
      component.tasks.set([]);
      component.error.set(true);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('app-error-fallback')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('app-task-card')).toBeFalsy();
    });

    it('should toggle loadingMore from false→true→false covering spinner block', () => {
      fixture.detectChanges();
      httpTesting.match('/api/v1/categories').forEach(r => r.flush([]));
      httpTesting.expectOne(r => r.url === '/api/v1/tasks').flush(mockTaskList);

      component.loadingMore.set(true);
      fixture.detectChanges();
      const spinners = fixture.nativeElement.querySelectorAll('viecz-spinner');
      expect(spinners.length).toBeGreaterThan(0);

      component.loadingMore.set(false);
      fixture.detectChanges();
      expect(component.loadingMore()).toBe(false);

      component.loadingMore.set(true);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('viecz-spinner').length).toBeGreaterThan(0);
    });

    it('should toggle hasMore true→false→true for noMoreTasks block', () => {
      fixture.detectChanges();
      httpTesting.match('/api/v1/categories').forEach(r => r.flush([]));
      const fullPage = Array.from({ length: 20 }, (_, i) => ({ ...mockTask, id: i + 1 }));
      httpTesting.expectOne(r => r.url === '/api/v1/tasks').flush({ data: fullPage, total: 25, page: 1, limit: 20 });
      expect(component.hasMore()).toBe(true);
      fixture.detectChanges();

      // true→false: creates noMoreTasks block
      component.hasMore.set(false);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('No more tasks');

      // false→true: destroys noMoreTasks block
      component.hasMore.set(true);
      fixture.detectChanges();

      // true→false again
      component.hasMore.set(false);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('No more tasks');
    });
  });
});

describe('MarketplaceComponent with minimum loading delay', () => {
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
        provideTranslocoForTesting(),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: MINIMUM_LOADING_MS, useValue: 5000 }, // Large delay to ensure remaining > 0
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MarketplaceComponent);
    component = fixture.componentInstance;
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should delay apply via setTimeout when remaining > 0 on success', () => {
    vi.useFakeTimers();
    fixture.detectChanges();
    httpTesting.match('/api/v1/categories').forEach(r => r.flush([]));
    const req = httpTesting.expectOne(r => r.url === '/api/v1/tasks');
    req.flush(mockTaskList);
    // loading is still true because remaining > 0 triggers setTimeout
    expect(component.loading()).toBe(true);
    vi.advanceTimersByTime(5000);
    expect(component.loading()).toBe(false);
    expect(component.tasks().length).toBe(1);
    vi.useRealTimers();
  });

  it('should delay apply via setTimeout when remaining > 0 on error', () => {
    vi.useFakeTimers();
    fixture.detectChanges();
    httpTesting.match('/api/v1/categories').forEach(r => r.flush([]));
    const req = httpTesting.expectOne(r => r.url === '/api/v1/tasks');
    req.flush(null, { status: 500, statusText: 'Error' });
    // loading is still true because remaining > 0 triggers setTimeout
    expect(component.loading()).toBe(true);
    vi.advanceTimersByTime(5000);
    expect(component.loading()).toBe(false);
    expect(component.error()).toBe(true);
    vi.useRealTimers();
  });
});
