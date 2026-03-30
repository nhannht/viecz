import { Component, input, computed } from '@angular/core';

/**
 * Standalone screenshot figure with bordered image and caption.
 * Size controls max-width: full=100%, medium=70%, small=40%.
 *
 * @example
 * <guide-screenshot src="/assets/screenshots/marketplace-desktop.png"
 *   caption="Hình 3.1: Giao diện Marketplace" size="full" />
 */
@Component({
  selector: 'viecz-guide-screenshot',
  standalone: true,
  template: `
    <figure class="mb-6 print:break-inside-avoid" [style.max-width]="maxWidth()">
      <img [src]="src()" [alt]="caption() || 'Screenshot'"
           class="w-full rounded-lg border border-border shadow-sm" loading="lazy" />
      @if (caption()) {
        <figcaption class="text-muted text-xs text-center mt-2 italic">
          {{ caption() }}
        </figcaption>
      }
    </figure>
  `,
})
export class GuideScreenshotComponent {
  src = input.required<string>();
  caption = input<string>('');
  size = input<'full' | 'medium' | 'small'>('full');

  maxWidth = computed(() => {
    switch (this.size()) {
      case 'full': return '100%';
      case 'medium': return '70%';
      case 'small': return '40%';
    }
  });
}
