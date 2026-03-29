import { Component, input, output } from '@angular/core';
import { VieczButtonComponent } from './viecz-button.component';

/**
 * Pricing tier card from the viecz-meow design system.
 *
 * Displays tier name, price, description, feature list, and CTA button.
 * Featured cards get a darker border and a "POPULAR" pseudo-badge.
 *
 * @example
 * ```html
 * <viecz-price-card
 *   tier="PRO"
 *   price="$19"
 *   period="/mo"
 *   description="For power users"
 *   [features]="['Unlimited tasks', 'Priority support']"
 *   ctaLabel="Get Pro"
 *   [featured]="true"
 *   (ctaClick)="onSelect('pro')"
 * />
 * ```
 */
@Component({
  selector: 'viecz-price-card',
  standalone: true,
  imports: [VieczButtonComponent],
  template: `
    <div class="relative bg-card border p-8 text-center transition-all duration-300
                hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)]"
         [class.border-fg]="featured()"
         [class.border-border]="!featured()">

      @if (featured()) {
        <span class="absolute top-0 right-6 -translate-y-px bg-fg text-bg
                     font-display text-[8px] tracking-[1px] px-2 py-1">
          POPULAR
        </span>
      }

      <h3 class="font-display text-[13px] text-fg tracking-[1px] mb-4">{{ tier() }}</h3>

      <div class="font-body text-fg mb-2">
        <span class="text-[36px] font-bold">{{ price() }}</span>
        <span class="text-[14px] text-muted">{{ period() }}</span>
      </div>

      <p class="font-body text-[12px] text-muted mb-6">{{ description() }}</p>

      <ul class="text-left mb-8">
        @for (feature of features(); track feature) {
          <li class="font-body text-[12px] text-muted py-2 border-b border-border">
            <span class="text-fg">+ </span>{{ feature }}
          </li>
        }
      </ul>

      <viecz-button
        variant="primary"
        [label]="ctaLabel()"
        [fullWidth]="true"
        (clicked)="ctaClick.emit()"
      />
    </div>
  `,
})
export class VieczPriceCardComponent {
  /** Tier name displayed as heading. */
  tier = input.required<string>();

  /** Price display (e.g. "$19"). */
  price = input.required<string>();

  /** Price period suffix (e.g. "/mo"). */
  period = input('/mo');

  /** Short description below the price. */
  description = input('');

  /** List of feature strings, each prefixed with "+". */
  features = input<string[]>([]);

  /** CTA button label. */
  ctaLabel = input('Get Started');

  /** When true, adds darker border and "POPULAR" badge. */
  featured = input(false);

  /** Emits when CTA button is clicked. */
  ctaClick = output<void>();
}
