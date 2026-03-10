import { Component, inject, OnInit, signal, HostListener, PLATFORM_ID, InjectionToken } from '@angular/core';

export const MINIMUM_LOADING_MS = new InjectionToken<number>('MINIMUM_LOADING_MS', {
  providedIn: 'root',
  factory: () => 300,
});
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective } from '@jsverse/transloco';
import { NhannhtMetroInputComponent } from '../shared/components/nhannht-metro-input.component';
import { NhannhtMetroIconComponent } from '../shared/components/nhannht-metro-icon.component';
import { NhannhtMetroSpinnerComponent } from '../shared/components/nhannht-metro-spinner.component';
import { TaskService } from '../core/task.service';
import { AuthService } from '../core/auth.service';
import { GeolocationService } from '../core/geolocation.service';
import { Task } from '../core/models';
import { CategoryChipsComponent } from '../shared/components/category-chips.component';
import { TaskCardComponent } from '../shared/components/task-card.component';
import { LoadingSkeletonComponent } from '../shared/components/loading-skeleton.component';
import { ErrorFallbackComponent } from '../shared/components/error-fallback.component';
import { MarketplaceMapComponent } from './marketplace-map.component';
import { HeroLiquidglassComponent } from './hero-liquidglass.component';

@Component({
  selector: 'app-marketplace',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    TranslocoDirective,
    NhannhtMetroInputComponent,
    NhannhtMetroIconComponent,
    NhannhtMetroSpinnerComponent,
    CategoryChipsComponent,
    TaskCardComponent,
    LoadingSkeletonComponent,
    ErrorFallbackComponent,
    MarketplaceMapComponent,
    HeroLiquidglassComponent,
  ],
  template: `
    <ng-container *transloco="let t">
    <div class="py-2 relative min-h-[60vh]">
      @if (!auth.isAuthenticated()) {
        <app-hero-liquidglass [total]="total()" />
      }

      <div class="mb-4">
        <nhannht-metro-input
          [label]="t('marketplace.searchLabel')"
          [placeholder]="t('marketplace.searchPlaceholder')"
          [(ngModel)]="search"
          (ngModelChange)="onSearchInput()"
        />
      </div>

      <app-category-chips (categorySelected)="onCategoryChange($event)" />

      <div class="flex flex-wrap items-center gap-3 my-4">
        <button
          class="inline-flex items-center gap-1.5 px-3 py-1.5 border-2 font-display text-[10px] tracking-[1px] transition-all duration-200"
          [class]="viewMode() === 'map' ? 'border-fg bg-fg text-bg' : 'border-border text-fg hover:border-fg'"
          (click)="toggleNearMe()"
        >
          <nhannht-metro-icon name="near_me" [size]="14" />
          @if (geo.loading()) {
            {{ t('marketplace.nearMeLoading') }}
          } @else if (geo.isDenied()) {
            {{ t('marketplace.nearMeDenied') }}
          } @else {
            {{ t('marketplace.nearMe') }}
          }
        </button>
      </div>

      @if (viewMode() === 'map') {
        <app-marketplace-map
          [tasks]="tasks()"
          [userLat]="geo.latitude()"
          [userLng]="geo.longitude()"
          [selectedTaskId]="selectedMapTaskId()"
          [loading]="loading()"
          (areaSearchRequested)="onAreaSearch($event)"
          (taskSelected)="onMapTaskSelected($event)"
        />
      } @else if (error()) {
        <app-error-fallback
          [title]="t('marketplace.failedToLoadTitle')"
          [message]="t('marketplace.failedToLoadMessage')"
          [retryFn]="retryLoad" />
      } @else if (loading() && tasks().length === 0) {
        <app-loading-skeleton variant="card" [count]="6" />
      } @else if (tasks().length === 0) {
        <div class="flex flex-col items-center py-16 px-4 text-center">
          <nhannht-metro-icon name="assignment" [size]="64" />
          <h3 class="font-display text-[11px] tracking-[1px] text-fg mt-3 mb-1">{{ t('marketplace.noTasksFound') }}</h3>
          <p class="font-body text-[13px] text-muted">{{ t('marketplace.noTasksHint') }}</p>
        </div>
      } @else {
        <div class="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4 my-4">
          @for (task of tasks(); track task.id) {
            <app-task-card [task]="task" />
          }
        </div>
        @if (loadingMore()) {
          <div class="flex justify-center py-6">
            <nhannht-metro-spinner />
          </div>
        }
        @if (!hasMore()) {
          <p class="text-center font-body text-[13px] text-muted py-4">{{ t('marketplace.noMoreTasks') }}</p>
        }
      }

      @if (auth.isAuthenticated()) {
        <a routerLink="/tasks/new"
           class="fixed bottom-6 right-6 z-50 w-14 h-14 bg-fg text-bg border-2 border-fg
                  hidden md:flex items-center justify-center cursor-pointer
                  hover:bg-transparent hover:text-fg transition-all duration-200"
           [attr.aria-label]="t('marketplace.createTask')">
          <nhannht-metro-icon name="add" [size]="28" />
        </a>
      }
    </div>
    </ng-container>
  `,
})
export class MarketplaceComponent implements OnInit {
  auth = inject(AuthService);
  geo = inject(GeolocationService);
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

