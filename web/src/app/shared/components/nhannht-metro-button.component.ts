import { Component, computed, input, output } from '@angular/core';

/**
 * Action button following the nhannht-metro-meow design system.
 *
 * **Primary** — solid `--fg` background, inverts on hover.
 * **Secondary** — text-only with `>` suffix, muted color.
 *
 * Replaces `MatButton` and `MatRaisedButton` from Angular Material.
 *
 * @example
 * ```html
 * <nhannht-metro-button variant="primary" label="Submit" (clicked)="onSubmit()" />
 * <nhannht-metro-button variant="secondary" label="Learn More" />
 * ```
 */
@Component({
  selector: 'nhannht-metro-button',
  standalone: true,
  template: `
    <button
      [class]="btnClass()"
      [class.w-full]="fullWidth() && variant() === 'primary'"
      [class.block]="fullWidth() && variant() === 'primary'"
      [disabled]="disabled()"
      [type]="type()"
      (click)="clicked.emit($event)">
      <ng-content>{{ label() }}</ng-content>@if (variant() === 'secondary') {<span class="ml-1">&gt;</span>}
    </button>
  `,
})
export class NhannhtMetroButtonComponent {
  /** Visual style. `primary` is solid fill, `secondary` is text-only with `>` arrow. */
  variant = input<'primary' | 'secondary'>('primary');

  /** @internal Computed CSS classes based on variant. */
  btnClass = computed(() =>
    this.variant() === 'primary'
      ? 'inline-block px-8 py-3 bg-fg text-bg font-body text-[13px] font-bold tracking-[2px] border border-fg cursor-pointer hover:bg-transparent hover:text-fg transition-all duration-250 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-fg disabled:hover:text-bg'
      : 'font-body text-[13px] text-muted tracking-[1px] cursor-pointer hover:text-fg transition-colors duration-200 bg-transparent border-none disabled:opacity-40 disabled:cursor-not-allowed'
  );

  /** Button text. Can also use `<ng-content>` for projected content. */
  label = input('');

  /** When true, button stretches to full container width. */
  fullWidth = input(false);

  /** Disables the button and reduces opacity. */
  disabled = input(false);

  /** Native HTML button type attribute. */
  type = input<'button' | 'submit' | 'reset'>('button');

  /** Emits on click. Does not fire when disabled. */
  clicked = output<MouseEvent>();
}
