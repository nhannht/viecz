import {
  Component,
  signal,
  ElementRef,
  ViewChild,
  afterNextRender,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { NhannhtMetroIconComponent } from '../shared/components/nhannht-metro-icon.component';
import { HeroEgg3dComponent } from '../marketplace/hero-egg-3d.component';

@Component({
  selector: 'app-landing-hero',
  standalone: true,
  imports: [RouterLink, TranslocoDirective, NhannhtMetroIconComponent, HeroEgg3dComponent],
  template: `
    <ng-container *transloco="let t">
      <section class="landing-hero" #heroSection>
        <!-- 3D whale canvas -->
        <div class="whale-container">
          @defer (on idle) {
            <app-hero-egg-3d [mousePos]="whaleMousePos()" />
          }
        </div>

        <!-- Radial fade overlay (controlled by GSAP) -->
        <div class="hero-fade-overlay" #fadeOverlay></div>

        <!-- Glass card content -->
        <div class="hero-glass-card" #glassCard [class.entered]="entered()">
          <div class="glass-ribs"></div>
          <div class="specular-spot"></div>
          <div class="card-content">
            <h1 class="hero-title">{{ t('marketplace.heroTitle') }}</h1>
            <p class="hero-subtitle">{{ t('marketplace.heroSubtitle') }}</p>

            <div class="stats-row">
              <div class="stat-pill" [class.entered]="entered()" style="transition-delay: 200ms">
                <span class="stat-value">0%</span>
                <span class="stat-label">{{ t('marketplace.platformFee') }}</span>
              </div>
              <div class="stat-pill" [class.entered]="entered()" style="transition-delay: 320ms">
                <span class="stat-value">11</span>
                <span class="stat-label">{{ t('marketplace.categories') }}</span>
              </div>
              <div class="stat-pill" [class.entered]="entered()" style="transition-delay: 440ms">
                <span class="stat-value">2m</span>
                <span class="stat-label">{{ t('landing.quickPost') }}</span>
              </div>
            </div>

            <div class="hero-cta">
              <a routerLink="/phone" class="cta-primary">
                <nhannht-metro-icon name="arrow_forward" [size]="18" />
                {{ t('marketplace.getStarted') }}
              </a>
              <a routerLink="/phone" class="cta-secondary">
                {{ t('marketplace.signInLink') }}
              </a>
            </div>
          </div>
        </div>
      </section>
    </ng-container>
  `,
  styles: `
    .landing-hero {
      position: relative;
      width: 100%;
      height: 100vh;
      min-height: 600px;
      overflow: hidden;
    }

    .whale-container {
      position: absolute;
      inset: 0;
      z-index: 0;
    }

    .hero-fade-overlay {
      position: absolute;
      inset: 0;
      z-index: 1;
      pointer-events: none;
      background: radial-gradient(
        ellipse 80% 80% at 50% 50%,
        transparent 30%,
        var(--color-bg) 100%
      );
      opacity: 0;
    }

    .hero-glass-card {
      position: absolute;
      z-index: 2;
      bottom: 15%;
      left: 50%;
      transform: translateX(-50%) translateY(60px) scale(0.92);
      max-width: 560px;
      width: calc(100% - 2rem);
      border-radius: 24px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.35);
      background: rgba(255, 255, 255, 0.08);
      box-shadow:
        0 8px 40px rgba(0, 0, 0, 0.12),
        0 2px 10px rgba(0, 0, 0, 0.06),
        inset 0 1px 0 rgba(255, 255, 255, 0.3);
      opacity: 0;
      transition:
        transform 900ms cubic-bezier(0.34, 1.56, 0.64, 1),
        opacity 700ms ease;
    }
    .hero-glass-card.entered {
      opacity: 1;
      transform: translateX(-50%) translateY(0) scale(1);
    }

    .glass-ribs {
      position: absolute;
      inset: 0;
      z-index: 0;
      border-radius: inherit;
      background: repeating-linear-gradient(
        90deg,
        rgba(255, 255, 255, 0.18) 0px,
        rgba(255, 255, 255, 0.06) 4px,
        rgba(0, 0, 0, 0.03) 7px,
        rgba(255, 255, 255, 0.12) 10px,
        rgba(255, 255, 255, 0.20) 14px
      );
      backdrop-filter: blur(18px) saturate(1.4);
      -webkit-backdrop-filter: blur(18px) saturate(1.4);
    }

    .specular-spot {
      position: absolute;
      inset: 0;
      z-index: 1;
      pointer-events: none;
      border-radius: inherit;
      background: radial-gradient(
        200px circle at 50% 35%,
        rgba(255, 255, 255, 0.45) 0%,
        rgba(255, 255, 255, 0.08) 40%,
        transparent 70%
      );
    }

    .card-content {
      position: relative;
      z-index: 3;
      padding: 2rem 1.5rem 1.5rem;
      text-align: center;
    }

    .hero-title {
      font-family: var(--font-display);
      font-size: 1.3rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      color: var(--color-fg);
      margin: 0 0 0.5rem;
      line-height: 1.3;
      text-shadow: 0 1px 3px rgba(255, 255, 255, 0.4);
    }

    .hero-subtitle {
      font-family: var(--font-body);
      font-size: 0.85rem;
      color: var(--color-muted);
      margin: 0 0 1.5rem;
      line-height: 1.5;
    }

    .stats-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.6rem;
      margin-bottom: 1.5rem;
    }

    .stat-pill {
      text-align: center;
      padding: 0.8rem 0.4rem;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.22);
      border: 1.5px solid rgba(255, 255, 255, 0.45);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      opacity: 0;
      transform: translateY(24px) scale(0.85);
      transition:
        transform 700ms cubic-bezier(0.34, 1.56, 0.64, 1),
        opacity 500ms ease;
    }
    .stat-pill.entered {
      opacity: 1;
      transform: translateY(0) scale(1);
    }

    .stat-value {
      display: block;
      font-family: var(--font-display);
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-fg);
      line-height: 1.2;
    }
    .stat-label {
      display: block;
      font-family: var(--font-display);
      font-size: 0.55rem;
      letter-spacing: 0.05em;
      color: var(--color-muted);
      margin-top: 0.2rem;
    }

    .hero-cta {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1.5rem;
    }
    .cta-primary {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.7rem 1.8rem;
      border-radius: 16px;
      background: var(--color-fg);
      color: var(--color-bg);
      font-family: var(--font-display);
      font-size: 0.8rem;
      font-weight: 600;
      letter-spacing: 0.03em;
      text-decoration: none;
      transition:
        transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1),
        box-shadow 250ms ease;
      box-shadow: 0 4px 20px color-mix(in srgb, var(--color-fg) 25%, transparent);
    }
    .cta-primary:hover {
      transform: translateY(-3px) scale(1.04);
      box-shadow: 0 8px 32px color-mix(in srgb, var(--color-fg) 35%, transparent);
    }
    .cta-secondary {
      font-family: var(--font-body);
      font-size: 0.85rem;
      color: var(--color-fg);
      text-decoration: none;
      opacity: 0.6;
      transition: opacity 200ms ease;
    }
    .cta-secondary:hover { opacity: 1; }

    @media (max-width: 640px) {
      .hero-glass-card {
        bottom: 8%;
      }
      .hero-title { font-size: 1.1rem; }
      .stat-value { font-size: 1.25rem; }
    }

    @media (prefers-reduced-motion: reduce) {
      .hero-glass-card, .stat-pill {
        transition: opacity 300ms ease !important;
        transform: translateX(-50%) !important;
      }
      .hero-glass-card.entered {
        transform: translateX(-50%) !important;
      }
      .stat-pill.entered {
        transform: none !important;
      }
    }
  `,
})
export class LandingHeroSection {
  @ViewChild('heroSection') heroRef!: ElementRef<HTMLElement>;
  @ViewChild('fadeOverlay') fadeOverlayRef!: ElementRef<HTMLElement>;
  @ViewChild('glassCard') glassCardRef!: ElementRef<HTMLElement>;

  entered = signal(false);
  whaleMousePos = signal<{ x: number; y: number } | null>(null);

  constructor() {
    afterNextRender(() => {
      setTimeout(() => this.entered.set(true), 80);
    });
  }

  /** Expose refs for parent GSAP orchestration */
  getHeroEl(): HTMLElement | null { return this.heroRef?.nativeElement ?? null; }
  getFadeOverlay(): HTMLElement | null { return this.fadeOverlayRef?.nativeElement ?? null; }
  getGlassCard(): HTMLElement | null { return this.glassCardRef?.nativeElement ?? null; }
}
