import { Component, input, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SlicePipe, DatePipe } from '@angular/common';
import { TranslocoDirective } from '@jsverse/transloco';
import { VieczIconComponent } from './viecz-icon.component';
import { VieczBadgeComponent } from './viecz-badge.component';
import { Task } from '../../core/models';
import { AuthService } from '../../core/auth.service';
import { LanguageService } from '../../core/language.service';
import { VndPipe, TimeAgoPipe } from '../../core/pipes';

import { GlassSpecularDirective } from '../directives/glass-specular.directive';

@Component({
  selector: 'app-task-card',
  standalone: true,
  imports: [RouterLink, SlicePipe, DatePipe, TranslocoDirective, VieczIconComponent, VieczBadgeComponent, VndPipe, TimeAgoPipe, GlassSpecularDirective],
  template: `
    <a [routerLink]="['/tasks', task().id]" *transloco="let t"
       appGlassSpecular
       class="block bg-card border border-border p-6 transition-all duration-300
              hover:border-fg hover:-translate-y-0.5
              hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] cursor-pointer">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <viecz-badge [label]="t(statusKey(task().status))" [status]="task().status" />
          @if (isOwner()) {
            <viecz-badge [label]="t('task.yourTask')" />
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
          <viecz-icon name="location_on" [size]="14" />
          @if (task().distance_km !== undefined && task().distance_km !== null) {
            <strong>{{ formatDistance(task().distance_km!) }}</strong> ·
          }
          {{ shortLocation() }}
        </span>
        @if (task().deadline) {
          <span class="flex items-center gap-1">
            <viecz-icon name="schedule" [size]="14" />
            {{ task().deadline | date:'dd/MM/yyyy' }}
          </span>
        }
      </div>

      <div class="flex items-center justify-between font-body text-[11px] text-muted mt-2">
        @if (task().category) {
          <span class="flex items-center gap-1">
            <viecz-icon name="category" [size]="14" />
            {{ lang.activeLang === 'vi' ? (task().category!.name_vi || task().category!.name) : task().category!.name }}
          </span>
        }
        <span class="flex items-center gap-1">
          <viecz-icon name="schedule" [size]="14" />
          {{ task().created_at | timeAgo }}
        </span>
        @if (task().application_count !== undefined) {
          <span class="flex items-center gap-1">
            <viecz-icon name="group" [size]="14" />
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

  private static readonly STATUS_KEYS: Record<string, string> = {
    open: 'task.statusOpen',
    in_progress: 'task.statusInProgress',
    completed: 'task.statusCompleted',
    cancelled: 'task.statusCancelled',
  };

  statusKey(status: string): string {
    return TaskCardComponent.STATUS_KEYS[status] || 'task.statusOpen';
  }

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
