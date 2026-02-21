import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NhannhtMetroInputComponent } from '../shared/components/nhannht-metro-input.component';
import { NhannhtMetroButtonComponent } from '../shared/components/nhannht-metro-button.component';
import { NhannhtMetroIconComponent } from '../shared/components/nhannht-metro-icon.component';
import { NhannhtMetroSpinnerComponent } from '../shared/components/nhannht-metro-spinner.component';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    NhannhtMetroInputComponent,
    NhannhtMetroButtonComponent,
    NhannhtMetroIconComponent,
    NhannhtMetroSpinnerComponent,
  ],
  template: `
    <div class="flex justify-center items-center min-h-screen bg-bg px-4">
      <div class="w-full max-w-[420px] bg-card border border-border p-8">
        <div class="flex items-center justify-center gap-2 mb-2">
          <nhannht-metro-icon name="work" [size]="28" />
          <span class="font-display text-[16px] text-fg tracking-[2px]">Viecz</span>
        </div>

        <h2 class="font-display text-[13px] text-fg text-center tracking-[2px] mb-1">SIGN IN</h2>
        <p class="font-body text-[13px] text-muted text-center mb-6">Sign in to your account</p>

        @if (error()) {
          <div class="bg-fg/20 text-fg font-body text-[13px] px-4 py-3 border border-fg mb-4">
            {{ error() }}
          </div>
        }

        <form (ngSubmit)="onLogin()" class="flex flex-col gap-4">
          <nhannht-metro-input
            label="EMAIL"
            type="email"
            placeholder="you@example.com"
            [(ngModel)]="email"
            name="email"
          />

          <div class="relative">
            <nhannht-metro-input
              label="PASSWORD"
              [type]="showPassword() ? 'text' : 'password'"
              placeholder="Enter password"
              [(ngModel)]="password"
              name="password"
            />
            <button type="button"
                    class="absolute right-3 bottom-2 bg-transparent border-none cursor-pointer text-muted hover:text-fg transition-colors"
                    (click)="showPassword.set(!showPassword())">
              <nhannht-metro-icon [name]="showPassword() ? 'visibility_off' : 'visibility'" [size]="20" />
            </button>
          </div>

          <div class="mt-2">
            @if (loading()) {
              <div class="flex justify-center py-3">
                <nhannht-metro-spinner [size]="20" />
              </div>
            } @else {
              <nhannht-metro-button
                variant="primary"
                label="Sign In"
                type="submit"
                [fullWidth]="true"
                [disabled]="loading()"
              />
            }
          </div>
        </form>

        <p class="font-body text-[13px] text-muted text-center mt-6">
          Don't have an account?
          <a routerLink="/register" class="text-fg font-bold hover:text-muted transition-colors">Register</a>
        </p>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  loading = signal(false);
  error = signal('');
  showPassword = signal(false);

  onLogin() {
    if (!this.email || !this.password) {
      this.error.set('Please fill in all fields');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.auth.login(this.email, this.password).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/']);
      },
      error: err => {
        this.loading.set(false);
        this.error.set(err.error?.error || 'Login failed');
      },
    });
  }
}
