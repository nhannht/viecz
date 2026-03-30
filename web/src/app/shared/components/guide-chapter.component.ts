import { Component, input } from '@angular/core';

/**
 * Guidebook chapter header with number, title, and subtitle.
 * Displays a teal left accent border and uses display font for the title.
 * Automatically inserts a page break before itself when printed.
 *
 * @example
 * <guide-chapter [chapterNumber]="1" title="Đăng ký tài khoản" subtitle="Tạo tài khoản mới bằng số điện thoại" />
 */
@Component({
  selector: 'viecz-guide-chapter',
  standalone: true,
  template: `
    <div class="border-l-4 pl-5 py-3 mb-6 print:break-before-page"
         style="border-color: #32B8C6">
      <p class="text-xs font-bold tracking-[3px] uppercase mb-1"
         style="color: #32B8C6">
        Chương {{ chapterNumber() }}
      </p>
      <h2 class="font-display text-2xl font-bold text-fg leading-tight mb-1">
        {{ title() }}
      </h2>
      @if (subtitle()) {
        <p class="text-muted text-sm">{{ subtitle() }}</p>
      }
    </div>
  `,
})
export class GuideChapterComponent {
  chapterNumber = input.required<number>();
  title = input.required<string>();
  subtitle = input<string>('');
}
