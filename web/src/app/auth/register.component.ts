import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    MatCard,
    MatCardContent,
    MatCardHeader,
    MatCardTitle,
    MatFormField,
    MatLabel,
    MatInput,
    MatButton,
    MatIcon,
    MatProgressSpinner,
  ],
  template: `
    <div class="auth-container">
      <mat-card class="auth-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon class="auth-logo">work</mat-icon>
            <span>Viecz</span>
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <h2>Create Account</h2>
          @if (error()) {
            <div class="error-banner">{{ error() }}</div>
          }
          <form (ngSubmit)="onRegister()" class="auth-form">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Full Name</mat-label>
              <input matInput type="text" [(ngModel)]="name" name="name"
                     required autocomplete="name">
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email</mat-label>
              <input matInput type="email" [(ngModel)]="email" name="email"
                     required autocomplete="email">
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Password</mat-label>
              <input matInput [type]="showPassword() ? 'text' : 'password'"
                     [(ngModel)]="password" name="password" required
                     autocomplete="new-password">
              <button matSuffix mat-icon-button type="button"
                      (click)="showPassword.set(!showPassword())">
                <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </mat-form-field>
            <div class="password-hint">
              Min 8 characters, 1 uppercase, 1 lowercase, 1 digit
            </div>
            <button mat-raised-button class="full-width submit-btn"
                    type="submit" [disabled]="loading()">
              @if (loading()) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                Create Account
              }
            </button>
          </form>
          <p class="auth-link">
            Already have an account? <a routerLink="/login">Sign In</a>
          </p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: `
    .auth-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: var(--mat-sys-surface-container-low);
      padding: 16px;
    }
    .auth-card { width: 100%; max-width: 420px; padding: 24px; }
    mat-card-header { justify-content: center; margin-bottom: 8px; }
    mat-card-title {
      display: flex; align-items: center; gap: 8px;
      font-size: 1.5rem; font-weight: 700;
    }
    .auth-logo { color: var(--mat-sys-primary); font-size: 2rem; width: 2rem; height: 2rem; }
    h2 { text-align: center; margin: 16px 0; }
    .auth-form { display: flex; flex-direction: column; gap: 4px; }
    .full-width { width: 100%; }
    .submit-btn {
      height: 48px; font-size: 1rem; margin-top: 8px;
      --mdc-filled-button-container-color: var(--mat-sys-primary);
      --mdc-filled-button-label-text-color: var(--mat-sys-on-primary);
    }
    .password-hint {
      font-size: 0.75rem;
      color: var(--mat-sys-on-surface-variant);
      margin: -8px 0 8px 4px;
    }
    .error-banner {
      background: var(--mat-sys-error-container);
      color: var(--mat-sys-on-error-container);
      padding: 12px; border-radius: 8px; margin-bottom: 16px; font-size: 0.875rem;
    }
    .auth-link { text-align: center; margin-top: 16px; color: var(--mat-sys-on-surface-variant); }
    .auth-link a { color: var(--mat-sys-primary); text-decoration: none; font-weight: 500; }
    mat-spinner { margin: 0 auto; }
  `,
})
export class RegisterComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  name = '';
  email = '';
  password = '';
  loading = signal(false);
  error = signal('');
  showPassword = signal(false);

  onRegister() {
    if (!this.name || !this.email || !this.password) {
      this.error.set('Please fill in all fields');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.auth.register(this.email, this.password, this.name).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/']);
      },
      error: err => {
        this.loading.set(false);
        this.error.set(err.error?.error || 'Registration failed');
      },
    });
  }
}
