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
import { NhannhtMetroButtonComponent } from '../shared/components/nhannht-metro-button.component';
import { NhannhtMetroAsciiArtComponent } from '../shared/components/nhannht-metro-ascii-art.component';
import { TaskCardComponent } from '../shared/components/task-card.component';
import { LoadingSkeletonComponent } from '../shared/components/loading-skeleton.component';
import { ErrorFallbackComponent } from '../shared/components/error-fallback.component';
import { MarketplaceMapComponent } from './marketplace-map.component';

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
    NhannhtMetroButtonComponent,
    NhannhtMetroAsciiArtComponent,
    CategoryChipsComponent,
    TaskCardComponent,
    LoadingSkeletonComponent,
    ErrorFallbackComponent,
    MarketplaceMapComponent,
  ],
  template: `
    <ng-container *transloco="let t">
    <div class="py-2 relative min-h-[60vh]">
      @if (!auth.isAuthenticated()) {
        <div class="border-2 border-fg p-8 mb-6">
          <div class="flex items-center justify-center gap-5 mb-6">
            <div class="w-[100px] sm:w-[120px] shrink-0">
              <nhannht-metro-ascii-art
                src="/mascot-ascii.svg"
                [width]="452"
                [height]="380"
                alt="Viecz mascot"
              />
            </div>
            <div class="text-center">
              <h1 class="font-display text-[16px] tracking-[3px] mb-2">{{ t('marketplace.heroTitle') }}</h1>
              <p class="font-body text-[14px] text-muted">{{ t('marketplace.heroSubtitle') }}</p>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-8 mb-6 max-w-[480px] mx-auto">
            <div class="text-center border-b-2 border-fg pb-3">
              <span class="font-display text-[24px] block">{{ total() }}+</span>
              <span class="font-display text-[9px] tracking-[1px] text-muted">{{ t('marketplace.tasksPosted') }}</span>
            </div>
            <div class="text-center border-b-2 border-fg pb-3">
              <span class="font-display text-[24px] block">11</span>
              <span class="font-display text-[9px] tracking-[1px] text-muted">{{ t('marketplace.categories') }}</span>
            </div>
            <div class="text-center border-b-2 border-fg pb-3">
              <span class="font-display text-[24px] block">0%</span>
              <span class="font-display text-[9px] tracking-[1px] text-muted">{{ t('marketplace.platformFee') }}</span>
            </div>
          </div>

          <div class="mb-6 max-w-[540px] mx-auto">
            <h4 class="font-display text-[10px] tracking-[2px] text-muted mb-4 text-center">{{ t('marketplace.howItWorks') }}</h4>
            <div class="grid grid-cols-3 gap-4 text-center">
              <div>
                <span class="inline-flex items-center justify-center w-8 h-8 border-2 border-fg font-display text-[11px] mb-2">1</span>
                <p class="font-display text-[10px] tracking-[1px]">{{ t('marketplace.step1Title') }}</p>
                <p class="font-body text-[11px] text-muted mt-1">{{ t('marketplace.step1Desc') }}</p>
              </div>
              <div>
                <span class="inline-flex items-center justify-center w-8 h-8 border-2 border-fg font-display text-[11px] mb-2">2</span>
                <p class="font-display text-[10px] tracking-[1px]">{{ t('marketplace.step2Title') }}</p>
                <p class="font-body text-[11px] text-muted mt-1">{{ t('marketplace.step2Desc') }}</p>
              </div>
              <div>
                <span class="inline-flex items-center justify-center w-8 h-8 border-2 border-fg font-display text-[11px] mb-2">3</span>
                <p class="font-display text-[10px] tracking-[1px]">{{ t('marketplace.step3Title') }}</p>
                <p class="font-body text-[11px] text-muted mt-1">{{ t('marketplace.step3Desc') }}</p>
              </div>
            </div>
          </div>

          <div class="flex justify-center gap-4 items-center">
            <a routerLink="/phone">
              <nhannht-metro-button variant="primary" [label]="t('marketplace.getStarted')" />
            </a>
            <a routerLink="/phone" class="font-body text-[13px] text-fg hover:opacity-70 transition-opacity">
              {{ t('marketplace.signInLink') }}
            </a>
          </div>
        </div>
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
                  flex items-center justify-center cursor-pointer
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
    this.taskService
      .list({
        search: this.search || undefined,
        category_id: this.selectedCategory || undefined,
        status: 'open',
        page: 1,
        limit: this.pageSize,
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
