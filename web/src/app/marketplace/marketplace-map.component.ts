import {
  Component,
  input,
  output,
  signal,
  inject,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  PLATFORM_ID,
  computed,
  effect,
  NgZone,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective } from '@jsverse/transloco';
import { Task } from '../core/models';
import { TaskCardComponent } from '../shared/components/task-card.component';
import { NhannhtMetroIconComponent } from '../shared/components/nhannht-metro-icon.component';
import { GeolocationService } from '../core/geolocation.service';
import { GeocodingService, GeocodingFeature } from '../core/geocoding.service';
import { environment } from '../environments/environment';

/** Haversine distance in meters between two lat/lng points */
export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Generate a GeoJSON Polygon circle from center + radius in meters */
export function createCirclePolygon(
  centerLng: number,
  centerLat: number,
  radiusMeters: number,
  steps = 64,
): GeoJSON.Feature<GeoJSON.Polygon> {
  const coords: [number, number][] = [];
  const distanceRadians = radiusMeters / 6371000;
  const centerLatRad = (centerLat * Math.PI) / 180;
  const centerLngRad = (centerLng * Math.PI) / 180;

  for (let i = 0; i <= steps; i++) {
    const bearing = (2 * Math.PI * i) / steps;
    const lat = Math.asin(
      Math.sin(centerLatRad) * Math.cos(distanceRadians) +
        Math.cos(centerLatRad) * Math.sin(distanceRadians) * Math.cos(bearing),
    );
    const lng =
      centerLngRad +
      Math.atan2(
        Math.sin(bearing) * Math.sin(distanceRadians) * Math.cos(centerLatRad),
        Math.cos(distanceRadians) - Math.sin(centerLatRad) * Math.sin(lat),
      );
    coords.push([(lng * 180) / Math.PI, (lat * 180) / Math.PI]);
  }

  return {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [coords] },
    properties: {},
  };
}

/** Easing: decelerate curve */
function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

/**
 * Animate a numeric value from `from` to `to` over `durationMs` using requestAnimationFrame.
 * Calls `onFrame(currentValue)` each frame. Returns a cancel function.
 */
export function animateValue(
  from: number,
  to: number,
  durationMs: number,
  easing: (t: number) => number,
  onFrame: (value: number) => void,
): () => void {
  let rafId = 0;
  const start = performance.now();

  function tick(now: number) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / durationMs, 1);
    const eased = easing(progress);
    onFrame(from + (to - from) * eased);
    if (progress < 1) {
      rafId = requestAnimationFrame(tick);
    }
  }

  rafId = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(rafId);
}

