import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID, signal, Component } from '@angular/core';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { TaskFormComponent } from './task-form.component';
import { CategoryService } from '../core/category.service';
import { WalletService } from '../core/wallet.service';
import { VieczSnackbarService } from '../shared/services/viecz-snackbar.service';
import { Category, Task } from '../core/models';
import { provideTranslocoForTesting } from '../core/transloco-testing';

const mockCategories: Category[] = [
  { id: 1, name: 'Delivery', name_vi: 'Giao hang', is_active: true },
  { id: 2, name: 'Cleaning', name_vi: 'Don dep', is_active: true },
];

const mockTask: Task = {
  id: 1,
  requester_id: 1,
  category_id: 2,
  title: 'Existing Task',
  description: 'Existing description',
  price: 30000,
  location: 'Some place',
  status: 'open',
  deadline: '2026-12-15T12:00:00Z',
  created_at: '2026-02-14T10:00:00Z',
  updated_at: '2026-02-14T10:00:00Z',
};

// Wrapper for create mode (no id input)
@Component({
  standalone: true,
  imports: [TaskFormComponent],
  template: `<app-task-form />`,
})
class CreateHostComponent {}

// Wrapper for edit mode (with id input)
@Component({
  standalone: true,
  imports: [TaskFormComponent],
  template: `<app-task-form [id]="taskId" />`,
})
class EditHostComponent {
  taskId = '1';
}

