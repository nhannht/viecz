import {
  Component,
  ElementRef,
  inject,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
  ViewChildren,
  QueryList,
  afterNextRender,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TranslocoDirective } from '@jsverse/transloco';

@Component({
  selector: 'app-landing-howitworks',
  standalone: true,
  imports: [TranslocoDirective],
  template: `
    <ng-container *transloco="let t">
      <section class="howitworks-section">
        <h2 class="section-title">{{ t('marketplace.howItWorks') }}</h2>

        <!-- Step 1: Post a task -->
        <div class="river-step" #riverStep>
          <div class="river-text" #stepText>
            <span class="step-number">1</span>
            <h3 class="step-heading">{{ t('marketplace.step1Title') }}</h3>
            <p class="step-body">{{ t('landing.step1Long') }}</p>
          </div>
          <div class="river-mock mock-panel" #stepMock>
            <!-- Mini task form -->
            <div class="mock-form">
              <div class="mock-field" #step1Field0>
                <label class="mock-label">{{ t('landing.mockTitleLabel') }}</label>
                <div class="mock-input typewriter-host">
                  <span class="typewriter-text" #typewriterText>{{ t('landing.mockTaskTitle') }}</span>
                  <span class="typewriter-cursor" #typewriterCursor></span>
                </div>
              </div>
              <div class="mock-field" #step1Field1>
                <label class="mock-label">{{ t('landing.mockCategoryLabel') }}</label>
                <div class="mock-input">{{ t('landing.mockCategoryValue') }}</div>
              </div>
              <div class="mock-field" #step1Field2>
                <label class="mock-label">{{ t('landing.mockPriceLabel') }}</label>
                <div class="mock-input">50,000 ₫</div>
              </div>
              <button class="mock-btn" #step1Btn>{{ t('landing.mockPostBtn') }}</button>
            </div>
            <!-- Result: task card -->
            <div class="mock-task-card" #step1Card>
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
        <div class="river-step river-step--reversed" #riverStep>
          <div class="river-text" #stepText>
            <span class="step-number">2</span>
            <h3 class="step-heading">{{ t('marketplace.step2Title') }}</h3>
            <p class="step-body">{{ t('landing.step2Long') }}</p>
          </div>
          <div class="river-mock mock-panel" #stepMock>
            <div class="mock-applicants-header">
              <span class="mock-applicants-label">{{ t('task.applications') }}</span>
              <span class="mock-applicants-count" #step2Counter>0</span>
            </div>
            <div class="mock-applicant" #step2App0>
              <div class="mock-avatar" style="background: #5b8a72;"></div>
              <div class="mock-applicant-info">
                <span class="mock-applicant-name">{{ t('landing.mockApplicant1') }}</span>
                <span class="mock-applicant-rating">★★★★★</span>
              </div>
              <span class="mock-applicant-price">45,000 ₫</span>
            </div>
            <div class="mock-applicant" #step2App1>
              <div class="mock-avatar" style="background: #8a5b7a;"></div>
              <div class="mock-applicant-info">
                <span class="mock-applicant-name">{{ t('landing.mockApplicant2') }}</span>
                <span class="mock-applicant-rating">★★★★☆</span>
              </div>
              <span class="mock-applicant-price">50,000 ₫</span>
            </div>
            <div class="mock-applicant" #step2App2>
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
        <div class="river-step" #riverStep>
          <div class="river-text" #stepText>
            <span class="step-number">3</span>
            <h3 class="step-heading">{{ t('marketplace.step3Title') }}</h3>
            <p class="step-body">{{ t('landing.step3Long') }}</p>
          </div>
          <div class="river-mock mock-panel" #stepMock>
            <div class="mock-receipt" #step3Receipt>
              <div class="mock-receipt-row" #step3Row0>
                <span>{{ t('landing.mockReceiptTask') }}</span>
                <span class="mock-receipt-dots"></span>
                <span>{{ t('landing.mockTaskTitle') }}</span>
              </div>
              <div class="mock-receipt-row" #step3Row1>
                <span>{{ t('landing.mockPriceLabel') }}</span>
                <span class="mock-receipt-dots"></span>
                <span>45,000 ₫</span>
              </div>
              <div class="mock-receipt-row" #step3Row2>
                <span>{{ t('landing.mockReceiptFee') }}</span>
                <span class="mock-receipt-dots"></span>
                <span>0 ₫</span>
              </div>
              <div class="mock-receipt-row mock-receipt-total" #step3Row3>
                <span>{{ t('landing.mockReceiptTotal') }}</span>
                <span class="mock-receipt-dots"></span>
                <span>45,000 ₫</span>
              </div>
              <div class="mock-progress-bar-track">
                <div class="mock-progress-bar-fill" #step3Bar></div>
              </div>
              <div class="mock-status-row">
                <span class="mock-status-text" #step3Status>{{ t('landing.mockPending') }}</span>
              </div>
              <div class="mock-stamp" #step3Stamp>✓ {{ t('landing.mockPaid') }}</div>
            </div>
          </div>
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
      margin: 0 0 4rem;
    }

    /* --- River layout --- */
    .river-step {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2.5rem;
      align-items: center;
      margin-bottom: 5rem;
      content-visibility: auto;
    }

    .river-step--reversed {
      direction: rtl;
    }
    .river-step--reversed > * {
      direction: ltr;
    }

    .river-text {
      /* Visible by default for SSR; hidden via JS in browser before animation */
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

    .step-heading {
      font-family: var(--font-display);
      font-size: 0.85rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      color: var(--color-fg);
      margin: 0.5rem 0;
    }

    .step-body {
      font-family: var(--font-body);
      font-size: 0.82rem;
      color: var(--color-muted);
      line-height: 1.6;
      margin: 0;
    }

    /* --- Mock panel (frostglass) --- */
    .mock-panel {
      border-radius: 20px;
      border: 1px solid rgba(255, 255, 255, 0.25);
      background: rgba(255, 255, 255, 0.06);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      box-shadow:
        0 4px 24px rgba(0, 0, 0, 0.08),
        inset 0 1px 0 rgba(255, 255, 255, 0.2);
      padding: 1.5rem;
      /* Visible by default for SSR; hidden via JS in browser before animation */
      overflow: hidden;
    }

    /* --- Step 1: Task form mock --- */
    .mock-form {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .mock-field {
      /* Hidden via JS before animation */
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
      background: rgba(255, 255, 255, 0.04);
    }

    .typewriter-host {
      position: relative;
      overflow: hidden;
    }

    .typewriter-text {
      /* clip-path set via JS before animation */
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
      /* Hidden via JS before animation */
    }

    /* --- Mock task card result --- */
    .mock-task-card {
      margin-top: 1rem;
      padding: 1rem;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.04);
      /* Hidden via JS before animation */
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
    }

    .mock-applicant {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.6rem 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      /* Hidden via JS before animation */
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

    /* --- Step 3: Receipt mock --- */
    .mock-receipt {
      font-family: var(--font-body);
    }

    .mock-receipt-row {
      display: flex;
      align-items: baseline;
      gap: 0.5rem;
      padding: 0.4rem 0;
      font-size: 0.7rem;
      color: var(--color-muted);
      /* Hidden via JS before animation */
    }

    .mock-receipt-dots {
      flex: 1;
      border-bottom: 1px dotted rgba(255, 255, 255, 0.2);
      margin: 0 0.25rem;
      min-width: 20px;
    }

    .mock-receipt-total {
      font-weight: 600;
      color: var(--color-fg);
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      margin-top: 0.25rem;
      padding-top: 0.5rem;
    }

    .mock-progress-bar-track {
      height: 4px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 2px;
      margin: 1rem 0 0.75rem;
      overflow: hidden;
    }

    .mock-progress-bar-fill {
      height: 100%;
      background: var(--color-fg);
      border-radius: 2px;
      transform-origin: left;
      /* scaleX(0) set via JS before animation */
    }

    .mock-status-row {
      display: flex;
      justify-content: center;
      margin-bottom: 0.5rem;
    }

    .mock-status-text {
      font-family: var(--font-display);
      font-size: 0.6rem;
      font-weight: 600;
      letter-spacing: 0.12em;
      color: var(--color-muted);
    }

    .mock-stamp {
      text-align: center;
      font-family: var(--font-display);
      font-size: 1.1rem;
      font-weight: 700;
      letter-spacing: 0.15em;
      color: var(--color-fg);
      /* Hidden via JS before animation */
    }

    /* Receipt invert state (applied via JS) */
    .mock-receipt--paid {
      background: var(--color-fg);
      border-radius: 8px;
      padding: 1rem;
      transition: background 300ms ease;
    }
    .mock-receipt--paid .mock-receipt-row,
    .mock-receipt--paid .mock-receipt-total,
    .mock-receipt--paid .mock-status-text,
    .mock-receipt--paid .mock-stamp {
      color: var(--color-bg);
    }
    .mock-receipt--paid .mock-receipt-dots {
      border-bottom-color: rgba(0, 0, 0, 0.2);
    }
    .mock-receipt--paid .mock-receipt-total {
      border-top-color: rgba(0, 0, 0, 0.15);
    }
    .mock-receipt--paid .mock-progress-bar-track {
      background: rgba(0, 0, 0, 0.15);
    }
    .mock-receipt--paid .mock-progress-bar-fill {
      background: var(--color-bg);
    }

    /* --- Ripple divider --- */
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

    /* --- Mobile --- */
    @media (max-width: 768px) {
      .river-step,
      .river-step--reversed {
        grid-template-columns: 1fr;
        gap: 1.5rem;
        direction: ltr;
      }
      .river-step--reversed > * {
        direction: ltr;
      }
      .river-text {
        order: -1;
      }
      .mock-panel {
        max-width: 100%;
      }
    }

    @media (max-width: 480px) {
      .howitworks-section {
        padding: 4rem 1rem 3rem;
      }
      .river-step {
        margin-bottom: 3.5rem;
      }
    }
  `,
})
export class LandingHowItWorksSection implements OnDestroy {
  @ViewChildren('riverStep') riverSteps!: QueryList<ElementRef<HTMLElement>>;
  @ViewChildren('stepText') stepTexts!: QueryList<ElementRef<HTMLElement>>;
  @ViewChildren('stepMock') stepMocks!: QueryList<ElementRef<HTMLElement>>;

