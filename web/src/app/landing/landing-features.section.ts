import {
  Component,
  ElementRef,
  inject,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TranslocoDirective } from '@jsverse/transloco';
import { LandingMinimapComponent } from './landing-minimap.component';
import { TaskCardComponent } from '../shared/components/task-card.component';
import { Task } from '../core/models';

// Weight-based easing curves (same as HIW)
const EASE_LIGHT = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
const EASE_MEDIUM = 'cubic-bezier(0.22, 1, 0.36, 1)';
const EASE_HEAVY = 'cubic-bezier(0.16, 1, 0.3, 1)';
const EASE_ELASTIC = 'cubic-bezier(0.68, -0.55, 0.27, 1.55)';

// Cross-dissolve progress ranges (4 steps)
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const FEAT_RANGES = {
  step0: { start: 0, end: 0.25 },
  dissolve01: { start: 0.20, end: 0.30 },
  step1: { start: 0.25, end: 0.50 },
  dissolve12: { start: 0.45, end: 0.55 },
  step2: { start: 0.50, end: 0.75 },
  dissolve23: { start: 0.70, end: 0.80 },
  step3: { start: 0.75, end: 1.0 },
};
const ANIM_THRESHOLDS = [0.02, 0.25, 0.50, 0.75];
const ANIM_HYSTERESIS = 0.03;

// Background gradient colors
const BG_TEAL = [33, 128, 141, 0.12] as const;
const BG_PURPLE = [100, 60, 180, 0.10] as const;
const BG_GREEN = [60, 160, 100, 0.10] as const;
const BG_WARM = [200, 140, 60, 0.10] as const;

