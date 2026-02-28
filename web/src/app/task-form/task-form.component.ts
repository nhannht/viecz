import { Component, inject, OnInit, signal, input, computed } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { TaskService } from '../core/task.service';
import { CategoryService } from '../core/category.service';
import { WalletService } from '../core/wallet.service';
import { VndPipe } from '../core/pipes';
import { NhannhtMetroCardComponent } from '../shared/components/nhannht-metro-card.component';
import { NhannhtMetroInputComponent } from '../shared/components/nhannht-metro-input.component';
import { NhannhtMetroSelectComponent } from '../shared/components/nhannht-metro-select.component';
import { NhannhtMetroSmartDeadlineComponent } from '../shared/components/nhannht-metro-smart-deadline.component';
import { NhannhtMetroButtonComponent } from '../shared/components/nhannht-metro-button.component';
import { NhannhtMetroIconComponent } from '../shared/components/nhannht-metro-icon.component';
import { NhannhtMetroSpinnerComponent } from '../shared/components/nhannht-metro-spinner.component';
import { NhannhtMetroLocationPickerComponent } from '../shared/components/nhannht-metro-location-picker.component';
import { NhannhtMetroSnackbarService } from '../shared/services/nhannht-metro-snackbar.service';
import { ProfileGateService } from '../core/profile-gate.service';
import { LocationPickerValue } from '../core/models';

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [
    FormsModule,
    TranslocoDirective,
    VndPipe,
    NhannhtMetroCardComponent,
    NhannhtMetroInputComponent,
    NhannhtMetroSelectComponent,
    NhannhtMetroSmartDeadlineComponent,
    NhannhtMetroButtonComponent,
    NhannhtMetroIconComponent,
    NhannhtMetroSpinnerComponent,
    NhannhtMetroLocationPickerComponent,
  ],
  template: `
    <ng-container *transloco="let t">
      @if (loadingTask()) {
        <div class="flex justify-center py-16"><nhannht-metro-spinner /></div>
      } @else {
        <nhannht-metro-card class="block max-w-[700px] mx-auto">
          <h2 class="font-display text-[11px] tracking-[1px] text-fg uppercase mb-4">
            {{ isEditMode() ? t('taskForm.editTitle') : t('taskForm.createTitle') }}
          </h2>
          <form class="flex flex-col gap-1 pt-4" (ngSubmit)="onSubmit()">
            <nhannht-metro-input
              [label]="t('taskForm.titleLabel')"
              [placeholder]="t('taskForm.titlePlaceholder')"
              [(ngModel)]="title" name="title"
              [error]="submitted && !title ? t('taskForm.titleRequired') : ''" />

            <div class="flex flex-col gap-1">
              <label class="font-display text-[10px] tracking-[1px] text-fg">{{ t('taskForm.descLabel') }}</label>
              <textarea
                class="w-full px-4 py-3 bg-card border border-border font-body text-[13px] text-fg
                       placeholder:text-muted focus:border-fg focus:outline-none transition-colors duration-200"
                [(ngModel)]="description" name="description" rows="5"
                [placeholder]="t('taskForm.descPlaceholder')"></textarea>
              @if (submitted && !description) {
                <span class="font-body text-[11px] text-red-600 font-semibold" role="alert">{{ t('taskForm.descRequired') }}</span>
              }
            </div>

            <nhannht-metro-select
              [label]="t('taskForm.categoryLabel')"
              [placeholder]="t('taskForm.categoryPlaceholder')"
              [options]="categoryOptions()"
              [(ngModel)]="categoryId" name="categoryId"
              [error]="submitted && !categoryId ? t('taskForm.categoryRequired') : ''" />

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
                  <span class="font-body text-[10px] opacity-80">{{ t('taskForm.availableBalance') }}</span>
                  <span class="font-body text-[15px] font-semibold">
                    @if (balanceLoading()) {
                      {{ t('common.loading') }}
                    } @else if (walletBalance() !== null) {
                      {{ walletBalance()! | vnd }}
                    } @else {
                      {{ t('taskForm.couldNotLoadBalance') }}
                    }
                  </span>
                </div>
              </div>
            }

            <nhannht-metro-input
              [label]="t('taskForm.priceLabel')"
              type="number"
              [placeholder]="t('taskForm.pricePlaceholder')"
              [step]="1000" [min]="1000"
              [(ngModel)]="price" name="price"
              [error]="priceError()" />

            <nhannht-metro-location-picker
              [label]="t('taskForm.locationLabel')"
              [placeholder]="t('taskForm.locationPickerHint')"
              [(ngModel)]="locationValue" name="locationValue"
              [error]="submitted && !locationValue.location ? t('taskForm.locationRequired') : ''" />

            <nhannht-metro-smart-deadline
              [label]="t('taskForm.deadlineLabel')"
              [(ngModel)]="deadline" name="deadline"
              [error]="submitted && isDeadlinePast() ? t('taskForm.deadlinePast') : ''" />

            <div class="flex justify-end items-center gap-3 pt-4">
              <nhannht-metro-button
                variant="secondary"
                [label]="t('common.cancel')"
                type="button"
                (clicked)="onCancel()" />
              <nhannht-metro-button
                variant="primary"
                [disabled]="saving()"
                type="submit">
                @if (saving()) {
                  <nhannht-metro-spinner size="sm" />
                } @else {
                  <span class="inline-flex items-center gap-2">
                    <nhannht-metro-icon [name]="isEditMode() ? 'save' : 'add'" [size]="18" />
                    {{ isEditMode() ? t('taskForm.saveChanges') : t('taskForm.createTitle') }}
                  </span>
                }
              </nhannht-metro-button>
            </div>
          </form>
        </nhannht-metro-card>
      }
    </ng-container>
  `,
})
export class TaskFormComponent implements OnInit {
  id = input<string>();

