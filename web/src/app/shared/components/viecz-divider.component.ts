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
 * <viecz-card>Content above</viecz-card>
 * <viecz-divider />
 * <viecz-card>Content below</viecz-card>
 * ```
 */
@Component({
  selector: 'viecz-divider',
  standalone: true,
  template: `<hr class="border-t border-border my-0" />`,
})
export class VieczDividerComponent {}
