import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { PLATFORM_ID } from '@angular/core';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService } from '../core/auth.service';
import { AuthResponse } from '../core/models';
import { provideTranslocoForTesting } from '../core/transloco-testing';

const mockAuthResponse: AuthResponse = {
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
  user: {
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
  },
};

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authServiceSpy: {
    requestOTP: ReturnType<typeof vi.fn>;
    verifyOTP: ReturnType<typeof vi.fn>;
  };
  let router: Router;

  beforeEach(async () => {
    authServiceSpy = {
      requestOTP: vi.fn(),
      verifyOTP: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideTranslocoForTesting(),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: AuthService, useValue: authServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start on step 1 (email input)', () => {
    expect(component.codeSent()).toBe(false);
  });

  describe('requestOTP', () => {
    it('should show error if email is empty', () => {
      component.email = '';
      component.onRequestOTP();
      expect(component.error()).toBeTruthy();
    });

    it('should call authService.requestOTP and move to step 2', () => {
      authServiceSpy.requestOTP.mockReturnValue(of({ message: 'sent', is_new_user: false }));
      component.email = 'test@example.com';
      component.onRequestOTP();

      expect(authServiceSpy.requestOTP).toHaveBeenCalledWith('test@example.com');
      expect(component.codeSent()).toBe(true);
      expect(component.isNewUser()).toBe(false);
    });

    it('should set isNewUser when user is new', () => {
      authServiceSpy.requestOTP.mockReturnValue(of({ message: 'sent', is_new_user: true }));
      component.email = 'new@example.com';
      component.onRequestOTP();

      expect(component.isNewUser()).toBe(true);
    });

    it('should show error on failure', () => {
      authServiceSpy.requestOTP.mockReturnValue(
        throwError(() => ({ error: { error: 'disposable email not allowed' } }))
      );
      component.email = 'test@temp.com';
      component.onRequestOTP();

      expect(component.error()).toBe('disposable email not allowed');
    });
  });

  describe('verifyOTP', () => {
    beforeEach(() => {
      component.codeSent.set(true);
      component.email = 'test@example.com';
    });

    it('should show error if code is empty', () => {
      component.code = '';
      component.onVerifyOTP();
      expect(component.error()).toBeTruthy();
    });

    it('should show error if new user and name is empty', () => {
      component.isNewUser.set(true);
      component.code = '123456';
      component.name = '';
      component.onVerifyOTP();
      expect(component.error()).toBeTruthy();
    });

    it('should call verifyOTP and navigate to marketplace on success', () => {
      authServiceSpy.verifyOTP.mockReturnValue(of(mockAuthResponse));
      component.code = '123456';
      component.onVerifyOTP();

      expect(authServiceSpy.verifyOTP).toHaveBeenCalledWith('test@example.com', '123456', undefined);
      expect(router.navigate).toHaveBeenCalledWith(['/marketplace']);
    });

    it('should pass name for new users', () => {
      authServiceSpy.verifyOTP.mockReturnValue(of(mockAuthResponse));
      component.isNewUser.set(true);
      component.code = '123456';
      component.name = 'New User';
      component.onVerifyOTP();

      expect(authServiceSpy.verifyOTP).toHaveBeenCalledWith('test@example.com', '123456', 'New User');
    });

    it('should show error on failure', () => {
      authServiceSpy.verifyOTP.mockReturnValue(
        throwError(() => ({ error: { error: 'invalid code' } }))
      );
      component.code = '000000';
      component.onVerifyOTP();

      expect(component.error()).toBe('invalid code');
    });
  });
});
