import { Component, input, computed } from '@angular/core';

/**
 * Status badge with display font and color-coded variants.
 *
 * Uses `--font-display` at 8px with 1px letter-spacing for a compact label.
 * Color scheme changes based on `status`:
 *
 * | Status | Background | Text | Border |
 * |--------|-----------|------|--------|
 * | `open` | `--fg` | `--bg` | `--fg` |
 * | `in_progress` | transparent | `--fg` | `--fg` |
 * | `completed` | `--muted` | `--bg` | `--muted` |
 * | `cancelled` | transparent | `--muted` | `--border` + strikethrough |
 * | `default` | transparent | `--fg` | `--border` |
 *
 * Replaces `MatChip` status indicators from Angular Material.
 *
 * @example
 * ```html
 * <nhannht-metro-badge label="OPEN" status="open" />
 * <nhannht-metro-badge label="IN PROGRESS" status="in_progress" />
 * <nhannht-metro-badge label="POPULAR" />
 * ```
 */
@Component({
  selector: 'nhannht-metro-badge',
  standalone: true,
  template: `
    <span
      class="inline-block font-display text-[8px] tracking-[1px] uppercase px-2 py-1 border"
      [class]="statusClasses()">
      {{ label() }}
    </span>
  `,
})
export class NhannhtMetroBadgeComponent {
  /** Badge text. Rendered uppercase automatically via CSS. */
  label = input.required<string>();

  /** Color variant matching task lifecycle states. Defaults to neutral styling. */
  status = input<'open' | 'in_progress' | 'completed' | 'cancelled' | 'default'>('default');

  statusClasses = computed(() => {
    switch (this.status()) {
      case 'open':
        return 'bg-fg text-bg border-fg';
      case 'in_progress':
        return 'bg-transparent text-fg border-fg';
      case 'completed':
        return 'bg-muted text-bg border-muted';
      case 'cancelled':
        return 'bg-transparent text-muted border-border line-through';
      default:
        return 'bg-transparent text-fg border-border';
    }
  });
}
