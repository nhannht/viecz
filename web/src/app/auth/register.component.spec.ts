import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Component, PLATFORM_ID } from '@angular/core';
import { of, throwError } from 'rxjs';
import { RegisterComponent } from './register.component';
import { AuthService } from '../core/auth.service';
import { AuthResponse } from '../core/models';

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
        provideAnimationsAsync(),
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
    expect(compiled.querySelector('h2')?.textContent).toContain('Create Account');
    expect(compiled.querySelectorAll('mat-form-field').length).toBe(3);
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

    expect(authSpy.register).toHaveBeenCalledWith('new@example.com', 'Password123', 'New User');
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
});
