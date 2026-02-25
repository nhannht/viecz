import { Injectable } from '@angular/core';

/**
 * MapLibre doesn't need a script loader — it's imported as an npm module.
 * This service is kept as a lightweight compatibility shim so existing
 * injection tokens and tests don't break. It always resolves immediately.
 *
 * @deprecated Will be removed once all consumers import MapLibre directly.
 */
@Injectable({ providedIn: 'root' })
export class GoogleMapsLoaderService {
  private ready = Promise.resolve();

  load(): Promise<void> {
    return this.ready;
  }
}
