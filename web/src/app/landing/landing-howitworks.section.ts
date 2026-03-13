import { Component } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { NhannhtMetroIconComponent } from '../shared/components/nhannht-metro-icon.component';

@Component({
  selector: 'app-landing-howitworks',
  standalone: true,
  imports: [TranslocoDirective, NhannhtMetroIconComponent],
  template: `
    <ng-container *transloco="let t">
      <section class="howitworks-section">
        <h2 class="section-title">{{ t('marketplace.howItWorks') }}</h2>
        <div class="cards-row">
          @for (step of steps; track step.num) {
            <div class="howitworks-card">
              <div class="glass-ribs"></div>
              <div class="card-inner">
                <div class="step-icon-wrap">
                  <nhannht-metro-icon [name]="step.icon" [size]="28" />
                </div>
                <span class="step-number">{{ step.num }}</span>
                <h3 class="step-title">{{ t(step.titleKey) }}</h3>
                <p class="step-desc">{{ t(step.descKey) }}</p>
              </div>
            </div>
          }
        </div>

        <!-- Water ripple divider -->
        <div class="ripple-divider"></div>
      </section>
    </ng-container>
  `,
  styles: `
    .howitworks-section {
      position: relative;
      padding: 6rem 1.5rem 4rem;
      max-width: 900px;
      margin: 0 auto;
    }

    .section-title {
      font-family: var(--font-display);
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.15em;
      color: var(--color-muted);
      text-align: center;
      margin: 0 0 3rem;
    }

    .cards-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.25rem;
    }

    .howitworks-card {
      position: relative;
      overflow: hidden;
      border-radius: 24px;
      border: 1px solid rgba(255, 255, 255, 0.30);
      background: rgba(255, 255, 255, 0.06);
      box-shadow:
        0 4px 24px rgba(0, 0, 0, 0.08),
        inset 0 1px 0 rgba(255, 255, 255, 0.25);
      opacity: 0;
      transform: translateY(60px);
    }

    .glass-ribs {
      position: absolute;
      inset: 0;
      z-index: 0;
      border-radius: inherit;
      background: repeating-linear-gradient(
        90deg,
        rgba(255, 255, 255, 0.14) 0px,
        rgba(255, 255, 255, 0.04) 4px,
        rgba(0, 0, 0, 0.02) 7px,
        rgba(255, 255, 255, 0.08) 10px,
        rgba(255, 255, 255, 0.14) 14px
      );
      backdrop-filter: blur(14px) saturate(1.3);
      -webkit-backdrop-filter: blur(14px) saturate(1.3);
    }

    .card-inner {
      position: relative;
      z-index: 1;
      padding: 2rem 1.5rem;
      text-align: center;
    }

    .step-icon-wrap {
      width: 56px;
      height: 56px;
      margin: 0 auto 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: var(--color-fg);
    }

    .step-number {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.2);
      font-family: var(--font-display);
      font-size: 0.7rem;
      font-weight: 700;
      color: var(--color-fg);
      margin-bottom: 0.75rem;
    }

    .step-title {
      font-family: var(--font-display);
      font-size: 0.8rem;
      font-weight: 600;
      letter-spacing: 0.05em;
      color: var(--color-fg);
      margin: 0 0 0.5rem;
    }

    .step-desc {
      font-family: var(--font-body);
      font-size: 0.78rem;
      color: var(--color-muted);
      margin: 0;
      line-height: 1.5;
    }

    .ripple-divider {
      position: relative;
      height: 120px;
      margin-top: 4rem;
      border-radius: 0 0 50% 50% / 0 0 100px 100px;
      background: linear-gradient(
        to bottom,
        transparent 0%,
        color-mix(in srgb, var(--color-bg) 30%, transparent) 100%
      );
    }

    @media (max-width: 640px) {
      .cards-row {
        grid-template-columns: 1fr;
        gap: 1rem;
      }
      .card-inner {
        display: flex;
        align-items: center;
        gap: 1rem;
        text-align: left;
        padding: 1.25rem;
      }
      .step-icon-wrap { margin: 0; flex-shrink: 0; }
      .step-number { margin-bottom: 0; }
    }
  `,
})
export class LandingHowItWorksSection {
  steps = [
    { num: 1, icon: 'edit_note', titleKey: 'marketplace.step1Title', descKey: 'marketplace.step1Desc' },
    { num: 2, icon: 'group', titleKey: 'marketplace.step2Title', descKey: 'marketplace.step2Desc' },
    { num: 3, icon: 'payments', titleKey: 'marketplace.step3Title', descKey: 'marketplace.step3Desc' },
  ];
}
