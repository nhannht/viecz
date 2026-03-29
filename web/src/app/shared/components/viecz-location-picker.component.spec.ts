import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { VieczLocationPickerComponent } from './viecz-location-picker.component';

describe('VieczLocationPickerComponent', () => {
  let component: VieczLocationPickerComponent;
  let fixture: ComponentFixture<VieczLocationPickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VieczLocationPickerComponent, FormsModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VieczLocationPickerComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default HCMC center', () => {
    expect(component.mapCenter()).toEqual({ lat: 10.7769, lng: 106.7009 });
    expect(component.zoom()).toBe(13);
    expect(component.markerPosition()).toBeNull();
  });

  it('writeValue should set display value and marker position', () => {
    component.writeValue({
      location: '227 Nguyen Van Cu',
      latitude: 10.762,
      longitude: 106.682,
    });
    expect(component.displayValue()).toBe('227 Nguyen Van Cu');
    expect(component.markerPosition()).toEqual({ lat: 10.762, lng: 106.682 });
    expect(component.mapCenter()).toEqual({ lat: 10.762, lng: 106.682 });
    expect(component.zoom()).toBe(16);
  });

  it('writeValue(null) should reset state', () => {
    component.writeValue({
      location: 'Test',
      latitude: 10.5,
      longitude: 106.5,
    });
    component.writeValue(null);
    expect(component.displayValue()).toBe('');
    expect(component.markerPosition()).toBeNull();
    expect(component.mapCenter()).toEqual({ lat: 10.7769, lng: 106.7009 });
    expect(component.zoom()).toBe(13);
  });

  it('setDisabledState should toggle disabled signal', () => {
    expect(component.disabled()).toBe(false);
    component.setDisabledState(true);
    expect(component.disabled()).toBe(true);
    component.setDisabledState(false);
    expect(component.disabled()).toBe(false);
  });

  it('registerOnChange should store callback', () => {
    const fn = vi.fn();
    component.registerOnChange(fn);
    expect(fn).not.toHaveBeenCalled();
  });

  it('registerOnTouched should store callback', () => {
    const fn = vi.fn();
    component.registerOnTouched(fn);
    expect(fn).not.toHaveBeenCalled();
  });

  it('should initialize with empty suggestions', () => {
    expect(component.suggestions()).toEqual([]);
    expect(component.showSuggestions()).toBe(false);
  });

  it('onSearchChange should clear suggestions for short input', () => {
    component.onSearchChange('a');
    expect(component.suggestions()).toEqual([]);
  });

  describe('SSR safety', () => {
    it('mapReady stays false on server platform', async () => {
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [VieczLocationPickerComponent, FormsModule],
        schemas: [NO_ERRORS_SCHEMA],
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          { provide: PLATFORM_ID, useValue: 'server' },
        ],
      }).compileComponents();

      const serverFixture = TestBed.createComponent(VieczLocationPickerComponent);
      const serverComponent = serverFixture.componentInstance;
      serverFixture.detectChanges();
      await serverFixture.whenStable();
      expect(serverComponent.mapReady()).toBe(false);
    });
  });
});
