import { Component, input, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SlicePipe } from '@angular/common';
import { NhannhtMetroIconComponent } from './nhannht-metro-icon.component';
import { NhannhtMetroBadgeComponent } from './nhannht-metro-badge.component';
import { Task } from '../../core/models';
import { AuthService } from '../../core/auth.service';
import { VndPipe, TimeAgoPipe } from '../../core/pipes';

@Component({
  selector: 'app-task-card',
  standalone: true,
  imports: [RouterLink, SlicePipe, NhannhtMetroIconComponent, NhannhtMetroBadgeComponent, VndPipe, TimeAgoPipe],
  template: `
    <a [routerLink]="['/tasks', task().id]"
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

      <div class="flex flex-wrap gap-4 font-body text-[11px] text-muted">
        @if (task().location) {
          <span class="flex items-center gap-1">
            <nhannht-metro-icon name="location_on" [size]="14" />
            {{ task().location }}
          </span>
        }
        @if (task().deadline) {
          <span class="flex items-center gap-1">
            <nhannht-metro-icon name="schedule" [size]="14" />
            {{ task().deadline | timeAgo }}
          </span>
        }
      </div>
    </a>
  `,
})
export class TaskCardComponent {
  task = input.required<Task>();
  private auth = inject(AuthService);

  isOwner() {
    return this.task().requester_id === this.auth.currentUser()?.id;
  }
}
