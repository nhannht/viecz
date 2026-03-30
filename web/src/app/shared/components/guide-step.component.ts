import { Component, input } from '@angular/core';

/**
 * Guidebook step block: numbered circle + instruction text + optional screenshot.
 * Used inside chapters to show step-by-step instructions.
 * Avoids page breaks inside when printed.
 *
 * @example
 * <guide-step [stepNumber]="1"
 *   instruction="Nhấn vào nút Đăng ký trên trang chủ"
 *   imageSrc="/assets/screenshots/login.png"
 *   imageCaption="Hình 1.1: Màn hình đăng nhập" />
 */
@Component({
  selector: 'viecz-guide-step',
  standalone: true,
  template: `
    <div class="mb-8 print:break-inside-avoid">
      <div class="flex items-start gap-4 mb-3">
        <div class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
             style="background: #32B8C6; color: #191C1D">
          {{ stepNumber() }}
        </div>
        <p class="text-fg text-[15px] leading-relaxed pt-1">{{ instruction() }}</p>
      </div>
      @if (imageSrc()) {
        <figure class="ml-12 mt-2">
          <img [src]="imageSrc()" [alt]="imageCaption() || instruction()"
               class="w-full rounded-lg border border-border shadow-sm" loading="lazy" />
          @if (imageCaption()) {
            <figcaption class="text-muted text-xs text-center mt-2 italic">
              {{ imageCaption() }}
            </figcaption>
          }
        </figure>
      }
    </div>
  `,
})
export class GuideStepComponent {
  stepNumber = input.required<number>();
  instruction = input.required<string>();
  imageSrc = input<string>('');
  imageCaption = input<string>('');
}
