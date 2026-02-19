import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCard, MatCardContent, MatCardActions } from '@angular/material/card';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatChipListbox, MatChipOption } from '@angular/material/chips';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { SlicePipe } from '@angular/common';
import { TaskService } from '../core/task.service';
import { CategoryService } from '../core/category.service';
import { Task, Category } from '../core/models';
import { VndPipe, TimeAgoPipe } from '../core/pipes';

@Component({
  selector: 'app-marketplace',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    MatCard,
    MatCardContent,
    MatCardActions,
    MatFormField,
    MatLabel,
    MatInput,
    MatButton,
    MatIcon,
    MatChipListbox,
    MatChipOption,
    MatPaginator,
    MatProgressSpinner,
    VndPipe,
    TimeAgoPipe,
    SlicePipe,
  ],
  template: `
    <div class="marketplace">
      <div class="search-bar">
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Search tasks</mat-label>
          <input matInput [(ngModel)]="search" (keyup.enter)="loadTasks()"
                 placeholder="What do you need help with?">
          <button matSuffix mat-icon-button (click)="loadTasks()">
            <mat-icon>search</mat-icon>
          </button>
        </mat-form-field>
      </div>

      <div class="category-filters">
        <mat-chip-listbox (change)="onCategoryChange($event.value)">
          <mat-chip-option [value]="0" [selected]="selectedCategory === 0">All</mat-chip-option>
          @for (cat of categories(); track cat.id) {
            <mat-chip-option [value]="cat.id" [selected]="selectedCategory === cat.id">
              {{ cat.name }}
            </mat-chip-option>
          }
        </mat-chip-listbox>
      </div>

      @if (loading()) {
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
            <mat-card class="task-card" [routerLink]="['/tasks', task.id]">
              <mat-card-content>
                <div class="task-header">
                  <span class="status-chip" [class]="task.status">{{ task.status }}</span>
                  <span class="task-price">{{ task.price | vnd }}</span>
                </div>
                <h3 class="task-title">{{ task.title }}</h3>
                <p class="task-desc">{{ task.description | slice:0:120 }}{{ task.description.length > 120 ? '...' : '' }}</p>
                <div class="task-meta">
                  <span class="meta-item">
                    <mat-icon>location_on</mat-icon>
                    {{ task.location }}
                  </span>
                  @if (task.deadline) {
                    <span class="meta-item">
                      <mat-icon>schedule</mat-icon>
                      {{ task.deadline | timeAgo }}
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
          }
        </div>

        <mat-paginator
          [length]="total()"
          [pageSize]="pageSize"
          [pageIndex]="page() - 1"
          [pageSizeOptions]="[10, 20, 50]"
          (page)="onPage($event)"
          showFirstLastButtons>
        </mat-paginator>
      }
    </div>
  `,
  styles: `
    .marketplace { padding: 8px 0; }
    .search-bar { margin-bottom: 16px; }
    .search-field { width: 100%; }
    .category-filters {
      margin-bottom: 16px;
      overflow-x: auto;
      white-space: nowrap;
    }
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
      margin-bottom: 16px;
    }
    .task-card {
      cursor: pointer;
      transition: box-shadow 0.2s;
    }
    .task-card:hover {
      box-shadow: var(--mat-sys-level3);
    }
    .task-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
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
    @media (max-width: 600px) {
      .task-grid {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class MarketplaceComponent implements OnInit {
  private taskService = inject(TaskService);
  private categoryService = inject(CategoryService);

  tasks = signal<Task[]>([]);
  categories = signal<Category[]>([]);
  total = signal(0);
  page = signal(1);
  pageSize = 20;
  loading = signal(false);
  search = '';
  selectedCategory = 0;

  ngOnInit() {
    this.categoryService.list().subscribe({
      next: cats => this.categories.set(cats),
    });
    this.loadTasks();
  }

  loadTasks() {
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
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  onCategoryChange(catId: number) {
    this.selectedCategory = catId;
    this.page.set(1);
    this.loadTasks();
  }

  onPage(event: PageEvent) {
    this.page.set(event.pageIndex + 1);
    this.pageSize = event.pageSize;
    this.loadTasks();
  }
}
