import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SlicePipe, DatePipe } from '@angular/common';
import { TranslocoDirective } from '@jsverse/transloco';
import { NhannhtMetroIconComponent } from './nhannht-metro-icon.component';
import { NhannhtMetroBadgeComponent } from './nhannht-metro-badge.component';
import { VndPipe, TimeAgoPipe } from '../../core/pipes';
import { LanguageService } from '../../core/language.service';
import type { Task } from '../../core/models';

/**
 * Marketplace task card displaying summary info with hover lift effect.
 *
 * Shows status badge, title, truncated description, price, location, and deadline.
 * Entire card is a clickable link to `/tasks/:id`.
 *
 * Replaces `MatCard`-based task card from Angular Material.
 *
 * @example
 * ```html
 * <nhannht-metro-task-card [task]="task" [isOwner]="true" />
 * ```
 */
@Component({
  selector: 'nhannht-metro-task-card',
  standalone: true,
  imports: [RouterLink, SlicePipe, DatePipe, TranslocoDirective, NhannhtMetroIconComponent, NhannhtMetroBadgeComponent, VndPipe, TimeAgoPipe],
  template: `
    <a [routerLink]="['/tasks', task().id]" *transloco="let t"
       class="block bg-card border border-border p-6 transition-all duration-300
              hover:border-fg hover:-translate-y-0.5
              hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] cursor-pointer">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <nhannht-metro-badge [label]="task().status.toUpperCase()" [status]="task().status" />
          @if (isOwner()) {
            <nhannht-metro-badge label="YOUR TASK" />
          }
        </div>
        <span class="font-body text-[13px] font-bold text-fg">{{ task().price | vnd }}</span>
      </div>

      <h3 class="font-display text-[11px] tracking-[1px] text-fg mb-2 truncate">
        {{ task().title }}
      </h3>

      <p class="font-body text-[13px] text-muted leading-[1.7] mb-4">
        {{ task().description | slice:0:120 }}{{ task().description.length > 120 ? '...' : '' }}
      </p>

      <div class="flex items-center justify-between font-body text-[11px] text-muted">
        <span class="flex items-center gap-1">
          <nhannht-metro-icon name="location_on" [size]="14" />
          {{ task().location || '—' }}
        </span>
        @if (task().deadline) {
          <span class="flex items-center gap-1">
            <nhannht-metro-icon name="schedule" [size]="14" />
            {{ task().deadline | date:'dd/MM/yyyy' }}
          </span>
        }
      </div>

      <div class="flex items-center justify-between font-body text-[11px] text-muted mt-2">
        @if (task().category) {
          <span class="flex items-center gap-1">
            <nhannht-metro-icon name="category" [size]="14" />
            {{ lang.activeLang === 'vi' ? (task().category!.name_vi || task().category!.name) : task().category!.name }}
          </span>
        }
        <span class="flex items-center gap-1">
          <nhannht-metro-icon name="schedule" [size]="14" />
          {{ task().created_at | timeAgo }}
        </span>
        @if (task().application_count !== undefined) {
          <span class="flex items-center gap-1">
            <nhannht-metro-icon name="group" [size]="14" />
            {{ task().application_count }} {{ t('taskCard.applied') }}
          </span>
        }
      </div>
    </a>
  `,
})
export class NhannhtMetroTaskCardComponent {
  lang = inject(LanguageService);

  /** Task data object. */
  task = input.required<Task>();

  /** When true, shows "YOUR TASK" badge. */
  isOwner = input(false);
}
