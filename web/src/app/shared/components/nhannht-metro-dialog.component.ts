import { Component, input, output } from '@angular/core';
import { NhannhtMetroButtonComponent } from './nhannht-metro-button.component';

/**
 * Modal dialog with backdrop, title, content, and confirm/cancel actions.
 *
 * Controlled via the `open` input — set to `true` to show, `false` to hide.
 * Clicking the backdrop emits `cancelled`. Dialog body is projected via `<ng-content>`.
 * Action buttons use `NhannhtMetroButtonComponent` internally.
 *
 * Replaces `MatDialog` / `MatDialogRef` / `MatDialogActions` from Angular Material.
 *
 * Accessibility: sets `role="dialog"`, `aria-modal="true"`, and `aria-label` from title.
 *
 * @example
 * ```html
 * <nhannht-metro-dialog [open]="showConfirm" title="DELETE TASK"
 *   confirmLabel="Delete" cancelLabel="Cancel"
 *   (confirmed)="onDelete()" (cancelled)="showConfirm = false">
 *   This action cannot be undone.
 * </nhannht-metro-dialog>
 * ```
 */
@Component({
  selector: 'nhannht-metro-dialog',
  standalone: true,
  imports: [NhannhtMetroButtonComponent],
  template: `
    @if (open()) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center"
        (click)="onBackdropClick($event)"
        role="dialog"
        [attr.aria-label]="title()"
        aria-modal="true">
        <!-- backdrop -->
        <div class="absolute inset-0 bg-fg/20"></div>
        <!-- dialog -->
        <div class="relative bg-card border border-border p-8 max-w-[480px] w-full mx-4 z-10">
          @if (title()) {
            <h2 class="font-display text-[13px] tracking-[1px] mb-4">{{ title() }}</h2>
          }
          <div class="font-body text-[13px] text-muted leading-[1.7] mb-6">
            <ng-content />
          </div>
          <div class="flex justify-end gap-4">
            @if (cancelLabel()) {
              <nhannht-metro-button variant="secondary" [label]="cancelLabel()" (clicked)="cancelled.emit()" />
            }
            @if (confirmLabel()) {
              <nhannht-metro-button variant="primary" [label]="confirmLabel()" (clicked)="confirmed.emit()" />
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class NhannhtMetroDialogComponent {
  /** Controls visibility. Set to `true` to show the dialog. */
  open = input(false);

  /** Dialog title in display font. Empty string hides the title. */
  title = input('');

  /** Label for the primary action button. Empty string hides the button. */
  confirmLabel = input('Confirm');

  /** Label for the secondary cancel button. Empty string hides the button. */
  cancelLabel = input('Cancel');

  /** Emits when the confirm button is clicked. */
  confirmed = output<void>();

  /** Emits when the cancel button or backdrop is clicked. */
  cancelled = output<void>();

  onBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('fixed')) {
      this.cancelled.emit();
    }
  }
}
