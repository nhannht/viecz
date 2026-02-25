import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { vi } from 'vitest';
import { GeolocationService } from './geolocation.service';

describe('GeolocationService', () => {
  let mockGetCurrentPosition: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockGetCurrentPosition = vi.fn();
    // jsdom doesn't provide navigator.geolocation — define it
    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition: mockGetCurrentPosition },
      configurable: true,
      writable: true,
    });
  });

  function createService(platformId = 'browser') {
    TestBed.configureTestingModule({
      providers: [
        GeolocationService,
        { provide: PLATFORM_ID, useValue: platformId },
      ],
    });
    return TestBed.inject(GeolocationService);
  }

  it('should be created', () => {
    const service = createService();
    expect(service).toBeTruthy();
  });

  it('should start with null latitude and longitude', () => {
    const service = createService();
    expect(service.latitude()).toBeNull();
    expect(service.longitude()).toBeNull();
  });

  it('should report isAvailable as false initially', () => {
    const service = createService();
    expect(service.isAvailable()).toBe(false);
  });

  it('should report isDenied as false initially', () => {
    const service = createService();
    expect(service.isDenied()).toBe(false);
  });

  it('should report loading as false initially', () => {
    const service = createService();
    expect(service.loading()).toBe(false);
  });

  it('should reject on server platform', async () => {
    const service = createService('server');
    await expect(service.requestLocation()).rejects.toBeTruthy();
  });

  it('should resolve with coordinates on success', async () => {
    const service = createService();
    const mockCoords = { latitude: 10.7769, longitude: 106.7009 } as GeolocationCoordinates;
    mockGetCurrentPosition.mockImplementation((success: PositionCallback) => {
      success({ coords: mockCoords } as GeolocationPosition);
    });

    const result = await service.requestLocation();
    expect(result.latitude).toBe(10.7769);
    expect(result.longitude).toBe(106.7009);
    expect(service.latitude()).toBe(10.7769);
    expect(service.longitude()).toBe(106.7009);
    expect(service.isAvailable()).toBe(true);
    expect(service.loading()).toBe(false);
  });

  it('should cache position and return immediately on second call', async () => {
    const service = createService();
    const mockCoords = { latitude: 10.7769, longitude: 106.7009 } as GeolocationCoordinates;
    mockGetCurrentPosition.mockImplementation((success: PositionCallback) => {
      success({ coords: mockCoords } as GeolocationPosition);
    });

    await service.requestLocation();
    await service.requestLocation();
    // Only called once because the second call uses cached position
    expect(mockGetCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it('should set isDenied on PERMISSION_DENIED error', async () => {
    const service = createService();
    mockGetCurrentPosition.mockImplementation(
      (_success: PositionCallback, error: PositionErrorCallback) => {
        error({
          code: 1,
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
          message: 'denied',
        } as GeolocationPositionError);
      },
    );

    await expect(service.requestLocation()).rejects.toBeTruthy();
    expect(service.isDenied()).toBe(true);
    expect(service.loading()).toBe(false);
  });

  it('should reject when geolocation API is not available', async () => {
    Object.defineProperty(navigator, 'geolocation', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    const service = createService();
    await expect(service.requestLocation()).rejects.toBeTruthy();
    expect(service.isDenied()).toBe(true);
  });
});
