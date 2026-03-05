import { Component, input } from '@angular/core';
import { GlassSpecularDirective } from '../directives/glass-specular.directive';

/**
 * Content container with `--card-bg` background, 1px border, and 32px padding.
 *
 * All corners are square (0px border-radius) per the design system.
 * Uses `<ng-content>` for projected content — no fixed internal structure.
 *
 * Replaces `MatCard` / `MatCardContent` / `MatCardHeader` from Angular Material.
 *
 * @example
 * ```html
 * <nhannht-metro-card>
 *   <h3 class="font-display text-[11px] tracking-[1px] mb-3">TITLE</h3>
 *   <p class="font-body text-[13px] text-muted">Content here.</p>
 * </nhannht-metro-card>
 *
 * <nhannht-metro-card [featured]="true" [hoverable]="true">
 *   Highlighted interactive card.
 * </nhannht-metro-card>
 * ```
 */
@Component({
  selector: 'nhannht-metro-card',
  standalone: true,
  imports: [GlassSpecularDirective],
  template: `
    <div
      appGlassSpecular
      class="bg-card border p-8 transition-all duration-300"
      [class.border-border]="!featured()"
      [class.border-fg]="featured()"
      [class.hover:border-fg]="hoverable()"
      [class.hover:-translate-y-0.5]="hoverable()"
      [class.hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)]]="hoverable()">
      <ng-content />
    </div>
  `,
})
export class NhannhtMetroCardComponent {
  /** When true, border uses `--fg` instead of `--border` for emphasis. */
  featured = input(false);

  /** When true, card lifts on hover with shadow and border highlight. */
  hoverable = input(false);
}