@Component({
  selector: 'app-marketplace-map',
  standalone: true,
  imports: [TaskCardComponent, NhannhtMetroIconComponent, TranslocoDirective, FormsModule],
  template: `
    <ng-container *transloco="let t">
      @if (mapReady()) {
        <div class="flex flex-col md:flex-row" style="height: calc(100vh - 200px); min-height: 400px">
          <!-- Map container with floating overlays -->
          <div class="relative flex-1 min-h-0">
            <div #mapContainer class="w-full h-full"></div>

            <!-- Search bar overlay (top-left) -->
            <div class="absolute top-3 left-3 z-20" style="max-width: 320px; width: calc(100% - 24px)">
              @if (showSearchBar()) {
                <div class="bg-bg border-2 border-fg shadow-md">
                  <div class="flex items-center gap-2 px-3 py-2">
                    <nhannht-metro-icon name="search" [size]="16" />
                    <input
                      type="text"
                      class="flex-1 bg-transparent font-body text-[13px] text-fg outline-none placeholder:text-muted"
                      [placeholder]="t('marketplace.mapSearchPlaceholder')"
                      [(ngModel)]="searchQuery"
                      (input)="onSearchQueryInput()"
                      (keydown.escape)="showSearchBar.set(false)"
                    />
                    <button class="text-muted hover:text-fg" (click)="showSearchBar.set(false); searchQuery = ''; suggestions.set([])">
                      <nhannht-metro-icon name="close" [size]="14" />
                    </button>
                  </div>
                  @if (suggestions().length > 0) {
                    <div class="border-t border-border max-h-[200px] overflow-y-auto">
                      @for (s of suggestions(); track s.id) {
                        <button
                          class="w-full text-left px-3 py-2 font-body text-[12px] text-fg hover:bg-fg hover:text-bg transition-colors truncate"
                          (click)="onSuggestionSelect(s)"
                        >
                          {{ s.place_name }}
                        </button>
                      }
                    </div>
                  }
                </div>
              } @else {
                <button
                  class="bg-bg border-2 border-fg px-3 py-2 flex items-center gap-2 shadow-md hover:bg-fg hover:text-bg transition-colors"
                  (click)="showSearchBar.set(true)"
                >
                  <nhannht-metro-icon name="search" [size]="16" />
                  <span class="font-display text-[9px] tracking-[1px]">{{ t('marketplace.mapSearchPlaceholder') }}</span>
                </button>
              }
            </div>

            <!-- "Search this area" button (top-center) -->
            @if (showSearchAreaButton()) {
              <div class="absolute top-3 left-1/2 -translate-x-1/2 z-20">
                <button
                  class="bg-fg text-bg px-4 py-2 font-display text-[10px] tracking-[1px] shadow-md hover:opacity-90 transition-opacity"
                  (click)="onSearchThisArea()"
                >
                  {{ t('marketplace.mapSearchThisArea') }}
                </button>
              </div>
            }

            <!-- Loading bar (top) -->
            @if (loading()) {
              <div class="absolute top-0 left-0 right-0 z-20 h-1 bg-border overflow-hidden">
                <div class="h-full bg-fg animate-pulse" style="width: 100%"></div>
              </div>
            }

            <!-- Radius slider control (bottom-left) -->
            <div class="absolute bottom-4 left-3 z-20 bg-bg border-2 border-fg shadow-md px-3 py-2" style="min-width: 180px">
              <div class="flex items-center justify-between mb-1">
                <span class="font-display text-[8px] tracking-[1px] text-muted uppercase">{{ t('marketplace.mapRadius') }}</span>
                <span class="font-display text-[11px] tracking-[1px] text-fg">{{ radiusLabel() }}</span>
              </div>
              <input
                type="range"
                [min]="0"
                [max]="radiusStops.length - 1"
                [value]="sliderIndex()"
                step="1"
                class="w-full h-1.5 appearance-none bg-border cursor-pointer accent-fg
                       [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                       [&::-webkit-slider-thumb]:bg-fg [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-bg
                       [&::-webkit-slider-thumb]:cursor-pointer
                       [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4
                       [&::-moz-range-thumb]:bg-fg [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-bg
                       [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-none"
                (input)="onRadiusSliderChange($event)"
              />
              <div class="flex justify-between mt-0.5">
                @for (stop of radiusStops; track stop.value) {
                  <span class="font-display text-[7px] text-muted">{{ stop.label }}</span>
                }
              </div>
            </div>

            <!-- My-location FAB (bottom-right) -->
            <button
              class="absolute bottom-4 right-4 z-20 w-10 h-10 bg-bg border-2 border-fg flex items-center justify-center shadow-md hover:bg-fg hover:text-bg transition-colors"
              (click)="onMyLocationClick()"
              [attr.aria-label]="t('marketplace.mapMyLocation')"
            >
              <nhannht-metro-icon name="my_location" [size]="20" />
            </button>
          </div>

          <!-- Desktop side panel -->
          <div class="hidden md:flex flex-col w-[380px] border-l-2 border-fg bg-bg">
            <div class="px-4 py-3 border-b border-border">
              <span class="font-display text-[10px] tracking-[1px]">
                @if (geoTasks().length > 0) {
                  {{ t('marketplace.mapTasksCount', { count: geoTasks().length }) }}
                } @else {
                  {{ t('marketplace.mapNoTasksInArea') }}
                }
              </span>
            </div>
            <div class="flex-1 overflow-y-auto p-3 space-y-3">
              @for (task of tasks(); track task.id) {
                <div
                  [id]="'panel-task-' + task.id"
                  class="cursor-pointer transition-all duration-200"
                  [class.ring-2]="selectedTaskId() === task.id"
                  [class.ring-fg]="selectedTaskId() === task.id"
                  (click)="onPanelTaskClick(task)"
                >
                  <app-task-card [task]="task" />
                </div>
              }
            </div>
          </div>

          <!-- Mobile bottom drawer -->
          <div
            class="md:hidden absolute bottom-0 left-0 right-0 z-30 bg-bg border-t-2 border-fg transition-all duration-300"
            [style.height]="drawerExpanded() ? '60vh' : '80px'"
          >
            <button
              class="w-full px-4 py-3 flex items-center justify-between border-b border-border"
              (click)="drawerExpanded.set(!drawerExpanded())"
            >
              <span class="font-display text-[10px] tracking-[1px]">
                @if (geoTasks().length > 0) {
                  {{ t('marketplace.mapTasksCount', { count: geoTasks().length }) }}
                } @else {
                  {{ t('marketplace.mapNoTasksInArea') }}
                }
              </span>
              <nhannht-metro-icon [name]="drawerExpanded() ? 'expand_more' : 'expand_less'" [size]="20" />
            </button>
            @if (drawerExpanded()) {
              <div class="overflow-y-auto p-3 space-y-3" style="height: calc(60vh - 50px)">
                @for (task of tasks(); track task.id) {
                  <div
                    [id]="'drawer-task-' + task.id"
                    class="cursor-pointer transition-all duration-200"
                    [class.ring-2]="selectedTaskId() === task.id"
                    [class.ring-fg]="selectedTaskId() === task.id"
                    (click)="onPanelTaskClick(task)"
                  >
                    <app-task-card [task]="task" />
                  </div>
                }
              </div>
            }
          </div>
        </div>
      } @else {
        <div class="flex items-center justify-center border border-border" style="height: calc(100vh - 200px); min-height: 400px">
          <span class="font-body text-[13px] text-muted">{{ t('marketplace.mapLoading') }}</span>
        </div>
      }
    </ng-container>
  `,
})
export class MarketplaceMapComponent implements OnInit, OnDestroy {
  // Inputs
  tasks = input.required<Task[]>();
  userLat = input<number | null>(null);
  userLng = input<number | null>(null);
  selectedTaskId = input<number | null>(null);
  loading = input<boolean>(false);


