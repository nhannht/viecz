import { Component } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { NhannhtMetroIconComponent } from '../shared/components/nhannht-metro-icon.component';

@Component({
  selector: 'app-landing-features',
  standalone: true,
  imports: [TranslocoDirective, NhannhtMetroIconComponent],
  template: `
    <ng-container *transloco="let t">
      <section class="features-section">
        <!-- Floating glass shards (parallax targets) -->
        <div class="glass-shard shard-1"></div>
        <div class="glass-shard shard-2"></div>
        <div class="glass-shard shard-3"></div>

        <div class="features-layout">
          <div class="features-text">
            <h2 class="features-heading">{{ t('landing.featuresTitle') }}</h2>
            <p class="features-sub">{{ t('landing.featuresSubtitle') }}</p>
          </div>

          <div class="features-grid">
            @for (feat of features; track feat.icon) {
              <div class="feature-card">
                <div class="glass-ribs"></div>
                <div class="feature-inner">
                  <div class="feature-icon">
                    <nhannht-metro-icon [name]="feat.icon" [size]="24" />
                  </div>
                  <h3 class="feature-title">{{ t(feat.titleKey) }}</h3>
                  <p class="feature-desc">{{ t(feat.descKey) }}</p>
                </div>
              </div>
            }
          </div>
        </div>
      </section>
    </ng-container>
  `,
  styles: `
    .features-section {
      position: relative;
      padding: 4rem 1.5rem 6rem;
      max-width: 1000px;
      margin: 0 auto;
      overflow: hidden;
    }

    /* Floating glass shards */
    .glass-shard {
      position: absolute;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.12);
      pointer-events: none;
      z-index: 0;
    }
    .shard-1 {
      width: 180px; height: 120px;
      top: 10%; right: -40px;
      clip-path: polygon(20% 0%, 100% 0%, 80% 100%, 0% 100%);
      transform: rotate(12deg);
    }
    .shard-2 {
      width: 140px; height: 90px;
      top: 50%; left: -30px;
      clip-path: polygon(0% 20%, 100% 0%, 100% 80%, 0% 100%);
      transform: rotate(-8deg);
    }
    .shard-3 {
      width: 100px; height: 160px;
      bottom: 5%; right: 10%;
      clip-path: polygon(50% 0%, 100% 30%, 100% 100%, 0% 100%, 0% 30%);
      transform: rotate(5deg);
    }

    @media (hover: none) {
      .glass-shard { display: none; }
    }

    .features-layout {
      position: relative;
      z-index: 1;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 3rem;
      align-items: center;
    }

    .features-text {
      padding-right: 1rem;
    }

    .features-heading {
      font-family: var(--font-display);
      font-size: 1.6rem;
      font-weight: 700;
      letter-spacing: 0.02em;
      color: var(--color-fg);
      margin: 0 0 1rem;
      line-height: 1.3;
    }

    .features-sub {
      font-family: var(--font-body);
      font-size: 0.9rem;
      color: var(--color-muted);
      margin: 0;
      line-height: 1.6;
    }

    .features-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .feature-card {
      position: relative;
      overflow: hidden;
      border-radius: 20px;
      border: 1px solid rgba(255, 255, 255, 0.25);
      background: rgba(255, 255, 255, calc(0.05 + var(--whale-darkness, 0) * 0.45));
      backdrop-filter: blur(calc(12px + var(--whale-darkness, 0) * 20px));
      -webkit-backdrop-filter: blur(calc(12px + var(--whale-darkness, 0) * 20px));
      box-shadow:
        0 4px 20px rgba(0, 0, 0, calc(0.06 + var(--whale-darkness, 0) * 0.12)),
        inset 0 1px 0 rgba(255, 255, 255, 0.2);
      opacity: 0;
      transform: translateY(40px);
      transition: box-shadow 200ms ease;
    }
    .feature-card:hover {
      box-shadow:
        0 8px 32px rgba(0, 0, 0, 0.1),
        inset 0 1px 0 rgba(255, 255, 255, 0.3);
    }

    .glass-ribs {
      position: absolute;
      inset: 0;
      z-index: 0;
      border-radius: inherit;
      background: repeating-linear-gradient(
        90deg,
        rgba(255, 255, 255, 0.10) 0px,
        rgba(255, 255, 255, 0.03) 4px,
        rgba(0, 0, 0, 0.01) 7px,
        rgba(255, 255, 255, 0.06) 10px,
        rgba(255, 255, 255, 0.10) 14px
      );
      backdrop-filter: blur(14px) saturate(1.2);
      -webkit-backdrop-filter: blur(14px) saturate(1.2);
    }

    .feature-inner {
      position: relative;
      z-index: 1;
      padding: 1.5rem 1.25rem;
    }

    .feature-icon {
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.25);
      color: var(--color-fg);
      margin-bottom: 0.75rem;
    }

    .feature-title {
      font-family: var(--font-display);
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.05em;
      color: var(--color-fg);
      margin: 0 0 0.35rem;
    }

    .feature-desc {
      font-family: var(--font-body);
      font-size: 0.72rem;
      color: var(--color-muted);
      margin: 0;
      line-height: 1.5;
    }

    @media (max-width: 768px) {
      .features-layout {
        grid-template-columns: 1fr;
        gap: 2rem;
      }
      .features-text { padding-right: 0; text-align: center; }
      .features-heading { font-size: 1.3rem; }
    }

    @media (max-width: 480px) {
      .features-grid {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class LandingFeaturesSection {
  features = [
    { icon: 'assignment', titleKey: 'landing.featureTasks', descKey: 'landing.featureTasksDesc' },
    { icon: 'payments', titleKey: 'landing.featurePayments', descKey: 'landing.featurePaymentsDesc' },
    { icon: 'location_on', titleKey: 'landing.featureLocation', descKey: 'landing.featureLocationDesc' },
    { icon: 'chat', titleKey: 'landing.featureChat', descKey: 'landing.featureChatDesc' },
  ];
}
