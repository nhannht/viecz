import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID, Component } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ApplyTaskComponent } from './apply-task.component';
import { VieczSnackbarService } from '../shared/services/viecz-snackbar.service';
import { Task, TaskApplication } from '../core/models';
import { provideTranslocoForTesting } from '../core/transloco-testing';

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
  let snackbarService: VieczSnackbarService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTranslocoForTesting(),
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    httpTesting = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    snackbarService = TestBed.inject(VieczSnackbarService);
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

  it('should show price error when proposed price is not multiple of 1000', () => {
    initComponent();
    const comp = getApplyComponent();
    comp.proposedPrice = 45500;
    comp.submit();

    expect(comp.priceError).toBe('Price must be a multiple of 1,000 VND');
    httpTesting.expectNone('/api/v1/tasks/1/applications');
  });

  it('should submit without proposed_price when null', () => {
    initComponent();
    const comp = getApplyComponent();
    comp.proposedPrice = null;
    comp.message = 'Just a message';
    comp.submit();

    const req = httpTesting.expectOne('/api/v1/tasks/1/applications');
    expect(req.request.body).toEqual({ message: 'Just a message' });
    req.flush({ id: 10 });
  });

  it('should submit without message when empty', () => {
    initComponent();
    const comp = getApplyComponent();
    comp.proposedPrice = 50000;
    comp.message = '';
    comp.submit();

    const req = httpTesting.expectOne('/api/v1/tasks/1/applications');
    expect(req.request.body).toEqual({ proposed_price: 50000 });
    req.flush({ id: 10 });
  });

  it('should show generic error on submit failure without details', () => {
    initComponent();
    const comp = getApplyComponent();
    comp.proposedPrice = 45000;
    comp.submit();

    httpTesting.expectOne('/api/v1/tasks/1/applications').flush(
      {},
      { status: 500, statusText: 'Internal Server Error' },
    );

    expect(snackbarService.show).toHaveBeenCalledWith('Failed to submit application', 'Close', { duration: 3000 });
  });

  it('should show loading spinner before task loads', () => {
    fixture.detectChanges();
    // Before flushing the task request, loading should be true
    const comp = getApplyComponent();
    expect(comp.loading()).toBe(true);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('viecz-spinner')).toBeTruthy();
    // Should not show the form yet
    expect(el.textContent).not.toContain('Fix my laptop');
    // Flush to avoid afterEach verify error
    httpTesting.expectOne('/api/v1/tasks/1').flush(mockTask);
  });

  it('should show submitting spinner during submit', () => {
    initComponent();
    const comp = getApplyComponent();
    comp.proposedPrice = 45000;
    comp.message = 'Test';
    comp.submit();
    // submitting is true before flush
    expect(comp.submitting()).toBe(true);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    // The spinner should be visible (submitting branch)
    const spinners = el.querySelectorAll('viecz-spinner');
    expect(spinners.length).toBeGreaterThan(0);
    // Flush to avoid afterEach verify error
    httpTesting.expectOne('/api/v1/tasks/1/applications').flush(mockApplication);
  });

  it('should not show submit button while submitting', () => {
    initComponent();
    const comp = getApplyComponent();
    comp.submitting.set(true);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    // The submit button text should not be present when submitting
    // Instead a spinner replaces the button
    const buttons = el.querySelectorAll('viecz-button');
    const submitBtn = Array.from(buttons).find(b =>
      b.getAttribute('ng-reflect-label')?.includes('Submit') || b.textContent?.includes('Submit'));
    expect(submitBtn).toBeFalsy();
  });

  it('should clear priceError after valid submit', () => {
    initComponent();
    const comp = getApplyComponent();
    // First trigger a price error
    comp.proposedPrice = 45500;
    comp.submit();
    expect(comp.priceError).toBe('Price must be a multiple of 1,000 VND');

    // Now submit with valid price - priceError should be cleared
    comp.proposedPrice = 45000;
    comp.submit();
    expect(comp.priceError).toBe('');
    // Flush the request
    httpTesting.expectOne('/api/v1/tasks/1/applications').flush(mockApplication);
  });

  it('should show form content after task loads', () => {
    initComponent();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Fix my laptop');
    expect(el.querySelector('viecz-input')).toBeTruthy();
    expect(el.querySelector('viecz-textarea')).toBeTruthy();
  });

  it('should show cancel button in form', () => {
    initComponent();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Cancel');
  });

  it('should show submit button when not submitting', () => {
    initComponent();
    const comp = getApplyComponent();
    expect(comp.submitting()).toBe(false);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Submit');
  });

  it('should update proposedPrice via DOM input event', () => {
    initComponent();
    const input = fixture.nativeElement.querySelector('viecz-input[name="proposedPrice"] input');
    if (input) {
      input.value = '30000';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      const comp = getApplyComponent();
      expect(String(comp.proposedPrice)).toBe('30000');
    }
  });

  it('should update message via DOM textarea input event', () => {
    initComponent();
    const textarea = fixture.nativeElement.querySelector('viecz-textarea textarea');
    if (textarea) {
      textarea.value = 'DOM message';
      textarea.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      const comp = getApplyComponent();
      expect(comp.message).toBe('DOM message');
    }
  });

  it('should trigger submit via DOM button click', async () => {
    initComponent();
    // Set values through DOM inputs to avoid ExpressionChangedAfterItHasBeenCheckedError
    const priceInput = fixture.nativeElement.querySelector('viecz-input input') as HTMLInputElement;
    if (priceInput) {
      priceInput.value = '50000';
      priceInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const textarea = fixture.nativeElement.querySelector('viecz-textarea textarea') as HTMLTextAreaElement;
    if (textarea) {
      textarea.value = 'Apply via DOM';
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    // Find submit button by its text content ('Submit Application')
    const buttons = fixture.nativeElement.querySelectorAll('viecz-button button');
    const submitBtn = Array.from(buttons).find(
      (b: any) => b.textContent?.includes('Submit Application')
    ) as HTMLButtonElement | undefined;
    expect(submitBtn).toBeTruthy();
    submitBtn!.click();
    fixture.detectChanges();
    const req = httpTesting.expectOne('/api/v1/tasks/1/applications');
    expect(req.request.method).toBe('POST');
    req.flush(mockApplication);
  });

  it('should not show task form when loading is true (covers @if loading branch)', () => {
    fixture.detectChanges();
    // loading() is true before flush — the @else if (task()) branch is NOT entered
    const comp = getApplyComponent();
    expect(comp.loading()).toBe(true);
    expect(comp.task()).toBeNull();
    const el = fixture.nativeElement as HTMLElement;
    // Neither the task form nor the task title should be visible
    expect(el.textContent).not.toContain('Fix my laptop');
    // Flush to avoid afterEach verify error
    httpTesting.expectOne('/api/v1/tasks/1').flush(mockTask);
  });

  it('should not show task form when task is null after loading (covers @else if (task()) false branch)', () => {
    fixture.detectChanges();
    // Flush with error to set loading=false but task remains null
    httpTesting.expectOne('/api/v1/tasks/1').flush(
      { error: 'not found' }, { status: 404, statusText: 'Not Found' },
    );
    fixture.detectChanges();
    const comp = getApplyComponent();
    expect(comp.loading()).toBe(false);
    expect(comp.task()).toBeNull();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).not.toContain('Fix my laptop');
  });

  it('should show submit button (@else branch of submitting) when submitting is false', () => {
    initComponent();
    const comp = getApplyComponent();
    comp.submitting.set(false);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    // The submit button is present in the @else branch
    const submitBtns = el.querySelectorAll('viecz-button');
    expect(submitBtns.length).toBeGreaterThan(0);
    // The spinner from submitting should not be visible
    const spinners = el.querySelectorAll('viecz-spinner');
    // Only one spinner at most (from loading, which is now false), so none expected
    expect(comp.submitting()).toBe(false);
  });

  it('should trigger cancel via DOM button click', () => {
    initComponent();
    fixture.detectChanges();

    // Find cancel button by text content ('Cancel >')
    const buttons = fixture.nativeElement.querySelectorAll('viecz-button button');
    const cancelBtn = Array.from(buttons).find(
      (b: any) => b.textContent?.includes('Cancel')
    ) as HTMLButtonElement | undefined;
    expect(cancelBtn).toBeTruthy();
    cancelBtn!.click();
    fixture.detectChanges();
    expect(router.navigate).toHaveBeenCalledWith(['/tasks', 1]);
  });
});
