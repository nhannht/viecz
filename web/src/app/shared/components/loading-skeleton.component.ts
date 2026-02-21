import { Component, input } from '@angular/core';

@Component({
  selector: 'app-loading-skeleton',
  standalone: true,
  template: `
    <div class="flex flex-col gap-4 py-4">
      @switch (variant()) {
        @case ('card') {
          @for (i of items(); track i) {
            <div class="p-4 bg-card border border-border flex flex-col gap-3">
              <div class="skeleton-line h-[18px] w-[60%]"></div>
              <div class="skeleton-line h-[14px] w-[40%]"></div>
              <div class="skeleton-line h-[14px] w-[90%]"></div>
              <div class="skeleton-line h-[14px] w-[50%]"></div>
            </div>
          }
        }
        @case ('list') {
          @for (i of items(); track i) {
            <div class="flex gap-3 items-center">
              <div class="skeleton-circle w-10 h-10 shrink-0"></div>
              <div class="flex-1 flex flex-col gap-2">
                <div class="skeleton-line h-[14px] w-[60%]"></div>
                <div class="skeleton-line h-[14px] w-[40%]"></div>
              </div>
            </div>
          }
        }
        @default {
          @for (i of items(); track i) {
            <div class="skeleton-line h-[14px] w-[90%]"></div>
          }
        }
      }
    </div>
  `,
  styles: `
    .skeleton-line {
      border-radius: 0;
      background: linear-gradient(90deg, var(--color-border) 25%, var(--color-card) 50%, var(--color-border) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
    }
    .skeleton-circle {
      border-radius: 50%;
      background: linear-gradient(90deg, var(--color-border) 25%, var(--color-card) 50%, var(--color-border) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
    }
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
