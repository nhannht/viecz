import { Directive, ElementRef, inject, NgZone, OnDestroy, OnInit } from '@angular/core';

/**
 * Tracks cursor position over the host element and sets CSS custom properties
 * `--specular-x`, `--specular-y`, and `--specular-opacity` for a glassmorphism
 * specular highlight effect. Pair with a `::before` pseudo-element in CSS.
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

  private onMove = (e: MouseEvent) => {
    const rect = this.el.nativeElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.el.nativeElement.style.setProperty('--specular-x', `${x}px`);
    this.el.nativeElement.style.setProperty('--specular-y', `${y}px`);
    this.el.nativeElement.style.setProperty('--specular-opacity', '1');
  };

  private onLeave = () => {
    this.el.nativeElement.style.setProperty('--specular-opacity', '0');
  };

  ngOnInit(): void {
    this.zone.runOutsideAngular(() => {
      this.el.nativeElement.addEventListener('mousemove', this.onMove);
      this.el.nativeElement.addEventListener('mouseleave', this.onLeave);
    });
  }

  ngOnDestroy(): void {
    this.el.nativeElement.removeEventListener('mousemove', this.onMove);
    this.el.nativeElement.removeEventListener('mouseleave', this.onLeave);
  }
}
