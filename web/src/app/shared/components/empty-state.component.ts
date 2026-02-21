import { Component, input } from '@angular/core';
import { NhannhtMetroIconComponent } from './nhannht-metro-icon.component';
import { NhannhtMetroButtonComponent } from './nhannht-metro-button.component';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [NhannhtMetroIconComponent, NhannhtMetroButtonComponent],
  template: `
    <div class="flex flex-col items-center justify-center py-12 px-4 text-center min-h-[200px]">
      <nhannht-metro-icon [name]="icon()" [size]="64" />
      <h3 class="font-display text-[11px] tracking-[1px] text-fg mt-3 mb-1">{{ title() }}</h3>
      <p class="font-body text-[13px] text-muted mb-4">{{ message() }}</p>
      @if (actionLabel()) {
        <nhannht-metro-button variant="primary" [label]="actionLabel()" (clicked)="onAction()" />
      }
    </div>
  `,
})
export class EmptyStateComponent {
  icon = input('inbox');
  title = input('Nothing here');
  message = input('');
  actionLabel = input('');
  action = input<() => void>();

  onAction() {
    const fn = this.action();
    if (fn) fn();
  }
}