  nearMeActive = signal(false);
  selectedRadius = signal<number | null>(null);
  viewMode = signal<'list' | 'map'>('list');
  selectedMapTaskId = signal<number | null>(null);

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

  toggleNearMe() {
    if (this.viewMode() === 'map') {
      // Already in map → go back to list
      this.viewMode.set('list');
      this.nearMeActive.set(false);
      this.selectedRadius.set(null);
      this.resetAndLoad();
      return;
    }
    // Switch to map view
    this.viewMode.set('map');
    // Request geolocation
    this.geo.requestLocation().then(() => {
      this.nearMeActive.set(true);
      this.resetAndLoad();
    }).catch(() => {
      // Location denied — stay in map with default center
    });
  }

  onAreaSearch(event: { lat: number; lng: number; radius: number | null }) {
    this.loading.set(true);
    // When radius is "All" (null), fetch all tasks so the map shows every pin
    const limit = event.radius == null ? 1000 : this.pageSize;
    this.taskService
      .list({
        search: this.search || undefined,
        category_id: this.selectedCategory || undefined,
        status: 'open',
        page: 1,
        limit,
        lat: event.lat,
        lng: event.lng,
        radius: event.radius ?? undefined,
        sort: 'distance',
      })
      .subscribe({
        next: (res) => {
          this.tasks.set(res.data || []);
          this.total.set(res.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  onMapTaskSelected(taskId: number) {
    this.selectedMapTaskId.set(taskId || null);
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

  private buildGeoParams() {
    if (!this.nearMeActive()) return {};
    return {
      lat: this.geo.latitude() ?? undefined,
      lng: this.geo.longitude() ?? undefined,
      radius: this.selectedRadius() ?? undefined,
      sort: 'distance' as const,
    };
  }

  private loadTasks() {
    this.loading.set(true);
    const loadStart = Date.now();
    this.taskService
      .list({
        search: this.search || undefined,
        category_id: this.selectedCategory || undefined,
        status: 'open',
        page: this.page(),
        limit: this.pageSize,
        ...this.buildGeoParams(),
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
          if (remaining > 0) {
            setTimeout(apply, remaining);
          } else {
            apply();
          }
        },
        error: () => {
          const apply = () => { this.loading.set(false); this.error.set(true); };
          const remaining = Math.max(0, this.minLoadMs - (Date.now() - loadStart));
          if (remaining > 0) {
            setTimeout(apply, remaining);
          } else {
            apply();
          }
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
        status: 'open',
        page: nextPage,
        limit: this.pageSize,
        ...this.buildGeoParams(),
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
