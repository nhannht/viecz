import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

/** Unified feature interface used by the location picker */
export interface GeocodingFeature {
  id: string;
  type: 'Feature';
  text: string;
  place_name: string;
  center: [number, number]; // [lng, lat]
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: Record<string, unknown>;
}

export interface GeocodingResponse {
  type: 'FeatureCollection';
  features: GeocodingFeature[];
}

/** Raw Nominatim search result */
interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  name?: string;
}

/**
 * Geocoding service using Nominatim (OpenStreetMap).
 * Nominatim has excellent POI data for Vietnam (universities, landmarks, etc.)
 * which MapTiler's geocoding lacks.
 *
 * Rate limit: 1 req/sec — fine with 300ms debounce on autocomplete.
 */
@Injectable({ providedIn: 'root' })
export class GeocodingService {
  private http = inject(HttpClient);

  search(
    query: string,
    options?: {
      limit?: number;
      language?: string;
      proximity?: [number, number];
      country?: string;
    },
  ): Observable<GeocodingResponse> {
    let params = new HttpParams()
      .set('q', query)
      .set('limit', options?.limit ?? 5)
      .set('addressdetails', '1');

    if (options?.country) params = params.set('countrycodes', options.country.toLowerCase());
    if (options?.language) params = params.set('language', options.language);
    if (options?.proximity) {
      const [lng, lat] = options.proximity;
      const delta = 0.5; // ~50km bias box
      params = params.set(
        'viewbox',
        `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`,
      );
      params = params.set('bounded', '0');
    }

    return this.http
      .get<NominatimResult[]>('/api/v1/geocode/search', { params })
      .pipe(map((results) => this.toGeocodingResponse(results)));
  }

  reverse(lng: number, lat: number): Observable<GeocodingResponse> {
    const params = new HttpParams()
      .set('lat', lat)
      .set('lon', lng)
      .set('language', 'vi,en');

    return this.http.get<NominatimResult>('/api/v1/geocode/reverse', { params }).pipe(
      map((result) => this.toGeocodingResponse([result])),
    );
  }

  private toGeocodingResponse(results: NominatimResult[]): GeocodingResponse {
    return {
      type: 'FeatureCollection',
      features: results.map((r) => {
        const lng = parseFloat(r.lon);
        const lat = parseFloat(r.lat);
        return {
          id: String(r.place_id),
          type: 'Feature' as const,
          text: r.name || r.display_name.split(',')[0],
          place_name: r.display_name,
          center: [lng, lat],
          geometry: { type: 'Point' as const, coordinates: [lng, lat] },
          properties: { type: r.type },
        };
      }),
    };
  }
}
