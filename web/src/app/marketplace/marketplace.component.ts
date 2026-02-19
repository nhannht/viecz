import { Component, inject, OnInit, signal, HostListener } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatFabButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { TaskService } from '../core/task.service';
import { Task } from '../core/models';
import { CategoryChipsComponent } from '../shared/components/category-chips.component';
import { TaskCardComponent } from '../shared/components/task-card.component';

@Component({
  selector: 'app-marketplace',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    MatFormField,
    MatLabel,
    MatInput,
    MatFabButton,
    MatIcon,
    MatProgressSpinner,
    CategoryChipsComponent,
    TaskCardComponent,
  ],
  template: `
    <div class="marketplace">
      <div class="search-bar">
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Search tasks</mat-label>
          <input matInput [(ngModel)]="search" (keyup.enter)="onSearch()"
                 placeholder="What do you need help with?">
          <button matSuffix mat-icon-button (click)="onSearch()">
            <mat-icon>search</mat-icon>
          </button>
        </mat-form-field>
      </div>

      <app-category-chips (categorySelected)="onCategoryChange($event)" />

      @if (loading() && tasks().length === 0) {
        <div class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      } @else if (tasks().length === 0) {
        <div class="empty-state">
          <mat-icon class="empty-icon">assignment</mat-icon>
          <h3>No tasks found</h3>
          <p>Try adjusting your search or filters</p>
        </div>
      } @else {
        <div class="task-grid">
          @for (task of tasks(); track task.id) {
            <app-task-card [task]="task" />
          }
        </div>
        @if (loadingMore()) {
          <div class="loading-more">
            <mat-spinner diameter="32"></mat-spinner>
          </div>
        }
        @if (!hasMore()) {
          <p class="end-of-list">No more tasks</p>
        }
      }

      <a mat-fab routerLink="/tasks/new" class="create-fab" aria-label="Create Task">
        <mat-icon>add</mat-icon>
      </a>
    </div>
  `,
  styles: `
    .marketplace { padding: 8px 0; position: relative; min-height: 60vh; }
    .search-bar { margin-bottom: 16px; }
    .search-field { width: 100%; }
    .loading-container {
      display: flex; justify-content: center; padding: 64px 0;
    }
    .empty-state {
      text-align: center; padding: 64px 16px;
      color: var(--mat-sys-on-surface-variant);
    }
    .empty-icon { font-size: 64px; width: 64px; height: 64px; opacity: 0.5; }
    .task-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 16px;
      margin: 16px 0;
    }
    .loading-more {
      display: flex; justify-content: center; padding: 24px 0;
    }
    .end-of-list {
      text-align: center;
      color: var(--mat-sys-on-surface-variant);
      padding: 16px 0;
      font-size: 0.875rem;
    }
    .create-fab {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 100;
    }
    @media (max-width: 600px) {
      .task-grid {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class MarketplaceComponent implements OnInit {
  private taskService = inject(TaskService);

  tasks = signal<Task[]>([]);
  total = signal(0);
  page = signal(1);
  loading = signal(false);
  loadingMore = signal(false);
  hasMore = signal(true);
  search = '';
  selectedCategory = 0;

  private readonly pageSize = 20;

  ngOnInit() {
    this.loadTasks();
  }

  onSearch() {
    this.resetAndLoad();
  }

  onCategoryChange(catId: number) {
    this.selectedCategory = catId;
    this.resetAndLoad();
  }

  @HostListener('window:scroll')
  onScroll() {
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
    this.loadTasks();
  }

  private loadTasks() {
    this.loading.set(true);
    this.taskService
      .list({
        search: this.search || undefined,
        category_id: this.selectedCategory || undefined,
        page: this.page(),
        limit: this.pageSize,
      })
      .subscribe({
        next: res => {
          this.tasks.set(res.data || []);
          this.total.set(res.total);
          this.hasMore.set((res.data?.length || 0) >= this.pageSize);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
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
