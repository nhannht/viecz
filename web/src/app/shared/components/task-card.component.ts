import { Component, input, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SlicePipe, DatePipe } from '@angular/common';
import { TranslocoDirective } from '@jsverse/transloco';
import { NhannhtMetroIconComponent } from './nhannht-metro-icon.component';
import { NhannhtMetroBadgeComponent } from './nhannht-metro-badge.component';
import { Task } from '../../core/models';
import { AuthService } from '../../core/auth.service';
import { LanguageService } from '../../core/language.service';
import { VndPipe, TimeAgoPipe } from '../../core/pipes';

@Component({
  selector: 'app-task-card',
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

      <p class="font-body text-[13px] text-muted leading-[1.7] mb-4 line-clamp-3">
        {{ task().description | slice:0:120 }}{{ task().description.length > 120 ? '...' : '' }}
      </p>

      <div class="flex items-center justify-between font-body text-[11px] text-muted">
        <span class="flex items-center gap-1">
          <nhannht-metro-icon name="location_on" [size]="14" />
          @if (task().distance_km !== undefined && task().distance_km !== null) {
            <strong>{{ formatDistance(task().distance_km!) }}</strong> ·
          }
          {{ shortLocation() }}
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
export class TaskCardComponent {
  lang = inject(LanguageService);
  task = input.required<Task>();
  private auth = inject(AuthService);

  isOwner() {
    return this.task().requester_id === this.auth.currentUser()?.id;
  }

  shortLocation(): string {
    const loc = this.task().location;
    if (!loc) return '—';
    const parts = loc.split(',').map(p => p.trim());
    return parts.slice(0, 2).join(', ');
  }

  formatDistance(km: number): string {
    if (km < 1) {
      return `${Math.round(km * 1000)} m`;
    }
    return `${km.toFixed(1)} km`;
  }
}