@Component({
  selector: 'app-landing-features',
  standalone: true,
  imports: [TranslocoDirective, LandingMinimapComponent, TaskCardComponent],
  template: `
    <ng-container *transloco="let t">
      <section id="landing-features" class="features-section" #sectionEl>
        <h2 class="section-title">{{ t('landing.featuresTitle') }}</h2>

        <div class="feat-indicators">
          <span class="feat-dot" [attr.data-feat]="'dot-0'"></span>
          <span class="feat-dot" [attr.data-feat]="'dot-1'"></span>
          <span class="feat-dot" [attr.data-feat]="'dot-2'"></span>
          <span class="feat-dot" [attr.data-feat]="'dot-3'"></span>
        </div>

        <div class="feat-stage">
          <!-- Slide 0: Browse Tasks — Real task cards -->
          <div id="feat-browse" class="feat-slide" [attr.data-feat]="'slide-0'">
            <div class="river-text" [attr.data-feat]="'text-0'">
              <span class="step-number">1</span>
              <h3 class="step-heading">{{ t('landing.featureTasks') }}</h3>
              <p class="step-body">{{ t('landing.featureTasksDesc') }}</p>
            </div>
            <div class="river-mock card-gallery" [attr.data-feat]="'mock-0'">
              @for (task of mockTasks; track task.id; let i = $index) {
                <div class="card-gallery-item" [attr.data-feat]="'s0-card-' + i" [style.--ci]="i">
                  <app-task-card [task]="task" />
                </div>
              }
            </div>
          </div>

          <!-- Slide 1: Transparent Fees — Receipt (reversed) -->
          <div id="feat-fees" class="feat-slide feat-slide--reversed" [attr.data-feat]="'slide-1'">
            <div class="river-text" [attr.data-feat]="'text-1'">
              <span class="step-number">2</span>
              <h3 class="step-heading">{{ t('landing.featureFees') }}</h3>
              <p class="step-body">{{ t('landing.featureFeesDesc') }}</p>
            </div>
            <div class="river-mock mock-panel" [attr.data-feat]="'mock-1'">
              <div class="receipt">
                <div class="receipt-row" [attr.data-feat]="'s1-row-0'">
                  <span class="receipt-label">{{ t('landing.mockFeeTaskPrice') }}</span>
                  <span class="receipt-value" [attr.data-feat]="'s1-val-0'">0</span>
                </div>
                <div class="receipt-row receipt-row--fee" [attr.data-feat]="'s1-row-1'">
                  <span class="receipt-label">{{ t('landing.mockFeePlatformFee') }}</span>
                  <span class="receipt-value" [attr.data-feat]="'s1-val-1'">0</span>
                </div>
                <div class="receipt-divider"></div>
                <div class="receipt-row receipt-row--total" [attr.data-feat]="'s1-row-2'">
                  <span class="receipt-label">{{ t('landing.mockFeeWorkerKeeps') }}</span>
                  <span class="receipt-value receipt-value--highlight" [attr.data-feat]="'s1-val-2'">0</span>
                </div>
                <div class="receipt-badge" [attr.data-feat]="'s1-badge'">{{ t('landing.mockFeeHighlight') }}</div>
              </div>
            </div>
          </div>

          <!-- Slide 2: Nearby Tasks — Map pins -->
          <div id="feat-nearby" class="feat-slide" [attr.data-feat]="'slide-2'">
            <div class="river-text" [attr.data-feat]="'text-2'">
              <span class="step-number">3</span>
              <h3 class="step-heading">{{ t('landing.featureLocation') }}</h3>
              <p class="step-body">{{ t('landing.featureLocationDesc') }}</p>
            </div>
            <div class="river-mock" [attr.data-feat]="'mock-2'">
              <app-landing-minimap />
            </div>
          </div>

          <!-- Slide 3: Real-time Chat — Bubble sequence (reversed) -->
          <div id="feat-chat" class="feat-slide feat-slide--reversed" [attr.data-feat]="'slide-3'">
            <div class="river-text" [attr.data-feat]="'text-3'">
              <span class="step-number">4</span>
              <h3 class="step-heading">{{ t('landing.featureChat') }}</h3>
              <p class="step-body">{{ t('landing.featureChatDesc') }}</p>
            </div>
            <div class="river-mock mock-panel" [attr.data-feat]="'mock-3'">
              <div class="chat-mock">
                <div class="chat-bubble chat-sent" [attr.data-feat]="'s3-bubble-0'">
                  {{ t('landing.mockChatMsg0') }}
                </div>
                <div class="chat-bubble chat-received" [attr.data-feat]="'s3-bubble-1'">
                  {{ t('landing.mockChatMsg1') }}
                </div>
                <div class="chat-bubble chat-sent" [attr.data-feat]="'s3-bubble-2'">
                  {{ t('landing.mockChatMsg2') }}
                </div>
                <div class="chat-typing" [attr.data-feat]="'s3-typing'">
                  <span class="typing-dot"></span>
                  <span class="typing-dot"></span>
                  <span class="typing-dot"></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="feat-bg-gradient" [attr.data-feat]="'bg-gradient'"></div>
      </section>
    </ng-container>
  `,
  styles: `
    .features-section {
      position: relative;
      overflow: hidden;
    }

    .section-title {
      position: absolute;
      top: 2rem;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10;
      font-family: var(--font-display);
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.15em;
      color: var(--color-muted);
      text-align: center;
      margin: 0;
      white-space: nowrap;
    }

    /* --- Stage: viewport-height container for stacked slides --- */
    .feat-stage {
      position: relative;
      width: 100%;
      height: 100vh;
      min-height: 600px;
    }

    .feat-slide {
      position: absolute;
      inset: 0;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2.5rem;
      align-items: center;
      padding: 6rem 1.5rem 4rem;
      max-width: 900px;
      margin: 0 auto;
      opacity: 0;
      pointer-events: none;
      will-change: opacity, transform, filter;
    }
    .feat-slide--active { pointer-events: auto; }

    .feat-slide--reversed {
      grid-template-columns: 1fr 1fr;
    }
    .feat-slide--reversed .river-text { order: 2; }
    .feat-slide--reversed .river-mock { order: 1; }

    /* --- Dot indicators --- */
    .feat-indicators {
      position: absolute;
      bottom: 2rem;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10;
      display: flex;
      gap: 0.5rem;
    }
    .feat-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.3);
      transition: background 300ms, transform 300ms;
    }
    .feat-dot--active {
      background: var(--color-fg);
      transform: scale(1.4);
    }

    /* --- Background gradient overlay --- */
    .feat-bg-gradient {
      position: absolute;
      inset: 0;
      z-index: -1;
      pointer-events: none;
    }

    /* --- Text block --- */
    .river-text {
      opacity: 0;
      transform: translateX(-30px);
    }

    .step-number {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: rgba(255, 255, 255, calc(0.2 + var(--whale-darkness, 0) * 0.3));
      font-family: var(--font-display);
      font-size: 0.7rem;
      font-weight: 700;
      color: color-mix(in srgb, var(--color-fg), white calc(var(--whale-darkness, 0) * 100%));
      margin-bottom: 0.75rem;
      text-shadow: 0 1px 3px rgba(0, 0, 0, calc(var(--whale-darkness, 0) * 0.5));
    }

    .step-heading {
      font-family: var(--font-display);
      font-size: 0.85rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      color: color-mix(in srgb, var(--color-fg), white calc(var(--whale-darkness, 0) * 100%));
      margin: 0.5rem 0;
      text-shadow: 0 1px 4px rgba(0, 0, 0, calc(var(--whale-darkness, 0) * 0.6));
    }

    .step-body {
      font-family: var(--font-body);
      font-size: 0.82rem;
      color: color-mix(in srgb, var(--color-muted), rgba(220, 220, 220, 0.9) calc(var(--whale-darkness, 0) * 100%));
      line-height: 1.6;
      margin: 0;
      text-shadow: 0 1px 3px rgba(0, 0, 0, calc(var(--whale-darkness, 0) * 0.4));
    }

    /* --- Mock panel — frostglass --- */
    .mock-panel {
      border-radius: 20px;
      border: 1px solid rgba(0, 0, 0, calc(0.08 + var(--whale-darkness, 0) * -0.08));
      background: rgba(255, 255, 255, calc(0.75 - var(--whale-darkness, 0) * 0.27));
      backdrop-filter: blur(calc(40px + var(--whale-darkness, 0) * 20px));
      -webkit-backdrop-filter: blur(calc(40px + var(--whale-darkness, 0) * 20px));
      box-shadow: 0 4px 24px rgba(0, 0, 0, calc(0.08 + var(--whale-darkness, 0) * 0.10));
      padding: 1.5rem;
      opacity: 0;
      transform: translateX(30px);
      filter: blur(8px);
      overflow: hidden;
    }

    /* ===== Slide 0: Task card gallery ===== */
    .card-gallery {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      padding: 0;
      background: none;
      border: none;
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
      box-shadow: none;
      filter: none;
    }

    .card-gallery-item {
      margin-left: calc(var(--ci) * 16px);
      opacity: 0;
      transform: translateX(40px);
      pointer-events: none;
    }

    /* ===== Slide 1: Receipt ===== */
    .receipt {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .receipt-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      opacity: 0;
      transform: translateY(8px);
    }
    .receipt-label {
      font-family: var(--font-body);
      font-size: 0.65rem;
      color: var(--color-muted);
    }
    .receipt-value {
      font-family: var(--font-display);
      font-size: 0.7rem;
      font-weight: 600;
      color: var(--color-fg);
    }
    .receipt-row--fee .receipt-value {
      color: #c62828;
    }
    .receipt-value--highlight {
      color: #2e7d32;
    }
    .receipt-divider {
      height: 1px;
      background: rgba(0, 0, 0, 0.1);
      margin: 0.15rem 0;
    }
    .receipt-badge {
      align-self: flex-end;
      font-family: var(--font-display);
      font-size: 0.6rem;
      font-weight: 600;
      letter-spacing: 0.04em;
      padding: 0.2rem 0.6rem;
      border-radius: 8px;
      background: rgba(46, 125, 50, 0.15);
      color: #2e7d32;
      opacity: 0;
      transform: scale(0.6);
      margin-top: 0.2rem;
    }

    /* ===== Slide 2: Map (MapLibre via app-landing-minimap) ===== */
    .map-label {
      position: absolute;
      bottom: 6px;
      right: 8px;
      font-family: var(--font-display);
      font-size: 0.55rem;
      font-weight: 600;
      color: rgba(95, 212, 216, 0.8);
      letter-spacing: 0.03em;
      opacity: 0;
      z-index: 2;
    }

    /* ===== Slide 3: Chat ===== */
    .chat-mock {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .chat-bubble {
      font-family: var(--font-body);
      font-size: 0.6rem;
      padding: 0.4rem 0.65rem;
      border-radius: 10px;
      max-width: 85%;
      line-height: 1.4;
      opacity: 0;
      transform: translateY(10px);
    }
    .chat-sent {
      align-self: flex-end;
      background: rgba(33, 128, 141, calc(0.8 - var(--whale-darkness, 0) * 0.5));
      color: white;
      border-bottom-right-radius: 3px;
    }
    .chat-received {
      align-self: flex-start;
      background: rgba(0, 0, 0, calc(0.06 + var(--whale-darkness, 0) * 0.1));
      color: color-mix(in srgb, var(--color-fg), white calc(var(--whale-darkness, 0) * 100%));
      border-bottom-left-radius: 3px;
    }
    .chat-typing {
      align-self: flex-start;
      display: flex;
      gap: 3px;
      padding: 0.4rem 0.65rem;
      border-radius: 10px;
      background: rgba(0, 0, 0, calc(0.06 + var(--whale-darkness, 0) * 0.1));
      opacity: 0;
    }
    .typing-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: rgba(0, 0, 0, calc(0.3 + var(--whale-darkness, 0) * 0.2));
      animation: bounce-dot 1.4s ease-in-out infinite;
    }
    .typing-dot:nth-child(2) { animation-delay: 0.2s; }
    .typing-dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes bounce-dot {
      0%, 60%, 100% { transform: translateY(0); }
      30% { transform: translateY(-4px); }
    }

    /* --- Mobile: undo stacking, fall back to flow layout --- */
    @media (max-width: 768px) {
      .features-section {
        padding: 4rem 1.5rem 3rem;
        max-width: 900px;
        margin: 0 auto;
      }
      .section-title {
        position: relative;
        top: auto;
        left: auto;
        transform: none;
        margin: 0 0 4rem;
      }
      .feat-stage {
        position: relative;
        height: auto;
        min-height: 0;
      }
      .feat-slide {
        position: relative;
        inset: auto;
        opacity: 1;
        pointer-events: auto;
        will-change: auto;
        margin-bottom: 5rem;
      }
      .feat-slide,
      .feat-slide--reversed {
        grid-template-columns: 1fr;
        gap: 1.5rem;
      }
      .feat-slide--reversed .river-text { order: -1; }
      .feat-slide--reversed .river-mock { order: 0; }
      .river-text {
        order: -1;
      }
      .mock-panel {
        max-width: 100%;
      }
      .river-text {
        opacity: 1;
        transform: none;
      }
      .mock-panel {
        opacity: 1;
        transform: none;
        filter: none;
      }
      .card-gallery-item {
        opacity: 1;
        transform: none;
      }
      .receipt-row {
        opacity: 1;
        transform: none;
      }
      .receipt-badge {
        opacity: 1;
        transform: none;
      }
      .chat-bubble {
        opacity: 1;
        transform: none;
      }
      .chat-typing {
        opacity: 1;
      }
      .feat-indicators,
      .feat-bg-gradient {
        display: none;
      }
    }

    @media (max-width: 480px) {
      .features-section {
        padding: 4rem 1rem 3rem;
      }
    }
  `,
})
export class LandingFeaturesSection implements OnDestroy {
  @ViewChild('sectionEl') private sectionRef!: ElementRef<HTMLElement>;

