import {
  Component,
} from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

/**
 * Lightweight CSS-only minimap with pulsing markers.
 * Replaces MapLibre GL to save ~263 KB gzipped JS + network tile fetches.
 *
 * Marker positions are approximate % coords for the HCMC area layout.
 */
@Component({
  selector: 'app-landing-minimap',
  standalone: true,
  imports: [TranslocoDirective],
  template: `
    <ng-container *transloco="let t">
      <div class="minimap-card">
        <div class="minimap-surface">
          <!-- Stylized map background with CSS -->
          <div class="map-bg">
            <!-- SVG road grid pattern -->
            <svg class="road-grid" viewBox="0 0 480 300" preserveAspectRatio="none">
              <!-- Major roads -->
              <path d="M0,150 Q120,140 240,160 T480,150" stroke="rgba(255,255,255,0.08)" stroke-width="3" fill="none"/>
              <path d="M240,0 Q250,75 230,150 T260,300" stroke="rgba(255,255,255,0.08)" stroke-width="3" fill="none"/>
              <path d="M0,80 Q160,90 320,70 T480,85" stroke="rgba(255,255,255,0.05)" stroke-width="2" fill="none"/>
              <path d="M100,0 Q110,100 90,200 T120,300" stroke="rgba(255,255,255,0.05)" stroke-width="2" fill="none"/>
              <path d="M380,0 Q370,100 390,200 T360,300" stroke="rgba(255,255,255,0.05)" stroke-width="2" fill="none"/>
              <path d="M0,220 Q120,230 240,210 T480,225" stroke="rgba(255,255,255,0.05)" stroke-width="2" fill="none"/>
              <!-- Minor roads -->
              <path d="M60,0 L60,300" stroke="rgba(255,255,255,0.03)" stroke-width="1" fill="none"/>
              <path d="M180,0 L180,300" stroke="rgba(255,255,255,0.03)" stroke-width="1" fill="none"/>
              <path d="M300,0 L300,300" stroke="rgba(255,255,255,0.03)" stroke-width="1" fill="none"/>
              <path d="M420,0 L420,300" stroke="rgba(255,255,255,0.03)" stroke-width="1" fill="none"/>
              <path d="M0,50 L480,50" stroke="rgba(255,255,255,0.03)" stroke-width="1" fill="none"/>
              <path d="M0,250 L480,250" stroke="rgba(255,255,255,0.03)" stroke-width="1" fill="none"/>
              <!-- River -->
              <path d="M350,0 Q320,60 340,120 Q360,180 330,240 Q310,270 320,300"
                    stroke="rgba(33,128,141,0.15)" stroke-width="8" fill="none" stroke-linecap="round"/>
            </svg>

            <!-- Frost overlay -->
            <div class="frost-overlay"></div>
          </div>

          <!-- Markers positioned with CSS -->
          <div class="marker" style="left: 35%; top: 55%;">
            <div class="marker-ripple" style="animation-delay: 0s"></div>
            <div class="marker-dot" style="animation-delay: 0s"></div>
            <div class="marker-label">{{ t('landing.mockMapDistrict1') }}</div>
          </div>

          <div class="marker" style="left: 65%; top: 20%;">
            <div class="marker-ripple" style="animation-delay: 0.6s"></div>
            <div class="marker-dot" style="animation-delay: 0.6s"></div>
            <div class="marker-label">{{ t('landing.mockMapThuDuc') }}</div>
          </div>

          <div class="marker" style="left: 45%; top: 35%;">
            <div class="marker-ripple" style="animation-delay: 1.2s"></div>
            <div class="marker-dot" style="animation-delay: 1.2s"></div>
            <div class="marker-label">{{ t('landing.mockMapBinhThanh') }}</div>
          </div>

          <div class="marker" style="left: 30%; top: 75%;">
            <div class="marker-ripple" style="animation-delay: 1.8s"></div>
            <div class="marker-dot" style="animation-delay: 1.8s"></div>
            <div class="marker-label">{{ t('landing.mockMapDist7') }}</div>
          </div>
        </div>
        <span class="task-count">{{ t('landing.mockMapLabel') }}</span>
      </div>
    </ng-container>
  `,
  styles: `
    .minimap-card {
      max-width: 480px;
      margin: 0 auto 3rem;
      border-radius: 24px;
      padding: 10px;
      position: relative;
      background: rgba(255, 255, 255, calc(0.08 + var(--whale-darkness, 0) * 0.42));
      backdrop-filter: blur(30px) saturate(150%);
      -webkit-backdrop-filter: blur(30px) saturate(150%);
      border: 1px solid rgba(255, 255, 255, 0.3);
      box-shadow:
        0 8px 32px rgba(0, 0, 0, 0.08),
        inset 0 1px 0 rgba(255, 255, 255, 0.3);
    }

    .minimap-surface {
      width: 100%;
      aspect-ratio: 16 / 10;
      border-radius: 16px;
      overflow: hidden;
      position: relative;
    }

    .map-bg {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        160deg,
        rgba(8, 25, 35, 0.95) 0%,
        rgba(12, 35, 50, 0.9) 40%,
        rgba(6, 20, 30, 0.95) 100%
      );
    }

    .road-grid {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }

    .frost-overlay {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 1;
      border-radius: 16px;
      background: linear-gradient(160deg, rgba(33,128,141,0.1) 0%, rgba(20,60,80,0.18) 100%);
    }

    .marker {
      position: absolute;
      z-index: 2;
      display: flex;
      flex-direction: column;
      align-items: center;
      transform: translate(-50%, -50%);
    }

    .marker-dot {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #21808d;
      box-shadow: 0 0 8px 3px rgba(33,128,141,0.6), 0 0 20px 6px rgba(33,128,141,0.3);
      animation: mm-pulse 3s ease-in-out infinite;
      position: relative;
      z-index: 2;
    }

    .marker-ripple {
      position: absolute;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 2px solid #21808d;
      opacity: 0;
      animation: mm-ripple 2.5s ease-out infinite;
      z-index: 1;
    }

    .marker-label {
      font-family: var(--font-display, system-ui);
      font-size: 0.55rem;
      letter-spacing: 0.03em;
      color: rgba(255,255,255,0.85);
      text-shadow: 0 1px 4px rgba(0,0,0,0.8);
      white-space: nowrap;
      margin-top: 4px;
      text-align: center;
    }

    .task-count {
      position: absolute;
      bottom: 18px;
      right: 22px;
      font-family: var(--font-display);
      font-size: 0.7rem;
      letter-spacing: 0.04em;
      color: var(--color-accent, #21808d);
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
      z-index: 1;
    }

    @keyframes mm-pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.2); opacity: 0.8; }
    }

    @keyframes mm-ripple {
      0% { transform: scale(1); opacity: 0.6; }
      100% { transform: scale(3.5); opacity: 0; }
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