  private taskService = inject(TaskService);
  private categoryService = inject(CategoryService);
  private walletService = inject(WalletService);
  private router = inject(Router);
  private snackBar = inject(NhannhtMetroSnackbarService);
  private profileGate = inject(ProfileGateService);
  private transloco = inject(TranslocoService);

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
  locationValue: LocationPickerValue = { location: '', latitude: 0, longitude: 0 };
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
          this.locationValue = {
            location: task.location,
            latitude: task.latitude || 0,
            longitude: task.longitude || 0,
          };
          this.deadline = task.deadline || '';
          this.loadingTask.set(false);
        },
        error: () => {
          this.snackBar.show(this.transloco.translate('taskForm.taskNotFound'), undefined, { duration: 3000 });
          this.router.navigate(['/']);
          this.loadingTask.set(false);
        },
      });
    }
  }

  priceError(): string {
    if (!this.submitted) return '';
    if (!this.price) return this.transloco.translate('taskForm.priceRequired');
    const p = Number(this.price);
    if (p <= 0) return this.transloco.translate('taskForm.priceGreaterThanZero');
    if (p % 1000 !== 0) return this.transloco.translate('taskForm.priceMultiple');
    return '';
  }

  isInsufficient(): boolean {
    const balance = this.walletBalance();
    const p = Number(this.price);
    return balance !== null && p > 0 && p > balance;
  }

  isDeadlinePast(): boolean {
    if (!this.deadline) return false;
    return new Date(this.deadline) < new Date();
  }

  onSubmit() {
    this.submitted = true;
    const p = Number(this.price);
    if (!this.title || !this.description || !this.categoryId || !this.price || p <= 0 || p % 1000 !== 0 || !this.locationValue.location) {
      return;
    }
    if (this.isDeadlinePast()) {
      return;
    }

    this.saving.set(true);
    const body: Record<string, unknown> = {
      title: this.title,
      description: this.description,
      category_id: Number(this.categoryId),
      price: Number(this.price),
      location: this.locationValue.location,
      latitude: this.locationValue.latitude,
      longitude: this.locationValue.longitude,
    };
    if (this.deadline) {
      body['deadline'] = this.deadline;
    }

    if (this.isEditMode()) {
      this.taskService.update(Number(this.id()), body).subscribe({
        next: task => {
          this.snackBar.show(this.transloco.translate('taskForm.taskUpdated'), undefined, { duration: 3000 });
          this.router.navigate(['/tasks', task.id]);
          this.saving.set(false);
        },
        error: () => this.saving.set(false),
      });
    } else {
      this.taskService.create(body).subscribe({
        next: task => {
          this.snackBar.show(this.transloco.translate('taskForm.taskCreated'), undefined, { duration: 3000 });
          this.router.navigate(['/tasks', task.id]);
          this.saving.set(false);
        },
        error: err => {
          this.saving.set(false);
          const gate = this.profileGate.isProfileGate(err);
          if (gate) {
            this.profileGate.openGate(gate, () => this.onSubmit());
          }
        },
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
