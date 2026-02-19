import { Component, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';

@Component({
  selector: 'app-error-fallback',
  standalone: true,
  imports: [MatIcon, MatButton],
  template: `
    <div class="error-fallback">
      <mat-icon class="error-icon">error_outline</mat-icon>
      <h3>{{ title() }}</h3>
      <p>{{ message() }}</p>
      @if (retryFn()) {
        <button mat-raised-button color="primary" (click)="retry()">
          <mat-icon>refresh</mat-icon> Try Again
        </button>
      }
    </div>
  `,
  styles: `
    .error-fallback {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 16px;
      text-align: center;
      min-height: 200px;
    }
    .error-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: var(--mat-sys-error, #b3261e);
      margin-bottom: 8px;
    }
    h3 { margin: 8px 0 4px; }
    p {
      margin: 0 0 16px;
      font-size: 0.875rem;
      color: var(--mat-sys-on-surface-variant);
    }
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
