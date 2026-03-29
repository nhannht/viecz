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
import { TaskCardComponent } from '../shared/components/task-card.component';
import { Task } from '../core/models';

// Weight-based easing curves
const EASE_LIGHT = 'cubic-bezier(0.34, 1.56, 0.64, 1)';   // snappy overshoot (fields, buttons)
const EASE_MEDIUM = 'cubic-bezier(0.22, 1, 0.36, 1)';      // smooth momentum (text blocks)
const EASE_HEAVY = 'cubic-bezier(0.16, 1, 0.3, 1)';        // slower settle (panels, cards)
const _EASE_ELASTIC = 'cubic-bezier(0.68, -0.55, 0.27, 1.55)'; // spring bounce (stamp)

// Cross-dissolve progress ranges
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const HIW_RANGES = {
  step0: { start: 0, end: 0.30 },
  dissolve01: { start: 0.25, end: 0.35 },
  step1: { start: 0.30, end: 0.60 },
  dissolve12: { start: 0.55, end: 0.65 },
  step2: { start: 0.60, end: 1.0 },
};
const ANIM_THRESHOLDS = [0.02, 0.30, 0.60];
const ANIM_HYSTERESIS = 0.03;

// Background gradient colors
const BG_TEAL = [33, 128, 141, 0.15] as const;
const BG_INDIGO = [80, 80, 200, 0.12] as const;
const BG_WARM = [200, 140, 60, 0.10] as const;

