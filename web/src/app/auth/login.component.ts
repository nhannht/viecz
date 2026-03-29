import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { NhannhtMetroInputComponent } from '../shared/components/nhannht-metro-input.component';
import { NhannhtMetroButtonComponent } from '../shared/components/nhannht-metro-button.component';
import { NhannhtMetroIconComponent } from '../shared/components/nhannht-metro-icon.component';
import { NhannhtMetroSpinnerComponent } from '../shared/components/nhannht-metro-spinner.component';
import { AuthService } from '../core/auth.service';
import { DevModeBannerComponent } from '../shared/components/dev-mode-banner.component';

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
    DevModeBannerComponent,
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
            <div class="bg-red-50 text-red-700 font-body text-[13px] px-4 py-3 border border-red-300 rounded mb-4">
              ⚠ {{ error() }}
            </div>
          }

          @if (!codeSent()) {
            <!-- Step 1: Email input -->
            <form (ngSubmit)="onRequestOTP()" class="flex flex-col gap-4">
              <nhannht-metro-input
                [label]="t('auth.login.emailLabel')"
                type="email"
                [placeholder]="t('auth.login.emailPlaceholder')"
                [(ngModel)]="email"
                name="email"
              />

              <div class="mt-2">
                @if (loading()) {
                  <div class="flex justify-center py-3">
                    <nhannht-metro-spinner size="sm" />
                  </div>
                } @else {
                  <nhannht-metro-button
                    variant="primary"
                    [label]="t('auth.login.continue')"
                    type="submit"
                    [fullWidth]="true"
                    [disabled]="loading()"
                  />
                }
              </div>
            </form>
          } @else {
            <!-- Step 2: OTP verification + optional name -->
            <p class="font-body text-[13px] text-fg text-center mb-4">
              {{ t('auth.login.codeSentTo', { email: email }) }}
            </p>

            @if (devCode()) {
              <app-dev-mode-banner>
                DEV MODE — code: <strong style="font-size:18px;letter-spacing:4px">{{ devCode() }}</strong>
              </app-dev-mode-banner>
            }

            <form (ngSubmit)="onVerifyOTP()" class="flex flex-col gap-4">
              @if (isNewUser()) {
                <nhannht-metro-input
                  [label]="t('auth.login.nameLabel')"
                  type="text"
                  [placeholder]="t('auth.login.namePlaceholder')"
                  [(ngModel)]="name"
                  name="name"
                />
              }

              <nhannht-metro-input
                [label]="t('auth.login.codeLabel')"
                type="text"
                [placeholder]="t('auth.login.codePlaceholder')"
                [(ngModel)]="code"
                name="code"
              />

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

              <p class="font-body text-[13px] text-muted text-center">
                <button type="button"
                        class="bg-transparent border-none cursor-pointer text-fg font-bold hover:text-muted transition-colors font-body text-[13px] p-0"
                        (click)="onResendCode()">
                  {{ t('auth.login.resendCode') }}
                </button>
              </p>
            </form>
          }

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
  code = '';
  name = '';
  loading = signal(false);
  error = signal('');
  codeSent = signal(false);
  isNewUser = signal(false);
  devCode = signal('');

  onRequestOTP() {
    if (!this.email.trim()) {
      this.error.set(this.transloco.translate('auth.login.enterEmail'));
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.auth.requestOTP(this.email).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.isNewUser.set(res.is_new_user);
        this.devCode.set(res.code || '');
        this.codeSent.set(true);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.error || this.transloco.translate('auth.login.otpFailed'));
      },
    });
  }

  onVerifyOTP() {
    if (!this.code.trim()) {
      this.error.set(this.transloco.translate('auth.login.enterCode'));
      return;
    }
    if (this.isNewUser() && !this.name.trim()) {
      this.error.set(this.transloco.translate('auth.login.enterName'));
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.auth.verifyOTP(this.email, this.code.trim(), this.isNewUser() ? this.name.trim() : undefined).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/marketplace']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.error || this.transloco.translate('auth.login.verifyFailed'));
      },
    });
  }

  onResendCode() {
    this.codeSent.set(false);
    this.code = '';
    this.error.set('');
    this.onRequestOTP();
  }
}
