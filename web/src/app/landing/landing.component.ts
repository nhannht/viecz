import {
  Component,
  inject,
  afterNextRender,
  OnDestroy,
  ViewChild,
  PLATFORM_ID,
  ElementRef,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ThemeService } from '../core/theme.service';
import { LandingGsapService } from './landing-gsap.service';
import { LandingNavComponent } from './landing-nav.component';
import { LandingHeroSection } from './landing-hero.section';
import { LandingHowItWorksSection } from './landing-howitworks.section';
import { LandingFeaturesSection } from './landing-features.section';
import { LandingTrustSection } from './landing-trust.section';
import { LandingCtaSection } from './landing-cta.section';
import { WhaleScrollComponent } from './whale-scroll.component';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [
    LandingNavComponent,
    LandingHeroSection,
    LandingHowItWorksSection,
    LandingFeaturesSection,
    LandingTrustSection,
    LandingCtaSection,
    WhaleScrollComponent,
  ],
  template: `
    <div class="landing-root" #landingRoot>
      <app-landing-nav />
      <app-landing-hero #heroSection />
      <app-landing-howitworks #howItWorksSection />
      <app-landing-features #featuresSection />
      <app-landing-trust />
      <app-landing-cta />

      <!-- Teal glow trail -->
      <div class="teal-glow" #tealGlow></div>
    </div>
    <app-whale-scroll #whaleScroll />
  `,
  styles: `
    .landing-root {
      overflow-x: hidden;
      min-height: 100vh;
      position: relative;
      z-index: 2;
      background: transparent;
    }

    .teal-glow {
      position: fixed;
      top: 50%;
      left: 50%;
      width: 600px;
      height: 600px;
      border-radius: 50%;
      background: radial-gradient(
        circle,
        rgba(33, 128, 141, 0.12) 0%,
        rgba(33, 128, 141, 0.04) 40%,
        transparent 70%
      );
      pointer-events: none;
      z-index: 0;
      transform: translate(-50%, -50%);
      opacity: 0;
    }
  `,
})
export class LandingComponent implements OnDestroy {
  @ViewChild('heroSection') heroSection!: LandingHeroSection;
  @ViewChild('howItWorksSection') howItWorksSection!: LandingHowItWorksSection;
  @ViewChild('featuresSection') featuresSection!: LandingFeaturesSection;
  @ViewChild('landingRoot') landingRoot!: ElementRef<HTMLElement>;
  @ViewChild('whaleScroll') whaleScroll!: WhaleScrollComponent;
  @ViewChild('tealGlow') tealGlowRef!: ElementRef<HTMLElement>;

  private themeService = inject(ThemeService);
  private gsapService = inject(LandingGsapService);
  private platformId = inject(PLATFORM_ID);
  private scrollTriggers: any[] = [];

  constructor() {
    afterNextRender(() => {
      // Force frostglass theme on landing
      this.themeService.setTheme('sang-frostglass');
      this.themeService.init();

      this.initGsapAnimations();
    });
  }

  private setupHiwMobileFallback(ScrollTrigger: any): void {
    const slides = this.howItWorksSection?.getSectionEl()?.querySelectorAll('.hiw-slide');
    if (!slides?.length) return;

    slides.forEach((slide, i) => {
      const el = slide as HTMLElement;
      el.style.position = 'relative';
      el.style.opacity = '1';
      el.style.pointerEvents = 'auto';
      el.style.filter = 'none';
      el.style.transform = 'none';

      // Reset inner content to hidden so entrance animations play on scroll.
      // Can't use resetStep() because played[i] is false initially.
      const isReversed = i === 1;
      const text = el.querySelector('.river-text') as HTMLElement;
      const mock = el.querySelector('.river-mock') as HTMLElement;
      if (text) { text.style.opacity = '0'; text.style.transform = `translateX(${isReversed ? '30px' : '-30px'})`; }
      if (mock) { mock.style.opacity = '0'; mock.style.transform = `translateX(${isReversed ? '-30px' : '30px'})`; mock.style.filter = 'blur(8px)'; }

      const st = ScrollTrigger.create({
        trigger: el,
        start: 'top 75%',
        onEnter: () => this.howItWorksSection?.playStep(i),
        onLeaveBack: () => this.howItWorksSection?.resetStep(i),
      });
      this.scrollTriggers.push(st);
    });
  }

