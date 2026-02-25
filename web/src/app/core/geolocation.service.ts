import { Injectable, PLATFORM_ID, inject, signal, computed } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class GeolocationService {
  private platformId = inject(PLATFORM_ID);
  private position = signal<GeolocationCoordinates | null>(null);
  private _denied = signal(false);
  private _loading = signal(false);

  readonly latitude = computed(() => this.position()?.latitude ?? null);
  readonly longitude = computed(() => this.position()?.longitude ?? null);
  readonly isAvailable = computed(() => this.latitude() !== null);
  readonly isDenied = computed(() => this._denied());
  readonly loading = computed(() => this._loading());

  requestLocation(): Promise<GeolocationCoordinates> {
    if (!isPlatformBrowser(this.platformId)) {
      return Promise.reject('Geolocation is not available on the server');
    }

    if (!navigator.geolocation) {
      this._denied.set(true);
      return Promise.reject('Geolocation API not supported');
    }

    // Return cached position if available
    if (this.position()) {
      return Promise.resolve(this.position()!);
    }

    this._loading.set(true);
    return new Promise<GeolocationCoordinates>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.position.set(pos.coords);
          this._denied.set(false);
          this._loading.set(false);
          resolve(pos.coords);
        },
        (err) => {
          this._loading.set(false);
          if (err.code === err.PERMISSION_DENIED) {
            this._denied.set(true);
          }
          reject(err);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
      );
    });
  }
}
