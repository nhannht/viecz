import { Component, isDevMode } from '@angular/core';

@Component({
  selector: 'app-dev-mode-banner',
  standalone: true,
  template: `
    @if (show) {
      <div style="background:#fefce8;color:#854d0e;border:1px solid #fde047;border-radius:4px;padding:12px 16px;margin-bottom:16px;text-align:center;font-family:monospace;font-size:13px">
        <ng-content />
      </div>
    }
  `,
})
export class DevModeBannerComponent {
  readonly show = isDevMode();
}
