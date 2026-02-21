import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID, signal, Component } from '@angular/core';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { TaskFormComponent } from './task-form.component';
import { CategoryService } from '../core/category.service';
import { WalletService } from '../core/wallet.service';
import { NhannhtMetroSnackbarService } from '../shared/services/nhannht-metro-snackbar.service';
import { Category, Task } from '../core/models';

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
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: CategoryService, useValue: categoryService },
        { provide: WalletService, useValue: walletServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: NhannhtMetroSnackbarService, useValue: snackBarSpy },
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
      taskForm.location = 'Library';
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

    it('should include deadline in request when set', () => {
      const taskFormDebug = fixture.debugElement.children[0];
      const taskForm = taskFormDebug.componentInstance as TaskFormComponent;

      taskForm.title = 'Task with Deadline';
      taskForm.description = 'Description';
      taskForm.categoryId = '1';
      taskForm.price = '10000';
      taskForm.location = 'Here';
      taskForm.deadline = '2026-12-25';
      fixture.detectChanges();

      taskForm.onSubmit();

      const req = httpTesting.expectOne('/api/v1/tasks');
      expect(req.request.body.deadline).toBeTruthy();
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
      taskForm.location = 'Here';

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
  });
});
