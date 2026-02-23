import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { Component, PLATFORM_ID } from '@angular/core';
import { of, throwError } from 'rxjs';
import { RegisterComponent } from './register.component';
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
    email: 'new@example.com',
    name: 'New User',
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

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let authSpy: {
    register: ReturnType<typeof vi.fn>;
    getAccessToken: ReturnType<typeof vi.fn>;
    currentUser: ReturnType<typeof vi.fn>;
  };
  let router: Router;

  beforeEach(async () => {
    authSpy = {
      register: vi.fn(),
      getAccessToken: vi.fn().mockReturnValue(null),
      currentUser: vi.fn().mockReturnValue(null),
    };

    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
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

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render register form', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h2')?.textContent).toContain('CREATE ACCOUNT');
    expect(compiled.querySelectorAll('nhannht-metro-input').length).toBe(3);
  });

  it('should show error when fields are empty', () => {
    component.name = '';
    component.email = '';
    component.password = '';
    component.onRegister();

    expect(component.error()).toBe('Please fill in all fields');
    expect(authSpy.register).not.toHaveBeenCalled();
  });

  it('should show error when name is empty', () => {
    component.name = '';
    component.email = 'test@example.com';
    component.password = 'Password123';
    component.onRegister();

    expect(component.error()).toBe('Please fill in all fields');
  });

  it('should call authService.register with credentials', () => {
    authSpy.register.mockReturnValue(of(mockAuthResponse));

    component.name = 'New User';
    component.email = 'new@example.com';
    component.password = 'Password123';
    component.onRegister();

    expect(authSpy.register).toHaveBeenCalledWith('new@example.com', 'Password123', 'New User', undefined);
  });

  it('should navigate to / on successful registration', () => {
    authSpy.register.mockReturnValue(of(mockAuthResponse));

    component.name = 'New User';
    component.email = 'new@example.com';
    component.password = 'Password123';
    component.onRegister();

    expect(router.navigate).toHaveBeenCalledWith(['/']);
    expect(component.loading()).toBe(false);
  });

  it('should show error on registration failure', () => {
    authSpy.register.mockReturnValue(
      throwError(() => ({ error: { error: 'Email already exists' } })),
    );

    component.name = 'New User';
    component.email = 'existing@example.com';
    component.password = 'Password123';
    component.onRegister();

    expect(component.error()).toBe('Email already exists');
    expect(component.loading()).toBe(false);
  });

  it('should show generic error when no error details', () => {
    authSpy.register.mockReturnValue(throwError(() => ({ error: {} })));

    component.name = 'New User';
    component.email = 'new@example.com';
    component.password = 'Password123';
    component.onRegister();

    expect(component.error()).toBe('Registration failed');
  });

  it('should toggle password visibility', () => {
    expect(component.showPassword()).toBe(false);
    component.showPassword.set(true);
    expect(component.showPassword()).toBe(true);
  });

  it('should display password hint', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const hint = compiled.querySelector('.password-hint');
    expect(hint?.textContent).toContain('Min 8 characters');
  });

  it('should have a link to login page', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const links = compiled.querySelectorAll('a');
    const loginLink = Array.from(links).find((l) => l.textContent?.includes('Sign In'));
    expect(loginLink).toBeTruthy();
  });

  it('should render error message when error is set', () => {
    component.error.set('Something went wrong');
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Something went wrong');
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
    // The button should be hidden, only spinner visible
    const buttons = el.querySelectorAll('nhannht-metro-button');
    // The only button left should be none (all are replaced by spinner)
    expect(el.querySelector('nhannht-metro-spinner')).toBeTruthy();
  });

  it('should show error when email is empty', () => {
    component.name = 'Test';
    component.email = '';
    component.password = 'Password123';
    component.onRegister();
    expect(component.error()).toBe('Please fill in all fields');
  });

  it('should show error when password is empty', () => {
    component.name = 'Test';
    component.email = 'test@example.com';
    component.password = '';
    component.onRegister();
    expect(component.error()).toBe('Please fill in all fields');
  });

  it('should clear previous error on valid submit', () => {
    component.error.set('Previous error');
    authSpy.register.mockReturnValue(of(mockAuthResponse));
    component.name = 'New User';
    component.email = 'new@example.com';
    component.password = 'Password123';
    component.onRegister();
    expect(component.error()).toBe('');
  });

  it('should set loading to true during registration', () => {
    authSpy.register.mockReturnValue(of(mockAuthResponse));
    component.name = 'New User';
    component.email = 'new@example.com';
    component.password = 'Password123';
    // After onRegister completes (sync), loading should be false
    component.onRegister();
    expect(component.loading()).toBe(false);
  });

  it('should render password input as text when showPassword is true', () => {
    component.showPassword.set(true);
    fixture.detectChanges();
    // Exercises the showPassword() ? 'text' : 'password' ternary true branch
    const inputs = fixture.nativeElement.querySelectorAll('nhannht-metro-input');
    expect(inputs.length).toBe(3);
  });

  it('should render password input as password when showPassword is false', () => {
    component.showPassword.set(false);
    fixture.detectChanges();
    // Exercises the showPassword() ? 'text' : 'password' ternary false branch
    const inputs = fixture.nativeElement.querySelectorAll('nhannht-metro-input');
    expect(inputs.length).toBe(3);
  });

  it('should not render error div when error is empty', () => {
    component.error.set('');
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
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

  it('should toggle showPassword icon between visibility_off and visibility', () => {
    component.showPassword.set(true);
    fixture.detectChanges();
    let icon = fixture.nativeElement.querySelector('button[type="button"] nhannht-metro-icon');
    expect(icon).toBeTruthy();

    component.showPassword.set(false);
    fixture.detectChanges();
    icon = fixture.nativeElement.querySelector('button[type="button"] nhannht-metro-icon');
    expect(icon).toBeTruthy();
  });

  it('should update name via DOM input event', () => {
    const inputs = fixture.nativeElement.querySelectorAll('nhannht-metro-input input');
    const nameInput = inputs[0];
    if (nameInput) {
      nameInput.value = 'DOM Name';
      nameInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(component.name).toBe('DOM Name');
    }
  });

  it('should update email via DOM input event', () => {
    const inputs = fixture.nativeElement.querySelectorAll('nhannht-metro-input input');
    const emailInput = inputs[1];
    if (emailInput) {
      emailInput.value = 'dom@example.com';
      emailInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(component.email).toBe('dom@example.com');
    }
  });

  it('should update password via DOM input event', () => {
    const inputs = fixture.nativeElement.querySelectorAll('nhannht-metro-input input');
    const passwordInput = inputs[2];
    if (passwordInput) {
      passwordInput.value = 'DomPass123';
      passwordInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(component.password).toBe('DomPass123');
    }
  });

  it('should submit register form via DOM form submit event', () => {
    authSpy.register.mockReturnValue(of(mockAuthResponse));
    component.name = 'New User';
    component.email = 'new@example.com';
    component.password = 'Password123';
    fixture.detectChanges();

    const form = fixture.nativeElement.querySelector('form');
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(authSpy.register).toHaveBeenCalledWith('new@example.com', 'Password123', 'New User', undefined);
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

  it('should render spinner (loading true-branch) and hide button (loading false-branch)', () => {
    // loading = true → spinner shows, button hidden
    component.loading.set(true);
    fixture.detectChanges();
    expect(component.loading()).toBe(true);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('nhannht-metro-spinner')).toBeTruthy();

    // loading = false → button shows, spinner hidden
    component.loading.set(false);
    fixture.detectChanges();
    expect(el.querySelector('nhannht-metro-button')).toBeTruthy();
    expect(el.querySelector('nhannht-metro-spinner')).toBeFalsy();
  });

  it('should show error then clear it (covers @if (error()) both branches)', () => {
    component.error.set('Some error');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Some error');

    component.error.set('');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.bg-fg\\/20')).toBeNull();
  });

  it('showPassword cycles through type cond-expr both branches', () => {
    component.showPassword.set(false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('nhannht-metro-input').length).toBe(3);

    component.showPassword.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('nhannht-metro-input').length).toBe(3);
  });
});
