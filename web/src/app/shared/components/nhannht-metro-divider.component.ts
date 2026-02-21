import { Component } from '@angular/core';

/**
 * Horizontal divider line using `--border` color.
 *
 * Renders a 1px `<hr>` element. No inputs — purely visual separator.
 *
 * Replaces `MatDivider` from Angular Material.
 *
 * @example
 * ```html
 * <nhannht-metro-card>Content above</nhannht-metro-card>
 * <nhannht-metro-divider />
 * <nhannht-metro-card>Content below</nhannht-metro-card>
 * ```
 */
@Component({
  selector: 'nhannht-metro-divider',
  standalone: true,
  template: `<hr class="border-t border-border my-0" />`,
})
export class NhannhtMetroDividerComponent {}
