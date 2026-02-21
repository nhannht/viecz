import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID, signal, Component } from '@angular/core';
import { By } from '@angular/platform-browser';
import { TaskDetailComponent } from './task-detail.component';
import { AuthService } from '../core/auth.service';
import { Task, User, TaskApplication } from '../core/models';

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
  description: 'Test description',
  price: 20000,
  location: 'Test location',
  status: 'open',
  user_has_applied: false,
  is_overdue: false,
  created_at: '2026-02-14T10:00:00Z',
  updated_at: '2026-02-14T10:00:00Z',
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

// Wrapper to provide required input
@Component({
  standalone: true,
  imports: [TaskDetailComponent],
  template: `<app-task-detail [id]="taskId" />`,
})
class TestHostComponent {
  taskId = '1';
}

describe('TaskDetailComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let httpTesting: HttpTestingController;
  let authService: { currentUser: ReturnType<typeof signal<User | null>>; getAccessToken: () => string | null; isAuthenticated: () => boolean };
  let router: Router;

  beforeEach(async () => {
    authService = {
      currentUser: signal<User | null>(mockUser),
      getAccessToken: () => 'test-token',
      isAuthenticated: () => true,
    };

    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: AuthService, useValue: authService },
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

  function initComponent(task: Task = mockTask, apps: TaskApplication[] = []) {
    fixture.detectChanges();
    httpTesting.expectOne('/api/v1/tasks/1').flush(task);
    const currentUserId = authService.currentUser()?.id;
    if (task.requester_id === currentUserId) {
      httpTesting.expectOne('/api/v1/tasks/1/applications').flush(apps);
    }
    fixture.detectChanges();
  }

  it('should create', () => {
    initComponent();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should load task on init', () => {
    initComponent();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Test Task');
  });

  it('should display task price', () => {
    initComponent();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('20.000');
  });

  it('should display task location', () => {
    initComponent();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Test location');
  });

  it('should display task description', () => {
    initComponent();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Test description');
  });

  it('should show edit and delete buttons for requester on open task', () => {
    initComponent();
    const el = fixture.nativeElement as HTMLElement;
    const editBtn = el.querySelector('[aria-label="Edit Task"]');
    const deleteBtn = el.querySelector('[aria-label="Delete Task"]');
    expect(editBtn).toBeTruthy();
    expect(deleteBtn).toBeTruthy();
  });

  it('should NOT show edit/delete buttons for non-requester', () => {
    authService.currentUser.set({ ...mockUser, id: 999 });
    initComponent({ ...mockTask, requester_id: 1 });
    const el = fixture.nativeElement as HTMLElement;
    const editBtn = el.querySelector('[aria-label="Edit Task"]');
    expect(editBtn).toBeNull();
  });

  it('should show apply button for non-requester on open task', () => {
    authService.currentUser.set({ ...mockUser, id: 999 });
    initComponent({ ...mockTask, requester_id: 1 });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Apply');
  });

  it('should show Applied badge when user has applied', () => {
    authService.currentUser.set({ ...mockUser, id: 999 });
    initComponent({ ...mockTask, requester_id: 1, user_has_applied: true });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Applied');
  });

  it('should show Mark Complete for requester on in_progress task', () => {
    initComponent({ ...mockTask, status: 'in_progress' });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Mark Complete');
  });

  it('should display applications list for requester', () => {
    initComponent(mockTask, [mockApplication]);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('APPLICATIONS (1)');
    expect(el.textContent).toContain('Tasker #2');
    expect(el.textContent).toContain('18.000');
  });

  it('should set showDeleteDialog to true on confirmDelete', () => {
    initComponent();
    const detailDebugEl = fixture.debugElement.query(By.directive(TaskDetailComponent));
    const detailComp = detailDebugEl.componentInstance as TaskDetailComponent;
    expect(detailComp.showDeleteDialog()).toBe(false);
    detailComp.confirmDelete();
    expect(detailComp.showDeleteDialog()).toBe(true);
  });

  it('should navigate home on error loading task', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/v1/tasks/1').flush(
      { error: 'not found' },
      { status: 404, statusText: 'Not Found' },
    );
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should show overdue badge when task is overdue', () => {
    initComponent({ ...mockTask, deadline: '2020-01-01T00:00:00Z', is_overdue: true });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('OVERDUE');
  });
});
