import { Component, input, computed } from '@angular/core';

/**
 * Guidebook callout box for tips, warnings, and notes.
 * Renders as a glass card with a colored left border and icon.
 *
 * @example
 * <guide-callout type="tip">Bạn có thể đăng nhập bằng Google.</guide-callout>
 * <guide-callout type="warning">Không chia sẻ mã OTP với người khác.</guide-callout>
 */
@Component({
  selector: 'viecz-guide-callout',
  standalone: true,
  template: `
    <div class="bg-card border border-border rounded-lg p-4 mb-6 flex gap-3 print:break-inside-avoid"
         [style.border-left]="'4px solid ' + accentColor()">
      <span class="material-icons text-lg flex-shrink-0 mt-0.5"
            [style.color]="accentColor()">
        {{ iconName() }}
      </span>
      <div>
        <p class="text-xs font-bold uppercase tracking-wider mb-1"
           [style.color]="accentColor()">
          {{ label() }}
        </p>
        <div class="text-fg text-sm leading-relaxed">
          <ng-content />
        </div>
      </div>
    </div>
  `,
})
export class GuideCalloutComponent {
  type = input<'tip' | 'warning' | 'note'>('tip');

  accentColor = computed(() => {
    switch (this.type()) {
      case 'tip': return '#32B8C6';
      case 'warning': return '#E5A100';
      case 'note': return '#8A9A9D';
    }
  });

  iconName = computed(() => {
    switch (this.type()) {
      case 'tip': return 'lightbulb';
      case 'warning': return 'warning';
      case 'note': return 'info';
    }
  });

  label = computed(() => {
    switch (this.type()) {
      case 'tip': return 'Mẹo';
      case 'warning': return 'Lưu ý';
      case 'note': return 'Ghi chú';
    }
  });
}
