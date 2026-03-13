import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { NhannhtMetroInputComponent } from '../shared/components/nhannht-metro-input.component';
import { NhannhtMetroButtonComponent } from '../shared/components/nhannht-metro-button.component';
import { NhannhtMetroIconComponent } from '../shared/components/nhannht-metro-icon.component';
import { NhannhtMetroSpinnerComponent } from '../shared/components/nhannht-metro-spinner.component';
import { AuthService } from '../core/auth.service';
import { FirebasePhoneAuthService } from '../core/firebase.service';
import google_libphonenumber from 'google-libphonenumber';

@Component({
  selector: 'app-phone-login',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
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

          <h2 class="font-display text-[13px] text-fg text-center tracking-[2px] mb-1">{{ t('auth.phone.title') }}</h2>
          <p class="font-body text-[13px] text-muted text-center mb-6">{{ t('auth.phone.subtitle') }}</p>

          @if (error()) {
            <div class="bg-fg/20 text-fg font-body text-[13px] px-4 py-3 border border-fg mb-4">
              {{ error() }}
            </div>
          }

          @if (!codeSent()) {
            <!-- Step 1: Phone number input -->
            <form (ngSubmit)="onSendCode()" class="flex flex-col gap-4">
              <nhannht-metro-input
                [label]="t('auth.phone.phoneLabel')"
                type="tel"
                [placeholder]="t('auth.phone.phonePlaceholder')"
                [(ngModel)]="phone"
                name="phone"
              />

              <div class="mt-2">
                @if (firebasePhone.sending()) {
                  <div class="flex justify-center py-3">
                    <nhannht-metro-spinner size="sm" [label]="t('auth.phone.sending')" />
                  </div>
                } @else {
                  <nhannht-metro-button
                    variant="primary"
                    [label]="t('auth.phone.continue')"
                    type="submit"
                    [fullWidth]="true"
                    [disabled]="firebasePhone.sending()"
                  />
                }
              </div>
            </form>
          } @else {
            <!-- Step 2: OTP verification -->
            <p class="font-body text-[13px] text-fg text-center mb-4">
              {{ t('auth.phone.codeSentTo', { phone: normalizedPhone() }) }}
            </p>

            <form (ngSubmit)="onVerifyCode()" class="flex flex-col gap-4">
              <nhannht-metro-input
                [label]="t('auth.phone.codeLabel')"
                type="text"
                [placeholder]="t('auth.phone.codePlaceholder')"
                [(ngModel)]="code"
                name="code"
              />

              <div class="mt-2">
                @if (firebasePhone.verifying() || loggingIn()) {
                  <div class="flex justify-center py-3">
                    <nhannht-metro-spinner size="sm" [label]="t('auth.phone.verifying')" />
                  </div>
                } @else {
                  <nhannht-metro-button
                    variant="primary"
                    [label]="t('auth.phone.verify')"
                    type="submit"
                    [fullWidth]="true"
                    [disabled]="firebasePhone.verifying() || loggingIn()"
                  />
                }
              </div>

              <p class="font-body text-[13px] text-muted text-center">
                <button type="button"
                        class="bg-transparent border-none cursor-pointer text-fg font-bold hover:text-muted transition-colors font-body text-[13px] p-0"
                        (click)="onResendCode()">
                  {{ t('auth.phone.resendCode') }}
                </button>
              </p>
            </form>
          }

          <div id="phone-login-recaptcha"></div>

          <p class="font-body text-[13px] text-muted text-center mt-6">
            <a routerLink="/login" class="text-fg font-bold hover:text-muted transition-colors">{{ t('auth.phone.signInWithEmail') }}</a>
          </p>
        </div>
      </div>
    </ng-container>
  `,
})
export class PhoneLoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private transloco = inject(TranslocoService);
  firebasePhone = inject(FirebasePhoneAuthService);

  phone = '';
  code = '';
  error = signal('');
  codeSent = signal(false);
  normalizedPhone = signal('');
  loggingIn = signal(false);

  private normalizePhone(raw: string): string | null {
    const phoneUtil = google_libphonenumber.PhoneNumberUtil.getInstance();
    try {
      const parsed = phoneUtil.parse(raw, 'VN');
      if (!phoneUtil.isValidNumber(parsed)) return null;
      return phoneUtil.format(parsed, google_libphonenumber.PhoneNumberFormat.E164);
    } catch {
      return null;
    }
  }

  async onSendCode() {
    const raw = this.phone.trim();
    if (!raw) return;

    const normalized = this.normalizePhone(raw);
    if (!normalized) {
      this.error.set(this.transloco.translate('auth.phone.invalidPhone'));
      return;
    }

    this.error.set('');
    this.normalizedPhone.set(normalized);

    try {
      await this.firebasePhone.sendVerificationCode(normalized, 'phone-login-recaptcha');
      this.codeSent.set(true);
    } catch (err: any) {
      this.error.set(err.message || this.transloco.translate('auth.phone.verificationFailed'));
    }
  }

  async onVerifyCode() {
    const trimmed = this.code.trim();
    if (!trimmed) return;

    this.error.set('');

    try {
      const idToken = await this.firebasePhone.confirmCode(trimmed);
      this.loggingIn.set(true);
      this.auth.phoneLogin(idToken).subscribe({
        next: () => {
          this.loggingIn.set(false);
          this.firebasePhone.reset();
          this.router.navigate(['/marketplace']);
        },
        error: (err) => {
          this.loggingIn.set(false);
          this.error.set(err.error?.error || this.transloco.translate('auth.phone.verificationFailed'));
        },
      });
    } catch (err: any) {
      this.error.set(err.message || this.transloco.translate('auth.phone.verificationFailed'));
    }
  }

  async onResendCode() {
    this.codeSent.set(false);
    this.code = '';
    this.error.set('');
    this.firebasePhone.reset();

    // Clear the reCAPTCHA container for the login page
    const container = document.getElementById('phone-login-recaptcha');
    if (container) container.innerHTML = '';

    // Re-send to the same normalized phone
    if (this.normalizedPhone()) {
      try {
        await this.firebasePhone.sendVerificationCode(this.normalizedPhone(), 'phone-login-recaptcha');
        this.codeSent.set(true);
      } catch (err: any) {
        this.error.set(err.message || this.transloco.translate('auth.phone.verificationFailed'));
      }
    }
  }
}