  private setupFeaturesMobileFallback(ScrollTrigger: any): void {
    const slides = this.featuresSection?.getSectionEl()?.querySelectorAll('.feat-slide');
    if (!slides?.length) return;

    slides.forEach((slide, i) => {
      const el = slide as HTMLElement;
      el.style.position = 'relative';
      el.style.opacity = '1';
      el.style.pointerEvents = 'auto';
      el.style.filter = 'none';
      el.style.transform = 'none';

      // Reset inner content to hidden so entrance animations play on scroll.
      // Can't use resetStep() because played[i] is false initially.
      const isReversed = i === 1 || i === 3;
      const text = el.querySelector('.river-text') as HTMLElement;
      const mock = el.querySelector('.river-mock') as HTMLElement;
      if (text) { text.style.opacity = '0'; text.style.transform = `translateX(${isReversed ? '30px' : '-30px'})`; }
      if (mock) { mock.style.opacity = '0'; mock.style.transform = `translateX(${isReversed ? '-30px' : '30px'})`; mock.style.filter = 'blur(8px)'; }

      const st = ScrollTrigger.create({
        trigger: el,
        start: 'top 75%',
        onEnter: () => this.featuresSection?.playStep(i),
        onLeaveBack: () => this.featuresSection?.resetStep(i),
      });
      this.scrollTriggers.push(st);
    });
  }

  ngOnDestroy(): void {
    for (const st of this.scrollTriggers) {
      st.kill?.();
    }
    this.scrollTriggers = [];
  }

