import { Component, input, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SlicePipe } from '@angular/common';
import { MatCard, MatCardContent, MatCardActions } from '@angular/material/card';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatChip } from '@angular/material/chips';
import { Task } from '../../core/models';
import { AuthService } from '../../core/auth.service';
import { VndPipe, TimeAgoPipe } from '../../core/pipes';

@Component({
  selector: 'app-task-card',
  standalone: true,
  imports: [
    RouterLink,
    SlicePipe,
    MatCard,
    MatCardContent,
    MatCardActions,
    MatButton,
    MatIcon,
    MatChip,
    VndPipe,
    TimeAgoPipe,
  ],
  template: `
    <mat-card class="task-card" [routerLink]="['/tasks', task().id]">
      <mat-card-content>
        <div class="task-header">
          <span class="status-chip" [class]="task().status">{{ task().status }}</span>
          @if (isOwner()) {
            <mat-chip class="your-task-badge" highlighted>Your Task</mat-chip>
          }
          <span class="spacer"></span>
          <span class="task-price">{{ task().price | vnd }}</span>
        </div>
        <h3 class="task-title">{{ task().title }}</h3>
        <p class="task-desc">{{ task().description | slice:0:120 }}{{ task().description.length > 120 ? '...' : '' }}</p>
        <div class="task-meta">
          <span class="meta-item">
            <mat-icon>location_on</mat-icon>
            {{ task().location }}
          </span>
          @if (task().deadline) {
            <span class="meta-item">
              <mat-icon>schedule</mat-icon>
              {{ task().deadline | timeAgo }}
            </span>
          }
        </div>
      </mat-card-content>
      <mat-card-actions>
        <button mat-button color="primary">
          <mat-icon>visibility</mat-icon> View Details
        </button>
      </mat-card-actions>
    </mat-card>
  `,
  styles: `
    .task-card {
      cursor: pointer;
      transition: box-shadow 0.2s;
    }
    .task-card:hover {
      box-shadow: var(--mat-sys-level3);
    }
    .task-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    .spacer { flex: 1; }
    .task-price {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--mat-sys-primary);
    }
    .task-title {
      font-size: 1rem;
      font-weight: 500;
      margin: 0 0 8px;
      line-height: 1.3;
    }
    .task-desc {
      font-size: 0.875rem;
      color: var(--mat-sys-on-surface-variant);
      margin: 0 0 12px;
      line-height: 1.4;
    }
    .task-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      font-size: 0.8rem;
      color: var(--mat-sys-on-surface-variant);
    }
    .meta-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .meta-item mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
    .your-task-badge {
      font-size: 0.7rem;
    }
    .status-chip {
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
      text-transform: capitalize;
    }
    .status-chip.open {
      background: #e8f5e9;
      color: #2e7d32;
    }
    .status-chip.in_progress {
      background: #fff3e0;
      color: #e65100;
    }
    .status-chip.completed {
      background: #e3f2fd;
      color: #1565c0;
    }
    .status-chip.cancelled {
      background: #fbe9e7;
      color: #bf360c;
    }
  `,
})
export class TaskCardComponent {
  task = input.required<Task>();
  private auth = inject(AuthService);

  isOwner() {
    return this.task().requester_id === this.auth.currentUser()?.id;
  }
}
