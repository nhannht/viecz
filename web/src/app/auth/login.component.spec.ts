import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Component, PLATFORM_ID } from '@angular/core';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService } from '../core/auth.service';
import { AuthResponse } from '../core/models';

@Component({ selector: 'app-dummy', template: '', standalone: true })
class DummyComponent {}

const mockAuthResponse: AuthResponse = {
  access_token: 'token',
  refresh_token: 'refresh',
  user: {
    id: 1,
    email: 'test@example.com',
    name: 'Test',
    university: 'DHQG-HCM',
    is_verified: false,
    rating: 0,
    total_tasks_completed: 0,
    total_tasks_posted: 0,
    total_earnings: 0,
    is_tasker: false,
    auth_provider: 'email',
    email_verified: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
};

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authSpy: {
    login: ReturnType<typeof vi.fn>;
    getAccessToken: ReturnType<typeof vi.fn>;
    currentUser: ReturnType<typeof vi.fn>;
  };
  let router: Router;

  beforeEach(async () => {
    authSpy = {
      login: vi.fn(),
      getAccessToken: vi.fn().mockReturnValue(null),
      currentUser: vi.fn().mockReturnValue(null),
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'login', component: DummyComponent },
          { path: 'register', component: DummyComponent },
          { path: '', component: DummyComponent },
        ]),
        provideAnimationsAsync(),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: AuthService, useValue: authSpy },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render login form', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h2')?.textContent).toContain('Sign In');
    expect(compiled.querySelectorAll('mat-form-field').length).toBe(2);
  });

  it('should show error when fields are empty', () => {
    component.email = '';
    component.password = '';
    component.onLogin();

    expect(component.error()).toBe('Please fill in all fields');
    expect(authSpy.login).not.toHaveBeenCalled();
  });

  it('should call authService.login with credentials', () => {
    authSpy.login.mockReturnValue(of(mockAuthResponse));

    component.email = 'test@example.com';
    component.password = 'Password123';
    component.onLogin();

    expect(authSpy.login).toHaveBeenCalledWith('test@example.com', 'Password123');
  });

  it('should navigate to / on successful login', () => {
    authSpy.login.mockReturnValue(of(mockAuthResponse));

    component.email = 'test@example.com';
    component.password = 'Password123';
    component.onLogin();

    expect(router.navigate).toHaveBeenCalledWith(['/']);
    expect(component.loading()).toBe(false);
  });

  it('should show error on login failure', () => {
    authSpy.login.mockReturnValue(
      throwError(() => ({ error: { error: 'Invalid email or password' } })),
    );

    component.email = 'test@example.com';
    component.password = 'wrong';
    component.onLogin();

    expect(component.error()).toBe('Invalid email or password');
    expect(component.loading()).toBe(false);
  });

  it('should show generic error when no error details', () => {
    authSpy.login.mockReturnValue(throwError(() => ({ error: {} })));

    component.email = 'test@example.com';
    component.password = 'wrong';
    component.onLogin();

    expect(component.error()).toBe('Login failed');
  });

  it('should set loading state during login', () => {
    authSpy.login.mockReturnValue(of(mockAuthResponse));

    component.email = 'test@example.com';
    component.password = 'Password123';

    expect(component.loading()).toBe(false);
    component.onLogin();
    expect(component.loading()).toBe(false);
  });

  it('should toggle password visibility', () => {
    expect(component.showPassword()).toBe(false);
    component.showPassword.set(true);
    expect(component.showPassword()).toBe(true);
  });

  it('should have a link to register page', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const links = compiled.querySelectorAll('a');
    const registerLink = Array.from(links).find((l) => l.textContent?.includes('Register'));
    expect(registerLink).toBeTruthy();
  });
});
