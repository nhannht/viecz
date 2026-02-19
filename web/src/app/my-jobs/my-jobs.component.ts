import { Component, inject, OnInit, signal, input, effect } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatTabGroup, MatTab } from '@angular/material/tabs';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatIcon } from '@angular/material/icon';
import { TaskService } from '../core/task.service';
import { AuthService } from '../core/auth.service';
import { Task } from '../core/models';
import { TaskCardComponent } from '../shared/components/task-card.component';

@Component({
  selector: 'app-my-jobs',
  standalone: true,
  imports: [RouterLink, MatTabGroup, MatTab, MatProgressSpinner, MatIcon, TaskCardComponent],
  template: `
    <div class="my-jobs-page">
      <h2>My Jobs</h2>
      <mat-tab-group [selectedIndex]="selectedTab()" (selectedIndexChange)="onTabChange($event)">
        <mat-tab label="Posted">
          <ng-template matTabContent>
            @if (loading()) {
              <div class="loading"><mat-spinner diameter="40"></mat-spinner></div>
            } @else if (tasks().length === 0) {
              <div class="empty">
                <mat-icon>assignment</mat-icon>
                <p>No posted tasks yet</p>
              </div>
            } @else {
              <div class="task-grid">
                @for (task of tasks(); track task.id) {
                  <app-task-card [task]="task" />
                }
              </div>
            }
          </ng-template>
        </mat-tab>
        <mat-tab label="Applied">
          <ng-template matTabContent>
            @if (loading()) {
              <div class="loading"><mat-spinner diameter="40"></mat-spinner></div>
            } @else if (tasks().length === 0) {
              <div class="empty">
                <mat-icon>work_outline</mat-icon>
                <p>No active jobs</p>
              </div>
            } @else {
              <div class="task-grid">
                @for (task of tasks(); track task.id) {
                  <app-task-card [task]="task" />
                }
              </div>
            }
          </ng-template>
        </mat-tab>
        <mat-tab label="Completed">
          <ng-template matTabContent>
            @if (loading()) {
              <div class="loading"><mat-spinner diameter="40"></mat-spinner></div>
            } @else if (tasks().length === 0) {
              <div class="empty">
                <mat-icon>done_all</mat-icon>
                <p>No completed jobs yet</p>
              </div>
            } @else {
              <div class="task-grid">
                @for (task of tasks(); track task.id) {
                  <app-task-card [task]="task" />
                }
              </div>
            }
          </ng-template>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: `
    .my-jobs-page { max-width: 1200px; margin: 0 auto; }
    h2 { margin: 0 0 16px; }
    .loading { display: flex; justify-content: center; padding: 48px 0; }
    .empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 48px 0;
      color: var(--mat-sys-on-surface-variant);
    }
    .empty mat-icon { font-size: 48px; width: 48px; height: 48px; margin-bottom: 8px; }
    .task-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
      padding: 16px 0;
    }
  `,
})
export class MyJobsComponent implements OnInit {
  mode = input<string>('posted');

  private taskService = inject(TaskService);
  private auth = inject(AuthService);
  private router = inject(Router);

  tasks = signal<Task[]>([]);
  loading = signal(false);
  selectedTab = signal(0);

  private modeToTab: Record<string, number> = { posted: 0, applied: 1, completed: 2 };
  private tabToMode = ['posted', 'applied', 'completed'];

  constructor() {
    effect(() => {
      const m = this.mode();
      this.selectedTab.set(this.modeToTab[m] ?? 0);
    });
  }

  ngOnInit() {
    this.loadTasks(this.mode() || 'posted');
  }

  onTabChange(index: number) {
    const mode = this.tabToMode[index];
    this.router.navigate(['/my-jobs', mode]);
    this.loadTasks(mode);
  }

  private loadTasks(mode: string) {
    this.loading.set(true);
    this.tasks.set([]);
    const userId = this.auth.currentUser()?.id;
    if (!userId) {
      this.loading.set(false);
      return;
    }

    let params: Record<string, any> = {};
    switch (mode) {
      case 'posted':
        params = { requester_id: userId };
        break;
      case 'applied':
        params = { tasker_id: userId, status: 'in_progress' };
        break;
      case 'completed':
        params = { tasker_id: userId, status: 'completed' };
        break;
    }

    this.taskService.list(params).subscribe({
      next: res => {
        this.tasks.set(res.data || []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }
}
