import { Component, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [MatIcon, MatButton],
  template: `
    <div class="empty-state">
      <mat-icon class="empty-icon">{{ icon() }}</mat-icon>
      <h3>{{ title() }}</h3>
      <p>{{ message() }}</p>
      @if (actionLabel()) {
        <button mat-raised-button (click)="onAction()">{{ actionLabel() }}</button>
      }
    </div>
  `,
  styles: `
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 16px;
      text-align: center;
      color: var(--mat-sys-on-surface-variant);
      min-height: 200px;
    }
    .empty-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      opacity: 0.4;
      margin-bottom: 8px;
    }
    h3 { margin: 8px 0 4px; font-weight: 500; }
    p { margin: 0 0 16px; font-size: 0.875rem; }
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
