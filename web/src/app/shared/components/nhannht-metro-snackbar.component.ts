import { Component, input, output } from '@angular/core';

/**
 * Toast notification bar fixed to the bottom-center of the viewport.
 *
 * Controlled via the `visible` input — set to `true` to show, `false` to hide.
 * The parent is responsible for toggling visibility (typically via `setTimeout`).
 * An optional action button can trigger a callback (e.g., "Undo").
 *
 * Replaces `MatSnackBar` / `MatSnackBarRef` from Angular Material.
 *
 * Accessibility: uses `role="status"` and `aria-live="polite"` for screen readers.
 *
 * @example
 * ```html
 * <nhannht-metro-snackbar [visible]="showToast" message="Task created successfully"
 *   actionLabel="Undo" (actionClicked)="undoCreate()" />
 * ```
 */
@Component({
  selector: 'nhannht-metro-snackbar',
  standalone: true,
  template: `
    @if (visible()) {
      <div
        class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-fg text-bg font-body text-[13px]
               px-6 py-3 border-2 border-fg flex items-center gap-4"
        role="status"
        aria-live="polite">
        <span>{{ message() }}</span>
        @if (actionLabel()) {
          <button
            class="font-display text-[10px] tracking-[1px] text-bg underline cursor-pointer
                   bg-transparent border-none hover:opacity-80"
            (click)="actionClicked.emit()">
            {{ actionLabel() }}
          </button>
        }
      </div>
    }
  `,
})
export class NhannhtMetroSnackbarComponent {
  /** Controls visibility. Set to `true` to show the snackbar. */
  visible = input(false);

  /** Text content displayed in the snackbar. */
  message = input('');

  /** Label for the optional action button. Empty string hides the button. */
  actionLabel = input('');

  /** Emits when the action button is clicked. */
  actionClicked = output<void>();
}
