import {
  Component,
} from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

/**
 * Lightweight minimap with static dark map image + pulsing markers.
 * Uses a pre-rendered CartoDB dark basemap (~46 KB WebP) instead of
 * MapLibre GL (~263 KB gzipped JS + network tile fetches).
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
          <!-- Real map background -->
          <img class="map-bg" src="assets/textures/hcmc_dark_map.webp" alt="" loading="lazy" />
          <div class="frost-overlay"></div>

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
      width: 100%;
      height: 100%;
      object-fit: cover;
      pointer-events: none;
    }

    .frost-overlay {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 1;
      border-radius: 16px;
      background: linear-gradient(160deg, rgba(33,128,141,0.08) 0%, rgba(20,60,80,0.12) 100%);
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
