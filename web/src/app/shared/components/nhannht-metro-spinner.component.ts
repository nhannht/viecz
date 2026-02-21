import { Component, input } from '@angular/core';

/**
 * CSS-only loading spinner using border animation.
 *
 * Renders a square element with a partially colored border that rotates.
 * Uses `--border` for the track and `--fg` for the active segment.
 *
 * Replaces `MatProgressSpinner` from Angular Material.
 * Includes `role="progressbar"` and `aria-label` for screen readers.
 *
 * @example
 * ```html
 * <nhannht-metro-spinner />
 * <nhannht-metro-spinner [size]="48" label="Saving" />
 * ```
 */
@Component({
  selector: 'nhannht-metro-spinner',
  standalone: true,
  template: `
    <div
      class="inline-block border-2 border-border border-t-fg animate-spin"
      [style.width.px]="size()"
      [style.height.px]="size()"
      role="progressbar"
      [attr.aria-label]="label()">
    </div>
  `,
})
export class NhannhtMetroSpinnerComponent {
  /** Spinner diameter in pixels. */
  size = input(24);

  /** Accessible label for screen readers. */
  label = input('Loading');
}
