import { Component, inject, OnInit, signal, input } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { VieczInputComponent } from '../shared/components/viecz-input.component';
import { VieczTextareaComponent } from '../shared/components/viecz-textarea.component';
import { VieczButtonComponent } from '../shared/components/viecz-button.component';
import { VieczSpinnerComponent } from '../shared/components/viecz-spinner.component';
import { VieczSnackbarService } from '../shared/services/viecz-snackbar.service';
import { TaskService } from '../core/task.service';
import { ApplicationService } from '../core/application.service';
import { ProfileGateService } from '../core/profile-gate.service';
import { Task } from '../core/models';
import { VndPipe } from '../core/pipes';

@Component({
  selector: 'app-apply-task',
  standalone: true,
  imports: [
    FormsModule,
    TranslocoDirective,
    VieczInputComponent,
    VieczTextareaComponent,
    VieczButtonComponent,
    VieczSpinnerComponent,
    VndPipe,
  ],
  template: `
    <ng-container *transloco="let t">
      @if (loading()) {
        <div class="flex justify-center py-16">
          <viecz-spinner />
        </div>
      } @else if (task()) {
        <div class="max-w-[600px] mx-auto">
          <div class="bg-card border border-border">
            <div class="px-6 py-4 border-b border-border">
              <h2 class="font-display text-[11px] tracking-[1px] text-fg m-0">
                {{ t('applyTask.applyFor') }}{{ task()!.title }}
              </h2>
            </div>

            <div class="px-6 py-4 flex flex-col gap-4">
              <div class="bg-bg border border-border px-4 py-3">
                <span class="font-body text-[13px] font-bold text-fg">{{ t('applyTask.taskPrice') }}{{ task()!.price | vnd }}</span>
              </div>

              <viecz-input
                [label]="t('applyTask.proposedPriceLabel')"
                type="number"
                [step]="1000" [min]="1000"
                [(ngModel)]="proposedPrice"
                name="proposedPrice"
                [error]="priceError"
              />

              <viecz-textarea
                [label]="t('applyTask.messageLabel')"
                [placeholder]="t('applyTask.messagePlaceholder')"
                [rows]="4"
                [(ngModel)]="message"
                name="message"
              />
            </div>

            <div class="flex justify-end gap-3 px-6 py-4 border-t border-border">
              <viecz-button variant="secondary" [label]="t('common.cancel')" (clicked)="cancel()" />
              @if (submitting()) {
                <viecz-spinner size="sm" />
              } @else {
                <viecz-button variant="primary" [label]="t('applyTask.submitButton')" (clicked)="submit()" />
              }
            </div>
          </div>
        </div>
      }
    </ng-container>
  `,
})
export class ApplyTaskComponent implements OnInit {
  id = input.required<string>();

  private taskService = inject(TaskService);
  private applicationService = inject(ApplicationService);
  private router = inject(Router);
  private snackbar = inject(VieczSnackbarService);
  private profileGate = inject(ProfileGateService);
  private transloco = inject(TranslocoService);

  task = signal<Task | null>(null);
  loading = signal(true);
  submitting = signal(false);
  proposedPrice: number | null = null;
  priceError = '';
  message = '';

  ngOnInit() {
    const taskId = Number(this.id());
    this.taskService.get(taskId).subscribe({
      next: task => {
        this.task.set(task);
        this.proposedPrice = task.price;
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackbar.show(this.transloco.translate('task.taskNotFound'), this.transloco.translate('common.close'), { duration: 3000 });
        this.router.navigate(['/marketplace']);
      },
    });
  }

  submit() {
    const p = Number(this.proposedPrice);
    if (this.proposedPrice && p > 0 && p % 1000 !== 0) {
      this.priceError = this.transloco.translate('applyTask.priceMultiple');
      return;
    }
    this.priceError = '';

    const body: { proposed_price?: number; message?: string } = {};
    if (this.proposedPrice) body.proposed_price = p;
    if (this.message) body.message = this.message;

    this.submitting.set(true);
    this.applicationService.apply(this.task()!.id, body).subscribe({
      next: () => {
        this.snackbar.show(this.transloco.translate('applyTask.submitted'), this.transloco.translate('common.close'), { duration: 3000 });
        this.router.navigate(['/tasks', this.task()!.id]);
      },
      error: err => {
        this.submitting.set(false);
        const gate = this.profileGate.isProfileGate(err);
        if (gate) {
          this.profileGate.openGate(gate, () => this.submit());
        } else {
          this.snackbar.show(err.error?.error || this.transloco.translate('applyTask.submitFailed'), this.transloco.translate('common.close'), { duration: 3000 });
        }
      },
    });
  }

  cancel() {
    this.router.navigate(['/tasks', this.task()!.id]);
  }
}
