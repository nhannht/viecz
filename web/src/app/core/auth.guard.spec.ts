import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { PLATFORM_ID } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('authGuard', () => {
  let routerSpy: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    localStorage.clear();
    routerSpy = { navigate: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: Router, useValue: routerSpy },
      ],
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should allow access when access token exists', () => {
    localStorage.setItem('viecz_access_token', 'some-token');

    const result = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
    expect(result).toBe(true);
  });

  it('should deny access and redirect to /login when no token', () => {
    const result = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
    expect(result).toBe(false);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });
});
