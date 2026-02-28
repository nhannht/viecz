import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import * as Sentry from '@sentry/angular';
import { Observable, tap } from 'rxjs';
import { User, AuthResponse } from './models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  currentUser = signal<User | null>(null);
  isAuthenticated = computed(() => !!this.currentUser());
  needsEmailVerification = computed(() => {
    const user = this.currentUser();
    return user !== null && user.auth_provider === 'email' && !user.email_verified;
  });

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const stored = localStorage.getItem('viecz_user');
      if (stored) {
        try {
          this.currentUser.set(JSON.parse(stored));
        } catch { /* ignore */ }
      }
    }
  }

  login(email: string, password: string) {
    return this.http
      .post<AuthResponse>('/api/v1/auth/login', { email, password })
      .pipe(tap(res => this.storeAuth(res)));
  }

  register(email: string, password: string, name: string, turnstileToken?: string) {
    const body: Record<string, string> = { email, password, name };
    if (turnstileToken) {
      body['turnstile_token'] = turnstileToken;
    }
    return this.http
      .post<AuthResponse>('/api/v1/auth/register', body)
      .pipe(tap(res => this.storeAuth(res)));
  }

  refresh() {
    const token = this.getRefreshToken();
    return this.http
      .post<{ access_token: string }>('/api/v1/auth/refresh', { refresh_token: token })
      .pipe(
        tap(res => {
          if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem('viecz_access_token', res.access_token);
          }
        }),
      );
  }

  logout() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('viecz_access_token');
      localStorage.removeItem('viecz_refresh_token');
      localStorage.removeItem('viecz_user');
    }
    this.currentUser.set(null);
    Sentry.setUser(null);
    this.router.navigate(['/phone']);
  }

  getAccessToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    return localStorage.getItem('viecz_access_token');
  }

  getRefreshToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    return localStorage.getItem('viecz_refresh_token');
  }

  verifyEmail(token: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>('/api/v1/auth/verify-email', { token }).pipe(
      tap(() => {
        const user = this.currentUser();
        if (user) {
          const updated = { ...user, email_verified: true };
          this.currentUser.set(updated);
          if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem('viecz_user', JSON.stringify(updated));
          }
        }
      }),
    );
  }

  resendVerification(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>('/api/v1/auth/resend-verification', {});
  }

  phoneLogin(idToken: string) {
    return this.http
      .post<AuthResponse>('/api/v1/auth/phone', { id_token: idToken })
      .pipe(tap(res => this.storeAuth(res)));
  }

  verifyPhone(idToken: string): Observable<{ phone: string; phone_verified: boolean }> {
    return this.http.post<{ phone: string; phone_verified: boolean }>('/api/v1/auth/verify-phone', { id_token: idToken }).pipe(
      tap(res => {
        const user = this.currentUser();
        if (user) {
          const updated = { ...user, phone: res.phone, phone_verified: true };
          this.currentUser.set(updated);
          if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem('viecz_user', JSON.stringify(updated));
          }
        }
      }),
    );
  }

  needsPhoneVerification = computed(() => {
    const user = this.currentUser();
    return user !== null && !user.phone_verified;
  });

  private storeAuth(res: AuthResponse) {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('viecz_access_token', res.access_token);
      localStorage.setItem('viecz_refresh_token', res.refresh_token);
      localStorage.setItem('viecz_user', JSON.stringify(res.user));
    }
    this.currentUser.set(res.user);
    Sentry.setUser({ id: res.user.id.toString(), email: res.user.email });
  }
}
