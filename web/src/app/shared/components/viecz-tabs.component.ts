import { Component, input, output } from '@angular/core';

/**
 * Horizontal tab navigation with underline indicator on the active tab.
 *
 * Tabs are passed as an array of `{ value, label }`. The parent controls the
 * active tab via the `activeTab` input and listens for changes via `tabChanged`.
 * Tab panel content is projected via `<ng-content>` below the tab bar.
 *
 * Replaces `MatTabGroup` + `MatTab` from Angular Material.
 *
 * Accessibility: uses `role="tablist"` on the tab bar, `role="tab"` with
 * `aria-selected` on each button, and `role="tabpanel"` on the content area.
 *
 * @example
 * ```html
 * <viecz-tabs
 *   [tabs]="[{ value: 'all', label: 'All' }, { value: 'mine', label: 'My Tasks' }]"
 *   [activeTab]="currentTab"
 *   (tabChanged)="currentTab = $event">
 *   <!-- tab panel content here -->
 * </viecz-tabs>
 * ```
 */
@Component({
  selector: 'viecz-tabs',
  standalone: true,
  template: `
    <div>
      <div class="flex border-b border-border" role="tablist">
        @for (tab of tabs(); track tab.value; let i = $index) {
          <button
            class="px-6 py-3 font-body text-[13px] tracking-[1px] cursor-pointer bg-transparent border-none
                   transition-colors duration-200"
            [class.text-fg]="tab.value === activeTab()"
            [class.border-b-2]="tab.value === activeTab()"
            [class.border-b-fg]="tab.value === activeTab()"
            [class.text-muted]="tab.value !== activeTab()"
            role="tab"
            [attr.aria-selected]="tab.value === activeTab()"
            (click)="tabChanged.emit(tab.value)">
            {{ tab.label }}
          </button>
        }
      </div>
      <div class="pt-4" role="tabpanel">
        <ng-content />
      </div>
    </div>
  `,
})
export class VieczTabsComponent {
  /** Available tabs. Each must have a `value` (identifier) and `label` (display text). */
  tabs = input<{ value: string; label: string }[]>([]);

  /** The `value` of the currently active tab. Controls the underline indicator. */
  activeTab = input('');

  /** Emits the `value` of the newly selected tab when clicked. */
  tabChanged = output<string>();
}