@Component({
  selector: 'app-landing-howitworks',
  standalone: true,
  imports: [TranslocoDirective, TaskCardComponent],
  template: `
    <ng-container *transloco="let t">
      <section id="landing-howitworks" class="howitworks-section" #sectionEl>
        <h2 class="section-title">{{ t('marketplace.howItWorks') }}</h2>

        <div class="hiw-indicators">
          <span class="hiw-dot" [attr.data-hiw]="'dot-0'"></span>
          <span class="hiw-dot" [attr.data-hiw]="'dot-1'"></span>
          <span class="hiw-dot" [attr.data-hiw]="'dot-2'"></span>
        </div>

        <div class="hiw-stage">
          <!-- Step 1: Post a task -->
          <div id="hiw-post" class="hiw-slide" [attr.data-hiw]="'slide-0'">
            <div class="river-text" [attr.data-hiw]="'text-0'">
              <span class="step-number">1</span>
              <h3 class="step-heading">{{ t('marketplace.step1Title') }}</h3>
              <p class="step-body">{{ t('landing.step1Long') }}</p>
            </div>
            <div class="river-mock mock-panel" [attr.data-hiw]="'mock-0'">
              <!-- Mini task form -->
              <div class="mock-form">
                <div class="mock-field" [attr.data-hiw]="'s1-field-0'">
                  <label class="mock-label">{{ t('landing.mockTitleLabel') }}</label>
                  <div class="mock-input typewriter-host">
                    <span class="typewriter-text" [attr.data-hiw]="'s1-tw-text'">{{ t('landing.mockTaskTitle') }}</span>
                    <span class="typewriter-cursor" [attr.data-hiw]="'s1-tw-cursor'"></span>
                  </div>
                </div>
                <div class="mock-field" [attr.data-hiw]="'s1-field-1'">
                  <label class="mock-label">{{ t('landing.mockCategoryLabel') }}</label>
                  <div class="mock-input">{{ t('landing.mockCategoryValue') }}</div>
                </div>
                <div class="mock-field" [attr.data-hiw]="'s1-field-2'">
                  <label class="mock-label">{{ t('landing.mockPriceLabel') }}</label>
                  <div class="mock-input">50,000 ₫</div>
                </div>
                <button class="mock-btn" [attr.data-hiw]="'s1-btn'">{{ t('landing.mockPostBtn') }}</button>
              </div>
              <!-- Result: task card -->
              <div class="mock-task-card" [attr.data-hiw]="'s1-card'">
                <h4 class="mock-card-title">{{ t('landing.mockTaskTitle') }}</h4>
                <p class="mock-card-desc">{{ t('landing.mockTaskDesc') }}</p>
                <div class="mock-card-meta">
                  <span class="mock-badge">{{ t('landing.mockCategoryValue') }}</span>
                  <span class="mock-card-price">50,000 ₫</span>
                </div>
                <div class="mock-card-footer">
                  <span class="mock-card-location">{{ t('landing.mockLocation') }}</span>
                  <span class="mock-card-deadline">{{ t('landing.mockDeadline') }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 2: Get matched (reversed) -->
          <div id="hiw-match" class="hiw-slide hiw-slide--reversed" [attr.data-hiw]="'slide-1'">
            <div class="river-text" [attr.data-hiw]="'text-1'">
              <span class="step-number">2</span>
              <h3 class="step-heading">{{ t('marketplace.step2Title') }}</h3>
              <p class="step-body">{{ t('landing.step2Long') }}</p>
            </div>
            <div class="river-mock mock-panel" [attr.data-hiw]="'mock-1'">
              <div class="mock-applicants-header">
                <span class="mock-applicants-label">{{ t('task.applications') }}</span>
                <span class="mock-applicants-count" [attr.data-hiw]="'s2-counter'">0</span>
              </div>
              <div class="mock-applicant" [attr.data-hiw]="'s2-app-0'">
                <div class="mock-avatar" style="background: #5b8a72;"></div>
                <div class="mock-applicant-info">
                  <span class="mock-applicant-name">{{ t('landing.mockApplicant1') }}</span>
                  <span class="mock-applicant-rating">★★★★★</span>
                </div>
                <span class="mock-applicant-price">45,000 ₫</span>
              </div>
              <div class="mock-applicant" [attr.data-hiw]="'s2-app-1'">
                <div class="mock-avatar" style="background: #8a5b7a;"></div>
                <div class="mock-applicant-info">
                  <span class="mock-applicant-name">{{ t('landing.mockApplicant2') }}</span>
                  <span class="mock-applicant-rating">★★★★☆</span>
                </div>
                <span class="mock-applicant-price">50,000 ₫</span>
              </div>
              <div class="mock-applicant" [attr.data-hiw]="'s2-app-2'">
                <div class="mock-avatar" style="background: #5b6e8a;"></div>
                <div class="mock-applicant-info">
                  <span class="mock-applicant-name">{{ t('landing.mockApplicant3') }}</span>
                  <span class="mock-applicant-rating">★★★★★</span>
                </div>
                <span class="mock-applicant-price">48,000 ₫</span>
              </div>
            </div>
          </div>

          <!-- Step 3: Get it done -->
          <div id="hiw-pay" class="hiw-slide" [attr.data-hiw]="'slide-2'">
            <div class="river-text" [attr.data-hiw]="'text-2'">
              <span class="step-number">3</span>
              <h3 class="step-heading">{{ t('marketplace.step3Title') }}</h3>
              <p class="step-body">{{ t('landing.step3Long') }}</p>
            </div>
            <div class="river-mock completed-card-wrap" [attr.data-hiw]="'mock-2'">
              <div class="completed-card-item" [attr.data-hiw]="'s3-card'">
                <app-task-card [task]="completedTask" />
              </div>
            </div>
          </div>
        </div>

        <div class="hiw-bg-gradient" [attr.data-hiw]="'bg-gradient'"></div>
      </section>
    </ng-container>
  `,
  styles: `
    .howitworks-section {
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
    .hiw-stage {
      position: relative;
      width: 100%;
      height: 100vh;
      min-height: 600px;
    }

    .hiw-slide {
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
    .hiw-slide--active { pointer-events: auto; }

    .hiw-slide--reversed {
      grid-template-columns: 1fr 1fr;
    }
    .hiw-slide--reversed .river-text { order: 2; }
    .hiw-slide--reversed .river-mock { order: 1; }

    /* --- Dot indicators --- */
    .hiw-indicators {
      position: absolute;
      bottom: 2rem;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10;
      display: flex;
      gap: 0.5rem;
    }
    .hiw-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.3);
      transition: background 300ms, transform 300ms;
    }
    .hiw-dot--active {
      background: var(--color-fg);
      transform: scale(1.4);
    }

    /* --- Background gradient overlay --- */
    .hiw-bg-gradient {
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
      border: 1px solid rgba(255, 255, 255, 0.25);
      background: rgba(255, 255, 255, calc(0.12 + var(--whale-darkness, 0) * 0.48));
      backdrop-filter: blur(30px) saturate(150%);
      -webkit-backdrop-filter: blur(30px) saturate(150%);
      box-shadow:
        0 2px 16px rgba(0, 0, 0, calc(0.08 + var(--whale-darkness, 0) * 0.15));
      padding: 1.5rem;
      opacity: 0;
      transform: translateX(30px);
      filter: blur(8px);
      overflow: hidden;
    }

    /* --- Step 1: Task form mock --- */
    .mock-form {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .mock-field {
      opacity: 0;
      transform: translateY(4px);
    }

    .mock-label {
      font-family: var(--font-display);
      font-size: 0.6rem;
      font-weight: 600;
      letter-spacing: 0.12em;
      color: var(--color-muted);
      margin-bottom: 0.25rem;
      display: block;
    }

    .mock-input {
      font-family: var(--font-body);
      font-size: 0.75rem;
      color: var(--color-fg);
      padding: 0.5rem 0.75rem;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 6px;
      background: rgba(255, 255, 255, calc(0.04 + var(--whale-darkness, 0) * 0.26));
    }

    .typewriter-host {
      position: relative;
      overflow: hidden;
    }

    .typewriter-text {
      clip-path: inset(0 100% 0 0);
    }

    .typewriter-cursor {
      display: inline-block;
      width: 1px;
      height: 1em;
      background: var(--color-fg);
      margin-left: 1px;
      vertical-align: text-bottom;
      opacity: 0;
    }

    .mock-btn {
      font-family: var(--font-display);
      font-size: 0.65rem;
      font-weight: 600;
      letter-spacing: 0.1em;
      color: var(--color-bg);
      background: var(--color-fg);
      border: 1px solid var(--color-fg);
      padding: 0.6rem 1rem;
      cursor: default;
      text-align: center;
      opacity: 0;
    }

    /* --- Mock task card result --- */
    .mock-task-card {
      margin-top: 1rem;
      padding: 1rem;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      background: rgba(255, 255, 255, calc(0.04 + var(--whale-darkness, 0) * 0.36));
      opacity: 0;
      transform: translateY(20px) scale(0.95);
    }

    .mock-card-title {
      font-family: var(--font-display);
      font-size: 0.68rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      color: var(--color-fg);
      margin: 0 0 0.35rem;
    }

    .mock-card-desc {
      font-family: var(--font-body);
      font-size: 0.7rem;
      color: var(--color-muted);
      margin: 0 0 0.5rem;
      line-height: 1.4;
    }

    .mock-card-meta {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.35rem;
    }

    .mock-badge {
      font-family: var(--font-display);
      font-size: 0.5rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 0.15rem 0.5rem;
      border: 1px solid var(--color-fg);
      background: var(--color-fg);
      color: var(--color-bg);
    }

    .mock-card-price {
      font-family: var(--font-display);
      font-size: 0.65rem;
      font-weight: 600;
      color: var(--color-fg);
    }

    .mock-card-footer {
      display: flex;
      justify-content: space-between;
      font-family: var(--font-body);
      font-size: 0.6rem;
      color: var(--color-muted);
    }

    /* --- Step 2: Applicants mock --- */
    .mock-applicants-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .mock-applicants-label {
      font-family: var(--font-display);
      font-size: 0.6rem;
      font-weight: 600;
      letter-spacing: 0.1em;
      color: var(--color-muted);
    }

    .mock-applicants-count {
      font-family: var(--font-display);
      font-size: 0.7rem;
      font-weight: 700;
      color: var(--color-fg);
      font-variant-numeric: tabular-nums;
      display: inline-block;
    }

    .mock-applicant {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.6rem 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      opacity: 0;
      transform: translateX(-40px);
    }

    .mock-applicant:last-child {
      border-bottom: none;
    }

    .mock-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .mock-applicant-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
    }

    .mock-applicant-name {
      font-family: var(--font-display);
      font-size: 0.65rem;
      font-weight: 600;
      color: var(--color-fg);
      letter-spacing: 0.05em;
    }

    .mock-applicant-rating {
      font-size: 0.55rem;
      color: var(--color-muted);
      letter-spacing: 1px;
    }

    .mock-applicant-price {
      font-family: var(--font-display);
      font-size: 0.65rem;
      font-weight: 600;
      color: var(--color-fg);
    }

    /* --- Step 3: Completed task card --- */
    .completed-card-wrap {
      padding: 0;
      background: none;
      border: none;
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
      box-shadow: none;
      filter: none;
    }

    .completed-card-item {
      opacity: 0;
      transform: translateY(20px) scale(0.95);
      pointer-events: none;
    }

    /* --- Mobile: undo stacking, fall back to flow layout --- */
    @media (max-width: 768px) {
      .howitworks-section {
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
      .hiw-stage {
        position: relative;
        height: auto;
        min-height: 0;
      }
      .hiw-slide {
        position: relative;
        inset: auto;
        opacity: 1;
        pointer-events: auto;
        will-change: auto;
        margin-bottom: 5rem;
      }
      .hiw-slide,
      .hiw-slide--reversed {
        grid-template-columns: 1fr;
        gap: 1.5rem;
      }
      .hiw-slide--reversed .river-text { order: -1; }
      .hiw-slide--reversed .river-mock { order: 0; }
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
      .mock-field {
        opacity: 1;
        transform: none;
      }
      .mock-btn {
        opacity: 1;
      }
      .mock-task-card {
        opacity: 1;
        transform: none;
      }
      .mock-applicant {
        opacity: 1;
        transform: none;
      }
      .completed-card-item {
        opacity: 1;
        transform: none;
      }
      .typewriter-text {
        clip-path: none;
      }
      .hiw-indicators,
      .hiw-bg-gradient {
        display: none;
      }
    }

    @media (max-width: 480px) {
      .howitworks-section {
        padding: 4rem 1rem 3rem;
      }
    }
  `,
})
export class LandingHowItWorksSection implements OnDestroy {
  @ViewChild('sectionEl') private sectionRef!: ElementRef<HTMLElement>;

