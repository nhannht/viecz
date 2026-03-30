import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID, signal, Component } from '@angular/core';
import { By } from '@angular/platform-browser';
import { MyJobsComponent } from './my-jobs.component';
import { AuthService } from '../core/auth.service';
import { Task, User, TaskListResponse } from '../core/models';
import { provideTranslocoForTesting } from '../core/transloco-testing';

const mockUser: User = {
  id: 1,
  email: 'test@example.com',
  name: 'Test User',
  university: 'DHQG-HCM',
  is_verified: false,
  rating: 0,
  total_tasks_completed: 0,
  total_tasks_posted: 0,
  total_earnings: 0,
  auth_provider: 'email',
  email_verified: false,
  phone_verified: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const mockTask: Task = {
  id: 1,
  requester_id: 1,
  category_id: 2,
  title: 'Test Task',
  description: 'Test desc',
  price: 20000,
  location: 'HCMC',
  status: 'open',
  created_at: '2026-02-14T10:00:00Z',
  updated_at: '2026-02-14T10:00:00Z',
};

const mockResponse: TaskListResponse = {
  data: [mockTask],
  total: 1,
  page: 1,
  limit: 20,
};

@Component({
  standalone: true,
  imports: [MyJobsComponent],
  template: `<app-my-jobs [mode]="mode" />`,
})
class TestHostComponent {
  mode = 'posted';
}

describe('MyJobsComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let httpTesting: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTranslocoForTesting(),
        { provide: PLATFORM_ID, useValue: 'browser' },
        {
          provide: AuthService,
          useValue: {
            currentUser: signal<User | null>(mockUser),
            getAccessToken: () => 'test-token',
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    httpTesting = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  function initComponent() {
    fixture.detectChanges();
    const req = httpTesting.expectOne(r => r.url === '/api/v1/tasks');
    req.flush(mockResponse);
    fixture.detectChanges();
  }

  it('should create', () => {
    initComponent();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should display My Jobs title', () => {
    initComponent();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('MY JOBS');
  });

  it('should load posted tasks by default with requester_id param', () => {
    fixture.detectChanges();
    const req = httpTesting.expectOne(r =>
      r.url === '/api/v1/tasks' && r.params.get('requester_id') === '1',
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should populate tasks signal when loaded', () => {
    initComponent();
    const comp = fixture.debugElement.query(By.directive(MyJobsComponent)).componentInstance as MyJobsComponent;
    expect(comp.tasks().length).toBe(1);
    expect(comp.tasks()[0].title).toBe('Test Task');
    expect(comp.loading()).toBe(false);
  });

  it('should have empty tasks when none returned', () => {
    fixture.detectChanges();
    httpTesting.expectOne(r => r.url === '/api/v1/tasks').flush({ data: [], total: 0, page: 1, limit: 20 });
    fixture.detectChanges();
    const comp = fixture.debugElement.query(By.directive(MyJobsComponent)).componentInstance as MyJobsComponent;
    expect(comp.tasks().length).toBe(0);
    expect(comp.loading()).toBe(false);
  });

  it('should have three tabs: Posted, Applied, Completed', () => {
    initComponent();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Posted');
    expect(el.textContent).toContain('Applied');
    expect(el.textContent).toContain('Completed');
  });

  it('should switch tabs and navigate on tab change', () => {
    initComponent();
    const comp = fixture.debugElement.query(By.directive(MyJobsComponent)).componentInstance as MyJobsComponent;
    comp.onTabChange('applied');
    const req = httpTesting.expectOne(r =>
      r.url === '/api/v1/tasks' && r.params.get('tasker_id') === '1' && r.params.get('status') === 'in_progress',
    );
    req.flush({ data: [], total: 0, page: 1, limit: 20 });
    expect(router.navigate).toHaveBeenCalledWith(['/my-jobs', 'applied']);
  });

  it('should load completed tasks on tab 2', () => {
    initComponent();
    const comp = fixture.debugElement.query(By.directive(MyJobsComponent)).componentInstance as MyJobsComponent;
    comp.onTabChange('completed');
    const req = httpTesting.expectOne(r =>
      r.url === '/api/v1/tasks' && r.params.get('tasker_id') === '1' && r.params.get('status') === 'completed',
    );
    req.flush({ data: [], total: 0, page: 1, limit: 20 });
    expect(router.navigate).toHaveBeenCalledWith(['/my-jobs', 'completed']);
  });

  it('should handle no user gracefully', () => {
    const authService = TestBed.inject(AuthService);
    (authService.currentUser as any).set(null);
    fixture.detectChanges();
    // No HTTP request should be made
    httpTesting.expectNone('/api/v1/tasks');
  });

  it('should handle load error and set error state', () => {
    fixture.detectChanges();
    httpTesting.expectOne(r => r.url === '/api/v1/tasks')
      .error(new ProgressEvent('error'));
    fixture.detectChanges();
    const comp = fixture.debugElement.query(By.directive(MyJobsComponent)).componentInstance as MyJobsComponent;
    expect(comp.loading()).toBe(false);
    expect(comp.error()).toBe(true);
  });

  it('goToCreate should navigate to /tasks/new', () => {
    initComponent();
    const comp = fixture.debugElement.query(By.directive(MyJobsComponent)).componentInstance as MyJobsComponent;
    comp.goToCreate();
    expect(router.navigate).toHaveBeenCalledWith(['/tasks/new']);
  });

  it('goToMarketplace should navigate to /', () => {
    initComponent();
    const comp = fixture.debugElement.query(By.directive(MyJobsComponent)).componentInstance as MyJobsComponent;
    comp.goToMarketplace();
    expect(router.navigate).toHaveBeenCalledWith(['/marketplace']);
  });

  it('retryLoad should reload tasks for current tab', () => {
    initComponent();
    const comp = fixture.debugElement.query(By.directive(MyJobsComponent)).componentInstance as MyJobsComponent;
    comp.retryLoad();
    const req = httpTesting.expectOne(r => r.url === '/api/v1/tasks');
    req.flush(mockResponse);
  });

  it('should show empty state for posted tab', () => {
    fixture.detectChanges();
    httpTesting.expectOne(r => r.url === '/api/v1/tasks').flush({ data: [], total: 0, page: 1, limit: 20 });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('No posted tasks');
  });

  it('should show loading spinner while loading', () => {
    // detectChanges triggers ngOnInit which sets loading=true
    fixture.detectChanges();
    // Before flushing the HTTP response, loading is true
    const comp = fixture.debugElement.query(By.directive(MyJobsComponent)).componentInstance as MyJobsComponent;
    expect(comp.loading()).toBe(true);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('viecz-spinner')).toBeTruthy();
    // Now flush to clean up
    httpTesting.expectOne(r => r.url === '/api/v1/tasks').flush(mockResponse);
  });

  it('should show error fallback when error is true', () => {
    fixture.detectChanges();
    httpTesting.expectOne(r => r.url === '/api/v1/tasks').error(new ProgressEvent('error'));
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-error-fallback')).toBeTruthy();
  });

  it('should show empty state for applied tab', () => {
    initComponent();
    const comp = fixture.debugElement.query(By.directive(MyJobsComponent)).componentInstance as MyJobsComponent;
    comp.onTabChange('applied');
    httpTesting.expectOne(r => r.url === '/api/v1/tasks').flush({ data: [], total: 0, page: 1, limit: 20 });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('No active jobs');
  });

  it('should show empty state for completed tab', () => {
    initComponent();
    const comp = fixture.debugElement.query(By.directive(MyJobsComponent)).componentInstance as MyJobsComponent;
    comp.onTabChange('completed');
    httpTesting.expectOne(r => r.url === '/api/v1/tasks').flush({ data: [], total: 0, page: 1, limit: 20 });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('No completed jobs yet');
  });

  it('should render task cards in the @for loop', () => {
    initComponent();
    const el = fixture.nativeElement as HTMLElement;
    const taskCards = el.querySelectorAll('app-task-card');
    expect(taskCards.length).toBe(1);
  });

  it('should render multiple task cards when multiple tasks returned', () => {
    fixture.detectChanges();
    const secondTask: Task = { ...mockTask, id: 2, title: 'Second Task' };
    httpTesting.expectOne(r => r.url === '/api/v1/tasks').flush({
      data: [mockTask, secondTask],
      total: 2,
      page: 1,
      limit: 20,
    });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const taskCards = el.querySelectorAll('app-task-card');
    expect(taskCards.length).toBe(2);
  });

  it('should handle null data in response', () => {
    fixture.detectChanges();
    httpTesting.expectOne(r => r.url === '/api/v1/tasks').flush({ data: null, total: 0, page: 1, limit: 20 });
    fixture.detectChanges();
    const comp = fixture.debugElement.query(By.directive(MyJobsComponent)).componentInstance as MyJobsComponent;
    expect(comp.tasks().length).toBe(0);
  });

  it('should default selectedTab to 0 when mode is unknown (modeToTab fallback)', () => {
    fixture.componentInstance.mode = 'unknown_mode' as any;
    fixture.detectChanges();
    // loadTasks('unknown_mode') still fires with userId
    httpTesting.expectOne(r => r.url === '/api/v1/tasks').flush(mockResponse);
    fixture.detectChanges();
    const comp = fixture.debugElement.query(By.directive(MyJobsComponent)).componentInstance as MyJobsComponent;
    // modeToTab['unknown_mode'] is undefined → ?? 0
    expect(comp.selectedTab()).toBe(0);
  });

  it('should default to posted when mode input is empty string', () => {
    fixture.componentInstance.mode = '';
    fixture.detectChanges();
    // mode() is '' which is falsy → || 'posted' fallback in ngOnInit
    const req = httpTesting.expectOne(r => r.url === '/api/v1/tasks' && r.params.get('requester_id') === '1');
    req.flush(mockResponse);
  });

  it('should default selectedTab to 0 when onTabChange receives unknown tab value', () => {
    initComponent();
    const comp = fixture.debugElement.query(By.directive(MyJobsComponent)).componentInstance as MyJobsComponent;
    comp.onTabChange('nonexistent');
    // tabDefs.findIndex returns -1 → index >= 0 is false → 0
    expect(comp.selectedTab()).toBe(0);
    httpTesting.expectOne(r => r.url === '/api/v1/tasks').flush(mockResponse);
  });

  describe('Template branch coverage', () => {
    it('should toggle from loading to tasks list (destroys loading spinner block)', () => {
      fixture.detectChanges();
      const comp = fixture.debugElement.query(By.directive(MyJobsComponent)).componentInstance as MyJobsComponent;
      // Loading state
      expect(comp.loading()).toBe(true);
      expect(fixture.nativeElement.querySelector('viecz-spinner')).toBeTruthy();

      // Flush — destroys spinner, creates task grid
      httpTesting.expectOne(r => r.url === '/api/v1/tasks').flush(mockResponse);
      fixture.detectChanges();
      expect(comp.loading()).toBe(false);
      expect(fixture.nativeElement.querySelector('app-task-card')).toBeTruthy();
    });

    it('should toggle from tasks list to loading (destroys task grid block)', () => {
      initComponent();
      const comp = fixture.debugElement.query(By.directive(MyJobsComponent)).componentInstance as MyJobsComponent;
      expect(fixture.nativeElement.querySelector('app-task-card')).toBeTruthy();

      // Switch to loading — destroys task grid, creates spinner
      comp.loading.set(true);
      comp.tasks.set([]);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('viecz-spinner')).toBeTruthy();
    });

    it('should toggle from error to loading (destroys error block)', () => {
      fixture.detectChanges();
      httpTesting.expectOne(r => r.url === '/api/v1/tasks').error(new ProgressEvent('error'));
      fixture.detectChanges();
      const comp = fixture.debugElement.query(By.directive(MyJobsComponent)).componentInstance as MyJobsComponent;
      expect(comp.error()).toBe(true);
      expect(fixture.nativeElement.querySelector('app-error-fallback')).toBeTruthy();

      // Destroy error block
      comp.error.set(false);
      comp.loading.set(true);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('viecz-spinner')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('app-error-fallback')).toBeFalsy();
    });

    it('should toggle from empty posted to tasks list (destroys empty state block)', () => {
      fixture.detectChanges();
      httpTesting.expectOne(r => r.url === '/api/v1/tasks').flush({ data: [], total: 0, page: 1, limit: 20 });
      fixture.detectChanges();
      const comp = fixture.debugElement.query(By.directive(MyJobsComponent)).componentInstance as MyJobsComponent;
      expect(fixture.nativeElement.textContent).toContain('No posted tasks');

      // Switch to tasks — destroys empty state, creates task grid
      comp.tasks.set([mockTask]);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('app-task-card')).toBeTruthy();
    });

    it('should toggle between empty applied and empty completed tabs (covers @switch branches)', () => {
      initComponent();
      const comp = fixture.debugElement.query(By.directive(MyJobsComponent)).componentInstance as MyJobsComponent;

      // Switch to applied empty state
      comp.onTabChange('applied');
      httpTesting.expectOne(r => r.url === '/api/v1/tasks').flush({ data: [], total: 0, page: 1, limit: 20 });
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('No active jobs');

      // Switch to completed empty state — destroys applied @case, creates completed @case
      comp.onTabChange('completed');
      httpTesting.expectOne(r => r.url === '/api/v1/tasks').flush({ data: [], total: 0, page: 1, limit: 20 });
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('No completed jobs yet');

      // Switch back to posted empty state — destroys completed @case, creates posted @case
      comp.onTabChange('posted');
      httpTesting.expectOne(r => r.url === '/api/v1/tasks').flush({ data: [], total: 0, page: 1, limit: 20 });
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('No posted tasks');
    });

    it('should toggle from tasks to error state (destroys task grid block)', () => {
      initComponent();
      const comp = fixture.debugElement.query(By.directive(MyJobsComponent)).componentInstance as MyJobsComponent;
      expect(fixture.nativeElement.querySelector('app-task-card')).toBeTruthy();

      // Switch to error state — destroys task grid block
      comp.tasks.set([]);
      comp.error.set(true);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('app-error-fallback')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('app-task-card')).toBeFalsy();
    });

    it('should toggle loading→error→empty→tasks→loading full cycle', () => {
      // Start at loading
      fixture.detectChanges();
      const comp = fixture.debugElement.query(By.directive(MyJobsComponent)).componentInstance as MyJobsComponent;
      expect(comp.loading()).toBe(true);
      expect(fixture.nativeElement.querySelector('viecz-spinner')).toBeTruthy();

      // loading → error
      httpTesting.expectOne(r => r.url === '/api/v1/tasks').error(new ProgressEvent('error'));
      fixture.detectChanges();
      expect(comp.error()).toBe(true);
      expect(fixture.nativeElement.querySelector('app-error-fallback')).toBeTruthy();

      // error → empty (posted tab)
      comp.error.set(false);
      comp.loading.set(false);
      comp.tasks.set([]);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('No posted tasks');

      // empty → tasks
      comp.tasks.set([mockTask]);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('app-task-card')).toBeTruthy();

      // tasks → loading
      comp.loading.set(true);
      comp.tasks.set([]);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('viecz-spinner')).toBeTruthy();
    });

    it('should cycle through all @switch/@case empty states', () => {
      // Posted empty
      fixture.detectChanges();
      httpTesting.expectOne(r => r.url === '/api/v1/tasks').flush({ data: [], total: 0, page: 1, limit: 20 });
      fixture.detectChanges();
      const comp = fixture.debugElement.query(By.directive(MyJobsComponent)).componentInstance as MyJobsComponent;
      expect(fixture.nativeElement.textContent).toContain('No posted tasks');

      // applied empty
      comp.onTabChange('applied');
      httpTesting.expectOne(r => r.url === '/api/v1/tasks').flush({ data: [], total: 0, page: 1, limit: 20 });
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('No active jobs');

      // completed empty
      comp.onTabChange('completed');
      httpTesting.expectOne(r => r.url === '/api/v1/tasks').flush({ data: [], total: 0, page: 1, limit: 20 });
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('No completed jobs yet');

      // Back to posted empty
      comp.onTabChange('posted');
      httpTesting.expectOne(r => r.url === '/api/v1/tasks').flush({ data: [], total: 0, page: 1, limit: 20 });
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('No posted tasks');
    });

    it('should toggle from empty to error and back (covers empty→error transition)', () => {
      fixture.detectChanges();
      httpTesting.expectOne(r => r.url === '/api/v1/tasks').flush({ data: [], total: 0, page: 1, limit: 20 });
      fixture.detectChanges();
      const comp = fixture.debugElement.query(By.directive(MyJobsComponent)).componentInstance as MyJobsComponent;
      expect(fixture.nativeElement.textContent).toContain('No posted tasks');

      // empty → error
      comp.error.set(true);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('app-error-fallback')).toBeTruthy();

      // error → empty
      comp.error.set(false);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('No posted tasks');
    });
  });
});