  // Step 1 refs
  @ViewChild('typewriterText') typewriterText!: ElementRef<HTMLElement>;
  @ViewChild('typewriterCursor') typewriterCursor!: ElementRef<HTMLElement>;
  @ViewChild('step1Field0') step1Field0!: ElementRef<HTMLElement>;
  @ViewChild('step1Field1') step1Field1!: ElementRef<HTMLElement>;
  @ViewChild('step1Field2') step1Field2!: ElementRef<HTMLElement>;
  @ViewChild('step1Btn') step1Btn!: ElementRef<HTMLElement>;
  @ViewChild('step1Card') step1Card!: ElementRef<HTMLElement>;

  // Step 2 refs
  @ViewChild('step2Counter') step2Counter!: ElementRef<HTMLElement>;
  @ViewChild('step2App0') step2App0!: ElementRef<HTMLElement>;
  @ViewChild('step2App1') step2App1!: ElementRef<HTMLElement>;
  @ViewChild('step2App2') step2App2!: ElementRef<HTMLElement>;

  // Step 3 refs
  @ViewChild('step3Receipt') step3Receipt!: ElementRef<HTMLElement>;
  @ViewChild('step3Row0') step3Row0!: ElementRef<HTMLElement>;
  @ViewChild('step3Row1') step3Row1!: ElementRef<HTMLElement>;
  @ViewChild('step3Row2') step3Row2!: ElementRef<HTMLElement>;
  @ViewChild('step3Row3') step3Row3!: ElementRef<HTMLElement>;
  @ViewChild('step3Bar') step3Bar!: ElementRef<HTMLElement>;
  @ViewChild('step3Status') step3Status!: ElementRef<HTMLElement>;
  @ViewChild('step3Stamp') step3Stamp!: ElementRef<HTMLElement>;

