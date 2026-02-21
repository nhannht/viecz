import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID, Component } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ApplyTaskComponent } from './apply-task.component';
import { NhannhtMetroSnackbarService } from '../shared/services/nhannht-metro-snackbar.service';
import { Task, TaskApplication } from '../core/models';

const mockTask: Task = {
  id: 1,
  requester_id: 2,
  category_id: 3,
  title: 'Fix my laptop',
  description: 'Screen is broken',
  price: 50000,
  location: 'HCMC',
  status: 'open',
  user_has_applied: false,
  is_overdue: false,
  created_at: '2026-02-14T10:00:00Z',
  updated_at: '2026-02-14T10:00:00Z',
};

const mockApplication: TaskApplication = {
  id: 10,
  task_id: 1,
  tasker_id: 5,
  proposed_price: 45000,
  message: 'I can fix it',
  status: 'pending',
  created_at: '2026-02-14T11:00:00Z',
  updated_at: '2026-02-14T11:00:00Z',
};

@Component({
  standalone: true,
  imports: [ApplyTaskComponent],
  template: `<app-apply-task [id]="taskId" />`,
})
class TestHostComponent {
  taskId = '1';
}

describe('ApplyTaskComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let httpTesting: HttpTestingController;
  let router: Router;
  let snackbarService: NhannhtMetroSnackbarService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    httpTesting = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    snackbarService = TestBed.inject(NhannhtMetroSnackbarService);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    vi.spyOn(snackbarService, 'show');
  });

  afterEach(() => {
    httpTesting.verify();
  });

  function initComponent(task: Task = mockTask) {
    fixture.detectChanges();
    httpTesting.expectOne('/api/v1/tasks/1').flush(task);
    fixture.detectChanges();
  }

  function getApplyComponent(): ApplyTaskComponent {
    const debugEl = fixture.debugElement.query(By.directive(ApplyTaskComponent));
    return debugEl.componentInstance as ApplyTaskComponent;
  }

  it('should create', () => {
    initComponent();
    expect(fixture.componentInstance).toBeTruthy();
    expect(getApplyComponent()).toBeTruthy();
  });

  it('should load task on init and display task title', () => {
    initComponent();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Fix my laptop');
  });

  it('should pre-fill proposed price from task price', () => {
    initComponent();
    const comp = getApplyComponent();
    expect(comp.proposedPrice).toBe(50000);
  });

  it('should display task price', () => {
    initComponent();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('50.000');
  });

  it('should navigate home on task load error', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/v1/tasks/1').flush(
      { error: 'not found' },
      { status: 404, statusText: 'Not Found' },
    );
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should submit application with proposed price and message', () => {
    initComponent();
    const comp = getApplyComponent();
    comp.proposedPrice = 45000;
    comp.message = 'I can fix it';

    comp.submit();

    const req = httpTesting.expectOne('/api/v1/tasks/1/applications');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ proposed_price: 45000, message: 'I can fix it' });
    req.flush(mockApplication);
  });

  it('should navigate to task detail on successful submit', () => {
    initComponent();
    const comp = getApplyComponent();
    comp.proposedPrice = 45000;
    comp.message = 'I can fix it';

    comp.submit();

    httpTesting.expectOne('/api/v1/tasks/1/applications').flush(mockApplication);
    expect(router.navigate).toHaveBeenCalledWith(['/tasks', 1]);
  });

  it('should show error snackbar on submit failure', () => {
    initComponent();
    const comp = getApplyComponent();
    comp.proposedPrice = 45000;

    comp.submit();

    httpTesting.expectOne('/api/v1/tasks/1/applications').flush(
      { error: 'Already applied' },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(snackbarService.show).toHaveBeenCalledWith('Already applied', 'Close', { duration: 3000 });
    expect(comp.submitting()).toBe(false);
  });

  it('should navigate to task detail on cancel', () => {
    initComponent();
    const comp = getApplyComponent();

    comp.cancel();

    expect(router.navigate).toHaveBeenCalledWith(['/tasks', 1]);
  });
});
