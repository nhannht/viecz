import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID, signal, Component } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { By } from '@angular/platform-browser';
import { MyJobsComponent } from './my-jobs.component';
import { AuthService } from '../core/auth.service';
import { Task, User, TaskListResponse } from '../core/models';

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
  is_tasker: true,
  auth_provider: 'email',
  email_verified: false,
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
        provideAnimationsAsync(),
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
    expect(el.textContent).toContain('My Jobs');
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
    comp.onTabChange(1);
    const req = httpTesting.expectOne(r =>
      r.url === '/api/v1/tasks' && r.params.get('tasker_id') === '1' && r.params.get('status') === 'in_progress',
    );
    req.flush({ data: [], total: 0, page: 1, limit: 20 });
    expect(router.navigate).toHaveBeenCalledWith(['/my-jobs', 'applied']);
  });

  it('should load completed tasks on tab 2', () => {
    initComponent();
    const comp = fixture.debugElement.query(By.directive(MyJobsComponent)).componentInstance as MyJobsComponent;
    comp.onTabChange(2);
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
});