  private platformId = inject(PLATFORM_ID);
  private animations: Animation[][] = [[], [], []];
  private played: boolean[] = [false, false, false];
  private paidText = '';
  private pendingText = '';
  private initialized = false;

  constructor() {
    afterNextRender(() => {
      this.hideElementsBeforeAnimation();
      this.initialized = true;
    });
  }

  /** Hide all animated elements in the browser so ScrollTrigger can reveal them.
   *  SSR renders them visible (no opacity:0 in CSS). */
  private hideElementsBeforeAnimation(): void {
    // Text + mock panels
    this.stepTexts?.forEach(ref => {
      ref.nativeElement.style.opacity = '0';
      ref.nativeElement.style.transform = 'translateY(30px)';
    });
    this.stepMocks?.forEach(ref => {
      ref.nativeElement.style.opacity = '0';
      ref.nativeElement.style.transform = 'translateY(30px)';
    });

    // Step 1 elements
    this.resetStep1Elements();
    if (this.typewriterText) this.typewriterText.nativeElement.style.clipPath = 'inset(0 100% 0 0)';

    // Step 2 elements
    this.resetStep2Elements();

    // Step 3 elements
    this.resetStep3Elements();
    if (this.step3Bar) this.step3Bar.nativeElement.style.transform = 'scaleX(0)';
  }

