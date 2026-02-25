import {
  Component,
  input,
  signal,
  inject,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  PLATFORM_ID,
  computed,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Task } from '../core/models';
import { TaskCardComponent } from '../shared/components/task-card.component';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-marketplace-map',
  standalone: true,
  imports: [TaskCardComponent],
  template: `
    @if (mapReady()) {
      <div class="relative">
        <div #mapContainer class="w-full h-[500px]"></div>
        @if (selectedTask()) {
          <div class="absolute bottom-4 left-4 right-4 z-10">
            <app-task-card [task]="selectedTask()!" />
          </div>
        }
      </div>
    } @else {
      <div class="flex items-center justify-center h-[500px] border border-border">
        <span class="font-body text-[13px] text-muted">Loading map...</span>
      </div>
    }
  `,
})
export class MarketplaceMapComponent implements OnInit, OnDestroy {
  tasks = input.required<Task[]>();
  userLat = input<number | null>(null);
  userLng = input<number | null>(null);

  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef<HTMLDivElement>;

  selectedTask = signal<Task | null>(null);
  mapReady = signal(false);

  private platformId = inject(PLATFORM_ID);
  private map: any = null;
  private markers: any[] = [];

  private readonly defaultLat = 10.7769;
  private readonly defaultLng = 106.7009;

  geoTasks = computed(() => this.tasks().filter((t) => t.latitude != null && t.longitude != null));

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    // Defer to allow ViewChild to resolve after mapReady triggers template change
    this.mapReady.set(true);
    setTimeout(() => this.initMap(), 0);
  }

  ngOnDestroy() {
    this.clearMarkers();
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
        this.addMarkers(maplibregl);
      });
    } catch {
      // WebGL not available (e.g. test environment) — map won't render
      this.mapReady.set(false);
    }
  }

  private addMarkers(maplibregl: any) {
    this.clearMarkers();
    for (const task of this.geoTasks()) {
      const el = document.createElement('div');
      el.className = 'maplibre-task-marker';
      el.style.cssText =
        'width:28px;height:28px;background:#1a1a1a;border:2px solid #f0ede8;border-radius:50%;cursor:pointer;';

      el.addEventListener('click', () => {
        this.selectedTask.set(task);
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([task.longitude!, task.latitude!])
        .addTo(this.map);

      this.markers.push(marker);
    }
  }

  private clearMarkers() {
    for (const m of this.markers) {
      m.remove();
    }
    this.markers = [];
  }

  onMarkerClick(task: Task) {
    this.selectedTask.set(task);
  }
}
