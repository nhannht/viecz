import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { VieczIconComponent } from './viecz-icon.component';

/**
 * Fixed top navigation bar with frosted glass effect.
 *
 * Displays a logo, navigation links, and optional action slots.
 * Uses `backdrop-filter: blur(12px)` with semi-transparent `--bg` background.
 *
 * Links use `RouterLink` + `RouterLinkActive` for SPA navigation.
 *
 * Replaces `MatToolbar` from Angular Material.
 *
 * @example
 * ```html
 * <viecz-nav
 *   logo="Viecz"
 *   [links]="[{label: 'Marketplace', route: '/marketplace', icon: 'store'}]"
 * >
 *   <ng-container actions>
 *     <button>Account</button>
 *   </ng-container>
 * </viecz-nav>
 * ```
 */
@Component({
  selector: 'viecz-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, VieczIconComponent],
  template: `
    <nav class="fixed top-0 left-0 right-0 z-50 flex items-center justify-between
                px-6 py-3 font-body"
         style="background: color-mix(in srgb, var(--color-bg) 85%, transparent); backdrop-filter: blur(12px)">
      <a [routerLink]="logoRoute()" class="font-display text-[13px] text-fg tracking-[2px]">
        {{ logo() }}
      </a>

      <div class="flex items-center gap-6">
        @for (link of links(); track link.route) {
          <a [routerLink]="link.route"
             routerLinkActive="text-fg font-bold"
             class="flex items-center gap-1 text-muted text-[13px] tracking-[1px]
                    transition-colors duration-200 hover:text-fg">
            @if (link.icon) {
              <viecz-icon [name]="link.icon" [size]="18" />
            }
            <span class="nav-label">{{ link.label }}</span>
          </a>
        }

        <ng-content select="[actions]" />
      </div>
    </nav>
  `,
  styles: `
    @media (max-width: 600px) {
      .nav-label { display: none; }
    }
  `,
})
export class VieczNavComponent {
  /** Logo text displayed on the left. */
  logo = input('Viecz');

  /** Route for the logo link. */
  logoRoute = input('/');

  /** Navigation link definitions. */
  links = input<{ label: string; route: string; icon?: string }[]>([]);
}
