import { Component, input } from '@angular/core';

/**
 * ASCII-animated loading skeleton using CSS content keyframes.
 *
 * Inspired by ltrademark's ASCII Loaders CodePen.
 * Each skeleton card/row has an animated ASCII loader instead of shimmer bars.
 *
 * Card variant mirrors the task card layout with ASCII block placeholders
 * and a braille spinner. List variant uses a bar loader per row.
 */
@Component({
  selector: 'app-loading-skeleton',
  standalone: true,
  template: `
    @switch (variant()) {
      @case ('card') {
        <div class="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4 py-4">
          @for (i of items(); track i) {
            <div class="p-6 bg-card border border-border flex flex-col gap-3 font-display select-none">
              <div class="flex items-center justify-between text-border">
                <span class="text-[10px] tracking-[1px]">████</span>
                <span class="text-[13px]">███.███ ₫</span>
              </div>
              <div class="text-border text-[11px] tracking-[1px]">████████████████</div>
              <div class="flex flex-col gap-1 text-border">
                <span class="text-[13px]">████████████████████████████████████</span>
                <span class="text-[13px]">██████████████████████████</span>
              </div>
              <div class="flex items-center justify-between">
                <div class="flex gap-4 text-border">
                  <span class="text-[11px]">◉ ████████</span>
                  <span class="text-[11px]">◷ ██████</span>
                </div>
                <span class="ascii-braille text-fg text-[14px]"></span>
              </div>
            </div>
          }
        </div>
      }
      @case ('list') {
        <div class="flex flex-col gap-4 py-4">
          @for (i of items(); track i) {
            <div class="flex gap-3 items-center font-display select-none">
              <span class="ascii-chunky text-fg text-[22px]"></span>
              <div class="flex-1 flex flex-col gap-1 text-border">
                <span class="text-[13px]">████████████████</span>
                <span class="text-[11px]">██████████</span>
              </div>
              <span class="ascii-bar text-fg text-[12px]"></span>
            </div>
          }
        </div>
      }
      @default {
        <div class="flex flex-col gap-3 py-4 font-display select-none">
          @for (i of items(); track i) {
            <div class="flex items-center gap-3">
              <span class="ascii-braille text-fg text-[14px]"></span>
              <span class="text-border text-[13px]">████████████████████████████████</span>
            </div>
          }
        </div>
      }
    }
  `,
  styles: `
    /* Braille spinner: ⣷⣯⣟⡿⢿⣻⣽⣾ */
    .ascii-braille::before {
      content: '⣷';
      animation: braille 700ms steps(1, end) infinite;
    }
    @keyframes braille {
      0%, 100% { content: '⣷'; }
      12.5% { content: '⣯'; }
      25% { content: '⣟'; }
      37.5% { content: '⡿'; }
      50% { content: '⢿'; }
      62.5% { content: '⣻'; }
      75% { content: '⣽'; }
      87.5% { content: '⣾'; }
    }

    /* Bar loader: [----] → [---=] */
    .ascii-bar::before {
      content: '[----]';
      animation: bar 700ms steps(1, end) infinite;
    }
    @keyframes bar {
      0%, 100% { content: '[----]'; }
      20% { content: '[=---]'; }
      40% { content: '[-=--]'; }
      60% { content: '[--=-]'; }
      80% { content: '[---=]'; }
    }

    /* Chunky spinner: ▛▜▟▙ */
    .ascii-chunky::before {
      content: '▛';
      animation: chunky 700ms steps(1, end) infinite;
    }
    @keyframes chunky {
      0%, 100% { content: '▛'; }
      25% { content: '▜'; }
      50% { content: '▟'; }
      75% { content: '▙'; }
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
