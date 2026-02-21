import { Component, inject, OnInit, signal, input, effect } from '@angular/core';
import { Router } from '@angular/router';
import { NhannhtMetroTabsComponent } from '../shared/components/nhannht-metro-tabs.component';
import { NhannhtMetroSpinnerComponent } from '../shared/components/nhannht-metro-spinner.component';
import { TaskService } from '../core/task.service';
import { AuthService } from '../core/auth.service';
import { Task } from '../core/models';
import { TaskCardComponent } from '../shared/components/task-card.component';
import { EmptyStateComponent } from '../shared/components/empty-state.component';
import { ErrorFallbackComponent } from '../shared/components/error-fallback.component';

@Component({
  selector: 'app-my-jobs',
  standalone: true,
  imports: [NhannhtMetroTabsComponent, NhannhtMetroSpinnerComponent, TaskCardComponent, EmptyStateComponent, ErrorFallbackComponent],
  template: `
    <div class="max-w-[1200px] mx-auto">
      <h2 class="font-display text-[13px] tracking-[2px] text-fg mb-4">MY JOBS</h2>
      <nhannht-metro-tabs
        [tabs]="tabDefs"
        [activeTab]="currentTab()"
        (tabChanged)="onTabChange($event)">
        @if (loading()) {
          <div class="flex justify-center py-12">
            <nhannht-metro-spinner [size]="40" />
          </div>
        } @else if (error()) {
          <app-error-fallback title="Failed to load tasks"
            message="Please try again later." [retryFn]="retryLoad" />
        } @else if (tasks().length === 0) {
          @switch (currentTab()) {
            @case ('posted') {
              <app-empty-state icon="assignment" title="No posted tasks yet"
                message="Post a task to find help"
                actionLabel="Post a Task" [action]="goToCreate" />
            }
            @case ('applied') {
              <app-empty-state icon="work_outline" title="No active jobs"
                message="Browse the marketplace to find tasks"
                actionLabel="Browse Marketplace" [action]="goToMarketplace" />
            }
            @case ('completed') {
              <app-empty-state icon="done_all" title="No completed jobs yet"
                message="Complete tasks to see them here" />
            }
          }
        } @else {
          <div class="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4 py-4">
            @for (task of tasks(); track task.id) {
              <app-task-card [task]="task" />
            }
          </div>
        }
      </nhannht-metro-tabs>
    </div>
  `,
})
export class MyJobsComponent implements OnInit {
  mode = input<string>('posted');

  private taskService = inject(TaskService);
  private auth = inject(AuthService);
  private router = inject(Router);

  tasks = signal<Task[]>([]);
  loading = signal(false);
  error = signal(false);
  currentTab = signal('posted');
  selectedTab = signal(0);

  tabDefs = [
    { value: 'posted', label: 'Posted' },
    { value: 'applied', label: 'Applied' },
    { value: 'completed', label: 'Completed' },
  ];

  private modeToTab: Record<string, number> = { posted: 0, applied: 1, completed: 2 };
  private tabToMode = ['posted', 'applied', 'completed'];

  constructor() {
    effect(() => {
      const m = this.mode();
      this.currentTab.set(m);
      this.selectedTab.set(this.modeToTab[m] ?? 0);
    });
  }

  ngOnInit() {
    this.loadTasks(this.mode() || 'posted');
  }

  onTabChange(tabValue: string) {
    this.currentTab.set(tabValue);
    const index = this.tabDefs.findIndex(t => t.value === tabValue);
    this.selectedTab.set(index >= 0 ? index : 0);
    this.router.navigate(['/my-jobs', tabValue]);
    this.loadTasks(tabValue);
  }

  goToCreate = () => this.router.navigate(['/tasks/new']);
  goToMarketplace = () => this.router.navigate(['/']);
  retryLoad = () => this.loadTasks(this.currentTab());

  private loadTasks(mode: string) {
    this.loading.set(true);
    this.tasks.set([]);
    this.error.set(false);
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
        this.error.set(true);
      },
    });
  }
}
