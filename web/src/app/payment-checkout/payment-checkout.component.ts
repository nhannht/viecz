import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  computed,
  inject,
  PLATFORM_ID,
  ElementRef,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import { isPlatformBrowser, NgClass, CurrencyPipe, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import QRCode from 'qrcode';

import { WalletService } from '../core/wallet.service';
import { BankListService, VietQRBank } from '../core/bank-list';
import { NhannhtMetroSpinnerComponent } from '../shared/components/nhannht-metro-spinner.component';
import { NhannhtMetroProgressBarComponent } from '../shared/components/nhannht-metro-progress-bar.component';
import { NhannhtMetroSnackbarService } from '../shared/services/nhannht-metro-snackbar.service';

/** Payment data passed via router state */
interface CheckoutState {
  qr_code: string;
  account_number: string;
  account_name: string;
  bin: string;
  amount: number;
  description: string;
  order_code: number;
  return_to: string;
  retry_escrow?: boolean;
  task_id?: number;
}

type Phase = 'pending' | 'explosion' | 'confirmed' | 'expired';

/**
 * Terminal Receipt checkout page — brutalist QR payment display.
 *
 * Receives PayOS payment data via Angular Router state. Polls for payment
 * confirmation, then shows ASCII explosion animation before inverted PAID card.
 */
@Component({
  selector: 'app-payment-checkout',
  standalone: true,
  imports: [NgClass, TranslocoDirective, NhannhtMetroSpinnerComponent, NhannhtMetroProgressBarComponent, CurrencyPipe, DatePipe],
  templateUrl: './payment-checkout.component.html',
  styleUrl: './payment-checkout.component.css',
})
export class PaymentCheckoutComponent implements OnInit, AfterViewInit, OnDestroy {
  private walletService = inject(WalletService);
  private router = inject(Router);
  private snackbar = inject(NhannhtMetroSnackbarService);
  private transloco = inject(TranslocoService);
  private bankListService = inject(BankListService);
  private platformId = inject(PLATFORM_ID);

  @ViewChild('qrCanvas') qrCanvas?: ElementRef<HTMLCanvasElement>;

  /** Current phase of the checkout flow */
  phase = signal<Phase>('pending');

  /** Payment data from router state */
  state = signal<CheckoutState | null>(null);

  /** Resolved bank info from VietQR API */
  bank = signal<VietQRBank | null>(null);
  bankName = computed(() => {
    const b = this.bank();
    if (b) return b.shortName;
    const bin = this.state()?.bin;
    return bin ? `Bank (${bin})` : '';
  });
  bankLogo = computed(() => this.bank()?.logo ?? '');

  /** Countdown seconds remaining (5 min = 300s) */
  secondsLeft = signal(300);

  /** Formatted countdown MM:SS */
  countdown = computed(() => {
    const s = this.secondsLeft();
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  });

  /** Progress percentage */
  progressPct = computed(() => Math.round((this.secondsLeft() / 300) * 100));

  /** Explosion animation chars */
  explosionChars = signal<{ char: string; x: number; y: number; tx: number; ty: number; delay: number }[]>([]);

  /** Confirmed timestamp */
  confirmedAt = signal<Date | null>(null);

  /** Auto-redirect countdown */
  redirectSeconds = signal(5);

  private pollInterval?: ReturnType<typeof setInterval>;
  private countdownInterval?: ReturnType<typeof setInterval>;
  private redirectInterval?: ReturnType<typeof setInterval>;

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    // Read router state
    const nav = this.router.getCurrentNavigation();
    const s = nav?.extras?.state ?? history.state;
    if (!s?.order_code) {
      this.router.navigate(['/wallet']);
      return;
    }
    this.state.set(s as CheckoutState);

    // Resolve bank name from BIN via VietQR API
    if (s.bin) {
      this.bankListService.getBanks().subscribe(banks => {
        const match = banks.find((b: VietQRBank) => b.bin === s.bin);
        if (match) this.bank.set(match);
      });
    }

    // Start countdown
    this.countdownInterval = setInterval(() => {
      const left = this.secondsLeft() - 1;
      if (left <= 0) {
        this.phase.set('expired');
        this.stopPolling();
        return;
      }
      this.secondsLeft.set(left);
    }, 1000);

    // Start polling for payment status
    this.startPolling();
  }

  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.renderQr();
  }

  ngOnDestroy() {
    this.stopPolling();
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    if (this.redirectInterval) clearInterval(this.redirectInterval);
  }

  private async renderQr() {
    const s = this.state();
    if (!s?.qr_code || !this.qrCanvas) return;
    try {
      await QRCode.toCanvas(this.qrCanvas.nativeElement, s.qr_code, {
        width: 200,
        margin: 1,
        color: { dark: '#1a1a1a', light: '#ffffff' },
      });
    } catch {
      // QR rendering failed silently — fallback link still available
    }
  }

  private startPolling() {
    const s = this.state();
    if (!s) return;
    this.pollInterval = setInterval(() => {
      this.walletService.getDepositStatus(s.order_code).subscribe({
        next: res => {
          if (res.status === 'success') {
            this.onPaymentSuccess();
          } else if (res.status === 'cancelled' || res.status === 'failed') {
            this.phase.set('expired');
            this.stopPolling();
          }
        },
      });
    }, 3000);
  }

  private stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = undefined;
    }
  }

  private onPaymentSuccess() {
    this.stopPolling();
    if (this.countdownInterval) clearInterval(this.countdownInterval);

    // Check prefers-reduced-motion
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotion) {
      // Skip animation, go straight to confirmed
      this.confirmedAt.set(new Date());
      this.phase.set('confirmed');
      this.startRedirectCountdown();
      return;
    }

    // Phase 2: ASCII explosion
    this.generateExplosionChars();
    this.phase.set('explosion');

    // After 1s, transition to confirmed
    setTimeout(() => {
      this.confirmedAt.set(new Date());
      this.phase.set('confirmed');
      this.startRedirectCountdown();
    }, 1000);
  }

  private generateExplosionChars() {
    const chars = '█ ▓ ▒ ░ # @ * + . :'.split(' ');
    const result: typeof this.explosionChars extends () => infer T ? T : never = [];
    for (let i = 0; i < 40; i++) {
      const angle = (Math.PI * 2 * i) / 40;
      const dist = 80 + Math.random() * 120;
      result.push({
        char: chars[i % chars.length],
        x: 100 + (Math.random() - 0.5) * 40,
        y: 100 + (Math.random() - 0.5) * 40,
        tx: Math.cos(angle) * dist,
        ty: Math.sin(angle) * dist,
        delay: Math.random() * 0.2,
      });
    }
    this.explosionChars.set(result);
  }

  private startRedirectCountdown() {
    this.redirectInterval = setInterval(() => {
      const left = this.redirectSeconds() - 1;
      if (left <= 0) {
        if (this.redirectInterval) clearInterval(this.redirectInterval);
        this.navigateAway();
        return;
      }
      this.redirectSeconds.set(left);
    }, 1000);
  }

  /** Copy text to clipboard and show snackbar */
  copyToClipboard(text: string) {
    if (!isPlatformBrowser(this.platformId)) return;
    navigator.clipboard.writeText(text).then(() => {
      this.snackbar.show(
        this.transloco.translate('checkout.copied'),
        undefined,
        { duration: 2000 },
      );
    });
  }

  /** Navigate to return destination */
  navigateAway() {
    const s = this.state();
    const returnTo = s?.return_to || '/wallet';
    this.router.navigate([returnTo]);
  }

  /** Navigate back to retry deposit (for expired state) */
  retryDeposit() {
    this.router.navigate(['/wallet']);
  }

  /** Format VND amount */
  formatVnd(amount: number): string {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
  }
}
