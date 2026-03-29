import { Component, inject, OnInit, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { VieczCardComponent } from '../shared/components/viecz-card.component';
import { VieczButtonComponent } from '../shared/components/viecz-button.component';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-payment-return',
  standalone: true,
  imports: [RouterLink, TranslocoDirective, VieczCardComponent, VieczButtonComponent],
  template: `
    <ng-container *transloco="let t">
      <div class="flex justify-center py-16 px-4">
        <viecz-card class="max-w-md w-full">
          <div class="text-center">
            @if (state() === 'success') {
              <div class="text-4xl mb-4">&#10003;</div>
              <h2 class="font-display text-[13px] tracking-[2px] text-fg m-0 mb-2">{{ t('payment.successTitle') }}</h2>
              <p class="font-body text-[13px] text-muted mb-6">
                {{ t('payment.successMessage') }}
              </p>
            } @else if (state() === 'cancelled') {
              <div class="text-4xl mb-4">&#10005;</div>
              <h2 class="font-display text-[13px] tracking-[2px] text-fg m-0 mb-2">{{ t('payment.cancelledTitle') }}</h2>
              <p class="font-body text-[13px] text-muted mb-6">
                {{ t('payment.cancelledMessage') }}
              </p>
            } @else {
              <div class="text-4xl mb-4">&#9888;</div>
              <h2 class="font-display text-[13px] tracking-[2px] text-fg m-0 mb-2">{{ t('payment.errorTitle') }}</h2>
              <p class="font-body text-[13px] text-muted mb-6">
                {{ t('payment.errorMessage') }}
              </p>
            }

            @if (loggedIn()) {
              <viecz-button variant="primary" [label]="t('payment.goToWallet')"
                routerLink="/wallet" />
            } @else {
              <viecz-button variant="primary" [label]="t('payment.logIn')"
                routerLink="/login" />
            }
          </div>
        </viecz-card>
      </div>
    </ng-container>
  `,
})
export class PaymentReturnComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private platformId = inject(PLATFORM_ID);

  state = signal<'success' | 'cancelled' | 'error'>('error');
  loggedIn = this.authService.isAuthenticated;

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    const params = this.route.snapshot.queryParamMap;
    const code = params.get('code');
    const cancel = params.get('cancel');
    const status = params.get('status');

    if (cancel === 'true') {
      this.state.set('cancelled');
    } else if (code === '00' || status === 'PAID') {
      this.state.set('success');
    } else {
      this.state.set('error');
    }
  }
}
