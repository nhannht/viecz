import {
  Component,
  ElementRef,
  Input,
  OnInit,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
  forwardRef,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, filter, switchMap } from 'rxjs';
import { LocationPickerValue } from '../../core/models';
import { GeocodingService, GeocodingFeature } from '../../core/geocoding.service';
import { environment } from '../../environments/environment';

const HCMC_LAT = 10.7769;
const HCMC_LNG = 106.7009;

@Component({
  selector: 'viecz-location-picker',
  standalone: true,
  imports: [FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => VieczLocationPickerComponent),
      multi: true,
    },
  ],
  template: `
    <div class="flex flex-col gap-1">
      @if (label) {
        <label class="font-display text-[10px] tracking-[1px] text-fg">{{ label }}</label>
      }

      <!-- Autocomplete search -->
      <div class="relative">
        <input
          type="text"
          class="w-full px-4 py-3 bg-card border border-border font-body text-[13px] text-fg
                 placeholder:text-muted focus:border-fg focus:outline-none transition-colors duration-200"
          [placeholder]="placeholder"
          [(ngModel)]="searchText"
          (ngModelChange)="onSearchChange($event)"
          (focus)="showSuggestions.set(true)"
          (blur)="onBlur()"
          [disabled]="disabled()"
        />
        @if (showSuggestions() && suggestions().length > 0) {
          <ul class="absolute top-full left-0 right-0 bg-bg border border-border z-50 max-h-[200px] overflow-y-auto">
            @for (feature of suggestions(); track feature.id) {
              <li
                class="px-4 py-2 cursor-pointer font-body text-[12px] hover:bg-card transition-colors"
                (mousedown)="selectPlace(feature)"
              >
                <span class="font-semibold">{{ feature.text }}</span>
                <span class="text-muted block text-[11px]">{{ feature.place_name }}</span>
              </li>
            }
          </ul>
        }
      </div>

      <!-- MapLibre map -->
      <div #mapContainer class="w-full h-[200px] border border-border"></div>

      @if (markerPosition()) {
        <span class="font-mono text-[11px] text-muted">
          {{ markerPosition()!.lat.toFixed(6) }}, {{ markerPosition()!.lng.toFixed(6) }}
        </span>
      }

      @if (error) {
        <span class="font-body text-[11px] text-red-600 font-semibold" role="alert">{{ error }}</span>
      }
    </div>
  `,
})
export class VieczLocationPickerComponent implements OnInit, OnDestroy, ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() error = '';

  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef<HTMLDivElement>;

  private platformId = inject(PLATFORM_ID);
  private geocoding = inject(GeocodingService);
  private searchSubject = new Subject<string>();
  private map: any = null;
  private marker: any = null;

  searchText = '';
  displayValue = signal('');
  disabled = signal(false);
  mapReady = signal(false);
  mapCenter = signal<{ lat: number; lng: number }>({ lat: HCMC_LAT, lng: HCMC_LNG });
  zoom = signal(13);
  markerPosition = signal<{ lat: number; lng: number } | null>(null);

  suggestions = signal<GeocodingFeature[]>([]);
  showSuggestions = signal(false);

  private currentValue: LocationPickerValue = { location: '', latitude: 0, longitude: 0 };
  private onChange: (value: LocationPickerValue) => void = () => {};
  private onTouched: () => void = () => {};

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    this.initSearchPipeline();
    this.initMap();
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  private initSearchPipeline() {
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        filter((q) => q.length >= 2),
        switchMap((query) =>
          this.geocoding.search(query, {
            limit: 5,
            language: 'vi,en',
            country: 'VN',
            proximity: [HCMC_LNG, HCMC_LAT],
          }),
        ),
      )
      .subscribe((response) => {
        this.suggestions.set(response.features);
      });
  }

  private async initMap() {
    try {
      const maplibreModule = await import('maplibre-gl');
      const maplibregl = maplibreModule.default || maplibreModule;

      this.map = new maplibregl.Map({
        container: this.mapContainer.nativeElement,
        style: `https://api.maptiler.com/maps/streets/style.json?key=${environment.mapTilerApiKey}`,
        center: [this.mapCenter().lng, this.mapCenter().lat],
        zoom: this.zoom(),
        attributionControl: false,
      });

      this.map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

      this.map.on('click', (e: any) => {
        if (this.disabled()) return;
        const { lng, lat } = e.lngLat;
        this.setMarker(lat, lng, maplibregl);
        this.reverseGeocode(lat, lng);
        this.onTouched();
      });

      this.map.on('load', () => {
        this.mapReady.set(true);
        // If we already have a value, place the marker
        const pos = this.markerPosition();
        if (pos) {
          this.setMarker(pos.lat, pos.lng, maplibregl);
          this.map.setCenter([pos.lng, pos.lat]);
          this.map.setZoom(16);
        }
      });
    } catch {
      // WebGL not available (e.g. test environment) — map won't render
    }
  }

  private setMarker(lat: number, lng: number, maplibregl: any) {
    if (this.marker) {
      this.marker.setLngLat([lng, lat]);
    } else {
      this.marker = new maplibregl.Marker({ draggable: true })
        .setLngLat([lng, lat])
        .addTo(this.map);

      this.marker.on('dragend', () => {
        const lngLat = this.marker.getLngLat();
        this.markerPosition.set({ lat: lngLat.lat, lng: lngLat.lng });
        this.reverseGeocode(lngLat.lat, lngLat.lng);
        this.onTouched();
      });
    }
    this.markerPosition.set({ lat, lng });
  }

  onSearchChange(value: string) {
    if (value.length < 2) {
      this.suggestions.set([]);
      return;
    }
    this.searchSubject.next(value);
  }

  selectPlace(feature: GeocodingFeature) {
    const [lng, lat] = feature.center;
    this.searchText = feature.place_name;
    this.suggestions.set([]);
    this.showSuggestions.set(false);
    this.updateValue(feature.place_name, lat, lng);
    this.displayValue.set(feature.place_name);

    if (this.map) {
      this.map.flyTo({ center: [lng, lat], zoom: 16 });
      import('maplibre-gl').then((mod) => {
        this.setMarker(lat, lng, mod.default || mod);
      });
    }
  }

  onBlur() {
    // Delay to allow mousedown on suggestion to fire first
    setTimeout(() => this.showSuggestions.set(false), 200);
    this.onTouched();
  }

  private reverseGeocode(lat: number, lng: number) {
    this.geocoding.reverse(lng, lat).subscribe({
      next: (response) => {
        const place = response.features[0];
        if (place) {
          const address = place.place_name;
          this.updateValue(address, lat, lng);
          this.displayValue.set(address);
          this.searchText = address;
        } else {
          this.updateValue('', lat, lng);
        }
      },
      error: () => {
        this.updateValue('', lat, lng);
      },
    });
  }

  private updateValue(location: string, latitude: number, longitude: number) {
    this.currentValue = { location, latitude, longitude };
    this.onChange(this.currentValue);
  }

  // ControlValueAccessor
  writeValue(value: LocationPickerValue | null): void {
    if (value) {
      this.currentValue = value;
      this.displayValue.set(value.location);
      this.searchText = value.location;
      if (value.latitude && value.longitude) {
        this.markerPosition.set({ lat: value.latitude, lng: value.longitude });
        this.mapCenter.set({ lat: value.latitude, lng: value.longitude });
        this.zoom.set(16);
        if (this.map) {
          this.map.setCenter([value.longitude, value.latitude]);
          this.map.setZoom(16);
          import('maplibre-gl').then((mod) => {
            this.setMarker(value.latitude, value.longitude, mod.default || mod);
          });
        }
      }
    } else {
      this.currentValue = { location: '', latitude: 0, longitude: 0 };
      this.displayValue.set('');
      this.searchText = '';
      this.markerPosition.set(null);
      this.mapCenter.set({ lat: HCMC_LAT, lng: HCMC_LNG });
      this.zoom.set(13);
      if (this.marker) {
        this.marker.remove();
        this.marker = null;
      }
      if (this.map) {
        this.map.setCenter([HCMC_LNG, HCMC_LAT]);
        this.map.setZoom(13);
      }
    }
  }

  registerOnChange(fn: (value: LocationPickerValue) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}
