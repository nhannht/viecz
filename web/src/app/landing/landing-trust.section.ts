import { Component } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

@Component({
  selector: 'app-landing-trust',
  standalone: true,
  imports: [TranslocoDirective],
  template: `
    <ng-container *transloco="let t">
      <section class="trust-section">
        <div class="stats-grid">
          @for (stat of stats; track stat.valueKey) {
            <div class="trust-tile">
              <span class="trust-value" [attr.data-target]="stat.target">{{ t(stat.valueKey) }}</span>
              <span class="trust-label">{{ t(stat.labelKey) }}</span>
            </div>
          }
        </div>

        <div class="testimonials-row">
          @for (quote of quotes; track quote.nameKey) {
            <div class="quote-card">
              <div class="glass-ribs"></div>
              <div class="quote-inner">
                <p class="quote-text">"{{ t(quote.textKey) }}"</p>
                <span class="quote-name">{{ t(quote.nameKey) }}</span>
              </div>
            </div>
          }
        </div>
      </section>
    </ng-container>
  `,
  styles: `
    .trust-section {
      position: relative;
      padding: 4rem 1.5rem 5rem;
      max-width: 900px;
      margin: 0 auto;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      margin-bottom: 4rem;
    }

    .trust-tile {
      text-align: center;
      padding: 1.5rem 1rem;
      border-radius: 20px;
      border: 1px solid rgba(255, 255, 255, 0.3);
      background: rgba(255, 255, 255, calc(0.06 + var(--whale-darkness, 0) * 0.44));
      backdrop-filter: blur(calc(32px + var(--whale-darkness, 0) * 8px)) saturate(200%);
      -webkit-backdrop-filter: blur(calc(32px + var(--whale-darkness, 0) * 8px)) saturate(200%);
      box-shadow:
        0 4px 20px rgba(0, 0, 0, 0.06),
        inset 0 1px 0 rgba(255, 255, 255, 0.3);
      opacity: 0;
      transform: translateY(40px);
    }

    .trust-value {
      display: block;
      font-family: var(--font-display);
      font-size: 1.8rem;
      font-weight: 700;
      color: var(--color-fg);
      line-height: 1.2;
      margin-bottom: 0.3rem;
    }

    .trust-label {
      display: block;
      font-family: var(--font-display);
      font-size: 0.6rem;
      letter-spacing: 0.1em;
      color: var(--color-muted);
    }

    .testimonials-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
    }

    .quote-card {
      position: relative;
      overflow: hidden;
      border-radius: 20px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      background: rgba(255, 255, 255, 0.04);
      opacity: 0;
      transform: translateY(40px);
    }

    .glass-ribs {
      position: absolute;
      inset: 0;
      z-index: 0;
      border-radius: inherit;
      background: repeating-linear-gradient(
        90deg,
        rgba(255, 255, 255, 0.08) 0px,
        rgba(255, 255, 255, 0.02) 4px,
        rgba(0, 0, 0, 0.01) 7px,
        rgba(255, 255, 255, 0.05) 10px,
        rgba(255, 255, 255, 0.08) 14px
      );
      backdrop-filter: blur(12px) saturate(1.2);
      -webkit-backdrop-filter: blur(12px) saturate(1.2);
    }

    .quote-inner {
      position: relative;
      z-index: 1;
      padding: 1.5rem;
    }

    .quote-text {
      font-family: var(--font-body);
      font-size: 0.82rem;
      font-style: italic;
      color: var(--color-fg);
      margin: 0 0 0.75rem;
      line-height: 1.5;
    }

    .quote-name {
      font-family: var(--font-display);
      font-size: 0.65rem;
      letter-spacing: 0.05em;
      color: var(--color-muted);
    }

    @media (max-width: 768px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
      .testimonials-row { grid-template-columns: 1fr; }
    }
  `,
})
export class LandingTrustSection {
  stats = [
    { valueKey: 'landing.statFee', labelKey: 'marketplace.platformFee', target: '0' },
    { valueKey: 'landing.statSecure', labelKey: 'landing.statSecureLabel', target: '100' },
    { valueKey: 'landing.statCategories', labelKey: 'marketplace.categories', target: '11' },
    { valueKey: 'landing.statSpeed', labelKey: 'landing.statSpeedLabel', target: '2' },
  ];

  quotes = [
    { textKey: 'landing.quote1', nameKey: 'landing.quote1Name' },
    { textKey: 'landing.quote2', nameKey: 'landing.quote2Name' },
    { textKey: 'landing.quote3', nameKey: 'landing.quote3Name' },
  ];
}
