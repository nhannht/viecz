import { Component, input } from '@angular/core';

@Component({
  selector: 'app-loading-skeleton',
  standalone: true,
  template: `
    <div class="skeleton-container">
      @switch (variant()) {
        @case ('card') {
          @for (i of items(); track i) {
            <div class="skeleton-card">
              <div class="skeleton-line title"></div>
              <div class="skeleton-line subtitle"></div>
              <div class="skeleton-line body"></div>
              <div class="skeleton-line body short"></div>
            </div>
          }
        }
        @case ('list') {
          @for (i of items(); track i) {
            <div class="skeleton-list-item">
              <div class="skeleton-circle"></div>
              <div class="skeleton-list-text">
                <div class="skeleton-line title"></div>
                <div class="skeleton-line subtitle"></div>
              </div>
            </div>
          }
        }
        @default {
          @for (i of items(); track i) {
            <div class="skeleton-line body"></div>
          }
        }
      }
    </div>
  `,
  styles: `
    .skeleton-container { display: flex; flex-direction: column; gap: 16px; padding: 16px 0; }
    .skeleton-card {
      padding: 16px;
      border-radius: 12px;
      background: var(--mat-sys-surface-container, #f5f5f5);
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .skeleton-line {
      height: 14px;
      border-radius: 4px;
      background: linear-gradient(90deg,
        var(--mat-sys-surface-variant, #e0e0e0) 25%,
        var(--mat-sys-surface-container-high, #eeeeee) 50%,
        var(--mat-sys-surface-variant, #e0e0e0) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
    }
    .skeleton-line.title { width: 60%; height: 18px; }
    .skeleton-line.subtitle { width: 40%; }
    .skeleton-line.body { width: 90%; }
    .skeleton-line.short { width: 50%; }
    .skeleton-circle {
      width: 40px; height: 40px;
      border-radius: 50%;
      background: linear-gradient(90deg,
        var(--mat-sys-surface-variant, #e0e0e0) 25%,
        var(--mat-sys-surface-container-high, #eeeeee) 50%,
        var(--mat-sys-surface-variant, #e0e0e0) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      flex-shrink: 0;
    }
    .skeleton-list-item { display: flex; gap: 12px; align-items: center; }
    .skeleton-list-text { flex: 1; display: flex; flex-direction: column; gap: 8px; }
    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `,
})
export class LoadingSkeletonComponent {
  variant = input<'card' | 'list' | 'line'>('card');
  count = input(3);

  items() {
    return Array.from({ length: this.count() }, (_, i) => i);
  }
}
