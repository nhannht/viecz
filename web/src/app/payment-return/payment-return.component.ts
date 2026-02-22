import { Component, inject, OnInit, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NhannhtMetroCardComponent } from '../shared/components/nhannht-metro-card.component';
import { NhannhtMetroButtonComponent } from '../shared/components/nhannht-metro-button.component';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-payment-return',
  standalone: true,
  imports: [RouterLink, NhannhtMetroCardComponent, NhannhtMetroButtonComponent],
  template: `
    <div class="flex justify-center py-16 px-4">
      <nhannht-metro-card class="max-w-md w-full">
        <div class="text-center">
          @if (state() === 'success') {
            <div class="text-4xl mb-4">&#10003;</div>
            <h2 class="font-display text-[13px] tracking-[2px] text-fg m-0 mb-2">PAYMENT SUCCESSFUL</h2>
            <p class="font-body text-[13px] text-muted mb-6">
              Your deposit has been processed. Funds will appear in your wallet shortly.
            </p>
          } @else if (state() === 'cancelled') {
            <div class="text-4xl mb-4">&#10005;</div>
            <h2 class="font-display text-[13px] tracking-[2px] text-fg m-0 mb-2">PAYMENT CANCELLED</h2>
            <p class="font-body text-[13px] text-muted mb-6">
              The payment was cancelled. No funds were charged.
            </p>
          } @else {
            <div class="text-4xl mb-4">&#9888;</div>
            <h2 class="font-display text-[13px] tracking-[2px] text-fg m-0 mb-2">PAYMENT ERROR</h2>
            <p class="font-body text-[13px] text-muted mb-6">
              Something went wrong with the payment. Please try again.
            </p>
          }

          @if (loggedIn()) {
            <nhannht-metro-button variant="primary" label="Go to Wallet"
              routerLink="/wallet" />
          } @else {
            <nhannht-metro-button variant="primary" label="Log In"
              routerLink="/login" />
          }
        </div>
      </nhannht-metro-card>
    </div>
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
