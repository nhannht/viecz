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
      min-height: 300vh;
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

    const setupRiverSteps = () => {
      const riverSteps = document.querySelectorAll('.river-step');
      if (riverSteps.length === 0) {
        requestAnimationFrame(setupRiverSteps);
        return;
      }
      riverSteps.forEach((step, i) => {
        const st = ScrollTrigger.create({
          trigger: step,
          start: 'top 75%',
          onEnter: () => this.howItWorksSection?.playStep(i),
          onLeaveBack: () => this.howItWorksSection?.resetStep(i),
        });
        this.scrollTriggers.push(st);
      });
    };
    setupRiverSteps();
  }
}
