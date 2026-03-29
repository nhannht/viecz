import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { AuthResponse, User } from './models';

const mockUser: User = {
  id: 1,
  email: 'test@example.com',
  name: 'Test User',
  university: 'DHQG-HCM',
  is_verified: false,
  rating: 0,
  total_tasks_completed: 0,
  total_tasks_posted: 0,
  total_earnings: 0,
  auth_provider: 'email',
  email_verified: true,
  phone_verified: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const mockAuthResponse: AuthResponse = {
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
  user: mockUser,
};

describe('AuthService', () => {
  let service: AuthService;
  let httpTesting: HttpTestingController;
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

    service = TestBed.inject(AuthService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return null access token when not logged in', () => {
    expect(service.getAccessToken()).toBeNull();
  });

  it('should not be authenticated initially', () => {
    expect(service.isAuthenticated()).toBe(false);
  });

  it('should have null current user initially', () => {
    expect(service.currentUser()).toBeNull();
  });

  describe('requestOTP', () => {
    it('should send POST to /api/v1/auth/otp/request', () => {
      service.requestOTP('test@example.com').subscribe();

      const req = httpTesting.expectOne('/api/v1/auth/otp/request');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email: 'test@example.com' });
      req.flush({ message: 'verification code sent', is_new_user: false });
    });

    it('should include turnstile token when provided', () => {
      service.requestOTP('test@example.com', 'turnstile-token').subscribe();

      const req = httpTesting.expectOne('/api/v1/auth/otp/request');
      expect(req.request.body).toEqual({ email: 'test@example.com', turnstile_token: 'turnstile-token' });
      req.flush({ message: 'verification code sent', is_new_user: true });
    });

    it('should return is_new_user flag', () => {
      let result: any;
      service.requestOTP('new@example.com').subscribe(r => result = r);

      const req = httpTesting.expectOne('/api/v1/auth/otp/request');
      req.flush({ message: 'verification code sent', is_new_user: true });

      expect(result.is_new_user).toBe(true);
    });
  });

  describe('verifyOTP', () => {
    it('should send POST to /api/v1/auth/otp/verify', () => {
      service.verifyOTP('test@example.com', '123456').subscribe();

      const req = httpTesting.expectOne('/api/v1/auth/otp/verify');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email: 'test@example.com', code: '123456' });
      req.flush(mockAuthResponse);
    });

    it('should include name for new users', () => {
      service.verifyOTP('test@example.com', '123456', 'New User').subscribe();

      const req = httpTesting.expectOne('/api/v1/auth/otp/verify');
      expect(req.request.body).toEqual({ email: 'test@example.com', code: '123456', name: 'New User' });
      req.flush(mockAuthResponse);
    });

    it('should store tokens and user on success', () => {
      service.verifyOTP('test@example.com', '123456').subscribe();

      const req = httpTesting.expectOne('/api/v1/auth/otp/verify');
      req.flush(mockAuthResponse);

      expect(service.getAccessToken()).toBe('test-access-token');
      expect(service.getRefreshToken()).toBe('test-refresh-token');
      expect(service.currentUser()).toEqual(mockUser);
      expect(localStorage.getItem('viecz_user')).toBeTruthy();
    });

    it('should propagate error on failure', () => {
      const errorSpy = vi.fn();
      service.verifyOTP('test@example.com', '000000').subscribe({ error: errorSpy });

      const req = httpTesting.expectOne('/api/v1/auth/otp/verify');
      req.flush({ error: 'invalid or expired verification code' }, { status: 401, statusText: 'Unauthorized' });

      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('should send POST to /api/v1/auth/refresh with refresh token', () => {
      localStorage.setItem('viecz_refresh_token', 'old-refresh-token');

      service.refresh().subscribe();

      const req = httpTesting.expectOne('/api/v1/auth/refresh');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ refresh_token: 'old-refresh-token' });
      req.flush({ access_token: 'new-access-token' });

      expect(service.getAccessToken()).toBe('new-access-token');
    });
  });

  describe('logout', () => {
    it('should clear tokens and user', () => {
      localStorage.setItem('viecz_access_token', 'token');
      localStorage.setItem('viecz_refresh_token', 'refresh');
      localStorage.setItem('viecz_user', JSON.stringify(mockUser));

      service.logout();

      expect(service.getAccessToken()).toBeNull();
      expect(service.getRefreshToken()).toBeNull();
      expect(service.currentUser()).toBeNull();
    });

    it('should navigate to /login', () => {
      service.logout();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('constructor - restore from localStorage', () => {
    it('should restore user from localStorage on init', () => {
      localStorage.setItem('viecz_user', JSON.stringify(mockUser));

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          { provide: PLATFORM_ID, useValue: 'browser' },
          { provide: Router, useValue: routerSpy },
        ],
      });
      const newService = TestBed.inject(AuthService);
      expect(newService.currentUser()).toEqual(mockUser);
    });

    it('should handle invalid JSON in localStorage gracefully', () => {
      localStorage.setItem('viecz_user', 'invalid-json');

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          { provide: PLATFORM_ID, useValue: 'browser' },
          { provide: Router, useValue: routerSpy },
        ],
      });
      const newService = TestBed.inject(AuthService);
      expect(newService.currentUser()).toBeNull();
    });
  });

  describe('isAuthenticated computed signal', () => {
    it('should be false when currentUser is null', () => {
      expect(service.currentUser()).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
    });

    it('should be true when currentUser is set', () => {
      service.verifyOTP('test@example.com', '123456').subscribe();
      const req = httpTesting.expectOne('/api/v1/auth/otp/verify');
      req.flush(mockAuthResponse);
      expect(service.currentUser()).not.toBeNull();
      expect(service.isAuthenticated()).toBe(true);
    });
  });

  describe('SSR / server platform', () => {
    let serverService: AuthService;
    let serverHttpTesting: HttpTestingController;

    beforeEach(() => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: Router, useValue: routerSpy },
        ],
      });
      serverService = TestBed.inject(AuthService);
      serverHttpTesting = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
      serverHttpTesting.verify();
    });

    it('should not read localStorage in constructor on server', () => {
      expect(serverService.currentUser()).toBeNull();
    });

    it('getAccessToken should return null on server', () => {
      expect(serverService.getAccessToken()).toBeNull();
    });

    it('logout should not throw on server', () => {
      expect(() => serverService.logout()).not.toThrow();
      expect(serverService.currentUser()).toBeNull();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('verifyOTP should store user in signal but not localStorage on server', () => {
      serverService.verifyOTP('test@example.com', '123456').subscribe();
      const req = serverHttpTesting.expectOne('/api/v1/auth/otp/verify');
      req.flush(mockAuthResponse);

      expect(serverService.currentUser()).toEqual(mockUser);
      expect(serverService.isAuthenticated()).toBe(true);
      expect(localStorage.getItem('viecz_access_token')).toBeNull();
    });
  });
});
