import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  let routerSpy: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    localStorage.clear();
    routerSpy = { navigate: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: Router, useValue: routerSpy },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    localStorage.clear();
  });

  it('should add Authorization header when token exists', () => {
    localStorage.setItem('viecz_access_token', 'my-token');

    http.get('/api/v1/tasks').subscribe();

    const req = httpTesting.expectOne('/api/v1/tasks');
    expect(req.request.headers.get('Authorization')).toBe('Bearer my-token');
    req.flush([]);
  });

  it('should not add Authorization header when no token', () => {
    http.get('/api/v1/tasks').subscribe();

    const req = httpTesting.expectOne('/api/v1/tasks');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush([]);
  });

  it('should attempt token refresh on 401 when refresh token exists', () => {
    localStorage.setItem('viecz_access_token', 'expired-token');
    localStorage.setItem('viecz_refresh_token', 'valid-refresh-token');

    http.get('/api/v1/tasks').subscribe({
      next: (data) => expect(data).toEqual([{ id: 1 }]),
    });

    // First request fails with 401
    const originalReq = httpTesting.expectOne('/api/v1/tasks');
    originalReq.flush({}, { status: 401, statusText: 'Unauthorized' });

    // Interceptor sends refresh request
    const refreshReq = httpTesting.expectOne('/api/v1/auth/refresh');
    expect(refreshReq.request.body).toEqual({ refresh_token: 'valid-refresh-token' });
    refreshReq.flush({ access_token: 'new-access-token' });

    // Interceptor retries original request with new token
    const retryReq = httpTesting.expectOne('/api/v1/tasks');
    expect(retryReq.request.headers.get('Authorization')).toBe('Bearer new-access-token');
    retryReq.flush([{ id: 1 }]);
  });

  it('should logout when refresh also fails', () => {
    localStorage.setItem('viecz_access_token', 'expired-token');
    localStorage.setItem('viecz_refresh_token', 'expired-refresh-token');

    http.get('/api/v1/tasks').subscribe({ error: () => {} });

    // First request fails with 401
    const originalReq = httpTesting.expectOne('/api/v1/tasks');
    originalReq.flush({}, { status: 401, statusText: 'Unauthorized' });

    // Refresh also fails
    const refreshReq = httpTesting.expectOne('/api/v1/auth/refresh');
    refreshReq.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should not attempt refresh for auth endpoints', () => {
    localStorage.setItem('viecz_access_token', 'token');
    localStorage.setItem('viecz_refresh_token', 'refresh-token');

    const errorSpy = vi.fn();
    http.post('/api/v1/auth/login', {}).subscribe({ error: errorSpy });

    const req = httpTesting.expectOne('/api/v1/auth/login');
    req.flush({ error: 'Invalid' }, { status: 401, statusText: 'Unauthorized' });

    // Should NOT attempt refresh
    httpTesting.expectNone('/api/v1/auth/refresh');
    expect(errorSpy).toHaveBeenCalled();
  });

  it('should not attempt refresh when no refresh token', () => {
    localStorage.setItem('viecz_access_token', 'expired-token');
    // No refresh token

    const errorSpy = vi.fn();
    http.get('/api/v1/tasks').subscribe({ error: errorSpy });

    const req = httpTesting.expectOne('/api/v1/tasks');
    req.flush({}, { status: 401, statusText: 'Unauthorized' });

    httpTesting.expectNone('/api/v1/auth/refresh');
    expect(errorSpy).toHaveBeenCalled();
  });

  it('should pass through non-401 errors', () => {
    const errorSpy = vi.fn();
    http.get('/api/v1/tasks').subscribe({ error: errorSpy });

    const req = httpTesting.expectOne('/api/v1/tasks');
    req.flush({ error: 'Not found' }, { status: 404, statusText: 'Not Found' });

    httpTesting.expectNone('/api/v1/auth/refresh');
    expect(errorSpy).toHaveBeenCalled();
  });
});
