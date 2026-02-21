import { Component, inject, OnInit, signal, HostListener, PLATFORM_ID, InjectionToken } from '@angular/core';

export const MINIMUM_LOADING_MS = new InjectionToken<number>('MINIMUM_LOADING_MS', {
  providedIn: 'root',
  factory: () => 300,
});
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NhannhtMetroInputComponent } from '../shared/components/nhannht-metro-input.component';
import { NhannhtMetroIconComponent } from '../shared/components/nhannht-metro-icon.component';
import { NhannhtMetroSpinnerComponent } from '../shared/components/nhannht-metro-spinner.component';
import { TaskService } from '../core/task.service';
import { AuthService } from '../core/auth.service';
import { Task } from '../core/models';
import { CategoryChipsComponent } from '../shared/components/category-chips.component';
import { NhannhtMetroButtonComponent } from '../shared/components/nhannht-metro-button.component';
import { TaskCardComponent } from '../shared/components/task-card.component';
import { LoadingSkeletonComponent } from '../shared/components/loading-skeleton.component';
import { ErrorFallbackComponent } from '../shared/components/error-fallback.component';

@Component({
  selector: 'app-marketplace',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    NhannhtMetroInputComponent,
    NhannhtMetroIconComponent,
    NhannhtMetroSpinnerComponent,
    NhannhtMetroButtonComponent,
    CategoryChipsComponent,
    TaskCardComponent,
    LoadingSkeletonComponent,
    ErrorFallbackComponent,
  ],
  template: `
    <div class="py-2 relative min-h-[60vh]">
      @if (!auth.isAuthenticated()) {
        <div class="border-2 border-fg p-8 mb-6 text-center">
          <h1 class="font-display text-[16px] tracking-[3px] mb-2">STUDENT MICRO-TASK MARKETPLACE</h1>
          <p class="font-body text-[14px] text-muted mb-6">Post tasks, find help, earn money.</p>
          <div class="flex justify-center gap-4 items-center">
            <a routerLink="/register">
              <nhannht-metro-button variant="primary" label="Get Started" />
            </a>
            <a routerLink="/login" class="font-body text-[13px] text-fg hover:opacity-70 transition-opacity">
              Sign In &gt;
            </a>
          </div>
        </div>
      }

      <div class="mb-4">
        <nhannht-metro-input
          label="SEARCH TASKS"
          placeholder="What do you need help with?"
          [(ngModel)]="search"
          (ngModelChange)="onSearchInput()"
        />
      </div>

      <app-category-chips (categorySelected)="onCategoryChange($event)" />

      @if (error()) {
        <app-error-fallback
          title="Failed to load tasks"
          message="Could not load the task list. Please try again."
          [retryFn]="retryLoad" />
      } @else if (loading() && tasks().length === 0) {
        <app-loading-skeleton variant="card" [count]="6" />
      } @else if (tasks().length === 0) {
        <div class="flex flex-col items-center py-16 px-4 text-center">
          <nhannht-metro-icon name="assignment" [size]="64" />
          <h3 class="font-display text-[11px] tracking-[1px] text-fg mt-3 mb-1">No tasks found</h3>
          <p class="font-body text-[13px] text-muted">Try adjusting your search or filters</p>
        </div>
      } @else {
        <div class="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4 my-4">
          @for (task of tasks(); track task.id) {
            <app-task-card [task]="task" />
          }
        </div>
        @if (loadingMore()) {
          <div class="flex justify-center py-6">
            <nhannht-metro-spinner [size]="32" />
          </div>
        }
        @if (!hasMore()) {
          <p class="text-center font-body text-[13px] text-muted py-4">No more tasks</p>
        }
      }

      @if (auth.isAuthenticated()) {
        <a routerLink="/tasks/new"
           class="fixed bottom-6 right-6 z-50 w-14 h-14 bg-fg text-bg border-2 border-fg
                  flex items-center justify-center cursor-pointer
                  hover:bg-transparent hover:text-fg transition-all duration-200"
           aria-label="Create Task">
          <nhannht-metro-icon name="add" [size]="28" />
        </a>
      }
    </div>
  `,
})
export class MarketplaceComponent implements OnInit {
  auth = inject(AuthService);
  private taskService = inject(TaskService);
  private minLoadMs = inject(MINIMUM_LOADING_MS);

  tasks = signal<Task[]>([]);
  total = signal(0);
  page = signal(1);
  loading = signal(false);
  loadingMore = signal(false);
  hasMore = signal(true);
  error = signal(false);
  search = '';
  selectedCategory = 0;
  retryLoad = () => this.resetAndLoad();

  private platformId = inject(PLATFORM_ID);
  private readonly pageSize = 20;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit() {
    this.loadTasks();
  }

  onSearchInput() {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.resetAndLoad(), 300);
  }

  onCategoryChange(catId: number) {
    this.selectedCategory = catId;
    this.resetAndLoad();
  }

  @HostListener('window:scroll')
  onScroll() {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.loadingMore() || !this.hasMore()) return;
    const threshold = 200;
    const position = window.innerHeight + window.scrollY;
    const height = document.documentElement.scrollHeight;
    if (position >= height - threshold) {
      this.loadMore();
    }
  }

  private resetAndLoad() {
    this.page.set(1);
    this.tasks.set([]);
    this.hasMore.set(true);
    this.error.set(false);
    this.loadTasks();
  }

  private loadTasks() {
    this.loading.set(true);
    const loadStart = Date.now();
    this.taskService
      .list({
        search: this.search || undefined,
        category_id: this.selectedCategory || undefined,
        page: this.page(),
        limit: this.pageSize,
      })
      .subscribe({
        next: res => {
          const apply = () => {
            this.tasks.set(res.data || []);
            this.total.set(res.total);
            this.hasMore.set((res.data?.length || 0) >= this.pageSize);
            this.loading.set(false);
          };
          const remaining = Math.max(0, this.minLoadMs - (Date.now() - loadStart));
          remaining > 0 ? setTimeout(apply, remaining) : apply();
        },
        error: () => {
          const apply = () => { this.loading.set(false); this.error.set(true); };
          const remaining = Math.max(0, this.minLoadMs - (Date.now() - loadStart));
          remaining > 0 ? setTimeout(apply, remaining) : apply();
        },
      });
  }

  private loadMore() {
    this.loadingMore.set(true);
    const nextPage = this.page() + 1;
    this.taskService
      .list({
        search: this.search || undefined,
        category_id: this.selectedCategory || undefined,
        page: nextPage,
        limit: this.pageSize,
      })
      .subscribe({
        next: res => {
          const newTasks = res.data || [];
          this.tasks.update(existing => [...existing, ...newTasks]);
          this.page.set(nextPage);
          this.hasMore.set(newTasks.length >= this.pageSize);
          this.loadingMore.set(false);
        },
        error: () => this.loadingMore.set(false),
      });
  }
}