  // Outputs
  areaSearchRequested = output<{ lat: number; lng: number; radius: number | null }>();
  taskSelected = output<number>();

  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef<HTMLDivElement>;

  // Services
  private geo = inject(GeolocationService);
  private geocoding = inject(GeocodingService);
  private platformId = inject(PLATFORM_ID);
  private ngZone = inject(NgZone);

  // State
  selectedTask = signal<Task | null>(null);
  mapReady = signal(false);
  showSearchBar = signal(false);
  showSearchAreaButton = signal(false);
  drawerExpanded = signal(false);
  suggestions = signal<GeocodingFeature[]>([]);
  searchQuery = '';

  // Radius slider
  readonly radiusStops: { value: number | null; label: string }[] = [
    { value: 1000, label: '1 km' },
    { value: 3000, label: '3 km' },
    { value: 5000, label: '5 km' },
    { value: 10000, label: '10 km' },
    { value: null, label: 'All' },
  ];
  sliderIndex = signal(2); // default 5km
  radiusLabel = computed(() => this.radiusStops[this.sliderIndex()].label);

  private map: any = null;
  private readonly defaultLat = 10.7769;
  private readonly defaultLng = 106.7009;
  private lastSearchCenter = signal<{ lat: number; lng: number } | null>(null);
  private suppressCameraCallback = false;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private currentAnimatedRadius = 0;
  private cancelRadiusAnimation: (() => void) | null = null;
  private rippleCancels: (() => void)[] = [];
  private readonly RIPPLE_COUNT = 3;

