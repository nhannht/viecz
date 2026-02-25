import { Component, inject, signal, AfterViewInit, OnDestroy, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { NhannhtMetroInputComponent } from '../shared/components/nhannht-metro-input.component';
import { NhannhtMetroButtonComponent } from '../shared/components/nhannht-metro-button.component';
import { NhannhtMetroIconComponent } from '../shared/components/nhannht-metro-icon.component';
import { NhannhtMetroSpinnerComponent } from '../shared/components/nhannht-metro-spinner.component';
import { AuthService } from '../core/auth.service';
import { environment } from '../environments/environment';

declare const turnstile: {
  render: (container: string | HTMLElement, options: {
    sitekey: string;
    callback: (token: string) => void;
    'error-callback'?: (error: string) => void;
    'expired-callback'?: () => void;
    size?: string;
  }) => string;
  remove: (widgetId: string) => void;
  reset: (widgetId: string) => void;
};

@Component({
  selector: 'app-register',
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

          <h2 class="font-display text-[13px] text-fg text-center tracking-[2px] mb-1">{{ t('auth.register.title') }}</h2>
          <p class="font-body text-[13px] text-muted text-center mb-6">{{ t('auth.register.subtitle') }}</p>

          @if (error()) {
            <div class="bg-fg/20 text-fg font-body text-[13px] px-4 py-3 border border-fg mb-4">
              {{ error() }}
            </div>
          }

          <form (ngSubmit)="onRegister()" class="flex flex-col gap-4">
            <nhannht-metro-input
              [label]="t('auth.register.nameLabel')"
              type="text"
              [placeholder]="t('auth.register.namePlaceholder')"
              [(ngModel)]="name"
              name="name"
            />

            <nhannht-metro-input
              [label]="t('auth.register.emailLabel')"
              type="email"
              [placeholder]="t('auth.register.emailPlaceholder')"
              [(ngModel)]="email"
              name="email"
            />

            <div>
              <div class="relative">
                <nhannht-metro-input
                  [label]="t('auth.register.passwordLabel')"
                  [type]="showPassword() ? 'text' : 'password'"
                  [placeholder]="t('auth.register.passwordPlaceholder')"
                  [(ngModel)]="password"
                  name="password"
                />
                <button type="button"
                        class="absolute right-3 bottom-2 bg-transparent border-none cursor-pointer text-muted hover:text-fg transition-colors"
                        (click)="showPassword.set(!showPassword())">
                  <nhannht-metro-icon [name]="showPassword() ? 'visibility_off' : 'visibility'" [size]="20" />
                </button>
              </div>
              <p class="password-hint font-body text-[11px] text-muted mt-1">
                {{ t('auth.register.passwordHint') }}
              </p>
            </div>

            <!-- Turnstile invisible widget container -->
            <div id="turnstile-container"></div>

            <div class="mt-2">
              @if (loading()) {
                <div class="flex justify-center py-3">
                  <nhannht-metro-spinner size="sm" />
                </div>
              } @else {
                <nhannht-metro-button
                  variant="primary"
                  [label]="t('auth.register.createButton')"
                  type="submit"
                  [fullWidth]="true"
                  [disabled]="loading()"
                />
              }
            </div>
          </form>

          <p class="font-body text-[13px] text-muted text-center mt-6">
            {{ t('auth.register.hasAccount') }}
            <a routerLink="/login" class="text-fg font-bold hover:text-muted transition-colors">{{ t('auth.register.signInLink') }}</a>
          </p>
        </div>
      </div>
    </ng-container>
  `,
})
export class RegisterComponent implements AfterViewInit, OnDestroy {
  private auth = inject(AuthService);
  private router = inject(Router);
  private transloco = inject(TranslocoService);
  private platformId = inject(PLATFORM_ID);

  name = '';
  email = '';
  password = '';
  loading = signal(false);
  error = signal('');
  showPassword = signal(false);
  turnstileToken = signal('');

  private widgetId: string | null = null;

  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    if (!environment.turnstileSiteKey) return;

    this.loadTurnstileScript();
  }

  ngOnDestroy() {
    if (this.widgetId && typeof turnstile !== 'undefined') {
      turnstile.remove(this.widgetId);
    }
  }

  onRegister() {
    if (!this.name || !this.email || !this.password) {
      this.error.set(this.transloco.translate('auth.register.fillAllFields'));
      return;
    }
    this.loading.set(true);
    this.error.set('');

    const token = this.turnstileToken() || undefined;
    this.auth.register(this.email, this.password, this.name, token).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/']);
      },
      error: err => {
        this.loading.set(false);
        this.error.set(err.error?.error || this.transloco.translate('auth.register.registerFailed'));
        // Reset Turnstile for retry
        if (this.widgetId && typeof turnstile !== 'undefined') {
          turnstile.reset(this.widgetId);
          this.turnstileToken.set('');
        }
      },
    });
  }

  private loadTurnstileScript() {
    // Avoid loading twice
    if (document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]')) {
      this.renderWidget();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.defer = true;
    script.onload = () => this.renderWidget();
    document.head.appendChild(script);
  }

  private renderWidget() {
    if (typeof turnstile === 'undefined') return;

    const container = document.getElementById('turnstile-container');
    if (!container) return;

    this.widgetId = turnstile.render(container, {
      sitekey: environment.turnstileSiteKey,
      callback: (token: string) => {
        this.turnstileToken.set(token);
      },
      'error-callback': () => {
        this.turnstileToken.set('');
      },
      'expired-callback': () => {
        this.turnstileToken.set('');
      },
      size: 'invisible',
    });
  }
}