  private el = inject(ElementRef<HTMLElement>);
  private platformId = inject(PLATFORM_ID);
  private animations: Animation[][] = [[], [], [], []];
  private played: boolean[] = [false, false, false, false];
  private rafIds: number[] = [];
  private lastActiveStep = -1;

  mockTasks: Task[] = [
    {
      id: 1, requester_id: 0, category_id: 1,
      title: 'Dọn dẹp căn hộ', description: 'Dọn dẹp phòng trọ trước khi trả phòng, quét lau và sắp xếp đồ đạc.',
      price: 40000, location: 'Quận 1, TP.HCM', status: 'open',
      category: { id: 1, name: 'Cleaning', name_vi: 'Dọn dẹp', is_active: true },
      application_count: 2, created_at: '2026-03-14T10:00:00Z', updated_at: '2026-03-14T10:00:00Z',
    },
    {
      id: 2, requester_id: 0, category_id: 2,
      title: 'Giao giấy tờ', description: 'Nhận giấy tờ từ văn phòng trường và giao đến địa chỉ ở Thủ Đức.',
      price: 25000, location: 'Thủ Đức, TP.HCM', status: 'open',
      category: { id: 2, name: 'Delivery', name_vi: 'Giao nhận', is_active: true },
      application_count: 0, created_at: '2026-03-14T08:30:00Z', updated_at: '2026-03-14T08:30:00Z',
    },
    {
      id: 3, requester_id: 0, category_id: 3,
      title: 'Gia sư Giải tích', description: 'Hỗ trợ ôn thi giữa kỳ môn Giải tích, cần người giỏi tích phân.',
      price: 80000, location: 'Bình Thạnh, TP.HCM', status: 'open',
      category: { id: 3, name: 'Tutoring', name_vi: 'Gia sư', is_active: true },
      application_count: 5, created_at: '2026-03-13T15:00:00Z', updated_at: '2026-03-13T15:00:00Z',
    },
  ];

