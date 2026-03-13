import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { AuthService } from '../core/auth.service';
import { LoadingSkeletonComponent } from '../shared/components/loading-skeleton.component';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [TranslocoDirective, RouterLink, LoadingSkeletonComponent],
  template: `
    <ng-container *transloco="let t">
      <div class="max-w-[480px] mx-auto mt-16 text-center">
        @if (loading()) {
          <app-loading-skeleton variant="line" [count]="3" />
          <p class="font-body text-[13px] text-muted mt-4">{{ t('verifyEmail.verifying') }}</p>
        } @else if (success()) {
          <h2 class="font-display text-[14px] tracking-[2px] mb-4">{{ t('verifyEmail.successTitle') }}</h2>
          <p class="font-body text-[13px] mb-6">{{ t('verifyEmail.successMessage') }}</p>
          <a routerLink="/marketplace"
             class="inline-block px-6 py-3 bg-fg text-bg font-display text-[11px] tracking-[1px] no-underline border border-fg hover:opacity-90 transition-opacity">
            {{ t('verifyEmail.goToMarketplace') }}
          </a>
        } @else {
          <h2 class="font-display text-[14px] tracking-[2px] mb-4">{{ t('verifyEmail.errorTitle') }}</h2>
          <p class="font-body text-[13px] text-muted mb-6">{{ errorMessage() }}</p>
          <a routerLink="/marketplace"
             class="inline-block px-6 py-3 bg-fg text-bg font-display text-[11px] tracking-[1px] no-underline border border-fg hover:opacity-90 transition-opacity">
            {{ t('verifyEmail.goToMarketplace') }}
          </a>
        }
      </div>
    </ng-container>
  `,
})
export class VerifyEmailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);

  loading = signal(true);
  success = signal(false);
  errorMessage = signal('');

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.loading.set(false);
      this.errorMessage.set('No verification token provided');
      return;
    }

    this.auth.verifyEmail(token).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set(true);
      },
      error: err => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.error || 'Verification failed');
      },
    });
  }
}
