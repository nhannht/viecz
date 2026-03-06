import { Directive, ElementRef, inject, NgZone, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Glass effects directive — manages specular highlight, sweep animation,
 * and overlay injection for frostglass cards.
 *
 * **Ambient behavior** (works on mobile + desktop):
 * - Specular: subtle centered pulse animation (CSS `specular-pulse`)
 * - Sweep: triggers once when card scrolls into view (IntersectionObserver)
 * - Overlays: `.glass-caustics` + `.glass-condensation` divs injected
 *
 * **Desktop enhancement** (hover):
 * - Specular follows cursor position via `--specular-x/y`
 * - Sweep re-triggers on each hover
 *
 * Runs outside Angular zone to avoid triggering change detection on mousemove.
 */
@Directive({
  selector: '[appGlassSpecular]',
  standalone: true,
})
export class GlassSpecularDirective implements OnInit, OnDestroy {
  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly zone = inject(NgZone);
  private readonly platformId = inject(PLATFORM_ID);
  private observer?: IntersectionObserver;

  private onMove = (e: MouseEvent) => {
    const host = this.el.nativeElement;
    const rect = host.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    host.style.setProperty('--specular-x', `${x}px`);
    host.style.setProperty('--specular-y', `${y}px`);
    host.style.setProperty('--specular-opacity', '1');
    host.classList.add('specular-active');
  };

  private onEnter = () => {
    // Re-trigger sweep on hover: remove class, force reflow, re-add
    const host = this.el.nativeElement;
    host.classList.remove('glass-sweep');
    void host.offsetWidth; // force reflow
    host.classList.add('glass-sweep');
  };

  private onLeave = () => {
    const host = this.el.nativeElement;
    host.style.setProperty('--specular-opacity', '0');
    host.classList.remove('specular-active');
  };

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.zone.runOutsideAngular(() => {
      this.el.nativeElement.addEventListener('mousemove', this.onMove);
      this.el.nativeElement.addEventListener('mouseenter', this.onEnter);
      this.el.nativeElement.addEventListener('mouseleave', this.onLeave);
      this.setupScrollTrigger();
    });
    this.injectOverlays();
  }

  ngOnDestroy(): void {
    this.el.nativeElement.removeEventListener('mousemove', this.onMove);
    this.el.nativeElement.removeEventListener('mouseenter', this.onEnter);
    this.el.nativeElement.removeEventListener('mouseleave', this.onLeave);
    this.observer?.disconnect();
  }

  /** Trigger sweep animation once when card scrolls into viewport. */
  private setupScrollTrigger(): void {
    if (typeof IntersectionObserver === 'undefined') return;
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).classList.add('glass-sweep');
            this.observer?.unobserve(entry.target); // fire once
          }
        }
      },
      { threshold: 0.3 },
    );
    this.observer.observe(this.el.nativeElement);
  }

  /** Inject glass-caustics and glass-condensation overlay divs into the host element. */
  private injectOverlays(): void {
    const host = this.el.nativeElement;
    if (!host.querySelector('.glass-caustics')) {
      const caustics = document.createElement('div');
      caustics.className = 'glass-caustics';
      host.insertBefore(caustics, host.firstChild);
    }
    if (!host.querySelector('.glass-condensation')) {
      const condensation = document.createElement('div');
      condensation.className = 'glass-condensation';
      host.insertBefore(condensation, host.firstChild);
    }
  }
}
