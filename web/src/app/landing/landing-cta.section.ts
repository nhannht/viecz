import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { NhannhtMetroIconComponent } from '../shared/components/nhannht-metro-icon.component';

@Component({
  selector: 'app-landing-cta',
  standalone: true,
  imports: [RouterLink, TranslocoDirective, NhannhtMetroIconComponent],
  template: `
    <ng-container *transloco="let t">
      <section class="cta-section">
        <!-- Condensation overlay -->
        <div class="condensation-overlay"></div>

        <div class="cta-content">
          <h2 class="cta-heading">{{ t('landing.ctaHeading') }}</h2>
          <p class="cta-sub">{{ t('landing.ctaSub') }}</p>

          <a routerLink="/phone" class="cta-button">
            <nhannht-metro-icon name="arrow_forward" [size]="20" />
            {{ t('marketplace.getStarted') }}
          </a>

          <div class="micro-trust">
            <span class="trust-item">{{ t('landing.trustFree') }}</span>
            <span class="trust-dot"></span>
            <span class="trust-item">{{ t('landing.trustQuick') }}</span>
            <span class="trust-dot"></span>
            <span class="trust-item">{{ t('landing.trustSecure') }}</span>
          </div>
        </div>
      </section>
    </ng-container>
  `,
  styles: `
    .cta-section {
      position: relative;
      padding: 5rem 1.5rem;
      background: rgba(6, 26, 40, 0.95);
      overflow: hidden;
    }

    .condensation-overlay {
      position: absolute;
      inset: 0;
      pointer-events: none;
      background:
        radial-gradient(2px 2px at 20% 30%, rgba(255, 255, 255, 0.15), transparent),
        radial-gradient(2px 2px at 70% 60%, rgba(255, 255, 255, 0.12), transparent),
        radial-gradient(1.5px 1.5px at 40% 80%, rgba(255, 255, 255, 0.10), transparent),
        radial-gradient(2px 2px at 85% 20%, rgba(255, 255, 255, 0.08), transparent),
        radial-gradient(1px 1px at 55% 45%, rgba(255, 255, 255, 0.12), transparent);
      background-size: 200px 200px, 180px 180px, 160px 160px, 220px 220px, 140px 140px;
      opacity: 0.5;
    }

    .cta-content {
      position: relative;
      z-index: 1;
      max-width: 600px;
      margin: 0 auto;
      text-align: center;
    }

    .cta-heading {
      font-family: var(--font-display);
      font-size: 1.8rem;
      font-weight: 700;
      letter-spacing: 0.02em;
      color: #f0f4f8;
      margin: 0 0 0.75rem;
      line-height: 1.3;
    }

    .cta-sub {
      font-family: var(--font-body);
      font-size: 0.9rem;
      color: rgba(240, 244, 248, 0.6);
      margin: 0 0 2rem;
      line-height: 1.5;
    }

    .cta-button {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.9rem 2.5rem;
      border-radius: 18px;
      background: #f0f4f8;
      color: #061a28;
      font-family: var(--font-display);
      font-size: 0.9rem;
      font-weight: 600;
      letter-spacing: 0.03em;
      text-decoration: none;
      transition:
        transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1),
        box-shadow 250ms ease;
      box-shadow: 0 4px 24px rgba(240, 244, 248, 0.2);
    }
    .cta-button:hover {
      transform: translateY(-3px) scale(1.04);
      box-shadow: 0 8px 40px rgba(240, 244, 248, 0.3);
    }
    .cta-button:active {
      transform: translateY(0) scale(0.97);
    }

    .micro-trust {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      margin-top: 2rem;
    }

    .trust-item {
      font-family: var(--font-display);
      font-size: 0.65rem;
      letter-spacing: 0.08em;
      color: rgba(240, 244, 248, 0.5);
    }

    .trust-dot {
      width: 3px;
      height: 3px;
      border-radius: 50%;
      background: rgba(240, 244, 248, 0.3);
    }

    @media (max-width: 640px) {
      .cta-heading { font-size: 1.3rem; }
      .micro-trust { flex-wrap: wrap; }
    }
  `,
})
export class LandingCtaSection {}
