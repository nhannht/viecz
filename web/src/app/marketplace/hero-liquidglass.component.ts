import {
  Component,
  inject,
  signal,
  ElementRef,
  ViewChild,
  PLATFORM_ID,
  afterNextRender,
  OnDestroy,
  input,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { NhannhtMetroButtonComponent } from '../shared/components/nhannht-metro-button.component';
import { NhannhtMetroIconComponent } from '../shared/components/nhannht-metro-icon.component';
import { ThemeService } from '../core/theme.service';


@Component({
  selector: 'app-hero-liquidglass',
  standalone: true,
  imports: [
    RouterLink,
    TranslocoDirective,
    NhannhtMetroButtonComponent,
    NhannhtMetroIconComponent,
  ],
  template: `
    <ng-container *transloco="let t">
      <section class="liquid-hero" #heroSection
               (mousemove)="onMouseMove($event)"
               (mouseleave)="onMouseLeave()">
        <!-- Background mesh canvas — covers entire hero -->
        <canvas #bgCanvas class="bg-canvas"></canvas>

        <!-- Main glass card -->
        <div class="glass-card" #glassCard [class.entered]="entered()">
          <div class="glass-ribs"></div>
          <div class="specular-spot"></div>

          <div class="card-content">
            <div class="hero-text">
              <h1 class="hero-title">{{ t('marketplace.heroTitle') }}</h1>
              <p class="hero-subtitle">{{ t('marketplace.heroSubtitle') }}</p>
            </div>

            <div class="stats-row">
              @for (stat of stats(); track stat.label) {
                <div class="stat-pill" [class.entered]="entered()"
                     [style.transition-delay]="(200 + $index * 120) + 'ms'">
                  <span class="stat-value">{{ stat.value }}</span>
                  <span class="stat-label">{{ t(stat.label) }}</span>
                </div>
              }
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

        <!-- Step cards -->
        <div class="steps-row">
          @for (step of [1, 2, 3]; track step) {
            <div class="step-card" [class.entered]="entered()"
                 [style.transition-delay]="(500 + step * 150) + 'ms'">
              <div class="glass-ribs"></div>
              <div class="step-content">
                <span class="step-number">{{ step }}</span>
                <p class="step-title">{{ t('marketplace.step' + step + 'Title') }}</p>
                <p class="step-desc">{{ t('marketplace.step' + step + 'Desc') }}</p>
              </div>
            </div>
          }
        </div>
      </section>
    </ng-container>
  `,
  styles: `
    /* ── Hero container — FULL BLEED from page top ── */
    .liquid-hero {
      position: relative;
      /* Extend up behind the nav bar */
      padding: 5rem 1rem 2rem;
      margin: -4rem calc(-50vw + 50%) 1.5rem;
      width: 100vw;
      overflow: hidden;
      cursor: crosshair;
      min-height: 600px;
    }

    /* ── Background canvas covers everything ── */
    .bg-canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      z-index: 0;
    }

    .glass-card {
      position: relative;
      z-index: 2;
      max-width: 600px;
      margin: 0 auto 2.5rem;
      border-radius: 24px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.35);
      background: rgba(255, 255, 255, 0.08);
      box-shadow:
        0 8px 40px rgba(0, 0, 0, 0.12),
        0 2px 10px rgba(0, 0, 0, 0.06),
        inset 0 1px 0 rgba(255, 255, 255, 0.3);
      /* Entrance */
      opacity: 0;
      transform: translateY(60px) scale(0.92);
      transition:
        transform 900ms cubic-bezier(0.34, 1.56, 0.64, 1),
        opacity 700ms ease;
    }

    .glass-card.entered {
      opacity: 1;
      transform: translateY(0) scale(1);
    }

    .glass-card:hover {
      box-shadow:
        0 16px 60px rgba(0, 0, 0, 0.14),
        0 4px 20px rgba(0, 0, 0, 0.08);
    }

    /* ── Fluted / reeded glass ribs — CSS only ── */
    .glass-ribs {
      position: absolute;
      inset: 0;
      z-index: 0;
      border-radius: inherit;
      /* Vertical ribbed glass: alternating light/dark strips */
      background:
        repeating-linear-gradient(
          90deg,
          rgba(255, 255, 255, 0.18) 0px,
          rgba(255, 255, 255, 0.06) 4px,
          rgba(0, 0, 0, 0.03) 7px,
          rgba(255, 255, 255, 0.12) 10px,
          rgba(255, 255, 255, 0.20) 14px
        );
      /* Frosted glass base */
      backdrop-filter: blur(18px) saturate(1.4);
      -webkit-backdrop-filter: blur(18px) saturate(1.4);
    }

    /* ── Specular — bright light spot that follows cursor ── */
    .specular-spot {
      position: absolute;
      inset: 0;
      z-index: 1;
      pointer-events: none;
      border-radius: inherit;
      background: radial-gradient(
        200px circle at var(--mx, 50%) var(--my, 35%),
        rgba(255, 255, 255, 0.55) 0%,
        rgba(255, 255, 255, 0.1) 40%,
        transparent 70%
      );
      opacity: 0;
      transition: opacity 300ms ease;
    }

    .glass-card:hover .specular-spot {
      opacity: 1;
    }

    /* ── Card content ── */
    .card-content {
      position: relative;
      z-index: 3;
      padding: 2.5rem 2rem 2rem;
    }

    .hero-text {
      text-align: center;
      margin-bottom: 2rem;
    }

    .hero-title {
      font-family: var(--font-display);
      font-size: 1.4rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      color: var(--color-fg);
      margin: 0 0 0.6rem;
      line-height: 1.3;
      text-shadow: 0 1px 3px rgba(255,255,255,0.4);
    }

    .hero-subtitle {
      font-family: var(--font-body);
      font-size: 0.9rem;
      color: var(--color-muted);
      margin: 0;
      line-height: 1.5;
    }

    /* ── Stats ── */
    .stats-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
      margin-bottom: 2rem;
    }

    .stat-pill {
      text-align: center;
      padding: 1rem 0.5rem;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.22);
      border: 1.5px solid rgba(255, 255, 255, 0.45);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      opacity: 0;
      transform: translateY(24px) scale(0.85);
      transition:
        transform 700ms cubic-bezier(0.34, 1.56, 0.64, 1),
        opacity 500ms ease,
        background 200ms ease;
    }

    .stat-pill.entered {
      opacity: 1;
      transform: translateY(0) scale(1);
    }

    .stat-pill:hover {
      background: rgba(255, 255, 255, 0.25);
      transform: translateY(-3px) scale(1.04);
    }

    .stat-value {
      display: block;
      font-family: var(--font-display);
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--color-fg);
      line-height: 1.2;
    }

    .stat-label {
      display: block;
      font-family: var(--font-display);
      font-size: 0.6rem;
      letter-spacing: 0.05em;
      color: var(--color-muted);
      margin-top: 0.25rem;
    }

    /* ── CTA ── */
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
      padding: 0.8rem 2rem;
      border-radius: 16px;
      background: var(--color-fg);
      color: var(--color-bg);
      font-family: var(--font-display);
      font-size: 0.85rem;
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

    .cta-primary:active {
      transform: translateY(0) scale(0.97);
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

    /* ── Step cards ── */
    .steps-row {
      position: relative;
      z-index: 2;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      max-width: 640px;
      margin: 0 auto;
    }

    .step-card {
      position: relative;
      overflow: hidden;
      border-radius: 20px;
      border: 1px solid rgba(255, 255, 255, 0.30);
      background: rgba(255, 255, 255, 0.06);
      box-shadow:
        0 4px 24px rgba(0, 0, 0, 0.08),
        inset 0 1px 0 rgba(255, 255, 255, 0.25);
      opacity: 0;
      transform: translateY(30px) scale(0.9);
      transition:
        transform 700ms cubic-bezier(0.34, 1.56, 0.64, 1),
        opacity 500ms ease;
      animation: step-float 4s ease-in-out infinite paused;
    }

    .step-card.entered {
      opacity: 1;
      transform: translateY(0) scale(1);
      animation-play-state: running;
    }

    .step-card:nth-child(1) { animation-delay: 0s; }
    .step-card:nth-child(2) { animation-delay: 1.3s; }
    .step-card:nth-child(3) { animation-delay: 2.6s; }

    @keyframes step-float {
      0%, 100% { transform: translateY(0) scale(1); }
      50% { transform: translateY(-5px) scale(1.01); }
    }

    .step-content {
      position: relative;
      z-index: 2;
      padding: 1.5rem 1rem;
      text-align: center;
    }

    .step-number {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2.2rem;
      height: 2.2rem;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.25);
      border: none;
      font-family: var(--font-display);
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--color-fg);
      margin-bottom: 0.75rem;
    }

    .step-title {
      font-family: var(--font-display);
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.03em;
      color: var(--color-fg);
      margin: 0 0 0.35rem;
    }

    .step-desc {
      font-family: var(--font-body);
      font-size: 0.72rem;
      color: var(--color-muted);
      margin: 0;
      line-height: 1.5;
    }

    /* ── Responsive ── */
    @media (max-width: 640px) {
      .liquid-hero {
        padding: 2.5rem 0.5rem 1.5rem;
        min-height: 480px;
      }
      .hero-title { font-size: 1.1rem; }
      .stats-row { gap: 0.5rem; }
      .stat-value { font-size: 1.35rem; }
      .steps-row {
        grid-template-columns: 1fr;
        gap: 0.75rem;
      }
      .step-content {
        display: flex;
        align-items: center;
        gap: 1rem;
        text-align: left;
        padding: 1rem;
      }
      .step-number {
        margin-bottom: 0;
        flex-shrink: 0;
      }
    }

    /* ── Reduced motion ── */
    @media (prefers-reduced-motion: reduce) {
      .glass-card, .stat-pill, .step-card {
        transition: opacity 300ms ease !important;
        transform: none !important;
        animation: none !important;
      }
      .glass-card.entered, .stat-pill.entered, .step-card.entered {
        transform: none !important;
      }
    }
  `,
})
export class HeroLiquidglassComponent implements OnDestroy {
  total = input(0);
  entered = signal(false);
  stats = signal([
    { value: '0+', label: 'marketplace.tasksPosted' },
    { value: '11', label: 'marketplace.categories' },
    { value: '0%', label: 'marketplace.platformFee' },
  ]);

  @ViewChild('heroSection') heroRef!: ElementRef<HTMLElement>;
  @ViewChild('bgCanvas') bgCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('glassCard') glassCardRef!: ElementRef<HTMLElement>;

  private platformId = inject(PLATFORM_ID);
  private themeService = inject(ThemeService);

  private renderer: BackgroundRenderer | null = null;

  constructor() {
    afterNextRender(() => {
      // Update stats with actual total
      const t = this.total();
      this.stats.set([
        { value: `${t}+`, label: 'marketplace.tasksPosted' },
        { value: '11', label: 'marketplace.categories' },
        { value: '0%', label: 'marketplace.platformFee' },
      ]);
      setTimeout(() => this.entered.set(true), 80);
      this.initRenderer();
    });
  }

  ngOnDestroy(): void {
    this.renderer?.destroy();
  }

  onMouseMove(e: MouseEvent): void {
    const card = this.glassCardRef?.nativeElement;
    if (card) {
      const cardRect = card.getBoundingClientRect();
      const cx = ((e.clientX - cardRect.left) / cardRect.width) * 100;
      const cy = ((e.clientY - cardRect.top) / cardRect.height) * 100;
      card.style.setProperty('--mx', `${cx}%`);
      card.style.setProperty('--my', `${cy}%`);
    }
  }

  onMouseLeave(): void {
    const card = this.glassCardRef?.nativeElement;
    if (card) {
      card.style.setProperty('--mx', '50%');
      card.style.setProperty('--my', '35%');
    }
  }

  private initRenderer(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const hero = this.heroRef.nativeElement;
    const bgCanvas = this.bgCanvasRef.nativeElement;
    this.renderer = new BackgroundRenderer(
      hero, bgCanvas, this.themeService.theme(),
    );
    this.renderer.draw();
  }
}

/* ════════════════════════════════════════════════════
   BackgroundRenderer — static gradient mesh on canvas
   ════════════════════════════════════════════════════ */

type Theme = 'light' | 'sang-frostglass' | 'dracula';

const THEME_GRADIENTS: Record<Theme, { x: number; y: number; r: number; color: string }[]> = {
  'light': [
    { x: 0.2, y: 0.3, r: 0.6, color: 'rgba(100, 120, 160, 0.12)' },
    { x: 0.8, y: 0.5, r: 0.5, color: 'rgba(160, 100, 100, 0.10)' },
    { x: 0.5, y: 0.8, r: 0.7, color: 'rgba(140, 140, 140, 0.08)' },
  ],
  'sang-frostglass': [
    { x: 0.1, y: 0.2, r: 0.8, color: 'rgba(50, 184, 198, 0.30)' },
    { x: 0.9, y: 0.25, r: 0.8, color: 'rgba(255, 100, 80, 0.16)' },
    { x: 0.5, y: 0.7, r: 0.9, color: 'rgba(33, 128, 141, 0.22)' },
    { x: 0.35, y: 0.5, r: 0.6, color: 'rgba(140, 230, 180, 0.12)' },
    { x: 0.75, y: 0.6, r: 0.7, color: 'rgba(100, 200, 255, 0.14)' },
  ],
  'dracula': [
    { x: 0.15, y: 0.25, r: 0.8, color: 'rgba(189, 147, 249, 0.25)' },
    { x: 0.85, y: 0.35, r: 0.8, color: 'rgba(139, 233, 253, 0.20)' },
    { x: 0.5, y: 0.75, r: 0.9, color: 'rgba(255, 121, 198, 0.16)' },
    { x: 0.7, y: 0.5, r: 0.6, color: 'rgba(80, 250, 123, 0.10)' },
  ],
};

class BackgroundRenderer {
  private ctx: CanvasRenderingContext2D;
  private resizeObserver: ResizeObserver;

  constructor(
    private hero: HTMLElement,
    private canvas: HTMLCanvasElement,
    private theme: Theme,
  ) {
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.resizeObserver = new ResizeObserver(() => this.draw());
    this.resizeObserver.observe(hero);
  }

  draw(): void {
    const dpr = Math.min(window.devicePixelRatio, 2);
    const rect = this.hero.getBoundingClientRect();
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);

    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const style = getComputedStyle(this.hero);
    const bgColor = style.getPropertyValue('--color-bg').trim() || '#FCFCF9';
    this.ctx.fillStyle = bgColor;
    this.ctx.fillRect(0, 0, w, h);

    const spots = THEME_GRADIENTS[this.theme] || THEME_GRADIENTS['sang-frostglass'];
    for (const spot of spots) {
      const cx = spot.x * w;
      const cy = spot.y * h;
      const r = spot.r * Math.max(w, h);

      const grad = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, spot.color);
      grad.addColorStop(0.6, spot.color.replace(/[\d.]+\)$/, '0.04)'));
      grad.addColorStop(1, 'transparent');

      this.ctx.fillStyle = grad;
      this.ctx.fillRect(0, 0, w, h);
    }
  }

  destroy(): void {
    this.resizeObserver.disconnect();
  }
}
