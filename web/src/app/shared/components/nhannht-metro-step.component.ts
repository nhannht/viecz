import { Component, input } from '@angular/core';

/**
 * Numbered step component from the nhannht-metro-meow design system.
 *
 * Displays a large, faded step number alongside a title and description.
 * The number uses the display font at large size with 15% opacity for a watermark effect.
 *
 * @example
 * ```html
 * <nhannht-metro-step
 *   number="01"
 *   title="Connect Your Workflow"
 *   description="Link your tools and services."
 * />
 * ```
 */
@Component({
  selector: 'nhannht-metro-step',
  standalone: true,
  template: `
    <div class="flex items-start gap-6">
      <span class="font-display text-[24px] text-fg min-w-[60px]"
            style="opacity: 0.15">
        {{ number() }}
      </span>
      <div>
        <h3 class="font-body text-[16px] text-fg tracking-[1px] mb-2">{{ title() }}</h3>
        <p class="font-body text-[13px] text-muted leading-[1.7]">{{ description() }}</p>
      </div>
    </div>
  `,
})
export class NhannhtMetroStepComponent {
  /** Step number displayed as watermark (e.g. "01", "02"). */
  number = input.required<string>();

  /** Step heading text. */
  title = input.required<string>();

  /** Step description text. */
  description = input('');
}
