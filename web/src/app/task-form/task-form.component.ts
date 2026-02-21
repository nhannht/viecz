import { Component, inject, OnInit, signal, input, computed } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../core/task.service';
import { CategoryService } from '../core/category.service';
import { WalletService } from '../core/wallet.service';
import { VndPipe } from '../core/pipes';
import { NhannhtMetroCardComponent } from '../shared/components/nhannht-metro-card.component';
import { NhannhtMetroInputComponent } from '../shared/components/nhannht-metro-input.component';
import { NhannhtMetroSelectComponent } from '../shared/components/nhannht-metro-select.component';
import { NhannhtMetroDatepickerComponent } from '../shared/components/nhannht-metro-datepicker.component';
import { NhannhtMetroButtonComponent } from '../shared/components/nhannht-metro-button.component';
import { NhannhtMetroIconComponent } from '../shared/components/nhannht-metro-icon.component';
import { NhannhtMetroSpinnerComponent } from '../shared/components/nhannht-metro-spinner.component';
import { NhannhtMetroSnackbarService } from '../shared/services/nhannht-metro-snackbar.service';

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [
    FormsModule,
    VndPipe,
    NhannhtMetroCardComponent,
    NhannhtMetroInputComponent,
    NhannhtMetroSelectComponent,
    NhannhtMetroDatepickerComponent,
    NhannhtMetroButtonComponent,
    NhannhtMetroIconComponent,
    NhannhtMetroSpinnerComponent,
  ],
  template: `
    @if (loadingTask()) {
      <div class="flex justify-center py-16"><nhannht-metro-spinner [size]="40" /></div>
    } @else {
      <nhannht-metro-card class="block max-w-[700px] mx-auto">
        <h2 class="font-display text-[11px] tracking-[1px] text-fg uppercase mb-4">
          {{ isEditMode() ? 'Edit Task' : 'Create Task' }}
        </h2>
        <form class="flex flex-col gap-1 pt-4" (ngSubmit)="onSubmit()">
          <nhannht-metro-input
            label="TITLE"
            placeholder="What do you need help with?"
            [(ngModel)]="title" name="title"
            [error]="submitted && !title ? 'Title is required' : ''" />

          <div class="flex flex-col gap-1">
            <label class="font-display text-[10px] tracking-[1px] text-fg">DESCRIPTION</label>
            <textarea
              class="w-full px-4 py-3 bg-card border border-border font-body text-[13px] text-fg
                     placeholder:text-muted focus:border-fg focus:outline-none transition-colors duration-200"
              [(ngModel)]="description" name="description" rows="5"
              placeholder="Describe the task in detail"></textarea>
            @if (submitted && !description) {
              <span class="font-body text-[11px] text-fg" role="alert">Description is required</span>
            }
          </div>

          <nhannht-metro-select
            label="CATEGORY"
            placeholder="Select a category"
            [options]="categoryOptions()"
            [(ngModel)]="categoryId" name="categoryId"
            [error]="submitted && !categoryId ? 'Category is required' : ''" />

          @if (!isEditMode()) {
            <div class="flex items-center gap-3 p-3 mb-2"
                 [class.bg-fg]="!isInsufficient()"
                 [class.text-bg]="!isInsufficient()"
                 [class.bg-card]="isInsufficient()"
                 [class.border]="isInsufficient()"
                 [class.border-fg]="isInsufficient()"
                 [class.text-fg]="isInsufficient()">
              <nhannht-metro-icon name="account_balance_wallet" />
              <div class="flex flex-col">
                <span class="font-body text-[10px] opacity-80">Available Balance</span>
                <span class="font-body text-[15px] font-semibold">
                  @if (balanceLoading()) {
                    Loading...
                  } @else if (walletBalance() !== null) {
                    {{ walletBalance()! | vnd }}
                  } @else {
                    Could not load balance
                  }
                </span>
              </div>
            </div>
          }

          <div class="flex max-sm:flex-col gap-4">
            <nhannht-metro-input class="flex-1"
              label="PRICE (VND)"
              type="number"
              placeholder="e.g. 50000"
              [(ngModel)]="price" name="price"
              [error]="submitted && (!price || +price <= 0) ? 'Price must be greater than 0' : ''" />

            <nhannht-metro-input class="flex-1"
              label="LOCATION"
              placeholder="Where is this task?"
              [(ngModel)]="location" name="location"
              [error]="submitted && !location ? 'Location is required' : ''" />
          </div>

          <nhannht-metro-datepicker
            label="DEADLINE"
            [(ngModel)]="deadline" name="deadline" />

          <div class="flex justify-end gap-3 pt-4">
            <nhannht-metro-button
              variant="secondary"
              label="Cancel"
              type="button"
              (clicked)="onCancel()" />
            <nhannht-metro-button
              variant="primary"
              [disabled]="saving()"
              type="submit">
              @if (saving()) {
                <nhannht-metro-spinner [size]="20" />
              } @else {
                <span class="inline-flex items-center gap-2">
                  <nhannht-metro-icon [name]="isEditMode() ? 'save' : 'add'" [size]="18" />
                  {{ isEditMode() ? 'Save Changes' : 'Create Task' }}
                </span>
              }
            </nhannht-metro-button>
          </div>
        </form>
      </nhannht-metro-card>
    }
  `,
})
export class TaskFormComponent implements OnInit {
  id = input<string>();

