import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID, Component } from '@angular/core';
import { provideTranslocoForTesting } from '../core/transloco-testing';
import { MarketplaceMapComponent } from './marketplace-map.component';
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
  template: `<app-marketplace-map [tasks]="tasks" [userLat]="10.77" [userLng]="106.70" />`,
})
class TestHostComponent {
  tasks = mockTasks;
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
});
