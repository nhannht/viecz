import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
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
    TranslocoDirective,
    NhannhtMetroInputComponent,
    NhannhtMetroButtonComponent,
    NhannhtMetroIconComponent,
    NhannhtMetroSpinnerComponent,
  ],
  template: `
    <ng-container *transloco="let t">
      <div class="flex justify-center items-center min-h-screen bg-bg px-4">
        <div class="w-full max-w-[420px] bg-card border border-border p-8">
          <div class="flex items-center justify-center gap-2 mb-2">
            <nhannht-metro-icon name="work" [size]="28" />
            <span class="font-display text-[16px] text-fg tracking-[2px]">{{ t('common.viecz') }}</span>
          </div>

          <h2 class="font-display text-[13px] text-fg text-center tracking-[2px] mb-1">{{ t('auth.login.title') }}</h2>
          <p class="font-body text-[13px] text-muted text-center mb-6">{{ t('auth.login.subtitle') }}</p>

          @if (error()) {
            <div class="bg-fg/20 text-fg font-body text-[13px] px-4 py-3 border border-fg mb-4">
              {{ error() }}
            </div>
          }

          <form (ngSubmit)="onLogin()" class="flex flex-col gap-4">
            <nhannht-metro-input
              [label]="t('auth.login.emailLabel')"
              type="email"
              [placeholder]="t('auth.login.emailPlaceholder')"
              [(ngModel)]="email"
              name="email"
            />

            <div class="relative">
              <nhannht-metro-input
                [label]="t('auth.login.passwordLabel')"
                [type]="showPassword() ? 'text' : 'password'"
                [placeholder]="t('auth.login.passwordPlaceholder')"
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
                  <nhannht-metro-spinner size="sm" />
                </div>
              } @else {
                <nhannht-metro-button
                  variant="primary"
                  [label]="t('auth.login.signInButton')"
                  type="submit"
                  [fullWidth]="true"
                  [disabled]="loading()"
                />
              }
            </div>
          </form>
        </div>
      </div>
    </ng-container>
  `,
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private transloco = inject(TranslocoService);

  email = '';
  password = '';
  loading = signal(false);
  error = signal('');
  showPassword = signal(false);

  onLogin() {
    if (!this.email || !this.password) {
      this.error.set(this.transloco.translate('auth.login.fillAllFields'));
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.auth.login(this.email, this.password).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/marketplace']);
      },
      error: err => {
        this.loading.set(false);
        this.error.set(err.error?.error || this.transloco.translate('auth.login.loginFailed'));
      },
    });
  }
}
