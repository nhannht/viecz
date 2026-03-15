import { Component } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

@Component({
  selector: 'app-landing-minimap',
  standalone: true,
  imports: [TranslocoDirective],
  template: `
    <ng-container *transloco="let t">
      <div class="minimap-card">
        <div class="minimap-surface">
          <!-- District dots with labels -->
          <div class="dot-group" style="left: 22%; top: 28%">
            <span class="dot"></span>
            <span class="dot-label">{{ t('landing.mockMapDistrict1') }}</span>
          </div>
          <div class="dot-group" style="left: 58%; top: 18%">
            <span class="dot"></span>
            <span class="dot-label">{{ t('landing.mockMapThuDuc') }}</span>
          </div>
          <div class="dot-group" style="left: 50%; top: 52%">
            <span class="dot"></span>
            <span class="dot-label">{{ t('landing.mockMapBinhThanh') }}</span>
          </div>
          <div class="dot-group" style="left: 20%; top: 72%">
            <span class="dot"></span>
            <span class="dot-label">{{ t('landing.mockMapDist7') }}</span>
          </div>

          <span class="task-count">{{ t('landing.mockMapLabel') }}</span>
        </div>
      </div>
    </ng-container>
  `,
  styles: `
    .minimap-card {
      max-width: 480px;
      margin: 0 auto 3rem;
      border-radius: 24px;
      padding: 10px;
      background: rgba(255, 255, 255, calc(0.08 + var(--whale-darkness, 0) * 0.42));
      backdrop-filter: blur(32px) saturate(200%);
      -webkit-backdrop-filter: blur(32px) saturate(200%);
      border: 1px solid rgba(255, 255, 255, 0.3);
      box-shadow:
        0 8px 32px rgba(0, 0, 0, 0.08),
        inset 0 1px 0 rgba(255, 255, 255, 0.3);
    }

    .minimap-surface {
      position: relative;
      width: 100%;
      aspect-ratio: 16 / 10;
      border-radius: 16px;
      background: linear-gradient(
        160deg,
        hsl(210, 8%, 42%) 0%,
        hsl(210, 8%, 36%) 100%
      );
      overflow: hidden;
    }

    .dot-group {
      position: absolute;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      transform: translate(-50%, -50%);
    }

    .dot {
      display: block;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--color-accent, #21808d);
      box-shadow:
        0 0 6px 2px rgba(33, 128, 141, 0.5),
        0 0 16px 4px rgba(33, 128, 141, 0.2);
      animation: dot-pulse 3s ease-in-out infinite;
    }

    .dot-group:nth-child(2) .dot { animation-delay: 0.7s; }
    .dot-group:nth-child(3) .dot { animation-delay: 1.4s; }
    .dot-group:nth-child(4) .dot { animation-delay: 2.1s; }

    @keyframes dot-pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.3); opacity: 0.7; }
    }

    .dot-label {
      font-family: var(--font-display);
      font-size: 0.65rem;
      letter-spacing: 0.03em;
      color: rgba(255, 255, 255, 0.75);
      white-space: nowrap;
    }

    .task-count {
      position: absolute;
      bottom: 10px;
      right: 14px;
      font-family: var(--font-display);
      font-size: 0.7rem;
      letter-spacing: 0.04em;
      color: var(--color-accent, #21808d);
    }

    @media (max-width: 768px) {
      .minimap-card {
        max-width: 100%;
        margin: 0 0 2rem;
      }
    }
  `,
})
export class LandingMinimapComponent {}
