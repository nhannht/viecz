import {
  Component,
  inject,
  afterNextRender,
  OnDestroy,
  ViewChild,
  ElementRef,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ThemeService } from '../core/theme.service';
import { LandingGsapService } from './landing-gsap.service';
import { LandingHowItWorksSection } from './landing-howitworks.section';

@Component({
  selector: 'app-howitworks-dev',
  standalone: true,
  imports: [LandingHowItWorksSection],
  template: `
    <div class="dev-root" #devRoot>
      <div class="dev-spacer">Scroll down to trigger animations</div>
      <app-landing-howitworks #howItWorksSection />
      <div class="dev-spacer">End</div>
    </div>
  `,
  styles: `
    .dev-root {
      min-height: 700vh;
      position: relative;
    }
    .dev-spacer {
      height: 80vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-display);
      font-size: 0.8rem;
      color: var(--color-muted);
      letter-spacing: 0.1em;
    }
  `,
})
export class HowItWorksDevComponent implements OnDestroy {
  @ViewChild('howItWorksSection') howItWorksSection!: LandingHowItWorksSection;
  @ViewChild('devRoot') devRoot!: ElementRef<HTMLElement>;

  private themeService = inject(ThemeService);
  private gsapService = inject(LandingGsapService);
  private platformId = inject(PLATFORM_ID);
  private scrollTriggers: any[] = [];

  constructor() {
    afterNextRender(() => {
      this.themeService.setTheme('sang-frostglass');
      this.themeService.init();
      this.initScrollTriggers();
    });
  }

  ngOnDestroy(): void {
    for (const st of this.scrollTriggers) {
      st.kill?.();
    }
    this.scrollTriggers = [];
  }

  private async initScrollTriggers(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const gsapMod = await this.gsapService.load();
    if (!gsapMod) return;
    const ScrollTrigger = (await import('gsap/ScrollTrigger')).ScrollTrigger;

    const setupHiw = () => {
      const hiwEl = this.howItWorksSection?.getSectionEl();
      if (!hiwEl) {
        requestAnimationFrame(setupHiw);
        return;
      }

      if (window.innerWidth < 768) {
        // Mobile fallback: per-slide triggers, no pinning
        const slides = hiwEl.querySelectorAll('.hiw-slide');
        slides.forEach((slide, i) => {
          const el = slide as HTMLElement;
          el.style.position = 'relative';
          el.style.opacity = '1';
          el.style.pointerEvents = 'auto';
          el.style.filter = 'none';
          el.style.transform = 'none';

          const st = ScrollTrigger.create({
            trigger: el,
            start: 'top 75%',
            onEnter: () => this.howItWorksSection?.playStep(i),
            onLeaveBack: () => this.howItWorksSection?.resetStep(i),
          });
          this.scrollTriggers.push(st);
        });
        return;
      }

      const hiwSt = ScrollTrigger.create({
        trigger: hiwEl,
        start: 'top top',
        end: '+=400%',
        pin: true,
        scrub: 1,
        onUpdate: (self: any) => this.howItWorksSection?.updateProgress(self.progress),
      });
      this.scrollTriggers.push(hiwSt);
    };
    setupHiw();
  }
}
