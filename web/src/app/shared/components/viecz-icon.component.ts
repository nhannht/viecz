import { Component, input } from '@angular/core';

/**
 * Wrapper around the Google Material Icons font.
 *
 * Renders a `<span class="material-icons">` with configurable size.
 * The icon font is loaded via `preview-head.html` (Storybook) and
 * `index.html` (production).
 *
 * Replaces `MatIcon` from Angular Material.
 *
 * @see https://fonts.google.com/icons for available icon names.
 *
 * @example
 * ```html
 * <viecz-icon name="home" />
 * <viecz-icon name="account_balance_wallet" [size]="32" />
 * <viecz-icon name="delete" [ariaHidden]="false" />
 * ```
 */
@Component({
  selector: 'viecz-icon',
  standalone: true,
  template: `
    <span
      class="material-icons select-none"
      [style.font-size.px]="size()"
      [style.width.px]="size()"
      [style.height.px]="size()"
      [style.line-height.px]="size()"
      [attr.aria-hidden]="ariaHidden()"
      [attr.aria-label]="ariaHidden() ? null : name()">
      {{ name() }}
    </span>
  `,
})
export class VieczIconComponent {
  /** Material Icons ligature name (e.g. `home`, `search`, `account_circle`). */
  name = input.required<string>();

  /** Icon size in pixels. Applied to font-size, width, height, and line-height. */
  size = input(24);

  /** When true (default), hides icon from screen readers. Set to false for standalone icons that convey meaning. */
  ariaHidden = input(true);
}