  private async initGsapAnimations(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const gsapMod = await this.gsapService.load();
    if (!gsapMod) return;
    const { gsap } = gsapMod;
    const ScrollTrigger = (await import('gsap/ScrollTrigger')).ScrollTrigger;

    if (prefersReduced) {
      gsap.globalTimeline.timeScale(Infinity);
    }

    // --- Hero pin + whale exit ---
    const heroEl = this.heroSection?.getHeroEl();
    const fadeOverlay = this.heroSection?.getFadeOverlay();
    const glassCard = this.heroSection?.getGlassCard();

    if (heroEl) {
      const heroSt = ScrollTrigger.create({
        trigger: heroEl,
        start: 'top top',
        end: '+=150%',
        pin: true,
        scrub: 1,
        onUpdate: (self: any) => {
          const p = self.progress;

          // Glass card fade out (0 → 0.3)
          if (glassCard) {
            const cardProgress = Math.min(p / 0.3, 1);
            glassCard.style.opacity = String(1 - cardProgress);
            glassCard.style.transform = `translateX(-50%) translateY(${-cardProgress * 60}px) scale(${1 - cardProgress * 0.1})`;
          }

          // Fade overlay (0.3 → 1.0)
          if (fadeOverlay) {
            const fadeProgress = Math.max(0, (p - 0.3) / 0.7);
            fadeOverlay.style.opacity = String(fadeProgress);
          }
        },
      });
      this.scrollTriggers.push(heroSt);

      // Mobile: shorter pin
      if (window.innerWidth < 768) {
        heroSt.vars.end = '+=80%';
        heroSt.refresh();
      }
    }

    // --- Lonely whale: fixed background behind content sections ---
    // Use raw scroll listener + ScrollTrigger.maxScroll() for precise 0→1 progress
    // across the entire page, including pin-expanded scroll distance from HIW/Features.
    if (this.whaleScroll) {
      const heroEndPx = Math.round(window.innerHeight * 1.5);
      let whaleActive = false;
      const onWhaleScroll = () => {
        const scrollY = window.scrollY;
        const maxScroll = ScrollTrigger.maxScroll(window);

        if (scrollY < heroEndPx) {
          if (whaleActive) {
            whaleActive = false;
            this.whaleScroll.setActive(false);
            document.documentElement.style.setProperty('--whale-darkness', '0');
          }
          return;
        }

        if (!whaleActive) {
          whaleActive = true;
          this.whaleScroll.setActive(true);
        }

        const p = Math.max(0, Math.min(1, (scrollY - heroEndPx) / (maxScroll - heroEndPx)));
        this.whaleScroll.setProgress(p);

        // Darken page background: ramp up 0→1 in first 20%, hold, ramp down in last 20%
        let darkness: number;
        if (p < 0.2) darkness = p / 0.2;
        else if (p > 0.8) darkness = (1 - p) / 0.2;
        else darkness = 1;
        document.documentElement.style.setProperty('--whale-darkness', String(darkness));
      };
      window.addEventListener('scroll', onWhaleScroll, { passive: true });
      // Shim kill() so ngOnDestroy cleanup works uniformly
      this.scrollTriggers.push({ kill: () => window.removeEventListener('scroll', onWhaleScroll) });
    }

    // --- How it works: pinned cross-dissolve (desktop) / per-slide (mobile) ---
    const isMobile = window.innerWidth < 768;
    const setupHiw = () => {
      const hiwEl = this.howItWorksSection?.getSectionEl();
      if (!hiwEl) {
        requestAnimationFrame(setupHiw);
        return;
      }

      if (isMobile) {
        this.setupHiwMobileFallback(ScrollTrigger);
        return;
      }

      const hiwSt = ScrollTrigger.create({
        trigger: hiwEl,
        start: 'top top',
        end: '+=400%',
        pin: true,
        scrub: 1,
        onUpdate: (self: any) => {
          this.howItWorksSection?.updateProgress(self.progress);
        },
      });
      this.scrollTriggers.push(hiwSt);
    };
    setupHiw();

    // --- Features: pinned cross-dissolve (desktop) / per-slide (mobile) ---
    const setupFeatures = () => {
      const featEl = this.featuresSection?.getSectionEl();
      if (!featEl) {
        requestAnimationFrame(setupFeatures);
        return;
      }

      if (isMobile) {
        this.setupFeaturesMobileFallback(ScrollTrigger);
        return;
      }

      const featSt = ScrollTrigger.create({
        trigger: featEl,
        start: 'top top',
        end: '+=500%',
        pin: true,
        scrub: 1,
        onUpdate: (self: any) => {
          this.featuresSection?.updateProgress(self.progress);
        },
      });
      this.scrollTriggers.push(featSt);
    };
    setupFeatures();

    // --- Trust tiles ---
    const trustTiles = document.querySelectorAll('.trust-tile');
    if (trustTiles.length) {
      gsap.from(trustTiles, {
        y: 40,
        opacity: 0,
        duration: 0.7,
        ease: 'power2.out',
        stagger: 0.1,
        scrollTrigger: {
          trigger: '.stats-grid',
          start: 'top 80%',
          toggleActions: 'play none none none',
        },
      });

      // Counter animation
      if (!prefersReduced) {
        trustTiles.forEach((tile) => {
          const valueEl = tile.querySelector('.trust-value') as HTMLElement;
          if (!valueEl) return;
          const target = parseInt(valueEl.getAttribute('data-target') || '0', 10);
          if (isNaN(target) || target === 0) return;
          const suffix = valueEl.textContent?.replace(/[\d]/g, '').trim() || '';
          gsap.from(valueEl, {
            textContent: 0,
            duration: 1.5,
            ease: 'power1.out',
            snap: { textContent: 1 },
            scrollTrigger: {
              trigger: tile,
              start: 'top 85%',
              toggleActions: 'play none none none',
            },
            onUpdate: function(this: any) {
              valueEl.textContent = Math.round(this.targets()[0].textContent) + suffix;
            },
          });
        });
      }
    }

    // --- Quote cards ---
    const quoteCards = document.querySelectorAll('.quote-card');
    if (quoteCards.length) {
      gsap.from(quoteCards, {
        y: 40,
        opacity: 0,
        duration: 0.7,
        ease: 'power2.out',
        stagger: 0.12,
        scrollTrigger: {
          trigger: '.testimonials-row',
          start: 'top 80%',
          toggleActions: 'play none none none',
        },
      });
    }

    // --- CTA section ---
    const ctaContent = document.querySelector('.cta-content');
    if (ctaContent) {
      gsap.from(ctaContent, {
        y: 30,
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: '.cta-section',
          start: 'top 80%',
          toggleActions: 'play none none none',
        },
      });
    }

    // --- Teal glow trail ---
    const tealGlow = this.tealGlowRef?.nativeElement;
    if (tealGlow && !prefersReduced) {
      gsap.to(tealGlow, {
        opacity: 0.6,
        duration: 0.5,
      });

      gsap.to(tealGlow, {
        y: () => window.innerHeight * 1.5,
        opacity: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: this.landingRoot.nativeElement,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1,
        },
      });
    }

    // --- Background gradient shift ---
    if (!prefersReduced) {
      const root = document.documentElement;
      gsap.to({}, {
        scrollTrigger: {
          trigger: this.landingRoot.nativeElement,
          start: 'top top',
          end: '80% bottom',
          scrub: 1,
          onUpdate: (self: any) => {
            root.style.setProperty('--hero-shift', String(self.progress));
          },
        },
      });
    }

    // --- Water ripple divider ---
    const ripple = document.querySelector('.ripple-divider') as HTMLElement;
    if (ripple && !prefersReduced) {
      gsap.to(ripple, {
        borderRadius: '0',
        ease: 'power2.inOut',
        scrollTrigger: {
          trigger: ripple,
          start: 'top 80%',
          end: 'bottom 60%',
          scrub: 1,
        },
      });
    }
  }
}
