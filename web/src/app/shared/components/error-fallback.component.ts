import { Component, input } from '@angular/core';
import { VieczIconComponent } from './viecz-icon.component';
import { VieczButtonComponent } from './viecz-button.component';

@Component({
  selector: 'app-error-fallback',
  standalone: true,
  imports: [VieczIconComponent, VieczButtonComponent],
  template: `
    <div class="flex flex-col items-center justify-center py-12 px-4 text-center min-h-[200px]">
      <viecz-icon name="error_outline" [size]="64" />
      <h3 class="font-display text-[11px] tracking-[1px] text-fg mt-3 mb-1">{{ title() }}</h3>
      <p class="font-body text-[13px] text-muted mb-4">{{ message() }}</p>
      @if (retryFn()) {
        <viecz-button variant="primary" label="Try Again" (clicked)="retry()" />
      }
    </div>
  `,
})
export class ErrorFallbackComponent {
  title = input('Something went wrong');
  message = input('Please try again later.');
  retryFn = input<(() => void) | null>(null);

  retry() {
    const fn = this.retryFn();
    if (fn) fn();
  }
}
