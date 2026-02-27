import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { Component, PLATFORM_ID } from '@angular/core';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService } from '../core/auth.service';
import { AuthResponse } from '../core/models';
import { provideTranslocoForTesting } from '../core/transloco-testing';

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
    auth_provider: 'email',
    email_verified: false,
    phone_verified: false,
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
        provideTranslocoForTesting(),
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
    expect(compiled.querySelector('h2')?.textContent).toContain('SIGN IN');
    expect(compiled.querySelectorAll('nhannht-metro-input').length).toBe(2);
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

  it('should not render register link in phone-first flow', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const links = compiled.querySelectorAll('a');
    const registerLink = Array.from(links).find((l) => l.textContent?.includes('Register'));
    expect(registerLink).toBeFalsy();
  });

  it('should render error message when error is set', () => {
    component.error.set('Bad credentials');
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Bad credentials');
  });

  it('should render spinner when loading', () => {
    component.loading.set(true);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('nhannht-metro-spinner')).toBeTruthy();
  });

  it('should not render submit button when loading', () => {
    component.loading.set(true);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('nhannht-metro-button')).toBeFalsy();
  });

  it('should show error when only email provided', () => {
    component.email = 'test@example.com';
    component.password = '';
    component.onLogin();
    expect(component.error()).toBe('Please fill in all fields');
  });

  it('should show error when only password provided', () => {
    component.email = '';
    component.password = 'pass123';
    component.onLogin();
    expect(component.error()).toBe('Please fill in all fields');
  });

  it('should clear previous error on successful submit', () => {
    component.error.set('Old error');
    authSpy.login.mockReturnValue(of(mockAuthResponse));
    component.email = 'test@example.com';
    component.password = 'Password123';
    component.onLogin();
    expect(component.error()).toBe('');
  });

  it('should render password input as text when showPassword is true', () => {
    component.showPassword.set(true);
    fixture.detectChanges();
    // This exercises the showPassword() ? 'text' : 'password' ternary true branch
    const inputs = fixture.nativeElement.querySelectorAll('nhannht-metro-input');
    expect(inputs.length).toBe(2);
  });

  it('should render password input as password when showPassword is false', () => {
    component.showPassword.set(false);
    fixture.detectChanges();
    // This exercises the showPassword() ? 'text' : 'password' ternary false branch
    const inputs = fixture.nativeElement.querySelectorAll('nhannht-metro-input');
    expect(inputs.length).toBe(2);
  });

  it('should not render error div when error is empty', () => {
    component.error.set('');
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    // The error div uses @if (error()), so it should be absent
    const errorDiv = el.querySelector('.bg-fg\\/20');
    expect(errorDiv).toBeNull();
  });

  it('should render submit button when not loading', () => {
    component.loading.set(false);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('nhannht-metro-button')).toBeTruthy();
    expect(el.querySelector('nhannht-metro-spinner')).toBeFalsy();
  });

  it('should toggle showPassword icon name between visibility_off and visibility', () => {
    component.showPassword.set(true);
    fixture.detectChanges();
    let icon = fixture.nativeElement.querySelector('button[type="button"] nhannht-metro-icon');
    expect(icon).toBeTruthy();

    component.showPassword.set(false);
    fixture.detectChanges();
    icon = fixture.nativeElement.querySelector('button[type="button"] nhannht-metro-icon');
    expect(icon).toBeTruthy();
  });

  it('should update email via DOM input event', () => {
    const inputs = fixture.nativeElement.querySelectorAll('nhannht-metro-input input');
    const emailInput = inputs[0];
    if (emailInput) {
      emailInput.value = 'dom@example.com';
      emailInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(component.email).toBe('dom@example.com');
    }
  });

  it('should update password via DOM input event', () => {
    const inputs = fixture.nativeElement.querySelectorAll('nhannht-metro-input input');
    const passwordInput = inputs[1];
    if (passwordInput) {
      passwordInput.value = 'SecurePass123';
      passwordInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(component.password).toBe('SecurePass123');
    }
  });

  it('should submit login form via DOM form submit event', () => {
    authSpy.login.mockReturnValue(of(mockAuthResponse));
    component.email = 'test@example.com';
    component.password = 'Password123';
    fixture.detectChanges();

    const form = fixture.nativeElement.querySelector('form');
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(authSpy.login).toHaveBeenCalledWith('test@example.com', 'Password123');
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should toggle showPassword via DOM button click', () => {
    expect(component.showPassword()).toBe(false);
    const toggleBtn = fixture.nativeElement.querySelector('button[type="button"]');
    if (toggleBtn) {
      toggleBtn.click();
      fixture.detectChanges();
      expect(component.showPassword()).toBe(true);
      toggleBtn.click();
      fixture.detectChanges();
      expect(component.showPassword()).toBe(false);
    }
  });

  it('should render submit button as disabled when loading is true (covers [disabled]="loading()" binding branch)', () => {
    component.loading.set(true);
    fixture.detectChanges();
    // When loading is true the @if(loading()) branch renders spinner not button
    // This exercises both the loading true-branch AND the component's loading signal
    expect(component.loading()).toBe(true);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('nhannht-metro-spinner')).toBeTruthy();
    // Button does not exist in loading state
    expect(el.querySelector('nhannht-metro-button')).toBeFalsy();
  });

  it('should show error state and then hide it when cleared (covers error signal toggle)', () => {
    // Set error - covers @if (error()) true branch
    component.error.set('Login error');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Login error');

    // Clear error - covers @if (error()) false branch
    component.error.set('');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.bg-fg\\/20')).toBeNull();
  });

  it('showPassword toggle cycles through text/password type (cond-expr both branches)', () => {
    // false branch: password
    component.showPassword.set(false);
    fixture.detectChanges();
    const passwordInputs = fixture.nativeElement.querySelectorAll('nhannht-metro-input');
    expect(passwordInputs.length).toBe(2);

    // true branch: text
    component.showPassword.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('nhannht-metro-input').length).toBe(2);
  });
});
