import {
  Component,
  ElementRef,
  inject,
  OnDestroy,
  PLATFORM_ID,
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
        <div class="river-step">
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
        <div class="river-step river-step--reversed">
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
        <div class="river-step">
          <div class="river-text" [attr.data-hiw]="'text-2'">
            <span class="step-number">3</span>
            <h3 class="step-heading">{{ t('marketplace.step3Title') }}</h3>
            <p class="step-body">{{ t('landing.step3Long') }}</p>
          </div>
          <div class="river-mock mock-panel" [attr.data-hiw]="'mock-2'">
            <div class="mock-receipt" [attr.data-hiw]="'s3-receipt'">
              <div class="mock-receipt-row" [attr.data-hiw]="'s3-row-0'">
                <span>{{ t('landing.mockReceiptTask') }}</span>
                <span class="mock-receipt-dots"></span>
                <span>{{ t('landing.mockTaskTitle') }}</span>
              </div>
              <div class="mock-receipt-row" [attr.data-hiw]="'s3-row-1'">
                <span>{{ t('landing.mockPriceLabel') }}</span>
                <span class="mock-receipt-dots"></span>
                <span>45,000 ₫</span>
              </div>
              <div class="mock-receipt-row" [attr.data-hiw]="'s3-row-2'">
                <span>{{ t('landing.mockReceiptFee') }}</span>
                <span class="mock-receipt-dots"></span>
                <span>0 ₫</span>
              </div>
              <div class="mock-receipt-row mock-receipt-total" [attr.data-hiw]="'s3-row-3'">
                <span>{{ t('landing.mockReceiptTotal') }}</span>
                <span class="mock-receipt-dots"></span>
                <span>45,000 ₫</span>
              </div>
              <div class="mock-progress-bar-track">
                <div class="mock-progress-bar-fill" [attr.data-hiw]="'s3-bar'"></div>
              </div>
              <div class="mock-status-row">
                <span class="mock-status-text" [attr.data-hiw]="'s3-status'">{{ t('landing.mockPending') }}</span>
              </div>
              <div class="mock-stamp" [attr.data-hiw]="'s3-stamp'">✓ {{ t('landing.mockPaid') }}</div>
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
      opacity: 0;
      transform: translateY(30px);
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
      opacity: 0;
      transform: translateY(30px);
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
      background: rgba(255, 255, 255, 0.04);
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
      background: rgba(255, 255, 255, 0.04);
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
      opacity: 0;
      transform: translateY(8px);
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
      transform: scaleX(0);
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
      opacity: 0;
      transform: scale(0);
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
  private el = inject(ElementRef<HTMLElement>);
  private platformId = inject(PLATFORM_ID);
  private animations: Animation[][] = [[], [], []];
  private played: boolean[] = [false, false, false];
  private paidText = '';
  private pendingText = '';

  constructor() {}

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

  /** Called by parent ScrollTrigger onEnter */
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

  /** Called by parent ScrollTrigger onLeaveBack */
  resetStep(index: number): void {
    if (!this.played[index]) return;
    this.played[index] = false;

    for (const anim of this.animations[index]) {
      anim.cancel();
    }
    this.animations[index] = [];

    const textEl = this.q(`text-${index}`);
    const mockEl = this.q(`mock-${index}`);
    if (textEl) { textEl.style.opacity = '0'; textEl.style.transform = 'translateY(30px)'; }
    if (mockEl) { mockEl.style.opacity = '0'; mockEl.style.transform = 'translateY(30px)'; }

    switch (index) {
      case 0: this.resetStep1Elements(); break;
      case 1: this.resetStep2Elements(); break;
      case 2: this.resetStep3Elements(); break;
    }
  }

  private showFinalState(index: number): void {
    const textEl = this.q(`text-${index}`);
    const mockEl = this.q(`mock-${index}`);
    if (textEl) { textEl.style.opacity = '1'; textEl.style.transform = 'none'; }
    if (mockEl) { mockEl.style.opacity = '1'; mockEl.style.transform = 'none'; }

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
        for (let i = 0; i < 4; i++) {
          const row = this.q(`s3-row-${i}`);
          if (row) { row.style.opacity = '1'; row.style.transform = 'none'; }
        }
        const bar = this.q('s3-bar');
        if (bar) bar.style.transform = 'scaleX(1)';
        const stamp = this.q('s3-stamp');
        if (stamp) { stamp.style.opacity = '1'; stamp.style.transform = 'scale(1)'; }
        const receipt = this.q('s3-receipt');
        if (receipt) receipt.classList.add('mock-receipt--paid');
        const status = this.q('s3-status');
        if (status) status.textContent = this.paidText || 'PAID';
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
    const f0 = this.q('s1-field-0');
    if (f0) {
      track(f0.animate(
        [{ opacity: '0', transform: 'translateY(4px)' }, { opacity: '1', transform: 'translateY(0)' }],
        { duration: 300, fill: 'forwards', easing: 'ease-out' },
      ));
    }

    await a1.finished;

    // 0.6s — typewriter reveal
    const twCursor = this.q('s1-tw-cursor');
    if (twCursor) {
      track(twCursor.animate(
        [{ opacity: '1' }, { opacity: '0' }, { opacity: '1' }],
        { duration: 600, iterations: 4, fill: 'forwards' },
      ));
    }
    const twText = this.q('s1-tw-text');
    if (twText) {
      const twAnim = track(twText.animate(
        [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }],
        { duration: 1200, fill: 'forwards', easing: 'steps(20, end)' },
      ));
      await twAnim.finished;
    }

    // 1.8s — category field
    const f1 = this.q('s1-field-1');
    if (f1) {
      const a = track(f1.animate(
        [{ opacity: '0', transform: 'translateY(4px)' }, { opacity: '1', transform: 'translateY(0)' }],
        { duration: 300, fill: 'forwards', easing: 'ease-out' },
      ));
      await a.finished;
    }

    // 2.1s — price field
    const f2 = this.q('s1-field-2');
    if (f2) {
      const a = track(f2.animate(
        [{ opacity: '0', transform: 'translateY(4px)' }, { opacity: '1', transform: 'translateY(0)' }],
        { duration: 300, fill: 'forwards', easing: 'ease-out' },
      ));
      await a.finished;
    }

    // 2.5s — button pulse
    const btn = this.q('s1-btn');
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
    const card = this.q('s1-card');
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

    const counterEl = this.q('s2-counter');

    // 0.4s, 0.8s, 1.2s — slide in applicants
    for (let i = 0; i < 3; i++) {
      const el = this.q(`s2-app-${i}`);
      if (!el) continue;

      if (i > 0) await this.delay(200);

      const a = track(el.animate(
        [
          { opacity: '0', transform: 'translateX(-40px)' },
          { opacity: '1', transform: 'translateX(0)' },
        ],
        { duration: 400, fill: 'forwards', easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      ));
      await a.finished;

      if (counterEl) counterEl.textContent = String(i + 1);
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

  // ─── Step 3: Get it done ──────────────────────────────

  private async playStep3(): Promise<void> {
    const track = (a: Animation) => { this.animations[2].push(a); return a; };
    const textEl = this.q('text-2')!;
    const mockEl = this.q('mock-2')!;

    // Capture translated text for PAID status
    const statusEl = this.q('s3-status');
    if (statusEl) this.pendingText = statusEl.textContent || 'PENDING';
    const stampEl = this.q('s3-stamp');
    if (stampEl) {
      const stampText = stampEl.textContent || '✓ PAID';
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
    for (let i = 0; i < 4; i++) {
      const row = this.q(`s3-row-${i}`);
      if (!row) continue;
      track(row.animate(
        [{ opacity: '0', transform: 'translateY(8px)' }, { opacity: '1', transform: 'translateY(0)' }],
        { duration: 300, fill: 'forwards', easing: 'ease-out' },
      ));
      await this.delay(150);
    }

    // Wait for last row to finish
    await this.delay(200);

    // 1.2s — progress bar fills
    const bar = this.q('s3-bar');
    if (bar) {
      const a = track(bar.animate(
        [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
        { duration: 1000, fill: 'forwards', easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      ));
      await a.finished;
    }

    // 2.2s — status text change
    if (statusEl) {
      statusEl.textContent = this.paidText;
      statusEl.style.color = 'var(--color-fg)';
    }

    // 2.4s — receipt bg invert + stamp
    const receipt = this.q('s3-receipt');
    if (receipt) receipt.classList.add('mock-receipt--paid');

    if (stampEl) {
      track(stampEl.animate(
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
    for (let i = 0; i < 4; i++) {
      const row = this.q(`s3-row-${i}`);
      if (row) { row.style.opacity = '0'; row.style.transform = 'translateY(8px)'; }
    }
    const bar = this.q('s3-bar');
    if (bar) bar.style.transform = 'scaleX(0)';
    const status = this.q('s3-status');
    if (status) {
      status.textContent = this.pendingText || 'PENDING';
      status.style.color = '';
    }
    const stamp = this.q('s3-stamp');
    if (stamp) { stamp.style.opacity = '0'; stamp.style.transform = 'scale(0)'; }
    const receipt = this.q('s3-receipt');
    if (receipt) receipt.classList.remove('mock-receipt--paid');
  }

  // ─── Utility ──────────────────────────────────────────

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
