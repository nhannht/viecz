import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { TaskApplication } from '../../core/models';
import { VndPipe, TimeAgoPipe } from '../../core/pipes';

@Component({
  selector: 'app-application-card',
  standalone: true,
  imports: [RouterLink, MatCard, MatCardContent, MatButton, MatIcon, VndPipe, TimeAgoPipe],
  template: `
    <mat-card class="app-card">
      <mat-card-content>
        <div class="app-header">
          <a [routerLink]="['/profile', application().tasker_id]" class="app-tasker">
            Tasker #{{ application().tasker_id }}
          </a>
          <span class="status-chip" [class]="application().status">{{ application().status }}</span>
        </div>
        @if (application().proposed_price) {
          <div class="app-price">{{ application().proposed_price | vnd }}</div>
        }
        @if (application().message) {
          <p class="app-message">{{ application().message }}</p>
        }
        <div class="app-footer">
          <span class="app-time">{{ application().created_at | timeAgo }}</span>
          @if (showAccept() && application().status === 'pending') {
            <button mat-raised-button (click)="acceptClick.emit(application().id)">
              <mat-icon>check</mat-icon> Accept
            </button>
          }
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    .app-card { margin-bottom: 8px; }
    .app-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .app-tasker {
      font-weight: 500;
      text-decoration: none;
      color: var(--mat-sys-primary);
    }
    .app-price {
      font-weight: 500;
      color: var(--mat-sys-primary);
      margin-bottom: 4px;
    }
    .app-message {
      font-size: 0.875rem;
      color: var(--mat-sys-on-surface-variant);
      margin: 4px 0;
    }
    .app-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 8px;
    }
    .app-time {
      font-size: 0.75rem;
      color: var(--mat-sys-on-surface-variant);
    }
    .status-chip {
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
      text-transform: capitalize;
    }
    .status-chip.pending { background: #fff8e1; color: #f57f17; }
    .status-chip.accepted { background: #e8f5e9; color: #2e7d32; }
    .status-chip.rejected { background: #fbe9e7; color: #bf360c; }
  `,
})
export class ApplicationCardComponent {
  application = input.required<TaskApplication>();
  showAccept = input(false);
  acceptClick = output<number>();
}