  private el = inject(ElementRef<HTMLElement>);
  private platformId = inject(PLATFORM_ID);
  private animations: Animation[][] = [[], [], []];
  private played: boolean[] = [false, false, false];
  private lastActiveStep = -1;

  completedTask: Task = {
    id: 99, requester_id: 0, category_id: 2,
    title: 'Giao giấy tờ từ FPT', description: 'Nhận giấy tờ từ văn phòng FPT và giao đến địa chỉ ở Thủ Đức.',
    price: 45000, location: 'Thủ Đức, TP.HCM', status: 'completed',
    category: { id: 2, name: 'Delivery', name_vi: 'Giao nhận', is_active: true },
    application_count: 3, created_at: '2026-03-14T08:30:00Z', updated_at: '2026-03-14T12:00:00Z',
    completed_at: '2026-03-14T12:00:00Z',
  };

  constructor() {}

  /** Expose section element for parent GSAP pin */
  getSectionEl(): HTMLElement | null {
    return this.sectionRef?.nativeElement ?? null;
  }

  /** Query a single element by data-hiw attribute from host */
  private q(key: string): HTMLElement | null {
    return this.el.nativeElement.querySelector(`[data-hiw="${key}"]`);
  }

  /** Query all elements by data-hiw prefix */
  private qAll(prefix: string): HTMLElement[] {
    return Array.from(this.el.nativeElement.querySelectorAll(`[data-hiw^="${prefix}"]`));
  }

