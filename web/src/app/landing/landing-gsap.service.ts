import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class LandingGsapService {
  private platformId = inject(PLATFORM_ID);
  private gsapModule: typeof import('gsap') | null = null;
  private scrollTriggerRegistered = false;

  async load(): Promise<typeof import('gsap') | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    if (this.gsapModule) return this.gsapModule;

    const [gsapMod, stMod] = await Promise.all([
      import('gsap'),
      import('gsap/ScrollTrigger'),
    ]);

    if (!this.scrollTriggerRegistered) {
      gsapMod.gsap.registerPlugin(stMod.ScrollTrigger);
      this.scrollTriggerRegistered = true;
    }

    this.gsapModule = gsapMod;
    return gsapMod;
  }

  get(): typeof import('gsap') | null {
    return this.gsapModule;
  }
}