  geoTasks = computed(() => this.tasks().filter((t) => t.latitude != null && t.longitude != null));

  constructor() {
    // Update GeoJSON markers when tasks change
    effect(() => {
      const tasks = this.geoTasks();
      if (this.map && this.map.getSource('task-markers-source')) {
        this.updateTaskMarkers(tasks);
      }
    });

    // Update user location dot when coordinates change
    effect(() => {
      const lat = this.userLat();
      const lng = this.userLng();
      if (this.map && this.map.getSource('user-location-source')) {
        this.updateUserLocationDot(lat, lng);
      }
    });

    // Highlight selected task marker
    effect(() => {
      const taskId = this.selectedTaskId();
      if (this.map && this.map.getSource('task-markers-source')) {
        this.highlightMarker(taskId);
      }
    });

    // Animate radius circle when slider index, search center, or user location changes
    effect(() => {
      const idx = this.sliderIndex();
      const radius = this.radiusStops[idx].value;
      const center = this.lastSearchCenter();
      const lat = center?.lat ?? this.userLat();
      const lng = center?.lng ?? this.userLng();
      if (this.map && this.map.getSource('search-radius-source')) {
        if (radius == null) {
          // "All" selected — hide the circle
          this.cancelRadiusAnimation?.();
          this.rippleCancels.forEach((c) => c());
          this.rippleCancels = [];
          this.currentAnimatedRadius = 0;
          const emptyPoly = { type: 'Feature' as const, geometry: { type: 'Polygon' as const, coordinates: [[]] }, properties: {} };
          this.map.getSource('search-radius-source')?.setData({ type: 'FeatureCollection', features: [emptyPoly] });
          for (let i = 0; i < this.RIPPLE_COUNT; i++) {
            this.map.getSource(`ripple-${i}-source`)?.setData({ type: 'FeatureCollection', features: [emptyPoly] });
          }
        } else {
          // Use map center as ultimate fallback
          const effectiveLat = lat ?? this.map.getCenter().lat;
          const effectiveLng = lng ?? this.map.getCenter().lng;
          this.animateRadiusTo(effectiveLat, effectiveLng, radius);
        }
      }
    });

  }

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.mapReady.set(true);
    setTimeout(() => this.initMap(), 0);
  }

  ngOnDestroy() {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.cancelRadiusAnimation?.();
    this.rippleCancels.forEach((c) => c());
    if (this.resizeObserver) this.resizeObserver.disconnect();
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  private async initMap() {
    try {
      const maplibreModule = await import('maplibre-gl');
      const maplibregl = maplibreModule.default || maplibreModule;

      const lat = this.userLat() ?? this.defaultLat;
      const lng = this.userLng() ?? this.defaultLng;

      this.map = new maplibregl.Map({
        container: this.mapContainer.nativeElement,
        style: `https://api.maptiler.com/maps/streets/style.json?key=${environment.mapTilerApiKey}`,
        center: [lng, lat],
        zoom: 13,
        attributionControl: false,
      });

      this.map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

      this.map.on('load', () => {
        this.setupGeoJsonLayers();
        this.updateTaskMarkers(this.geoTasks());
        this.updateUserLocationDot(this.userLat(), this.userLng());
        // Animate initial radius circle from 0 → default slider value (skip if "All")
        const initialRadius = this.radiusStops[this.sliderIndex()].value;
        if (initialRadius != null) {
          this.animateRadiusTo(lat, lng, initialRadius);
        }
        this.lastSearchCenter.set({ lat, lng });
      });

      // Camera move detection
      this.map.on('moveend', () => {
        if (this.suppressCameraCallback) {
          this.suppressCameraCallback = false;
          return;
        }
        const center = this.map.getCenter();
        const last = this.lastSearchCenter();
        if (last && haversineDistance(last.lat, last.lng, center.lat, center.lng) > 200) {
          this.ngZone.run(() => this.showSearchAreaButton.set(true));
        }
      });

      // Click on task marker
      this.map.on('click', 'task-markers-layer', (e: any) => {
        if (e.features && e.features.length > 0) {
          const taskId = e.features[0].properties.taskId;
          this.ngZone.run(() => {
            this.taskSelected.emit(taskId);
            this.scrollToTask(taskId);
            this.drawerExpanded.set(true);
          });
        }
      });

      // Click on empty area — deselect
      this.map.on('click', (e: any) => {
        const features = this.map.queryRenderedFeatures(e.point, {
          layers: ['task-markers-layer'],
        });
        if (!features || features.length === 0) {
          this.ngZone.run(() => this.taskSelected.emit(0));
        }
      });

      // Pointer cursor on markers
      this.map.on('mouseenter', 'task-markers-layer', () => {
        this.map.getCanvas().style.cursor = 'pointer';
      });
      this.map.on('mouseleave', 'task-markers-layer', () => {
        this.map.getCanvas().style.cursor = '';
      });

      // ResizeObserver for container changes
      this.resizeObserver = new ResizeObserver(() => {
        if (this.map) this.map.resize();
      });
      this.resizeObserver.observe(this.mapContainer.nativeElement);
    } catch {
      this.mapReady.set(false);
    }
  }

  private setupGeoJsonLayers() {
    const emptyGeoJson = { type: 'FeatureCollection' as const, features: [] };

    // Search radius circle (rendered below everything else)
    this.map.addSource('search-radius-source', { type: 'geojson', data: emptyGeoJson });
    this.map.addLayer({
      id: 'search-radius-fill',
      type: 'fill',
      source: 'search-radius-source',
      paint: {
        'fill-color': '#4285F4',
        'fill-opacity': 0.08,
      },
    });
    this.map.addLayer({
      id: 'search-radius-stroke',
      type: 'line',
      source: 'search-radius-source',
      paint: {
        'line-color': '#4285F4',
        'line-width': 2,
        'line-opacity': 0.4,
        'line-dasharray': [4, 3],
      },
    });

    // Ripple ring layers (3 staggered rings for cascade effect)
    for (let i = 0; i < this.RIPPLE_COUNT; i++) {
      this.map.addSource(`ripple-${i}-source`, { type: 'geojson', data: emptyGeoJson });
      this.map.addLayer({
        id: `ripple-${i}-layer`,
        type: 'line',
        source: `ripple-${i}-source`,
        paint: {
          'line-color': '#4285F4',
          'line-width': 1.5,
          'line-opacity': 0,
        },
      });
    }

    // Task markers source + layers
    this.map.addSource('task-markers-source', { type: 'geojson', data: emptyGeoJson });

    // Outer ring (highlight/hover)
    this.map.addLayer({
      id: 'task-markers-ring',
      type: 'circle',
      source: 'task-markers-source',
      paint: {
        'circle-radius': 14,
        'circle-color': '#FF6B35',
        'circle-opacity': ['case', ['boolean', ['get', 'selected'], false], 0.4, 0.15],
      },
    });

    // Main dot
    this.map.addLayer({
      id: 'task-markers-layer',
      type: 'circle',
      source: 'task-markers-source',
      paint: {
        'circle-radius': 9,
        'circle-color': '#FF6B35',
        'circle-stroke-color': '#FFFFFF',
        'circle-stroke-width': 2.5,
      },
    });

    // User location source + layers
    this.map.addSource('user-location-source', { type: 'geojson', data: emptyGeoJson });

    // Pulse ring
    this.map.addLayer({
      id: 'user-location-pulse',
      type: 'circle',
      source: 'user-location-source',
      paint: {
        'circle-radius': 16,
        'circle-color': '#4285F4',
        'circle-opacity': 0.2,
      },
    });

    // Blue dot
    this.map.addLayer({
      id: 'user-location-dot',
      type: 'circle',
      source: 'user-location-source',
      paint: {
        'circle-radius': 8,
        'circle-color': '#4285F4',
        'circle-stroke-color': '#FFFFFF',
        'circle-stroke-width': 2.5,
      },
    });
  }

  private updateTaskMarkers(tasks: Task[]) {
    const features = tasks.map((task) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [task.longitude!, task.latitude!],
      },
      properties: {
        taskId: task.id,
        title: task.title,
        selected: task.id === this.selectedTaskId(),
      },
    }));

    const source = this.map.getSource('task-markers-source');
    if (source) {
      source.setData({ type: 'FeatureCollection', features });
    }
  }

  private updateUserLocationDot(lat: number | null, lng: number | null) {
    const source = this.map.getSource('user-location-source');
    if (!source) return;

    if (lat != null && lng != null) {
      source.setData({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [lng, lat] },
            properties: {},
          },
        ],
      });
    } else {
      source.setData({ type: 'FeatureCollection', features: [] });
    }
  }

  private updateRadiusCircle(lat: number, lng: number, radius: number) {
    const source = this.map.getSource('search-radius-source');
    if (!source) return;

    const circle = createCirclePolygon(lng, lat, radius);
    source.setData({ type: 'FeatureCollection', features: [circle] });
  }

  /**
   * Animate the radius circle from current size to `targetRadius` with ripple cascade.
   * The main circle eases smoothly while 3 ghost rings expand outward and fade.
   */
  private animateRadiusTo(lat: number, lng: number, targetRadius: number) {
    // Cancel any running animations
    this.cancelRadiusAnimation?.();
    this.rippleCancels.forEach((c) => c());
    this.rippleCancels = [];

    const fromRadius = this.currentAnimatedRadius || targetRadius * 0.3;

    // 1. Main circle: smooth ease from current → target (600ms)
    this.cancelRadiusAnimation = animateValue(
      fromRadius,
      targetRadius,
      600,
      easeOutCubic,
      (r) => {
        this.currentAnimatedRadius = r;
        if (this.map?.getSource('search-radius-source')) {
          this.updateRadiusCircle(lat, lng, r);
        }
      },
    );

    // 2. Ripple cascade: 3 rings, staggered 100ms apart
    for (let i = 0; i < this.RIPPLE_COUNT; i++) {
      const delay = i * 100;
      const timeoutId = setTimeout(() => {
        const rippleFrom = fromRadius;
        // Each ripple expands ~20% past target, with each successive ring going further
        const rippleTo = targetRadius * (1.1 + i * 0.08);
        const rippleDuration = 700;

        const cancel = animateValue(
          rippleFrom,
          rippleTo,
          rippleDuration,
          easeOutCubic,
          (r) => {
            const sourceId = `ripple-${i}-source`;
            const layerId = `ripple-${i}-layer`;
            if (!this.map?.getSource(sourceId)) return;

            // Draw the ripple ring
            const ring = createCirclePolygon(lng, lat, r);
            this.map.getSource(sourceId).setData({
              type: 'FeatureCollection',
              features: [ring],
            });

            // Fade out as it expands: opacity goes 0.5 → 0
            const progress = (r - rippleFrom) / (rippleTo - rippleFrom);
            const opacity = 0.5 * (1 - progress);
            this.map.setPaintProperty(layerId, 'line-opacity', opacity);
          },
        );

        this.rippleCancels.push(cancel);
      }, delay);

      // Also track the timeout so we can cancel if needed
      this.rippleCancels.push(() => clearTimeout(timeoutId));
    }
  }

  onRadiusSliderChange(event: Event) {
    const idx = parseInt((event.target as HTMLInputElement).value, 10);
    this.sliderIndex.set(idx);
    const radius = this.radiusStops[idx].value;

    // Ensure we have a center for the circle
    if (!this.lastSearchCenter() && this.map) {
      const c = this.map.getCenter();
      this.lastSearchCenter.set({ lat: c.lat, lng: c.lng });
    }

    // Trigger area search with new radius
    const center = this.lastSearchCenter();
    if (center) {
      this.areaSearchRequested.emit({ lat: center.lat, lng: center.lng, radius });
    }
  }

  private highlightMarker(taskId: number | null) {
    const tasks = this.geoTasks();
    const features = tasks.map((task) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [task.longitude!, task.latitude!],
      },
      properties: {
        taskId: task.id,
        title: task.title,
        selected: task.id === taskId,
      },
    }));

    const source = this.map.getSource('task-markers-source');
    if (source) {
      source.setData({ type: 'FeatureCollection', features });
    }
  }

  onSearchThisArea() {
    if (!this.map) return;
    const center = this.map.getCenter();
    const radius = this.radiusStops[this.sliderIndex()].value;

    this.lastSearchCenter.set({ lat: center.lat, lng: center.lng });
    this.showSearchAreaButton.set(false);
    this.areaSearchRequested.emit({ lat: center.lat, lng: center.lng, radius });
  }

  onMyLocationClick() {
    this.geo.requestLocation().then((coords) => {
      if (this.map) {
        this.suppressCameraCallback = true;
        this.map.flyTo({
          center: [coords.longitude, coords.latitude],
          zoom: 14,
          duration: 1000,
        });
        // Trigger area search with current slider radius after fly-to
        this.map.once('moveend', () => {
          const radius = this.radiusStops[this.sliderIndex()].value;
          this.areaSearchRequested.emit({
            lat: coords.latitude,
            lng: coords.longitude,
            radius,
          });
          this.lastSearchCenter.set({ lat: coords.latitude, lng: coords.longitude });
          this.showSearchAreaButton.set(false);
        });
      }
    });
  }

  onSearchQueryInput() {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    const query = this.searchQuery.trim();
    if (query.length < 2) {
      this.suggestions.set([]);
      return;
    }
    this.searchTimer = setTimeout(() => {
      const proximity =
        this.userLat() != null && this.userLng() != null
          ? ([this.userLng()!, this.userLat()!] as [number, number])
          : undefined;

      this.geocoding.search(query, { limit: 5, country: 'VN', proximity }).subscribe({
        next: (res) => this.suggestions.set(res.features),
        error: () => this.suggestions.set([]),
      });
    }, 300);
  }

  onSuggestionSelect(feature: GeocodingFeature) {
    const [lng, lat] = feature.center;
    this.searchQuery = feature.text;
    this.suggestions.set([]);
    this.showSearchBar.set(false);

    if (this.map) {
      this.suppressCameraCallback = true;
      this.map.flyTo({ center: [lng, lat], zoom: 14, duration: 1000 });
      // Auto-trigger area search after fly
      this.map.once('moveend', () => {
        this.onSearchThisArea();
      });
    }
  }

  onPanelTaskClick(task: Task) {
    this.taskSelected.emit(task.id);
    if (this.map && task.latitude != null && task.longitude != null) {
      this.suppressCameraCallback = true;
      this.map.flyTo({
        center: [task.longitude, task.latitude],
        zoom: 15,
        duration: 800,
      });
    }
  }

  private scrollToTask(taskId: number) {
    setTimeout(() => {
      const el =
        document.getElementById(`panel-task-${taskId}`) ||
        document.getElementById(`drawer-task-${taskId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
  }
}
