import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID, Component, signal } from '@angular/core';
import { provideTranslocoForTesting } from '../core/transloco-testing';
import { MarketplaceMapComponent, haversineDistance, createCirclePolygon, animateValue } from './marketplace-map.component';
import { Task } from '../core/models';

const mockTasks: Task[] = [
  {
    id: 1, requester_id: 1, category_id: 1, title: 'Task A',
    description: 'Desc A', price: 50000, location: 'Q1', status: 'open',
    latitude: 10.77, longitude: 106.70, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 2, requester_id: 1, category_id: 1, title: 'Task B',
    description: 'Desc B', price: 30000, location: 'Q7', status: 'open',
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
  },
];

@Component({
  standalone: true,
  imports: [MarketplaceMapComponent],
  template: `<app-marketplace-map
    [tasks]="tasks"
    [userLat]="10.77"
    [userLng]="106.70"
    [selectedTaskId]="selectedTaskId()"
    [loading]="loading()"
    (areaSearchRequested)="lastAreaSearch = $event"
    (taskSelected)="lastTaskSelected = $event"
  />`,
})
class TestHostComponent {
  tasks = mockTasks;
  selectedTaskId = signal<number | null>(null);
  loading = signal(false);
  lastAreaSearch: { lat: number; lng: number; radius: number | null } | null = null;
  lastTaskSelected: number | null = null;
}

describe('MarketplaceMapComponent', () => {
  function createFixture() {
    TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTranslocoForTesting(),
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });

    return TestBed.createComponent(TestHostComponent);
  }

  it('should create', () => {
    const fixture = createFixture();
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should filter tasks with geo coordinates', () => {
    const fixture = createFixture();
    fixture.detectChanges();
    const mapComponent = fixture.debugElement.children[0].componentInstance as MarketplaceMapComponent;
    expect(mapComponent.geoTasks().length).toBe(1);
    expect(mapComponent.geoTasks()[0].id).toBe(1);
  });

  it('should set mapReady on browser platform', () => {
    const fixture = createFixture();
    fixture.detectChanges();
    const mapComponent = fixture.debugElement.children[0].componentInstance as MarketplaceMapComponent;
    expect(mapComponent.mapReady()).toBe(true);
  });

  it('should not initialize map on server platform', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTranslocoForTesting(),
        { provide: PLATFORM_ID, useValue: 'server' },
      ],
    });
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
    const mapComponent = fixture.debugElement.children[0].componentInstance as MarketplaceMapComponent;
    expect(mapComponent.mapReady()).toBe(false);
  });

  it('should have drawerExpanded default to false', () => {
    const fixture = createFixture();
    fixture.detectChanges();
    const mapComponent = fixture.debugElement.children[0].componentInstance as MarketplaceMapComponent;
    expect(mapComponent.drawerExpanded()).toBe(false);
  });

  it('should have showSearchAreaButton default to false', () => {
    const fixture = createFixture();
    fixture.detectChanges();
    const mapComponent = fixture.debugElement.children[0].componentInstance as MarketplaceMapComponent;
    expect(mapComponent.showSearchAreaButton()).toBe(false);
  });

  it('should have showSearchBar default to false', () => {
    const fixture = createFixture();
    fixture.detectChanges();
    const mapComponent = fixture.debugElement.children[0].componentInstance as MarketplaceMapComponent;
    expect(mapComponent.showSearchBar()).toBe(false);
  });

  it('should have sliderIndex default to 2 (5km)', () => {
    const fixture = createFixture();
    fixture.detectChanges();
    const mapComponent = fixture.debugElement.children[0].componentInstance as MarketplaceMapComponent;
    expect(mapComponent.sliderIndex()).toBe(2);
    expect(mapComponent.radiusLabel()).toBe('5 km');
  });
});

describe('haversineDistance', () => {
  it('should return 0 for same point', () => {
    expect(haversineDistance(10.77, 106.70, 10.77, 106.70)).toBe(0);
  });

  it('should calculate distance between two known points', () => {
    // HCMC center (~10.7769, 106.7009) to Thu Duc (~10.8493, 106.7731)
    const d = haversineDistance(10.7769, 106.7009, 10.8493, 106.7731);
    // Roughly ~10.5 km
    expect(d).toBeGreaterThan(9000);
    expect(d).toBeLessThan(12000);
  });

  it('should be symmetric', () => {
    const d1 = haversineDistance(10.77, 106.70, 10.85, 106.77);
    const d2 = haversineDistance(10.85, 106.77, 10.77, 106.70);
    expect(Math.abs(d1 - d2)).toBeLessThan(0.01);
  });
});

describe('createCirclePolygon', () => {
  it('should return a valid GeoJSON Polygon Feature', () => {
    const result = createCirclePolygon(106.70, 10.77, 1000);
    expect(result.type).toBe('Feature');
    expect(result.geometry.type).toBe('Polygon');
    expect(result.geometry.coordinates).toHaveLength(1);
    // Default 64 steps + closing point
    expect(result.geometry.coordinates[0]).toHaveLength(65);
  });

  it('should close the polygon ring', () => {
    const result = createCirclePolygon(106.70, 10.77, 5000, 32);
    const ring = result.geometry.coordinates[0];
    expect(ring[0][0]).toBeCloseTo(ring[ring.length - 1][0], 8);
    expect(ring[0][1]).toBeCloseTo(ring[ring.length - 1][1], 8);
  });

  it('should produce points roughly at the specified radius', () => {
    const centerLng = 106.70;
    const centerLat = 10.77;
    const radiusMeters = 3000;
    const result = createCirclePolygon(centerLng, centerLat, radiusMeters);
    // Check a few points are roughly 3km from center
    const ring = result.geometry.coordinates[0];
    for (let i = 0; i < ring.length - 1; i += 16) {
      const d = haversineDistance(centerLat, centerLng, ring[i][1], ring[i][0]);
      expect(d).toBeGreaterThan(2800);
      expect(d).toBeLessThan(3200);
    }
  });
});

describe('animateValue', () => {
  it('should return a cancel function', () => {
    const cancel = animateValue(0, 100, 500, (t) => t, () => {});
    expect(typeof cancel).toBe('function');
    cancel(); // should not throw
  });

  it('should call onFrame at least once', async () => {
    const values: number[] = [];
    const cancel = animateValue(0, 100, 16, (t) => t, (v) => values.push(v));

    // Wait for at least one rAF tick
    await new Promise((r) => setTimeout(r, 50));
    cancel();

    expect(values.length).toBeGreaterThan(0);
  });

  it('should be cancellable and stop producing frames', async () => {
    const values: number[] = [];
    const cancel = animateValue(0, 1000, 2000, (t) => t, (v) => values.push(v));

    // Let it run briefly then cancel
    await new Promise((r) => setTimeout(r, 30));
    cancel();
    const countAfterCancel = values.length;

    // Wait more and verify no additional frames
    await new Promise((r) => setTimeout(r, 100));
    expect(values.length).toBe(countAfterCancel);
  });

  it('should apply easing function', async () => {
    let easingCalled = false;
    const customEasing = (t: number) => { easingCalled = true; return t * t; };
    const cancel = animateValue(0, 100, 16, customEasing, () => {});

    await new Promise((r) => setTimeout(r, 50));
    cancel();

    expect(easingCalled).toBe(true);
  });
});
