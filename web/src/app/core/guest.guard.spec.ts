import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { PLATFORM_ID } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { guestGuard } from './guest.guard';

describe('guestGuard', () => {
  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should allow access when no token exists', () => {
    const result = TestBed.runInInjectionContext(() => guestGuard({} as any, {} as any));
    expect(result).toBe(true);
  });

  it('should redirect to /marketplace when token exists', () => {
    localStorage.setItem('viecz_access_token', 'some-token');

    const result = TestBed.runInInjectionContext(() => guestGuard({} as any, {} as any));
    const router = TestBed.inject(Router);
    expect(result).toEqual(router.parseUrl('/marketplace'));
  });
});
