import { Component, input } from '@angular/core';

export interface TocItem {
  number: number;
  title: string;
  anchor: string;
}

/**
 * Table of contents for the guidebook. Renders as a glass card with anchor links.
 *
 * @example
 * <guide-toc [items]="[
 *   { number: 1, title: 'Đăng ký tài khoản', anchor: 'ch1' },
 *   { number: 2, title: 'Tìm việc trên bản đồ', anchor: 'ch2' },
 * ]" />
 */
@Component({
  selector: 'viecz-guide-toc',
  standalone: true,
  template: `
    <nav class="bg-card border border-border rounded-lg p-6 mb-8">
      <h3 class="font-display text-lg font-bold text-fg mb-4 uppercase tracking-wider"
          style="color: #32B8C6">
        Mục lục
      </h3>
      <ol class="list-none space-y-2">
        @for (item of items(); track item.anchor) {
          <li>
            <a [href]="'#' + item.anchor"
               class="flex items-baseline gap-2 text-fg hover:text-[#32B8C6] transition-colors text-sm no-underline print:text-fg">
              <span class="font-bold" style="color: #32B8C6; min-width: 1.5rem">{{ item.number }}.</span>
              <span class="flex-1">{{ item.title }}</span>
              <span class="border-b border-dotted border-muted flex-1 mx-1 self-end mb-1"></span>
            </a>
          </li>
        }
      </ol>
    </nav>
  `,
})
export class GuideTocComponent {
  items = input.required<TocItem[]>();
}