  ngOnDestroy(): void {
    for (const group of this.animations) {
      for (const anim of group) {
        anim.cancel();
      }
    }
    this.animations = [[], [], []];
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
      this.stepVisibility(p, HIW_RANGES.step0, HIW_RANGES.dissolve01, null),
      this.stepVisibility(p, HIW_RANGES.step1, HIW_RANGES.dissolve12, HIW_RANGES.dissolve01),
      this.stepVisibility(p, HIW_RANGES.step2, null, HIW_RANGES.dissolve12),
    ];

    // 2. Apply slide visibility (opacity, blur, scale)
    for (let i = 0; i < 3; i++) {
      this.applySlideVisibility(i, vis[i]);
    }

    // 3. Background gradient
    this.updateBgGradient(p);

    // 4. Dot indicators
    this.updateDots(p);

    // 5. Fire-and-forget internal animations at thresholds
    this.checkAndFireInternalAnims(p);
  }

  private stepVisibility(
    p: number,
    range: { start: number; end: number },
    dissolveOut: { start: number; end: number } | null,
    dissolveIn: { start: number; end: number } | null,
  ): number {
    // Incoming: fade in during dissolveIn zone
    let fadeIn = 1;
    if (dissolveIn) {
      if (p < dissolveIn.start) return 0;
      if (p < dissolveIn.end) {
        fadeIn = clamp01((p - dissolveIn.start) / (dissolveIn.end - dissolveIn.start));
      }
    } else {
      // First step: visible from start
      if (p < range.start) fadeIn = clamp01(p / 0.02 || 1); // instant at p=0
    }

    // Outgoing: fade out during dissolveOut zone
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
      slide.classList.remove('hiw-slide--active');
      return;
    }

    slide.style.opacity = String(v);
    // Incoming: blur clears as v→1; outgoing: scale shrinks as v→0
    const blurPx = 6 * (1 - v);
    slide.style.filter = blurPx > 0.1 ? `blur(${blurPx.toFixed(1)}px)` : 'none';
    slide.style.transform = `scale(${(0.96 + v * 0.04).toFixed(3)})`;

    if (v > 0.5) {
      slide.classList.add('hiw-slide--active');
      slide.style.pointerEvents = 'auto';
    } else {
      slide.classList.remove('hiw-slide--active');
      slide.style.pointerEvents = 'none';
    }
  }

  private updateBgGradient(p: number): void {
    const bg = this.q('bg-gradient');
    if (!bg) return;

    let r: number, g: number, b: number, a: number;
    if (p <= 0.30) {
      [r, g, b, a] = BG_TEAL;
    } else if (p <= 0.60) {
      const t = clamp01((p - 0.30) / 0.30);
      r = lerp(BG_TEAL[0], BG_INDIGO[0], t);
      g = lerp(BG_TEAL[1], BG_INDIGO[1], t);
      b = lerp(BG_TEAL[2], BG_INDIGO[2], t);
      a = lerp(BG_TEAL[3], BG_INDIGO[3], t);
    } else {
      const t = clamp01((p - 0.60) / 0.40);
      r = lerp(BG_INDIGO[0], BG_WARM[0], t);
      g = lerp(BG_INDIGO[1], BG_WARM[1], t);
      b = lerp(BG_INDIGO[2], BG_WARM[2], t);
      a = lerp(BG_INDIGO[3], BG_WARM[3], t);
    }

    bg.style.background =
      `radial-gradient(ellipse 80% 80% at 50% 50%, rgba(${Math.round(r!)}, ${Math.round(g!)}, ${Math.round(b!)}, ${a!.toFixed(2)}), transparent)`;
  }

  private updateDots(p: number): void {
    let active: number;
    if (p < 0.30) active = 0;
    else if (p < 0.60) active = 1;
    else active = 2;

    if (active === this.lastActiveStep) return;
    this.lastActiveStep = active;

    for (let i = 0; i < 3; i++) {
      const dot = this.q(`dot-${i}`);
      if (!dot) continue;
      if (i === active) {
        dot.classList.add('hiw-dot--active');
      } else {
        dot.classList.remove('hiw-dot--active');
      }
    }
  }

  private checkAndFireInternalAnims(p: number): void {
    for (let i = 0; i < 3; i++) {
      const threshold = ANIM_THRESHOLDS[i];
      if (p >= threshold && !this.played[i]) {
        this.playStep(i);
      } else if (p < threshold - ANIM_HYSTERESIS && this.played[i]) {
        this.resetStep(i);
      }
    }
  }

  // ─── Legacy API (kept for mobile fallback) ──────────────

  /** Called by parent ScrollTrigger onEnter (mobile) or internally */
  playStep(index: number): void {
    if (this.played[index]) return;
    if (!isPlatformBrowser(this.platformId)) return;

    // Verify elements exist in the DOM (transloco may not have rendered yet)
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
      case 0: this.playStep1(); break;
      case 1: this.playStep2(); break;
      case 2: this.playStep3(); break;
    }
  }

  /** Called by parent ScrollTrigger onLeaveBack (mobile) or internally */
  resetStep(index: number): void {
    if (!this.played[index]) return;
    this.played[index] = false;

    for (const anim of this.animations[index]) {
      anim.cancel();
    }
    this.animations[index] = [];

    const textEl = this.q(`text-${index}`);
    const mockEl = this.q(`mock-${index}`);
    // Step 2 (reversed layout): text from right, mock from left; others: text left, mock right
    const textX = index === 1 ? '30px' : '-30px';
    const mockX = index === 1 ? '-30px' : '30px';
    if (textEl) { textEl.style.opacity = '0'; textEl.style.transform = `translateX(${textX})`; }
    if (mockEl) { mockEl.style.opacity = '0'; mockEl.style.transform = `translateX(${mockX})`; mockEl.style.filter = 'blur(8px)'; }

    switch (index) {
      case 0: this.resetStep1Elements(); break;
      case 1: this.resetStep2Elements(); break;
      case 2: this.resetStep3Elements(); break;
    }
  }

  private showAllFinalStates(): void {
    for (let i = 0; i < 3; i++) {
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
        for (let i = 0; i < 3; i++) this.showEl(this.q(`s1-field-${i}`));
        const tw = this.q('s1-tw-text');
        if (tw) tw.style.clipPath = 'inset(0 0 0 0)';
        this.showEl(this.q('s1-btn'));
        const card = this.q('s1-card');
        if (card) { card.style.opacity = '1'; card.style.transform = 'none'; }
        break;
      }
      case 1: {
        for (let i = 0; i < 3; i++) {
          const app = this.q(`s2-app-${i}`);
          if (app) { app.style.opacity = '1'; app.style.transform = 'none'; }
        }
        const counter = this.q('s2-counter');
        if (counter) counter.textContent = '3';
        break;
      }
      case 2: {
        const card = this.q('s3-card');
        if (card) { card.style.opacity = '1'; card.style.transform = 'none'; }
        break;
      }
    }
  }

  private showEl(el: HTMLElement | null): void {
    if (el) { el.style.opacity = '1'; el.style.transform = 'none'; }
  }

  // ─── Step 1: Post a task ───────────────────────────────

  private async playStep1(): Promise<void> {
    const track = (a: Animation) => { this.animations[0].push(a); return a; };
    const textEl = this.q('text-0')!;
    const mockEl = this.q('mock-0')!;

    // 0.0s — text slides from LEFT, mock from RIGHT with blur
    const a1 = track(textEl.animate(
      [{ opacity: '0', transform: 'translateX(-30px)' }, { opacity: '1', transform: 'translateX(0)' }],
      { duration: 600, fill: 'forwards', easing: EASE_MEDIUM },
    ));
    track(mockEl.animate(
      [
        { opacity: '0', transform: 'translateX(30px)', filter: 'blur(8px)' },
        { opacity: '1', transform: 'translateX(0)', filter: 'blur(0px)' },
      ],
      { duration: 600, fill: 'forwards', easing: EASE_HEAVY },
    ));

    // Show first field immediately with panel
    const f0 = this.q('s1-field-0');
    if (f0) {
      track(f0.animate(
        [{ opacity: '0', transform: 'translateY(4px)' }, { opacity: '1', transform: 'translateY(0)' }],
        { duration: 300, fill: 'forwards', easing: EASE_LIGHT },
      ));
    }

    try { await a1.finished; } catch { return; }

    // 0.6s — variable typewriter (natural pauses at word boundaries)
    const twCursor = this.q('s1-tw-cursor');
    if (twCursor) {
      track(twCursor.animate(
        [{ opacity: '1' }, { opacity: '0' }, { opacity: '1' }],
        { duration: 600, iterations: 4, fill: 'forwards' },
      ));
    }
    const twText = this.q('s1-tw-text');
    if (twText) {
      const text = twText.textContent || '';
      const twKeyframes = this.buildTypewriterKeyframes(text);
      const twAnim = track(twText.animate(twKeyframes, { duration: 1200, fill: 'forwards' }));
      try { await twAnim.finished; } catch { return; }
    }

    // 1.8s — micro-stagger fields (40ms gaps instead of 300ms sequential)
    const fields = [this.q('s1-field-1'), this.q('s1-field-2')];
    for (let i = 0; i < fields.length; i++) {
      const f = fields[i];
      if (!f) continue;
      if (i > 0) await this.delay(40);
      track(f.animate(
        [{ opacity: '0', transform: 'translateY(4px)' }, { opacity: '1', transform: 'translateY(0)' }],
        { duration: 300, fill: 'forwards', easing: EASE_LIGHT },
      ));
    }
    await this.delay(200);

    // button pulse with elastic
    const btn = this.q('s1-btn');
    if (btn) {
      const a = track(btn.animate(
        [
          { opacity: '0', transform: 'scale(0.95)' },
          { opacity: '1', transform: 'scale(1.03)' },
          { opacity: '1', transform: 'scale(1)' },
        ],
        { duration: 300, fill: 'forwards', easing: EASE_LIGHT },
      ));
      try { await a.finished; } catch { return; }
    }

    // task card with elastic overshoot (3-keyframe)
    const card = this.q('s1-card');
    if (card) {
      track(card.animate(
        [
          { opacity: '0', transform: 'translateY(20px) scale(0.95)' },
          { opacity: '1', transform: 'translateY(-4px) scale(1.02)' },
          { opacity: '1', transform: 'translateY(0) scale(1)' },
        ],
        { duration: 600, fill: 'forwards', easing: EASE_HEAVY },
      ));
    }
  }

  private resetStep1Elements(): void {
    for (let i = 0; i < 3; i++) {
      const f = this.q(`s1-field-${i}`);
      if (f) { f.style.opacity = '0'; f.style.transform = 'translateY(4px)'; }
    }
    const btn = this.q('s1-btn');
    if (btn) { btn.style.opacity = '0'; }
    const card = this.q('s1-card');
    if (card) { card.style.opacity = '0'; card.style.transform = 'translateY(20px) scale(0.95)'; }
    const tw = this.q('s1-tw-text');
    if (tw) tw.style.clipPath = 'inset(0 100% 0 0)';
    const cursor = this.q('s1-tw-cursor');
    if (cursor) cursor.style.opacity = '0';
  }

  // ─── Step 2: Get matched ──────────────────────────────

  private async playStep2(): Promise<void> {
    const track = (a: Animation) => { this.animations[1].push(a); return a; };
    const textEl = this.q('text-1')!;
    const mockEl = this.q('mock-1')!;

    // 0.0s — reversed layout: text from RIGHT, mock from LEFT with blur
    track(textEl.animate(
      [{ opacity: '0', transform: 'translateX(30px)' }, { opacity: '1', transform: 'translateX(0)' }],
      { duration: 600, fill: 'forwards', easing: EASE_MEDIUM },
    ));
    const a2 = track(mockEl.animate(
      [
        { opacity: '0', transform: 'translateX(-30px)', filter: 'blur(8px)' },
        { opacity: '1', transform: 'translateX(0)', filter: 'blur(0px)' },
      ],
      { duration: 600, fill: 'forwards', easing: EASE_HEAVY },
    ));
    try { await a2.finished; } catch { return; }

    const counterEl = this.q('s2-counter');

    // Slide in applicants with counter scale bump
    for (let i = 0; i < 3; i++) {
      const el = this.q(`s2-app-${i}`);
      if (!el) continue;

      if (i > 0) await this.delay(200);

      const a = track(el.animate(
        [
          { opacity: '0', transform: 'translateX(-40px)' },
          { opacity: '1', transform: 'translateX(0)' },
        ],
        { duration: 400, fill: 'forwards', easing: EASE_MEDIUM },
      ));

      // Counter scale bump on each applicant arrival
      a.finished.then(() => {
        if (counterEl) {
          counterEl.textContent = String(i + 1);
          track(counterEl.animate(
            [{ transform: 'scale(1.3)' }, { transform: 'scale(1)' }],
            { duration: 200, easing: EASE_LIGHT },
          ));
        }
      }).catch(() => { /* AbortError — animation cancelled */ });
      try { await a.finished; } catch { return; }
    }
  }

  private resetStep2Elements(): void {
    for (let i = 0; i < 3; i++) {
      const app = this.q(`s2-app-${i}`);
      if (app) { app.style.opacity = '0'; app.style.transform = 'translateX(-40px)'; }
    }
    const counter = this.q('s2-counter');
    if (counter) counter.textContent = '0';
  }

  // ─── Step 3: Get it done — completed task card ───────

  private async playStep3(): Promise<void> {
    const track = (a: Animation) => { this.animations[2].push(a); return a; };
    const textEl = this.q('text-2')!;
    const mockEl = this.q('mock-2')!;

    // Text from left
    track(textEl.animate(
      [{ opacity: '0', transform: 'translateX(-30px)' }, { opacity: '1', transform: 'translateX(0)' }],
      { duration: 600, fill: 'forwards', easing: EASE_MEDIUM },
    ));

    // Mock container (no glass — just show it)
    mockEl.style.opacity = '1';
    mockEl.style.transform = 'none';
    mockEl.style.filter = 'none';

    await this.delay(200);

    // Task card slides up with elastic overshoot
    const card = this.q('s3-card');
    if (card) {
      track(card.animate(
        [
          { opacity: '0', transform: 'translateY(20px) scale(0.95)' },
          { opacity: '1', transform: 'translateY(-4px) scale(1.02)' },
          { opacity: '1', transform: 'translateY(0) scale(1)' },
        ],
        { duration: 600, fill: 'forwards', easing: EASE_HEAVY },
      ));
    }
  }

  private resetStep3Elements(): void {
    const card = this.q('s3-card');
    if (card) { card.style.opacity = ''; card.style.transform = ''; }
  }

  // ─── Utility ──────────────────────────────────────────

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /** Build variable-speed typewriter keyframes with pauses at word boundaries */
  private buildTypewriterKeyframes(text: string): Keyframe[] {
    if (!text.length) return [{ clipPath: 'inset(0 0 0 0)' }];

    const keyframes: { clipPath: string; offset: number }[] = [];
    const spaceIndices = new Set<number>();
    for (let i = 0; i < text.length; i++) {
      if (text[i] === ' ') spaceIndices.add(i + 1); // pause after each space
    }

    let t = 0;
    for (let i = 0; i <= text.length; i++) {
      const pct = i / text.length;
      keyframes.push({ clipPath: `inset(0 ${(100 - pct * 100).toFixed(1)}% 0 0)`, offset: t });
      t += spaceIndices.has(i) ? 0.08 : 0.03; // longer pause at word breaks
    }

    // Normalize offsets to 0-1
    const total = t;
    for (const k of keyframes) k.offset /= total;
    // Ensure first=0 and last=1
    keyframes[0].offset = 0;
    keyframes[keyframes.length - 1].offset = 1;

    return keyframes;
  }
}
