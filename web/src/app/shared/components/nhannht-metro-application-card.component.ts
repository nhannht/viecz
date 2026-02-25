import { Component, input, output, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { NhannhtMetroBadgeComponent } from './nhannht-metro-badge.component';
import { NhannhtMetroButtonComponent } from './nhannht-metro-button.component';
import { VndPipe, TimeAgoPipe } from '../../core/pipes';
import type { TaskApplication } from '../../core/models';

/**
 * Card displaying a task application with status, message, and accept action.
 *
 * Shows tasker link, application status badge, proposed price,
 * message, timestamp, and optional accept button.
 *
 * Replaces `MatCard`-based application card from Angular Material.
 *
 * @example
 * ```html
 * <nhannht-metro-application-card
 *   [application]="app"
 *   [showAccept]="true"
 *   (acceptClick)="onAccept($event)"
 * />
 * ```
 */
@Component({
  selector: 'nhannht-metro-application-card',
  standalone: true,
  imports: [RouterLink, TranslocoDirective, NhannhtMetroBadgeComponent, NhannhtMetroButtonComponent, VndPipe, TimeAgoPipe],
  template: `
    <ng-container *transloco="let t">
      <div class="bg-card border border-border p-6 font-body">
        <div class="flex items-center justify-between mb-3">
          <a [routerLink]="['/profile', application().tasker_id]"
             class="text-[13px] text-fg font-bold tracking-[1px] hover:text-muted transition-colors duration-200">
            {{ application().tasker?.name || t('applicationCard.tasker') + application().tasker_id }}
          </a>
          <nhannht-metro-badge [label]="application().status.toUpperCase()" [status]="badgeStatus()" />
        </div>

        @if (application().proposed_price) {
          <p class="text-[13px] text-fg mb-2">
            {{ t('applicationCard.proposed') }}<span class="font-bold">{{ application().proposed_price | vnd }}</span>
          </p>
        }

        @if (application().message) {
          <p class="text-[13px] text-muted leading-[1.7] mb-3">{{ application().message }}</p>
        }

        <div class="flex items-center justify-between pt-3 border-t border-border">
          <span class="text-[11px] text-muted">{{ application().created_at | timeAgo }}</span>
          @if (showAccept() && application().status === 'pending') {
            <nhannht-metro-button
              variant="primary"
              [label]="t('applicationCard.accept')"
              (clicked)="acceptClick.emit(application().id)"
            />
          }
        </div>
      </div>
    </ng-container>
  `,
})
export class NhannhtMetroApplicationCardComponent {
  /** Application data object. */
  application = input.required<TaskApplication>();

  /** When true and status is pending, shows the Accept button. */
  showAccept = input(false);

  /** Emits the application ID when Accept is clicked. */
  acceptClick = output<number>();

  badgeStatus = computed(() => {
    const s = this.application().status;
    if (s === 'accepted') return 'completed' as const;
    if (s === 'rejected') return 'cancelled' as const;
    return 'in_progress' as const;
  });
}
