import { Component, computed, inject, input } from '@angular/core';
import { ThemeService } from '../../core/theme.service';

/**
 * Theme-aware progress bar component.
 *
 * Renders an ASCII `▓░` bar in metro themes and a smooth liquid-fill
 * gradient bar in the frostglass theme.
 *
 * @example
 * ```html
 * <nhannht-metro-progress-bar [value]="75" />
 * <nhannht-metro-progress-bar [value]="progressPct()" size="sm" />
 * ```
 */
@Component({
  selector: 'nhannht-metro-progress-bar',
  standalone: true,
  template: `
    @if (isGlass()) {
      <div class="glass-bar-container">
        <div class="glass-bar-track" [class.glass-bar-sm]="size() === 'sm'">
          <div class="glass-bar-fill" [style.width.%]="value()"></div>
        </div>
        <span class="glass-bar-label">{{ value() }}%</span>
      </div>
    } @else {
      <div class="metro-bar">
        <span class="metro-track">{{ metroBar() }}</span>
        <span class="metro-pct"> {{ value() }}%</span>
      </div>
    }
  `,
  styles: [`
    /* ── Metro variant ── */
    .metro-bar {
      font-size: 0.875rem;
      margin: 0.75rem 0;
      text-align: center;
    }
    .metro-track {
      letter-spacing: 1px;
    }

    /* ── Glass variant ── */
    .glass-bar-container {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0.75rem 0;
    }
    .glass-bar-track {
      flex: 1;
      height: 0.5rem;
      border-radius: 9999px;
      background: rgba(0, 0, 0, 0.06);
      box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.08);
      overflow: hidden;
    }
    .glass-bar-sm {
      height: 0.375rem;
    }
    .glass-bar-fill {
      height: 100%;
      border-radius: 9999px;
      background: linear-gradient(90deg, #32B8C6, #21808D);
      transition: width 1s ease;
      position: relative;
      overflow: hidden;
    }
    .glass-bar-fill::after {
      content: '';
      position: absolute;
      right: -1px;
      top: -1px;
      bottom: -1px;
      width: 6px;
      background: inherit;
      border-radius: 0 9999px 9999px 0;
      animation: liquid-wobble 2s ease-in-out infinite alternate;
    }
    @keyframes liquid-wobble {
      0%   { transform: scaleY(1); }
      50%  { transform: scaleY(1.15) translateX(1px); }
      100% { transform: scaleY(0.9); }
    }
    .glass-bar-label {
      font-family: 'Inter', sans-serif;
      font-size: 0.75rem;
      color: #5E6C70;
      min-width: 2.5rem;
      text-align: right;
    }

    @media (prefers-reduced-motion: reduce) {
      .glass-bar-fill { transition: none; }
      .glass-bar-fill::after { animation: none; }
    }
  `],
})
export class NhannhtMetroProgressBarComponent {
  /** Progress value, 0–100. */
  value = input<number>(0);

  /** Size preset. */
  size = input<'sm' | 'md'>('md');

  private themeService = inject(ThemeService);

  isGlass = computed(() => this.themeService.theme() === 'sang-frostglass');

  metroBar = computed(() => {
    const filled = Math.round((this.value() / 100) * 20);
    const empty = 20 - filled;
    return '▓'.repeat(filled) + '░'.repeat(empty);
  });
}
