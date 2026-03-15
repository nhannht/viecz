import {
  Component,
  ElementRef,
  ViewChild,
  afterNextRender,
  inject,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { environment } from '../environments/environment';

/** Real coordinates + fake job for each dot */
const TASK_MARKERS = [
  { lng: 106.6977, lat: 10.7769, labelKey: 'landing.mockMapDistrict1', jobKey: 'landing.mockDeckTask0' },
  { lng: 106.7600, lat: 10.8500, labelKey: 'landing.mockMapThuDuc',    jobKey: 'landing.mockDeckTask1' },
  { lng: 106.7100, lat: 10.8050, labelKey: 'landing.mockMapBinhThanh', jobKey: 'landing.mockDeckTask2' },
  { lng: 106.7000, lat: 10.7350, labelKey: 'landing.mockMapDist7',     jobKey: 'landing.mockDeckTask3' },
];

@Component({
  selector: 'app-landing-minimap',
  standalone: true,
  imports: [TranslocoDirective],
  template: `
    <ng-container *transloco="let t">
      <div class="minimap-card">
        <div class="minimap-surface" #mapContainer></div>
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
      backdrop-filter: blur(32px) saturate(200%);
      -webkit-backdrop-filter: blur(32px) saturate(200%);
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

    @media (max-width: 768px) {
      .minimap-card {
        max-width: 100%;
        margin: 0 0 2rem;
      }
    }
  `,
})
export class LandingMinimapComponent {
  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLElement>;
  private platformId = inject(PLATFORM_ID);
  private transloco = inject(TranslocoService);

  constructor() {
    afterNextRender(() => {
      requestAnimationFrame(() => this.initMap());
    });
  }

  private async initMap(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const maplibreModule = await import('maplibre-gl');
    const maplibregl = maplibreModule.default || maplibreModule;

    // Fit all markers with padding
    const bounds = new maplibregl.LngLatBounds();
    for (const m of TASK_MARKERS) bounds.extend([m.lng, m.lat]);

    const map = new maplibregl.Map({
      container: this.mapContainer.nativeElement,
      style: `https://api.maptiler.com/maps/streets/style.json?key=${environment.mapTilerApiKey}`,
      bounds,
      fitBoundsOptions: { padding: 50 },
      interactive: false,
      attributionControl: false,
    });

    // Teal frost overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position:absolute; inset:0; pointer-events:none; z-index:1; border-radius:16px;
      background: linear-gradient(160deg, rgba(33,128,141,0.1) 0%, rgba(20,60,80,0.18) 100%);
    `;
    this.mapContainer.nativeElement.appendChild(overlay);

    // Desaturate + darken tiles
    map.on('render', () => {
      const canvas = this.mapContainer.nativeElement.querySelector('canvas');
      if (canvas && !canvas.style.filter) {
        canvas.style.filter = 'saturate(0.4) brightness(0.75)';
      }
    });

    map.on('load', () => {
      TASK_MARKERS.forEach((marker, i) => {
        const districtName = this.transloco.translate(marker.labelKey);
        const jobName = this.transloco.translate(marker.jobKey);

        // Wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'mm-marker';
        wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;cursor:pointer;';

        // Ripple ring (expanding ring animation)
        const ripple = document.createElement('div');
        ripple.className = 'mm-ripple';
        ripple.style.cssText = `
          position:absolute; width:16px; height:16px; border-radius:50%;
          border: 2px solid #21808d; opacity:0;
          animation: mm-ripple 2.5s ease-out infinite;
          animation-delay: ${i * 0.6}s;
        `;

        // Dot
        const dot = document.createElement('div');
        dot.className = 'mm-dot';
        dot.style.cssText = `
          width:16px; height:16px; border-radius:50%; position:relative;
          background: #21808d;
          box-shadow: 0 0 8px 3px rgba(33,128,141,0.6), 0 0 20px 6px rgba(33,128,141,0.3);
          animation: mm-pulse 3s ease-in-out infinite;
          animation-delay: ${i * 0.6}s;
          transition: transform 0.2s, box-shadow 0.2s;
        `;

        // Label (district name, always visible)
        const label = document.createElement('div');
        label.style.cssText = `
          font-family: var(--font-display, system-ui); font-size: 0.6rem;
          letter-spacing: 0.03em; color: rgba(255,255,255,0.9);
          text-shadow: 0 1px 4px rgba(0,0,0,0.8); white-space: nowrap;
          margin-top: 4px; text-align: center;
        `;
        label.textContent = districtName;

        // Tooltip (job name, shown on hover)
        const tooltip = document.createElement('div');
        tooltip.style.cssText = `
          position:absolute; bottom:calc(100% + 10px); left:50%; transform:translateX(-50%) translateY(4px);
          background: rgba(33,128,141,0.95); color:#fff;
          font-family: var(--font-display, system-ui); font-size: 0.65rem;
          padding: 5px 10px; border-radius: 8px; white-space: nowrap;
          pointer-events: none; opacity: 0;
          transition: opacity 0.2s, transform 0.2s;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        tooltip.textContent = jobName;

        // Tooltip arrow
        const arrow = document.createElement('div');
        arrow.style.cssText = `
          position:absolute; bottom:-4px; left:50%; transform:translateX(-50%);
          width:0; height:0;
          border-left: 5px solid transparent; border-right: 5px solid transparent;
          border-top: 5px solid rgba(33,128,141,0.95);
        `;
        tooltip.appendChild(arrow);

        // Hover effects
        wrapper.addEventListener('mouseenter', () => {
          dot.style.transform = 'scale(1.5)';
          dot.style.boxShadow = '0 0 12px 5px rgba(33,128,141,0.8), 0 0 30px 10px rgba(33,128,141,0.4)';
          tooltip.style.opacity = '1';
          tooltip.style.transform = 'translateX(-50%) translateY(0)';
        });
        wrapper.addEventListener('mouseleave', () => {
          dot.style.transform = '';
          dot.style.boxShadow = '';
          tooltip.style.opacity = '0';
          tooltip.style.transform = 'translateX(-50%) translateY(4px)';
        });

        wrapper.appendChild(tooltip);
        wrapper.appendChild(ripple);
        wrapper.appendChild(dot);
        wrapper.appendChild(label);

        new maplibregl.Marker({ element: wrapper, anchor: 'center' })
          .setLngLat([marker.lng, marker.lat])
          .addTo(map);
      });
    });

    // Inject animations
    if (!document.getElementById('mm-style')) {
      const style = document.createElement('style');
      style.id = 'mm-style';
      style.textContent = `
        @keyframes mm-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.8; }
        }
        @keyframes mm-ripple {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(3.5); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
  }
}