  /** Expose section element for parent GSAP pin */
  getSectionEl(): HTMLElement | null {
    return this.sectionRef?.nativeElement ?? null;
  }

  /** Query a single element by data-feat attribute */
  private q(key: string): HTMLElement | null {
    return this.el.nativeElement.querySelector(`[data-feat="${key}"]`);
  }

  /** Query all elements by data-feat prefix */
  private qAll(prefix: string): HTMLElement[] {
    return Array.from(this.el.nativeElement.querySelectorAll(`[data-feat^="${prefix}"]`));
  }

  ngOnDestroy(): void {
    for (const group of this.animations) {
      for (const anim of group) anim.cancel();
    }
    this.animations = [[], [], [], []];
    for (const id of this.rafIds) cancelAnimationFrame(id);
    this.rafIds = [];
  }

  // ─── Scrub-driven progress API ──────────────────────────

  /** Called by parent ScrollTrigger onUpdate with 0→1 progress */
  updateProgress(p: number): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      this.showAllFinalStates();
      return;
    }

    // 1. Compute per-step visibility
    const vis = [
      this.stepVisibility(p, FEAT_RANGES.step0, FEAT_RANGES.dissolve01, null),
      this.stepVisibility(p, FEAT_RANGES.step1, FEAT_RANGES.dissolve12, FEAT_RANGES.dissolve01),
      this.stepVisibility(p, FEAT_RANGES.step2, FEAT_RANGES.dissolve23, FEAT_RANGES.dissolve12),
      this.stepVisibility(p, FEAT_RANGES.step3, null, FEAT_RANGES.dissolve23),
    ];

    // 2. Apply slide visibility
    for (let i = 0; i < 4; i++) {
      this.applySlideVisibility(i, vis[i]);
    }

    // 3. Background gradient
    this.updateBgGradient(p);

    // 4. Dot indicators
    this.updateDots(p);

    // 5. Fire internal animations at thresholds
    this.checkAndFireInternalAnims(p);
  }

  private stepVisibility(
    p: number,
    range: { start: number; end: number },
    dissolveOut: { start: number; end: number } | null,
    dissolveIn: { start: number; end: number } | null,
  ): number {
    let fadeIn = 1;
    if (dissolveIn) {
      if (p < dissolveIn.start) return 0;
      if (p < dissolveIn.end) {
        fadeIn = clamp01((p - dissolveIn.start) / (dissolveIn.end - dissolveIn.start));
      }
    } else {
      if (p < range.start) fadeIn = clamp01(p / 0.02 || 1);
    }

    let fadeOut = 1;
    if (dissolveOut) {
      if (p > dissolveOut.end) return 0;
      if (p > dissolveOut.start) {
        fadeOut = 1 - clamp01((p - dissolveOut.start) / (dissolveOut.end - dissolveOut.start));
      }
    }

    return Math.min(fadeIn, fadeOut);
  }

  private applySlideVisibility(index: number, v: number): void {
    const slide = this.q(`slide-${index}`);
    if (!slide) return;

    if (v <= 0) {
      slide.style.opacity = '0';
      slide.style.pointerEvents = 'none';
      slide.classList.remove('feat-slide--active');
      return;
    }

    slide.style.opacity = String(v);
    const blurPx = 6 * (1 - v);
    slide.style.filter = blurPx > 0.1 ? `blur(${blurPx.toFixed(1)}px)` : 'none';
    slide.style.transform = `scale(${(0.96 + v * 0.04).toFixed(3)})`;

    if (v > 0.5) {
      slide.classList.add('feat-slide--active');
      slide.style.pointerEvents = 'auto';
    } else {
      slide.classList.remove('feat-slide--active');
      slide.style.pointerEvents = 'none';
    }
  }

  private updateBgGradient(p: number): void {
    const bg = this.q('bg-gradient');
    if (!bg) return;

    let r: number, g: number, b: number, a: number;
    if (p <= 0.25) {
      [r, g, b, a] = BG_TEAL;
    } else if (p <= 0.50) {
      const t = clamp01((p - 0.25) / 0.25);
      r = lerp(BG_TEAL[0], BG_PURPLE[0], t);
      g = lerp(BG_TEAL[1], BG_PURPLE[1], t);
      b = lerp(BG_TEAL[2], BG_PURPLE[2], t);
      a = lerp(BG_TEAL[3], BG_PURPLE[3], t);
    } else if (p <= 0.75) {
      const t = clamp01((p - 0.50) / 0.25);
      r = lerp(BG_PURPLE[0], BG_GREEN[0], t);
      g = lerp(BG_PURPLE[1], BG_GREEN[1], t);
      b = lerp(BG_PURPLE[2], BG_GREEN[2], t);
      a = lerp(BG_PURPLE[3], BG_GREEN[3], t);
    } else {
      const t = clamp01((p - 0.75) / 0.25);
      r = lerp(BG_GREEN[0], BG_WARM[0], t);
      g = lerp(BG_GREEN[1], BG_WARM[1], t);
      b = lerp(BG_GREEN[2], BG_WARM[2], t);
      a = lerp(BG_GREEN[3], BG_WARM[3], t);
    }

    bg.style.background =
      `radial-gradient(ellipse 80% 80% at 50% 50%, rgba(${Math.round(r!)}, ${Math.round(g!)}, ${Math.round(b!)}, ${a!.toFixed(2)}), transparent)`;
  }

  private updateDots(p: number): void {
    let active: number;
    if (p < 0.25) active = 0;
    else if (p < 0.50) active = 1;
    else if (p < 0.75) active = 2;
    else active = 3;

    if (active === this.lastActiveStep) return;
    this.lastActiveStep = active;

    for (let i = 0; i < 4; i++) {
      const dot = this.q(`dot-${i}`);
      if (!dot) continue;
      if (i === active) {
        dot.classList.add('feat-dot--active');
      } else {
        dot.classList.remove('feat-dot--active');
      }
    }
  }

  private checkAndFireInternalAnims(p: number): void {
    for (let i = 0; i < 4; i++) {
      const threshold = ANIM_THRESHOLDS[i];
      if (p >= threshold && !this.played[i]) {
        this.playStep(i);
      } else if (p < threshold - ANIM_HYSTERESIS && this.played[i]) {
        this.resetStep(i);
      }
    }
  }

  // ─── Play / Reset API (also used by mobile fallback) ────

  playStep(index: number): void {
    if (this.played[index]) return;
    if (!isPlatformBrowser(this.platformId)) return;

    const textEl = this.q(`text-${index}`);
    const mockEl = this.q(`mock-${index}`);
    if (!textEl || !mockEl) return;

    this.played[index] = true;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      this.showFinalState(index);
      return;
    }

    switch (index) {
      case 0: this.playStep0(); break;
      case 1: this.playStep1(); break;
      case 2: this.playStep2(); break;
      case 3: this.playStep3(); break;
    }
  }

  resetStep(index: number): void {
    if (!this.played[index]) return;
    this.played[index] = false;

    for (const anim of this.animations[index]) anim.cancel();
    this.animations[index] = [];

    const textEl = this.q(`text-${index}`);
    const mockEl = this.q(`mock-${index}`);
    const isReversed = index === 1 || index === 3;
    const textX = isReversed ? '30px' : '-30px';
    const mockX = isReversed ? '-30px' : '30px';
    if (textEl) { textEl.style.opacity = '0'; textEl.style.transform = `translateX(${textX})`; }
    if (mockEl) { mockEl.style.opacity = '0'; mockEl.style.transform = `translateX(${mockX})`; mockEl.style.filter = 'blur(8px)'; }

    switch (index) {
      case 0: this.resetStep0Elements(); break;
      case 1: this.resetStep1Elements(); break;
      case 2: this.resetStep2Elements(); break;
      case 3: this.resetStep3Elements(); break;
    }
  }

  private showAllFinalStates(): void {
    for (let i = 0; i < 4; i++) {
      const slide = this.q(`slide-${i}`);
      if (slide) {
        slide.style.opacity = '1';
        slide.style.filter = 'none';
        slide.style.transform = 'none';
        slide.style.pointerEvents = 'auto';
      }
      this.showFinalState(i);
    }
  }

  private showFinalState(index: number): void {
    const textEl = this.q(`text-${index}`);
    const mockEl = this.q(`mock-${index}`);
    if (textEl) { textEl.style.opacity = '1'; textEl.style.transform = 'none'; }
    if (mockEl) { mockEl.style.opacity = '1'; mockEl.style.transform = 'none'; mockEl.style.filter = 'none'; }

    switch (index) {
      case 0: {
        // Task cards visible
        for (let i = 0; i < 3; i++) {
          const card = this.q(`s0-card-${i}`);
          if (card) { card.style.opacity = '1'; card.style.transform = 'translateX(0)'; }
        }
        break;
      }
      case 1: {
        // Receipt rows visible
        const values = ['50,000₫', '-5,000₫', '45,000₫'];
        for (let i = 0; i < 3; i++) {
          const row = this.q(`s1-row-${i}`);
          if (row) { row.style.opacity = '1'; row.style.transform = 'translateY(0)'; }
          const val = this.q(`s1-val-${i}`);
          if (val) val.textContent = values[i];
        }
        const badge = this.q('s1-badge');
        if (badge) { badge.style.opacity = '1'; badge.style.transform = 'scale(1)'; }
        break;
      }
      case 2: {
        // Map label visible (minimap handles its own markers)
        const label = this.q('s2-label');
        if (label) label.style.opacity = '1';
        break;
      }
      case 3: {
        // Chat bubbles visible
        for (let i = 0; i < 3; i++) {
          const b = this.q(`s3-bubble-${i}`);
          if (b) { b.style.opacity = '1'; b.style.transform = 'translateY(0)'; }
        }
        break;
      }
    }
  }

  // ─── Step 0: Browse Tasks — Deck fan-out ───────────────

  private async playStep0(): Promise<void> {
    const track = (a: Animation) => { this.animations[0].push(a); return a; };
    const textEl = this.q('text-0')!;
    const mockEl = this.q('mock-0')!;

    // Text from left
    track(textEl.animate(
      [{ opacity: '0', transform: 'translateX(-30px)' }, { opacity: '1', transform: 'translateX(0)' }],
      { duration: 600, fill: 'forwards', easing: EASE_MEDIUM },
    ));

    // Mock container (card-gallery has no visual — just show it)
    mockEl.style.opacity = '1';
    mockEl.style.transform = 'none';
    mockEl.style.filter = 'none';

    // Stagger cards sliding in from right
    for (let i = 0; i < 3; i++) {
      const card = this.q(`s0-card-${i}`);
      if (!card) continue;
      await this.delay(120);
      track(card.animate(
        [
          { opacity: '0', transform: `translateX(60px)` },
          { opacity: '1', transform: 'translateX(0)' },
        ],
        { duration: 500, easing: EASE_HEAVY, fill: 'forwards' },
      ));
    }
  }

  private resetStep0Elements(): void {
    for (let i = 0; i < 3; i++) {
      const card = this.q(`s0-card-${i}`);
      if (card) { card.style.opacity = ''; card.style.transform = ''; }
    }
  }

  // ─── Step 1: Transparent Fees — Receipt count-up ───────

  private async playStep1(): Promise<void> {
    const track = (a: Animation) => { this.animations[1].push(a); return a; };
    const textEl = this.q('text-1')!;
    const mockEl = this.q('mock-1')!;

    // Reversed: text from right, mock from left
    track(textEl.animate(
      [{ opacity: '0', transform: 'translateX(30px)' }, { opacity: '1', transform: 'translateX(0)' }],
      { duration: 600, fill: 'forwards', easing: EASE_MEDIUM },
    ));
    const a1 = track(mockEl.animate(
      [
        { opacity: '0', transform: 'translateX(-30px)', filter: 'blur(8px)' },
        { opacity: '1', transform: 'translateX(0)', filter: 'blur(0px)' },
      ],
      { duration: 600, fill: 'forwards', easing: EASE_HEAVY },
    ));
    try { await a1.finished; } catch { return; }

    // Stagger receipt rows with count-up
    const targets = [50000, -5000, 45000];
    const formatters = [
      (v: number) => `${v.toLocaleString()}₫`,
      (v: number) => `-${Math.abs(v).toLocaleString()}₫`,
      (v: number) => `${v.toLocaleString()}₫`,
    ];

    for (let i = 0; i < 3; i++) {
      const row = this.q(`s1-row-${i}`);
      if (!row) continue;
      if (i > 0) await this.delay(40);

      track(row.animate(
        [
          { opacity: '0', transform: 'translateY(8px)' },
          { opacity: '1', transform: 'translateY(0)' },
        ],
        { duration: 300, fill: 'forwards', easing: EASE_LIGHT },
      ));

      // Count up number
      const valEl = this.q(`s1-val-${i}`);
      if (valEl) {
        const target = targets[i];
        const start = performance.now();
        const duration = 600;
        const fi = i;
        const tick = (now: number) => {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          const current = Math.round(eased * target);
          valEl.textContent = formatters[fi](current);
          if (progress < 1) {
            const id = requestAnimationFrame(tick);
            this.rafIds.push(id);
          }
        };
        const id = requestAnimationFrame(tick);
        this.rafIds.push(id);
      }
    }

    await this.delay(300);

    // Badge pop
    const badge = this.q('s1-badge');
    if (badge) {
      track(badge.animate(
        [
          { opacity: '0', transform: 'scale(0.6)' },
          { opacity: '1', transform: 'scale(1)' },
        ],
        { duration: 400, easing: EASE_ELASTIC, fill: 'forwards' },
      ));
    }
  }

  private resetStep1Elements(): void {
    for (let i = 0; i < 3; i++) {
      const row = this.q(`s1-row-${i}`);
      if (row) { row.style.opacity = ''; row.style.transform = ''; }
      const val = this.q(`s1-val-${i}`);
      if (val) val.textContent = '0';
    }
    const badge = this.q('s1-badge');
    if (badge) { badge.style.opacity = ''; badge.style.transform = ''; }
    for (const id of this.rafIds) cancelAnimationFrame(id);
    this.rafIds = [];
  }

  // ─── Step 2: Nearby Tasks — Map pins ───────────────────

  private async playStep2(): Promise<void> {
    const track = (a: Animation) => { this.animations[2].push(a); return a; };
    const textEl = this.q('text-2')!;
    const mockEl = this.q('mock-2')!;

    // Text from left, mock from right
    track(textEl.animate(
      [{ opacity: '0', transform: 'translateX(-30px)' }, { opacity: '1', transform: 'translateX(0)' }],
      { duration: 600, fill: 'forwards', easing: EASE_MEDIUM },
    ));
    const a1 = track(mockEl.animate(
      [
        { opacity: '0', transform: 'translateX(30px)', filter: 'blur(8px)' },
        { opacity: '1', transform: 'translateX(0)', filter: 'blur(0px)' },
      ],
      { duration: 600, fill: 'forwards', easing: EASE_HEAVY },
    ));
    try { await a1.finished; } catch { return; }

    // Map label fade (minimap handles its own markers)
    const label = this.q('s2-label');
    if (label) {
      track(label.animate(
        [{ opacity: '0' }, { opacity: '1' }],
        { duration: 400, easing: 'ease-out', fill: 'forwards' },
      ));
    }
  }

  private resetStep2Elements(): void {
    const label = this.q('s2-label');
    if (label) label.style.opacity = '';
  }

  // ─── Step 3: Real-time Chat — Bubble sequence ──────────

  private async playStep3(): Promise<void> {
    const track = (a: Animation) => { this.animations[3].push(a); return a; };
    const textEl = this.q('text-3')!;
    const mockEl = this.q('mock-3')!;

    // Reversed: text from right, mock from left
    track(textEl.animate(
      [{ opacity: '0', transform: 'translateX(30px)' }, { opacity: '1', transform: 'translateX(0)' }],
      { duration: 600, fill: 'forwards', easing: EASE_MEDIUM },
    ));
    const a1 = track(mockEl.animate(
      [
        { opacity: '0', transform: 'translateX(-30px)', filter: 'blur(8px)' },
        { opacity: '1', transform: 'translateX(0)', filter: 'blur(0px)' },
      ],
      { duration: 600, fill: 'forwards', easing: EASE_HEAVY },
    ));
    try { await a1.finished; } catch { return; }

    const typing = this.q('s3-typing');

    // Typing → bubble sequence (x3)
    for (let i = 0; i < 3; i++) {
      // Show typing dots
      if (typing) {
        const showTyping = track(typing.animate(
          [{ opacity: '0' }, { opacity: '1' }],
          { duration: 200, fill: 'forwards' },
        ));
        try { await showTyping.finished; } catch { return; }
        await this.delay(600);

        // Hide typing
        track(typing.animate(
          [{ opacity: '1' }, { opacity: '0' }],
          { duration: 150, fill: 'forwards' },
        ));
        await this.delay(100);
      }

      // Show bubble
      const bubble = this.q(`s3-bubble-${i}`);
      if (bubble) {
        const a = track(bubble.animate(
          [
            { opacity: '0', transform: 'translateY(10px)' },
            { opacity: '1', transform: 'translateY(0)' },
          ],
          { duration: 300, fill: 'forwards', easing: EASE_LIGHT },
        ));
        try { await a.finished; } catch { return; }
      }

      if (i < 2) await this.delay(200);
    }
  }

  private resetStep3Elements(): void {
    for (let i = 0; i < 3; i++) {
      const b = this.q(`s3-bubble-${i}`);
      if (b) { b.style.opacity = ''; b.style.transform = ''; }
    }
    const typing = this.q('s3-typing');
    if (typing) typing.style.opacity = '';
  }

  // ─── Utility ──────────────────────────────────────────

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
