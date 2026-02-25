import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID, signal, Component } from '@angular/core';
import { By } from '@angular/platform-browser';
import { TaskDetailComponent } from './task-detail.component';
import { AuthService } from '../core/auth.service';
import { Task, User, TaskApplication } from '../core/models';
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
  is_tasker: true,
  auth_provider: 'email',
  email_verified: false,
  phone_verified: true,
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
  let authService: { currentUser: ReturnType<typeof signal<User | null>>; getAccessToken: () => string | null; isAuthenticated: () => boolean; needsPhoneVerification: () => boolean };
  let router: Router;

  beforeEach(async () => {
    authService = {
      currentUser: signal<User | null>(mockUser),
      getAccessToken: () => 'test-token',
      isAuthenticated: () => true,
      needsPhoneVerification: () => false,
    };

    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTranslocoForTesting(),
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

  it('should hide apply button when task is overdue', () => {
    authService.currentUser.set({ ...mockUser, id: 999 });
    initComponent({ ...mockTask, requester_id: 1, is_overdue: true });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).not.toContain('Apply');
  });

  it('should delete task successfully', () => {
    initComponent();
    const detailDebugEl = fixture.debugElement.query(By.directive(TaskDetailComponent));
    const comp = detailDebugEl.componentInstance as TaskDetailComponent;
    comp.deleteTask();
    httpTesting.expectOne('/api/v1/tasks/1').flush({ message: 'ok' });
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should show error on delete failure', () => {
    initComponent();
    const detailDebugEl = fixture.debugElement.query(By.directive(TaskDetailComponent));
    const comp = detailDebugEl.componentInstance as TaskDetailComponent;
    comp.deleteTask();
    httpTesting.expectOne('/api/v1/tasks/1').flush({ error: 'forbidden' }, { status: 403, statusText: 'Forbidden' });
    // No navigation since it failed
    expect(router.navigate).not.toHaveBeenCalledWith(['/']);
  });

  it('should set pendingAppId and show escrow dialog on acceptApp', () => {
    initComponent(mockTask, [mockApplication]);
    const detailDebugEl = fixture.debugElement.query(By.directive(TaskDetailComponent));
    const comp = detailDebugEl.componentInstance as TaskDetailComponent;
    comp.acceptApp(42);
    expect(comp.pendingAppId()).toBe(42);
    expect(comp.showEscrowDialog()).toBe(true);
  });

  it('should execute accept app and create escrow on success', () => {
    initComponent(mockTask, [mockApplication]);
    const detailDebugEl = fixture.debugElement.query(By.directive(TaskDetailComponent));
    const comp = detailDebugEl.componentInstance as TaskDetailComponent;
    comp.pendingAppId.set(1);
    comp.executeAcceptApp();

    // Accept application
    httpTesting.expectOne('/api/v1/applications/1/accept').flush({ message: 'ok' });
    // Create escrow
    httpTesting.expectOne('/api/v1/payments/escrow').flush({ message: 'ok' });
    // Reload task
    httpTesting.expectOne('/api/v1/tasks/1').flush({ ...mockTask, status: 'in_progress' });
    httpTesting.expectOne('/api/v1/tasks/1/applications').flush([]);
  });

  it('should show error when accept fails', () => {
    initComponent(mockTask, [mockApplication]);
    const detailDebugEl = fixture.debugElement.query(By.directive(TaskDetailComponent));
    const comp = detailDebugEl.componentInstance as TaskDetailComponent;
    comp.pendingAppId.set(1);
    comp.executeAcceptApp();

    httpTesting.expectOne('/api/v1/applications/1/accept').flush(
      { error: 'already accepted' },
      { status: 400, statusText: 'Bad Request' },
    );
  });

  it('should show error when escrow creation fails', () => {
    initComponent(mockTask, [mockApplication]);
    const detailDebugEl = fixture.debugElement.query(By.directive(TaskDetailComponent));
    const comp = detailDebugEl.componentInstance as TaskDetailComponent;
    comp.pendingAppId.set(1);
    comp.executeAcceptApp();

    httpTesting.expectOne('/api/v1/applications/1/accept').flush({ message: 'ok' });
    httpTesting.expectOne('/api/v1/payments/escrow').flush(
      { error: 'insufficient balance' },
      { status: 400, statusText: 'Bad Request' },
    );
  });

  it('should navigate to apply page', () => {
    initComponent();
    const detailDebugEl = fixture.debugElement.query(By.directive(TaskDetailComponent));
    const comp = detailDebugEl.componentInstance as TaskDetailComponent;
    comp.navigateToApply();
    expect(router.navigate).toHaveBeenCalledWith(['/tasks', 1, 'apply']);
  });

  it('should complete task successfully', () => {
    initComponent({ ...mockTask, status: 'in_progress' });
    const detailDebugEl = fixture.debugElement.query(By.directive(TaskDetailComponent));
    const comp = detailDebugEl.componentInstance as TaskDetailComponent;
    comp.completeTask();

    httpTesting.expectOne('/api/v1/tasks/1/complete').flush({ message: 'ok' });
    // Reload task after complete
    httpTesting.expectOne('/api/v1/tasks/1').flush({ ...mockTask, status: 'completed' });
    httpTesting.expectOne('/api/v1/tasks/1/applications').flush([]);
  });

  it('should show error when complete fails', () => {
    initComponent({ ...mockTask, status: 'in_progress' });
    const detailDebugEl = fixture.debugElement.query(By.directive(TaskDetailComponent));
    const comp = detailDebugEl.componentInstance as TaskDetailComponent;
    comp.completeTask();

    httpTesting.expectOne('/api/v1/tasks/1/complete').flush(
      { error: 'not allowed' },
      { status: 400, statusText: 'Bad Request' },
    );
  });

  it('should return correct badgeStatus for known statuses', () => {
    initComponent({ ...mockTask, status: 'open' });
    const detailDebugEl = fixture.debugElement.query(By.directive(TaskDetailComponent));
    const comp = detailDebugEl.componentInstance as TaskDetailComponent;
    expect(comp.badgeStatus()).toBe('open');

    comp.task.set({ ...mockTask, status: 'in_progress' });
    expect(comp.badgeStatus()).toBe('in_progress');

    comp.task.set({ ...mockTask, status: 'completed' });
    expect(comp.badgeStatus()).toBe('completed');

    comp.task.set({ ...mockTask, status: 'cancelled' });
    expect(comp.badgeStatus()).toBe('cancelled');
  });

  it('should return default badgeStatus for unknown status', () => {
    initComponent();
    const detailDebugEl = fixture.debugElement.query(By.directive(TaskDetailComponent));
    const comp = detailDebugEl.componentInstance as TaskDetailComponent;
    comp.task.set({ ...mockTask, status: 'unknown' as any });
    expect(comp.badgeStatus()).toBe('default');
  });

  it('should show unauthenticated CTA when not logged in', () => {
    authService.currentUser.set(null);
    (authService as any).isAuthenticated = () => false;
    initComponent({ ...mockTask, requester_id: 999 });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('WANT TO APPLY FOR THIS TASK?');
    expect(el.textContent).toContain('Register to Apply');
  });

  it('should render task images when image_urls are present', () => {
    initComponent({ ...mockTask, image_urls: ['http://example.com/a.jpg', 'http://example.com/b.jpg'] });
    const el = fixture.nativeElement as HTMLElement;
    const imgs = el.querySelectorAll('img');
    expect(imgs.length).toBe(2);
    expect(imgs[0].src).toContain('a.jpg');
  });

  it('should not render images when image_urls is empty', () => {
    initComponent({ ...mockTask, image_urls: [] });
    const el = fixture.nativeElement as HTMLElement;
    const imgs = el.querySelectorAll('img');
    expect(imgs.length).toBe(0);
  });

  it('should show loading spinner while task is loading', () => {
    fixture.detectChanges();
    // Before flushing, loading is true
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('nhannht-metro-spinner')).toBeTruthy();
    // Flush to clean up
    httpTesting.expectOne('/api/v1/tasks/1').flush(mockTask);
    httpTesting.expectOne('/api/v1/tasks/1/applications').flush([]);
  });

  it('should not show edit/delete buttons for requester on non-open task', () => {
    initComponent({ ...mockTask, status: 'in_progress' });
    const el = fixture.nativeElement as HTMLElement;
    const editBtn = el.querySelector('[aria-label="Edit Task"]');
    const deleteBtn = el.querySelector('[aria-label="Delete Task"]');
    expect(editBtn).toBeNull();
    expect(deleteBtn).toBeNull();
  });

  it('should show deadline when task has a deadline', () => {
    initComponent({ ...mockTask, deadline: '2026-12-25T00:00:00Z' });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Deadline');
  });

  it('should not show deadline section when task has no deadline', () => {
    initComponent({ ...mockTask, deadline: undefined });
    const el = fixture.nativeElement as HTMLElement;
    // The schedule icon and "Deadline" text should not appear
    expect(el.textContent).not.toContain('Deadline');
  });

  it('should not show applications panel for non-requester', () => {
    authService.currentUser.set({ ...mockUser, id: 999 });
    initComponent({ ...mockTask, requester_id: 1 });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).not.toContain('APPLICATIONS');
  });

  it('should not show applications panel when there are no applications', () => {
    initComponent(mockTask, []);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).not.toContain('APPLICATIONS');
  });

  it('should show applications panel with accept button on open task', () => {
    initComponent({ ...mockTask, status: 'open' }, [mockApplication]);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('APPLICATIONS (1)');
  });

  it('should not show apply button when task is not open', () => {
    authService.currentUser.set({ ...mockUser, id: 999 });
    initComponent({ ...mockTask, requester_id: 1, status: 'in_progress' });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).not.toContain('Apply');
  });

  it('should show delete confirmation dialog content', () => {
    initComponent();
    const detailDebugEl = fixture.debugElement.query(By.directive(TaskDetailComponent));
    const comp = detailDebugEl.componentInstance as TaskDetailComponent;
    comp.confirmDelete();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Test Task');
  });

  it('should show escrow dialog when accepting an application', () => {
    initComponent(mockTask, [mockApplication]);
    const detailDebugEl = fixture.debugElement.query(By.directive(TaskDetailComponent));
    const comp = detailDebugEl.componentInstance as TaskDetailComponent;
    comp.acceptApp(1);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('20.000');
  });

  it('should show fallback error on deleteTask failure without details', () => {
    initComponent();
    const detailDebugEl = fixture.debugElement.query(By.directive(TaskDetailComponent));
    const comp = detailDebugEl.componentInstance as TaskDetailComponent;
    comp.deleteTask();
    httpTesting.expectOne('/api/v1/tasks/1').flush({}, { status: 500, statusText: 'Server Error' });
    // err.error?.error is undefined, so fallback translation 'Failed' is used
    expect(router.navigate).not.toHaveBeenCalledWith(['/']);
  });

  it('should show fallback error on completeTask failure without details', () => {
    initComponent({ ...mockTask, status: 'in_progress' });
    const detailDebugEl = fixture.debugElement.query(By.directive(TaskDetailComponent));
    const comp = detailDebugEl.componentInstance as TaskDetailComponent;
    comp.completeTask();
    httpTesting.expectOne('/api/v1/tasks/1/complete').flush({}, { status: 500, statusText: 'Server Error' });
    // err.error?.error is undefined, so fallback translation 'Complete failed' is used
  });

  it('should show fallback error on accept application failure without details', () => {
    initComponent(mockTask, [mockApplication]);
    const detailDebugEl = fixture.debugElement.query(By.directive(TaskDetailComponent));
    const comp = detailDebugEl.componentInstance as TaskDetailComponent;
    comp.pendingAppId.set(1);
    comp.executeAcceptApp();
    httpTesting.expectOne('/api/v1/applications/1/accept').flush({}, { status: 500, statusText: 'Server Error' });
    // err.error?.error is undefined, triggers fallback translation
  });

  it('should show fallback error on escrow creation failure without details', () => {
    initComponent(mockTask, [mockApplication]);
    const detailDebugEl = fixture.debugElement.query(By.directive(TaskDetailComponent));
    const comp = detailDebugEl.componentInstance as TaskDetailComponent;
    comp.pendingAppId.set(1);
    comp.executeAcceptApp();

    // Accept succeeds
    httpTesting.expectOne('/api/v1/applications/1/accept').flush({ message: 'ok' });
    // Escrow fails with empty body - err.error?.error is undefined
    httpTesting.expectOne('/api/v1/payments/escrow').flush({}, { status: 500, statusText: 'Server Error' });
    // Fallback translation 'Escrow creation failed' is used
  });

  describe('Template branch coverage', () => {
    it('should toggle from loading to task content (destroys spinner block)', () => {
      fixture.detectChanges();
      // Loading state before flush
      expect(fixture.nativeElement.querySelector('nhannht-metro-spinner')).toBeTruthy();

      // Flush — destroys spinner, creates content
      httpTesting.expectOne('/api/v1/tasks/1').flush(mockTask);
      httpTesting.expectOne('/api/v1/tasks/1/applications').flush([]);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('nhannht-metro-spinner')).toBeFalsy();
      expect(fixture.nativeElement.querySelector('nhannht-metro-card')).toBeTruthy();
    });

    it('should toggle from task content to loading (destroys task content block)', () => {
      initComponent();
      const comp = fixture.debugElement.query(By.directive(TaskDetailComponent)).componentInstance as TaskDetailComponent;
      expect(fixture.nativeElement.querySelector('nhannht-metro-card')).toBeTruthy();

      // Destroy task content, show spinner
      comp.loading.set(true);
      comp.task.set(null);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('nhannht-metro-spinner')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('nhannht-metro-card')).toBeFalsy();
    });

    it('should toggle applications panel from hidden to visible (destroys/creates panel)', () => {
      initComponent(mockTask, []);
      const comp = fixture.debugElement.query(By.directive(TaskDetailComponent)).componentInstance as TaskDetailComponent;
      // No applications panel
      expect(fixture.nativeElement.textContent).not.toContain('APPLICATIONS');

      // Add application — creates applications panel
      comp.applications.set([mockApplication]);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('APPLICATIONS');
    });

    it('should toggle applications panel from visible to hidden (destroys applications panel)', () => {
      initComponent(mockTask, [mockApplication]);
      const comp = fixture.debugElement.query(By.directive(TaskDetailComponent)).componentInstance as TaskDetailComponent;
      expect(fixture.nativeElement.textContent).toContain('APPLICATIONS');

      // Remove application — destroys panel
      comp.applications.set([]);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).not.toContain('APPLICATIONS');
    });

    it('should toggle deadline from hidden to visible (destroys/creates deadline block)', () => {
      initComponent({ ...mockTask, deadline: undefined });
      const comp = fixture.debugElement.query(By.directive(TaskDetailComponent)).componentInstance as TaskDetailComponent;
      expect(fixture.nativeElement.textContent).not.toContain('Deadline');

      // Add deadline — creates deadline block
      comp.task.set({ ...mockTask, deadline: '2026-12-25T00:00:00Z' });
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Deadline');
    });

    it('should toggle deadline from visible to hidden (destroys deadline block)', () => {
      initComponent({ ...mockTask, deadline: '2026-12-25T00:00:00Z' });
      const comp = fixture.debugElement.query(By.directive(TaskDetailComponent)).componentInstance as TaskDetailComponent;
      expect(fixture.nativeElement.textContent).toContain('Deadline');

      // Remove deadline — destroys deadline block
      comp.task.set({ ...mockTask, deadline: undefined });
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).not.toContain('Deadline');
    });

    it('should toggle showDeleteDialog from false to true (covers dialog open state)', () => {
      initComponent();
      const comp = fixture.debugElement.query(By.directive(TaskDetailComponent)).componentInstance as TaskDetailComponent;
      expect(comp.showDeleteDialog()).toBe(false);

      // Open dialog
      comp.showDeleteDialog.set(true);
      fixture.detectChanges();
      expect(comp.showDeleteDialog()).toBe(true);

      // Close dialog
      comp.showDeleteDialog.set(false);
      fixture.detectChanges();
      expect(comp.showDeleteDialog()).toBe(false);
    });

    it('should toggle showEscrowDialog from false to true to false', () => {
      initComponent(mockTask, [mockApplication]);
      const comp = fixture.debugElement.query(By.directive(TaskDetailComponent)).componentInstance as TaskDetailComponent;
      expect(comp.showEscrowDialog()).toBe(false);

      comp.showEscrowDialog.set(true);
      fixture.detectChanges();
      expect(comp.showEscrowDialog()).toBe(true);

      comp.showEscrowDialog.set(false);
      fixture.detectChanges();
      expect(comp.showEscrowDialog()).toBe(false);
    });

    it('should toggle overdue badge from hidden to shown (destroys/creates overdue block)', () => {
      initComponent({ ...mockTask, deadline: '2026-12-25T00:00:00Z', is_overdue: false });
      const comp = fixture.debugElement.query(By.directive(TaskDetailComponent)).componentInstance as TaskDetailComponent;
      expect(fixture.nativeElement.textContent).not.toContain('OVERDUE');

      // Make overdue — creates overdue badge block
      comp.task.set({ ...mockTask, deadline: '2020-01-01T00:00:00Z', is_overdue: true });
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('OVERDUE');
    });

    it('should toggle image_urls from populated to empty (destroys image block)', () => {
      initComponent({ ...mockTask, image_urls: ['http://example.com/a.jpg'] });
      expect(fixture.nativeElement.querySelectorAll('img').length).toBe(1);

      const comp = fixture.debugElement.query(By.directive(TaskDetailComponent)).componentInstance as TaskDetailComponent;
      // Remove images — destroys image block
      comp.task.set({ ...mockTask, image_urls: [] });
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('img').length).toBe(0);
    });
  });
});