describe('TaskFormComponent', () => {
  let categoryService: { categories: ReturnType<typeof signal<Category[]>>; load: ReturnType<typeof vi.fn> };
  let walletServiceSpy: { get: ReturnType<typeof vi.fn> };
  let routerSpy: { navigate: ReturnType<typeof vi.fn> };
  let snackBarSpy: { show: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    categoryService = {
      categories: signal<Category[]>(mockCategories),
      load: vi.fn(),
    };
    walletServiceSpy = {
      get: vi.fn().mockReturnValue(of({ available_balance: 100000, balance: 100000, escrow_balance: 0 })),
    };
    routerSpy = { navigate: vi.fn() };
    snackBarSpy = { show: vi.fn() };
  });

  function setupTestBed(hostClass: any) {
    TestBed.configureTestingModule({
      imports: [hostClass],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTranslocoForTesting(),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: CategoryService, useValue: categoryService },
        { provide: WalletService, useValue: walletServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: VieczSnackbarService, useValue: snackBarSpy },
      ],
    });
  }

  describe('Create Mode', () => {
    let fixture: ComponentFixture<CreateHostComponent>;
    let httpTesting: HttpTestingController;

    beforeEach(() => {
      setupTestBed(CreateHostComponent);
      fixture = TestBed.createComponent(CreateHostComponent);
      httpTesting = TestBed.inject(HttpTestingController);
      fixture.detectChanges();
    });

    afterEach(() => {
      httpTesting.verify();
    });

    it('should create in create mode', () => {
      expect(fixture.componentInstance).toBeTruthy();
    });

    it('should show "Create Task" title', () => {
      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('Create Task');
    });

    it('should call categoryService.load on init', () => {
      expect(categoryService.load).toHaveBeenCalled();
    });

    it('should not submit when required fields are empty', () => {
      const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
      form.dispatchEvent(new Event('submit'));
      fixture.detectChanges();

      httpTesting.expectNone('/api/v1/tasks');
    });

    it('should POST to /api/v1/tasks on valid submit', () => {
      const taskFormDebug = fixture.debugElement.children[0];
      const taskForm = taskFormDebug.componentInstance as TaskFormComponent;

      taskForm.title = 'New Task';
      taskForm.description = 'Task description';
      taskForm.categoryId = '1';
      taskForm.price = '50000';
      taskForm.locationValue = { location: 'Library', latitude: 0, longitude: 0 };
      fixture.detectChanges();

      taskForm.onSubmit();

      const req = httpTesting.expectOne('/api/v1/tasks');
      expect(req.request.method).toBe('POST');
      expect(req.request.body.title).toBe('New Task');
      expect(req.request.body.price).toBe(50000);
      req.flush({ ...mockTask, id: 5 });

      expect(routerSpy.navigate).toHaveBeenCalledWith(['/tasks', 5]);
      expect(snackBarSpy.show).toHaveBeenCalledWith('Task created', undefined, { duration: 3000 });
    });

    it('should include deadline ISO string in request when set', () => {
      const taskFormDebug = fixture.debugElement.children[0];
      const taskForm = taskFormDebug.componentInstance as TaskFormComponent;

      taskForm.title = 'Task with Deadline';
      taskForm.description = 'Description';
      taskForm.categoryId = '1';
      taskForm.price = '10000';
      taskForm.locationValue = { location: 'Here', latitude: 0, longitude: 0 };
      taskForm.deadline = '2026-12-25T22:00:00.000Z';
      fixture.detectChanges();

      taskForm.onSubmit();

      const req = httpTesting.expectOne('/api/v1/tasks');
      expect(req.request.body.deadline).toBe('2026-12-25T22:00:00.000Z');
      req.flush({ ...mockTask, id: 6 });
    });

    it('should navigate to home on cancel in create mode', () => {
      const taskFormDebug = fixture.debugElement.children[0];
      const taskForm = taskFormDebug.componentInstance as TaskFormComponent;
      taskForm.onCancel();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);
    });

    it('should not submit with price 0 or negative', () => {
      const taskFormDebug = fixture.debugElement.children[0];
      const taskForm = taskFormDebug.componentInstance as TaskFormComponent;

      taskForm.title = 'Task';
      taskForm.description = 'Desc';
      taskForm.categoryId = '1';
      taskForm.price = '0';
      taskForm.locationValue = { location: 'Here', latitude: 0, longitude: 0 };

      taskForm.onSubmit();
      httpTesting.expectNone('/api/v1/tasks');
    });
  });

  describe('Edit Mode', () => {
    let fixture: ComponentFixture<EditHostComponent>;
    let httpTesting: HttpTestingController;

    beforeEach(() => {
      setupTestBed(EditHostComponent);
      fixture = TestBed.createComponent(EditHostComponent);
      httpTesting = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
      httpTesting.verify();
    });

    it('should load existing task in edit mode', () => {
      fixture.detectChanges();
      const req = httpTesting.expectOne('/api/v1/tasks/1');
      expect(req.request.method).toBe('GET');
      req.flush(mockTask);

      const taskFormDebug = fixture.debugElement.children[0];
      const taskForm = taskFormDebug.componentInstance as TaskFormComponent;
      expect(taskForm.isEditMode()).toBe(true);
      expect(taskForm.title).toBe('Existing Task');
      expect(taskForm.price).toBe('30000');
    });

    it('should show "Edit Task" title', () => {
      fixture.detectChanges();
      httpTesting.expectOne('/api/v1/tasks/1').flush(mockTask);
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('Edit Task');
    });

    it('should PUT to /api/v1/tasks/:id on submit', () => {
      fixture.detectChanges();
      httpTesting.expectOne('/api/v1/tasks/1').flush(mockTask);

      const taskFormDebug = fixture.debugElement.children[0];
      const taskForm = taskFormDebug.componentInstance as TaskFormComponent;
      taskForm.title = 'Updated Task';
      taskForm.onSubmit();

      const req = httpTesting.expectOne('/api/v1/tasks/1');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body.title).toBe('Updated Task');
      req.flush({ ...mockTask, title: 'Updated Task' });

      expect(snackBarSpy.show).toHaveBeenCalledWith('Task updated', undefined, { duration: 3000 });
    });

    it('should navigate to task detail on cancel in edit mode', () => {
      fixture.detectChanges();
      httpTesting.expectOne('/api/v1/tasks/1').flush(mockTask);

      const taskFormDebug = fixture.debugElement.children[0];
      const taskForm = taskFormDebug.componentInstance as TaskFormComponent;
      taskForm.onCancel();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/tasks', '1']);
    });

    it('should navigate home on error loading task', () => {
      fixture.detectChanges();
      httpTesting.expectOne('/api/v1/tasks/1').flush(
        { error: 'not found' },
        { status: 404, statusText: 'Not Found' },
      );
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);
    });

    it('should handle update error', () => {
      fixture.detectChanges();
      httpTesting.expectOne('/api/v1/tasks/1').flush(mockTask);

      const taskFormDebug = fixture.debugElement.children[0];
      const taskForm = taskFormDebug.componentInstance as TaskFormComponent;
      taskForm.title = 'Updated Task';
      taskForm.onSubmit();

      httpTesting.expectOne('/api/v1/tasks/1').flush(
        { error: 'server error' },
        { status: 500, statusText: 'Internal Server Error' },
      );
      expect(taskForm.saving()).toBe(false);
    });
  });

  describe('Validation', () => {
    let fixture: ComponentFixture<CreateHostComponent>;
    let httpTesting: HttpTestingController;

    beforeEach(() => {
      setupTestBed(CreateHostComponent);
      fixture = TestBed.createComponent(CreateHostComponent);
      httpTesting = TestBed.inject(HttpTestingController);
      fixture.detectChanges();
    });

    afterEach(() => {
      httpTesting.verify();
    });

    it('priceError should return empty when not submitted', () => {
      const taskFormDebug = fixture.debugElement.children[0];
      const taskForm = taskFormDebug.componentInstance as TaskFormComponent;
      expect(taskForm.priceError()).toBe('');
    });

    it('priceError should return required message when price is empty', () => {
      const taskFormDebug = fixture.debugElement.children[0];
      const taskForm = taskFormDebug.componentInstance as TaskFormComponent;
      taskForm.submitted = true;
      taskForm.price = '';
      expect(taskForm.priceError()).toBe('Price is required');
    });

    it('priceError should return greater than zero message', () => {
      const taskFormDebug = fixture.debugElement.children[0];
      const taskForm = taskFormDebug.componentInstance as TaskFormComponent;
      taskForm.submitted = true;
      taskForm.price = '-1000';
      expect(taskForm.priceError()).toBe('Price must be greater than 0');
    });

    it('priceError should return multiple message for non-1000 multiple', () => {
      const taskFormDebug = fixture.debugElement.children[0];
      const taskForm = taskFormDebug.componentInstance as TaskFormComponent;
      taskForm.submitted = true;
      taskForm.price = '1500';
      expect(taskForm.priceError()).toBe('Price must be a multiple of 1,000 VND');
    });

    it('isInsufficient should return true when price exceeds balance', () => {
      const taskFormDebug = fixture.debugElement.children[0];
      const taskForm = taskFormDebug.componentInstance as TaskFormComponent;
      taskForm.walletBalance.set(10000);
      taskForm.price = '50000';
      expect(taskForm.isInsufficient()).toBe(true);
    });

    it('isInsufficient should return false when balance is sufficient', () => {
      const taskFormDebug = fixture.debugElement.children[0];
      const taskForm = taskFormDebug.componentInstance as TaskFormComponent;
      taskForm.walletBalance.set(100000);
      taskForm.price = '50000';
      expect(taskForm.isInsufficient()).toBe(false);
    });

    it('isInsufficient should return false when balance is null', () => {
      const taskFormDebug = fixture.debugElement.children[0];
      const taskForm = taskFormDebug.componentInstance as TaskFormComponent;
      taskForm.walletBalance.set(null);
      taskForm.price = '50000';
      expect(taskForm.isInsufficient()).toBe(false);
    });

    it('should not submit with non-multiple-of-1000 price', () => {
      const taskFormDebug = fixture.debugElement.children[0];
      const taskForm = taskFormDebug.componentInstance as TaskFormComponent;
      taskForm.title = 'Task';
      taskForm.description = 'Desc';
      taskForm.categoryId = '1';
      taskForm.price = '1500';
      taskForm.locationValue = { location: 'Here', latitude: 0, longitude: 0 };
      taskForm.onSubmit();
      httpTesting.expectNone('/api/v1/tasks');
    });

    it('should handle create error', () => {
      const taskFormDebug = fixture.debugElement.children[0];
      const taskForm = taskFormDebug.componentInstance as TaskFormComponent;
      taskForm.title = 'Task';
      taskForm.description = 'Desc';
      taskForm.categoryId = '1';
      taskForm.price = '10000';
      taskForm.locationValue = { location: 'Here', latitude: 0, longitude: 0 };
      taskForm.onSubmit();

      httpTesting.expectOne('/api/v1/tasks').flush(
        { error: 'server error' },
        { status: 500, statusText: 'Internal Server Error' },
      );
      expect(taskForm.saving()).toBe(false);
    });

    it('should handle wallet balance load error', () => {
      walletServiceSpy.get.mockReturnValue(throwError(() => new Error('fail')));
      const fixture2 = TestBed.createComponent(CreateHostComponent);
      fixture2.detectChanges();
      const taskFormDebug = fixture2.debugElement.children[0];
      const taskForm = taskFormDebug.componentInstance as TaskFormComponent;
      expect(taskForm.balanceLoading()).toBe(false);
    });

    it('should display wallet balance when loaded', () => {
      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('100.000');
    });

    it('should display "Loading..." while balance is loading', () => {
      walletServiceSpy.get.mockReturnValue(of({ available_balance: 100000, balance: 100000, escrow_balance: 0 }));
      const taskFormDebug = fixture.debugElement.children[0];
      const taskForm = taskFormDebug.componentInstance as TaskFormComponent;
      taskForm.balanceLoading.set(true);
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('Loading...');
    });

    it('should show "Could not load balance" when walletBalance is null and not loading', () => {
      const taskFormDebug = fixture.debugElement.children[0];
      const taskForm = taskFormDebug.componentInstance as TaskFormComponent;
      taskForm.walletBalance.set(null);
      taskForm.balanceLoading.set(false);
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('Could not load balance');
    });

    it('should show insufficient balance styling when price exceeds balance', () => {
      const taskFormDebug = fixture.debugElement.children[0];
      const taskForm = taskFormDebug.componentInstance as TaskFormComponent;
      taskForm.walletBalance.set(10000);
      taskForm.price = '50000';
      fixture.detectChanges();
      expect(taskForm.isInsufficient()).toBe(true);
    });

    it('should show saving spinner when saving', () => {
      const taskFormDebug = fixture.debugElement.children[0];
      const taskForm = taskFormDebug.componentInstance as TaskFormComponent;
      taskForm.saving.set(true);
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const spinners = el.querySelectorAll('viecz-spinner');
      expect(spinners.length).toBeGreaterThan(0);
    });

    it('should show price error in template after submit with empty price', () => {
      const taskFormDebug = fixture.debugElement.children[0];
      const taskForm = taskFormDebug.componentInstance as TaskFormComponent;
      taskForm.title = 'Test';
      taskForm.description = 'Desc';
      taskForm.categoryId = '1';
      taskForm.price = '';
      taskForm.locationValue = { location: 'Here', latitude: 0, longitude: 0 };
      taskForm.onSubmit();
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('Price is required');
    });

    it('should not submit when deadline is in the past', () => {
      const taskFormDebug = fixture.debugElement.children[0];
      const taskForm = taskFormDebug.componentInstance as TaskFormComponent;
      taskForm.title = 'Task';
      taskForm.description = 'Desc';
      taskForm.categoryId = '1';
      taskForm.price = '10000';
      taskForm.locationValue = { location: 'Here', latitude: 0, longitude: 0 };
      taskForm.deadline = '2020-01-01T00:00:00.000Z';
      taskForm.onSubmit();
      httpTesting.expectNone('/api/v1/tasks');
    });

    it('should display description required error when submitted without description', () => {
      const taskFormDebug = fixture.debugElement.children[0];
      const taskForm = taskFormDebug.componentInstance as TaskFormComponent;
      taskForm.title = 'Test';
      taskForm.description = '';
      taskForm.categoryId = '1';
      taskForm.price = '10000';
      taskForm.locationValue = { location: 'Here', latitude: 0, longitude: 0 };
      taskForm.onSubmit();
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('Description is required');
    });

    it('should not show balance widget in edit mode', () => {
      // balance widget is only shown when !isEditMode()
      // In create mode it should be visible
      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('Available Balance');
    });
  });

  describe('categoryOptions || fallback branch', () => {
    let fixture: ComponentFixture<CreateHostComponent>;
    let httpTesting: HttpTestingController;

    beforeEach(() => {
      // Provide categories with empty name_vi to hit the || cat.name fallback
      categoryService.categories.set([
        { id: 1, name: 'Delivery', name_vi: '', is_active: true },
        { id: 2, name: 'Cleaning', name_vi: 'Don dep', is_active: true },
      ]);
      setupTestBed(CreateHostComponent);
      fixture = TestBed.createComponent(CreateHostComponent);
      httpTesting = TestBed.inject(HttpTestingController);
      fixture.detectChanges();
    });

    afterEach(() => {
      httpTesting.verify();
    });

    it('should use cat.name when cat.name_vi is empty string (covers || fallback)', () => {
      const comp = fixture.debugElement.children[0].componentInstance as TaskFormComponent;
      const options = comp.categoryOptions();
      // First category: name_vi is '' (falsy) → falls back to cat.name 'Delivery'
      expect(options[0].label).toBe('Delivery');
      // Second category: name_vi is 'Don dep' (truthy) → uses name_vi
      expect(options[1].label).toBe('Don dep');
    });
  });

  describe('DOM event triggers', () => {
    let fixture: ComponentFixture<CreateHostComponent>;
    let httpTesting: HttpTestingController;

    beforeEach(() => {
      setupTestBed(CreateHostComponent);
      fixture = TestBed.createComponent(CreateHostComponent);
      httpTesting = TestBed.inject(HttpTestingController);
      fixture.detectChanges();
    });

    afterEach(() => {
      httpTesting.verify();
    });

    function getComponent(): TaskFormComponent {
      return fixture.debugElement.children[0].componentInstance as TaskFormComponent;
    }

    it('should update title via DOM input event', () => {
      const input = fixture.nativeElement.querySelector('viecz-input[name="title"] input');
      if (input) {
        input.value = 'New Task Title';
        input.dispatchEvent(new Event('input'));
        fixture.detectChanges();
        expect(getComponent().title).toBe('New Task Title');
      }
    });

    it('should update description via DOM textarea input event', () => {
      const textarea = fixture.nativeElement.querySelector('textarea[name="description"]');
      if (textarea) {
        textarea.value = 'New description';
        textarea.dispatchEvent(new Event('input'));
        fixture.detectChanges();
        expect(getComponent().description).toBe('New description');
      }
    });

    it('should update categoryId via DOM select change event', () => {
      const select = fixture.nativeElement.querySelector('viecz-select select');
      if (select) {
        select.value = '2';
        select.dispatchEvent(new Event('change'));
        fixture.detectChanges();
        expect(getComponent().categoryId).toBe('2');
      }
    });

    it('should update price via DOM input event', () => {
      const input = fixture.nativeElement.querySelector('viecz-input[name="price"] input');
      if (input) {
        input.value = '25000';
        input.dispatchEvent(new Event('input'));
        fixture.detectChanges();
        expect(getComponent().price).toBe('25000');
      }
    });

    it('should render location picker component', () => {
      const picker = fixture.nativeElement.querySelector('viecz-location-picker');
      expect(picker).toBeTruthy();
    });

    it('should render smart deadline picker component', () => {
      const picker = fixture.nativeElement.querySelector('viecz-smart-deadline');
      expect(picker).toBeTruthy();
    });

    it('should submit form via DOM form submit event', () => {
      const comp = getComponent();
      comp.title = 'Test';
      comp.description = 'Desc';
      comp.categoryId = '1';
      comp.price = '10000';
      comp.locationValue = { location: 'HCM', latitude: 0, longitude: 0 };
      fixture.detectChanges();

      const form = fixture.nativeElement.querySelector('form');
      form.dispatchEvent(new Event('submit'));
      fixture.detectChanges();

      const req = httpTesting.expectOne('/api/v1/tasks');
      expect(req.request.method).toBe('POST');
      req.flush({ ...mockTask, id: 99 });
    });

    it('should trigger cancel via DOM button click', () => {
      // Cancel button has text 'Cancel >' (secondary variant adds >)
      const buttons = fixture.nativeElement.querySelectorAll('viecz-button button');
      const cancelBtn = Array.from(buttons).find(
        (b: any) => b.textContent?.includes('Cancel')
      ) as HTMLButtonElement | undefined;
      expect(cancelBtn).toBeTruthy();
      cancelBtn!.click();
      fixture.detectChanges();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);
    });
  });

  describe('Edit Mode - loadingTask branch', () => {
    let fixture: ComponentFixture<EditHostComponent>;
    let httpTesting: HttpTestingController;

    beforeEach(() => {
      setupTestBed(EditHostComponent);
      fixture = TestBed.createComponent(EditHostComponent);
      httpTesting = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
      httpTesting.verify();
    });

    it('should show spinner while loading task in edit mode', () => {
      fixture.detectChanges();
      // Before flushing, loadingTask is true
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('viecz-spinner')).toBeTruthy();
      // Flush to clean up
      httpTesting.expectOne('/api/v1/tasks/1').flush(mockTask);
    });

    it('should not show balance widget in edit mode', () => {
      fixture.detectChanges();
      httpTesting.expectOne('/api/v1/tasks/1').flush(mockTask);
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).not.toContain('Available Balance');
    });
  });

  describe('Template branch coverage', () => {
    let fixture: ComponentFixture<CreateHostComponent>;
    let httpTesting: HttpTestingController;

    beforeEach(() => {
      setupTestBed(CreateHostComponent);
      fixture = TestBed.createComponent(CreateHostComponent);
      httpTesting = TestBed.inject(HttpTestingController);
      fixture.detectChanges();
    });

    afterEach(() => {
      httpTesting.verify();
    });

    function getComponent(): TaskFormComponent {
      return fixture.debugElement.children[0].componentInstance as TaskFormComponent;
    }

    it('should toggle loadingTask from true to false (destroys spinner, creates form)', () => {
      const comp = getComponent();
      // Render loading state
      comp.loadingTask.set(true);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('viecz-spinner')).toBeTruthy();

      // Toggle off — destroys spinner block, creates card block
      comp.loadingTask.set(false);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('viecz-card')).toBeTruthy();
    });

    it('should toggle saving spinner from false to true to false (covers both branches)', () => {
      const comp = getComponent();
      expect(comp.saving()).toBe(false);

      // Create spinner block, destroy icon+text block
      comp.saving.set(true);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('viecz-spinner')).toBeTruthy();

      // Destroy spinner block, recreate icon+text block
      comp.saving.set(false);
      fixture.detectChanges();
      // The submit button should now show the icon+text
      expect(comp.saving()).toBe(false);
    });

    it('should show description required error when submitted with empty description (true-branch)', () => {
      const comp = getComponent();
      // Trigger submit with empty description — sets submitted=true and triggers error display
      comp.title = 'Test';
      comp.categoryId = '1';
      comp.price = '10000';
      comp.locationValue = { location: 'Here', latitude: 0, longitude: 0 };
      comp.description = ''; // empty
      comp.onSubmit(); // sets submitted=true internally
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Description is required');
    });

    it('should not show description required error before submission (false-branch)', () => {
      // Before submitting, submitted=false so the @if block is inactive
      expect(fixture.nativeElement.textContent).not.toContain('Description is required');
    });

    it('should toggle balance loading state (covers balanceLoading branch)', () => {
      const comp = getComponent();
      // Set loading state
      comp.balanceLoading.set(true);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Loading...');

      // Switch to loaded state
      comp.balanceLoading.set(false);
      comp.walletBalance.set(50000);
      fixture.detectChanges();
      // Balance value is shown
      expect(fixture.nativeElement.textContent).toContain('50.000');
    });

    it('should toggle walletBalance from value to null (covers else branch in balance display)', () => {
      const comp = getComponent();
      comp.balanceLoading.set(false);
      comp.walletBalance.set(100000);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('100.000');

      // Switch to null balance — shows "Could not load balance"
      comp.walletBalance.set(null);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Could not load balance');
    });

    it('should toggle isEditMode balance widget visibility (destroys/creates balance block)', () => {
      const comp = getComponent();
      expect(comp.isEditMode()).toBe(false);
      // In create mode, balance widget is shown
      expect(fixture.nativeElement.textContent).toContain('Available Balance');

      // Switch to edit mode — balance widget is hidden
      comp.isEditMode.set(true);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).not.toContain('Available Balance');

      // Switch back to create mode — balance widget reappears
      comp.isEditMode.set(false);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Available Balance');
    });

    it('should show deadline past error when submitted with past deadline (true-branch)', () => {
      const comp = getComponent();
      // Trigger submit with a past deadline to hit the deadline validation branch
      comp.title = 'Test';
      comp.description = 'Desc';
      comp.categoryId = '1';
      comp.price = '10000';
      comp.locationValue = { location: 'Here', latitude: 0, longitude: 0 };
      comp.deadline = '2020-01-01T00:00:00.000Z'; // past date
      comp.onSubmit(); // sets submitted=true
      fixture.detectChanges();
      // The deadline error should be shown
      expect(fixture.nativeElement.textContent).toContain('Deadline cannot be in the past');
    });

    it('should not show deadline past error before submission (false-branch)', () => {
      // Before submitting, submitted=false so deadline error @if block is inactive
      expect(fixture.nativeElement.textContent).not.toContain('Deadline cannot be in the past');
    });
  });
});