  private taskService = inject(TaskService);
  private categoryService = inject(CategoryService);
  private walletService = inject(WalletService);
  private router = inject(Router);
  private snackBar = inject(NhannhtMetroSnackbarService);

  isEditMode = signal(false);
  loadingTask = signal(false);
  saving = signal(false);
  submitted = false;
  walletBalance = signal<number | null>(null);
  balanceLoading = signal(true);

  categoryOptions = computed(() =>
    this.categoryService.categories().map(cat => ({
      value: String(cat.id),
      label: cat.name_vi || cat.name,
    }))
  );

  title = '';
  description = '';
  categoryId = '';
  price = '';
  location = '';
  deadline = '';

  ngOnInit() {
    this.categoryService.load();
    this.walletService.get().subscribe({
      next: wallet => {
        this.walletBalance.set(wallet.available_balance);
        this.balanceLoading.set(false);
      },
      error: () => this.balanceLoading.set(false),
    });
    const taskId = this.id();
    if (taskId) {
      this.isEditMode.set(true);
      this.loadingTask.set(true);
      this.taskService.get(Number(taskId)).subscribe({
        next: task => {
          this.title = task.title;
          this.description = task.description;
          this.categoryId = String(task.category_id);
          this.price = String(task.price);
          this.location = task.location;
          this.deadline = task.deadline ? task.deadline.split('T')[0] : '';
          this.loadingTask.set(false);
        },
        error: () => {
          this.snackBar.show('Task not found', undefined, { duration: 3000 });
          this.router.navigate(['/']);
          this.loadingTask.set(false);
        },
      });
    }
  }

  isInsufficient(): boolean {
    const balance = this.walletBalance();
    const p = Number(this.price);
    return balance !== null && p > 0 && p > balance;
  }

  onSubmit() {
    this.submitted = true;
    if (!this.title || !this.description || !this.categoryId || !this.price || Number(this.price) <= 0 || !this.location) {
      return;
    }

    this.saving.set(true);
    const body: Record<string, unknown> = {
      title: this.title,
      description: this.description,
      category_id: Number(this.categoryId),
      price: Number(this.price),
      location: this.location,
    };
    if (this.deadline) {
      body['deadline'] = new Date(this.deadline).toISOString();
    }

    if (this.isEditMode()) {
      this.taskService.update(Number(this.id()), body).subscribe({
        next: task => {
          this.snackBar.show('Task updated', undefined, { duration: 3000 });
          this.router.navigate(['/tasks', task.id]);
          this.saving.set(false);
        },
        error: () => this.saving.set(false),
      });
    } else {
      this.taskService.create(body).subscribe({
        next: task => {
          this.snackBar.show('Task created', undefined, { duration: 3000 });
          this.router.navigate(['/tasks', task.id]);
          this.saving.set(false);
        },
        error: () => this.saving.set(false),
      });
    }
  }

  onCancel() {
    if (this.isEditMode()) {
      this.router.navigate(['/tasks', this.id()]);
    } else {
      this.router.navigate(['/']);
    }
  }
}