  ngOnDestroy(): void {
    for (const group of this.animations) {
      for (const anim of group) {
        anim.cancel();
      }
    }
    this.animations = [[], [], []];
  }

  /** Called by parent ScrollTrigger onEnter */
  playStep(index: number): void {
    if (this.played[index]) return;
    this.played[index] = true;

    if (!isPlatformBrowser(this.platformId)) return;

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

  /** Called by parent ScrollTrigger onLeaveBack */
  resetStep(index: number): void {
    if (!this.played[index]) return;
    this.played[index] = false;

    for (const anim of this.animations[index]) {
      anim.cancel();
    }
    this.animations[index] = [];

    // Reset to initial hidden state
    const textEl = this.stepTexts?.toArray()[index]?.nativeElement;
    const mockEl = this.stepMocks?.toArray()[index]?.nativeElement;

    if (textEl) {
      textEl.style.opacity = '0';
      textEl.style.transform = 'translateY(30px)';
    }
    if (mockEl) {
      mockEl.style.opacity = '0';
      mockEl.style.transform = 'translateY(30px)';
    }

    // Reset step-specific elements
    switch (index) {
      case 0: this.resetStep1Elements(); break;
      case 1: this.resetStep2Elements(); break;
      case 2: this.resetStep3Elements(); break;
    }
  }

  private showFinalState(index: number): void {
    const textEl = this.stepTexts?.toArray()[index]?.nativeElement;
    const mockEl = this.stepMocks?.toArray()[index]?.nativeElement;
    if (textEl) { textEl.style.opacity = '1'; textEl.style.transform = 'none'; }
    if (mockEl) { mockEl.style.opacity = '1'; mockEl.style.transform = 'none'; }

    switch (index) {
      case 0:
        this.setVisible(this.step1Field0); this.setVisible(this.step1Field1); this.setVisible(this.step1Field2);
        if (this.typewriterText) this.typewriterText.nativeElement.style.clipPath = 'inset(0 0 0 0)';
        this.setVisible(this.step1Btn); this.setVisible(this.step1Card);
        if (this.step1Card) this.step1Card.nativeElement.style.transform = 'none';
        break;
      case 1:
        this.setVisible(this.step2App0); this.setVisible(this.step2App1); this.setVisible(this.step2App2);
        [this.step2App0, this.step2App1, this.step2App2].forEach(r => {
          if (r) r.nativeElement.style.transform = 'none';
        });
        if (this.step2Counter) this.step2Counter.nativeElement.textContent = '3';
        break;
      case 2:
        this.setVisible(this.step3Row0); this.setVisible(this.step3Row1);
        this.setVisible(this.step3Row2); this.setVisible(this.step3Row3);
        [this.step3Row0, this.step3Row1, this.step3Row2, this.step3Row3].forEach(r => {
          if (r) r.nativeElement.style.transform = 'none';
        });
        if (this.step3Bar) this.step3Bar.nativeElement.style.transform = 'scaleX(1)';
        if (this.step3Stamp) { this.step3Stamp.nativeElement.style.opacity = '1'; this.step3Stamp.nativeElement.style.transform = 'scale(1)'; }
        if (this.step3Receipt) this.step3Receipt.nativeElement.classList.add('mock-receipt--paid');
        if (this.step3Status) {
          this.step3Status.nativeElement.textContent = this.step3Status.nativeElement.textContent!.replace(
            this.step3Status.nativeElement.textContent!, this.paidText || 'PAID',
          );
        }
        break;
    }
  }

  private setVisible(ref: ElementRef<HTMLElement> | undefined): void {
    if (ref) { ref.nativeElement.style.opacity = '1'; ref.nativeElement.style.transform = 'none'; }
  }

  // ─── Step 1: Post a task ───────────────────────────────

  private async playStep1(): Promise<void> {
    const track = (a: Animation) => { this.animations[0].push(a); return a; };
    const textEl = this.stepTexts?.toArray()[0]?.nativeElement;
    const mockEl = this.stepMocks?.toArray()[0]?.nativeElement;
    if (!textEl || !mockEl) return;

    // 0.0s — fade in text + mock panel
    const a1 = track(textEl.animate(
      [{ opacity: '0', transform: 'translateY(30px)' }, { opacity: '1', transform: 'translateY(0)' }],
      { duration: 600, fill: 'forwards', easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    ));
    track(mockEl.animate(
      [{ opacity: '0', transform: 'translateY(30px)' }, { opacity: '1', transform: 'translateY(0)' }],
      { duration: 600, fill: 'forwards', easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    ));

    // Show first field immediately with panel
    const f0 = this.step1Field0?.nativeElement;
    if (f0) {
      track(f0.animate(
        [{ opacity: '0', transform: 'translateY(4px)' }, { opacity: '1', transform: 'translateY(0)' }],
        { duration: 300, fill: 'forwards', easing: 'ease-out' },
      ));
    }

    await a1.finished;

    // 0.6s — typewriter reveal
    const twText = this.typewriterText?.nativeElement;
    const twCursor = this.typewriterCursor?.nativeElement;
    if (twCursor) {
      track(twCursor.animate(
        [{ opacity: '1' }, { opacity: '0' }, { opacity: '1' }],
        { duration: 600, iterations: 4, fill: 'forwards' },
      ));
    }
    if (twText) {
      const twAnim = track(twText.animate(
        [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }],
        { duration: 1200, fill: 'forwards', easing: 'steps(20, end)' },
      ));
      await twAnim.finished;
    }

    // 1.8s — category field
    const f1 = this.step1Field1?.nativeElement;
    if (f1) {
      const a = track(f1.animate(
        [{ opacity: '0', transform: 'translateY(4px)' }, { opacity: '1', transform: 'translateY(0)' }],
        { duration: 300, fill: 'forwards', easing: 'ease-out' },
      ));
      await a.finished;
    }

    // 2.1s — price field
    const f2 = this.step1Field2?.nativeElement;
    if (f2) {
      const a = track(f2.animate(
        [{ opacity: '0', transform: 'translateY(4px)' }, { opacity: '1', transform: 'translateY(0)' }],
        { duration: 300, fill: 'forwards', easing: 'ease-out' },
      ));
      await a.finished;
    }

    // 2.5s — button pulse
    const btn = this.step1Btn?.nativeElement;
    if (btn) {
      const a = track(btn.animate(
        [
          { opacity: '0', transform: 'scale(0.95)' },
          { opacity: '1', transform: 'scale(1.03)' },
          { opacity: '1', transform: 'scale(1)' },
        ],
        { duration: 300, fill: 'forwards', easing: 'ease-out' },
      ));
      await a.finished;
    }

    // 2.8s — task card slides up
    const card = this.step1Card?.nativeElement;
    if (card) {
      track(card.animate(
        [
          { opacity: '0', transform: 'translateY(20px) scale(0.95)' },
          { opacity: '1', transform: 'translateY(0) scale(1)' },
        ],
        { duration: 500, fill: 'forwards', easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      ));
    }
  }

  private resetStep1Elements(): void {
    [this.step1Field0, this.step1Field1, this.step1Field2, this.step1Btn].forEach(ref => {
      if (ref) { ref.nativeElement.style.opacity = '0'; ref.nativeElement.style.transform = 'translateY(4px)'; }
    });
    if (this.step1Card) { this.step1Card.nativeElement.style.opacity = '0'; this.step1Card.nativeElement.style.transform = 'translateY(20px) scale(0.95)'; }
    if (this.typewriterText) this.typewriterText.nativeElement.style.clipPath = 'inset(0 100% 0 0)';
    if (this.typewriterCursor) this.typewriterCursor.nativeElement.style.opacity = '0';
  }

  // ─── Step 2: Get matched ──────────────────────────────

  private async playStep2(): Promise<void> {
    const track = (a: Animation) => { this.animations[1].push(a); return a; };
    const textEl = this.stepTexts?.toArray()[1]?.nativeElement;
    const mockEl = this.stepMocks?.toArray()[1]?.nativeElement;
    if (!textEl || !mockEl) return;

    // 0.0s — fade in
    track(textEl.animate(
      [{ opacity: '0', transform: 'translateY(30px)' }, { opacity: '1', transform: 'translateY(0)' }],
      { duration: 600, fill: 'forwards', easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    ));
    const a2 = track(mockEl.animate(
      [{ opacity: '0', transform: 'translateY(30px)' }, { opacity: '1', transform: 'translateY(0)' }],
      { duration: 600, fill: 'forwards', easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    ));
    await a2.finished;

    const apps = [this.step2App0, this.step2App1, this.step2App2];
    const counterEl = this.step2Counter?.nativeElement;

    // 0.4s, 0.8s, 1.2s — slide in applicants
    for (let i = 0; i < apps.length; i++) {
      const el = apps[i]?.nativeElement;
      if (!el) continue;

      // Small delay between cards
      if (i > 0) await this.delay(200);

      const a = track(el.animate(
        [
          { opacity: '0', transform: 'translateX(-40px)' },
          { opacity: '1', transform: 'translateX(0)' },
        ],
        { duration: 400, fill: 'forwards', easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      ));
      await a.finished;

      // Increment counter
      if (counterEl) counterEl.textContent = String(i + 1);
    }
  }

  private resetStep2Elements(): void {
    [this.step2App0, this.step2App1, this.step2App2].forEach(ref => {
      if (ref) { ref.nativeElement.style.opacity = '0'; ref.nativeElement.style.transform = 'translateX(-40px)'; }
    });
    if (this.step2Counter) this.step2Counter.nativeElement.textContent = '0';
  }

  // ─── Step 3: Get it done ──────────────────────────────

  private async playStep3(): Promise<void> {
    const track = (a: Animation) => { this.animations[2].push(a); return a; };
    const textEl = this.stepTexts?.toArray()[2]?.nativeElement;
    const mockEl = this.stepMocks?.toArray()[2]?.nativeElement;
    if (!textEl || !mockEl) return;

    // Capture translated text for PAID status
    if (this.step3Status) this.pendingText = this.step3Status.nativeElement.textContent || 'PENDING';
    if (this.step3Stamp) {
      const stampText = this.step3Stamp.nativeElement.textContent || '✓ PAID';
      this.paidText = stampText.replace('✓ ', '').trim();
    }

    // 0.0s — fade in text + receipt
    track(textEl.animate(
      [{ opacity: '0', transform: 'translateY(30px)' }, { opacity: '1', transform: 'translateY(0)' }],
      { duration: 600, fill: 'forwards', easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    ));
    const a2 = track(mockEl.animate(
      [{ opacity: '0', transform: 'translateY(30px)' }, { opacity: '1', transform: 'translateY(0)' }],
      { duration: 600, fill: 'forwards', easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    ));
    await a2.finished;

    // 0.6s — stagger receipt rows
    const rows = [this.step3Row0, this.step3Row1, this.step3Row2, this.step3Row3];
    for (const row of rows) {
      const el = row?.nativeElement;
      if (!el) continue;
      track(el.animate(
        [{ opacity: '0', transform: 'translateY(8px)' }, { opacity: '1', transform: 'translateY(0)' }],
        { duration: 300, fill: 'forwards', easing: 'ease-out' },
      ));
      await this.delay(150);
    }

    // Wait for last row to finish
    await this.delay(200);

    // 1.2s — progress bar fills
    const bar = this.step3Bar?.nativeElement;
    if (bar) {
      const a = track(bar.animate(
        [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
        { duration: 1000, fill: 'forwards', easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      ));
      await a.finished;
    }

    // 2.2s — status text change
    const statusEl = this.step3Status?.nativeElement;
    if (statusEl) {
      statusEl.textContent = this.paidText;
      statusEl.style.color = 'var(--color-fg)';
    }

    // 2.4s — receipt bg invert + stamp
    const receiptEl = this.step3Receipt?.nativeElement;
    if (receiptEl) receiptEl.classList.add('mock-receipt--paid');

    const stamp = this.step3Stamp?.nativeElement;
    if (stamp) {
      track(stamp.animate(
        [
          { opacity: '0', transform: 'scale(0)' },
          { opacity: '1', transform: 'scale(1.1)' },
          { opacity: '1', transform: 'scale(1)' },
        ],
        { duration: 400, fill: 'forwards', easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      ));
    }
  }

  private resetStep3Elements(): void {
    [this.step3Row0, this.step3Row1, this.step3Row2, this.step3Row3].forEach(ref => {
      if (ref) { ref.nativeElement.style.opacity = '0'; ref.nativeElement.style.transform = 'translateY(8px)'; }
    });
    if (this.step3Bar) this.step3Bar.nativeElement.style.transform = 'scaleX(0)';
    if (this.step3Status) {
      this.step3Status.nativeElement.textContent = this.pendingText || 'PENDING';
      this.step3Status.nativeElement.style.color = '';
    }
    if (this.step3Stamp) {
      this.step3Stamp.nativeElement.style.opacity = '0';
      this.step3Stamp.nativeElement.style.transform = 'scale(0)';
    }
    if (this.step3Receipt) this.step3Receipt.nativeElement.classList.remove('mock-receipt--paid');
  }

  // ─── Utility ──────────────────────────────────────────

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
