import { Component, inject, OnInit, signal, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { UserService } from '../core/user.service';
import { AuthService } from '../core/auth.service';
import { User } from '../core/models';
import { VndPipe } from '../core/pipes';
import { NhannhtMetroCardComponent } from '../shared/components/nhannht-metro-card.component';
import { NhannhtMetroButtonComponent } from '../shared/components/nhannht-metro-button.component';
import { NhannhtMetroIconComponent } from '../shared/components/nhannht-metro-icon.component';
import { NhannhtMetroInputComponent } from '../shared/components/nhannht-metro-input.component';
import { NhannhtMetroDividerComponent } from '../shared/components/nhannht-metro-divider.component';
import { NhannhtMetroBadgeComponent } from '../shared/components/nhannht-metro-badge.component';
import { NhannhtMetroSpinnerComponent } from '../shared/components/nhannht-metro-spinner.component';
import { NhannhtMetroSnackbarService } from '../shared/services/nhannht-metro-snackbar.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    FormsModule,
    VndPipe,
    DecimalPipe,
    RouterLink,
    NhannhtMetroCardComponent,
    NhannhtMetroButtonComponent,
    NhannhtMetroIconComponent,
    NhannhtMetroInputComponent,
    NhannhtMetroDividerComponent,
    NhannhtMetroBadgeComponent,
    NhannhtMetroSpinnerComponent,
  ],
  template: `
    @if (loading()) {
      <div class="flex justify-center py-16">
        <nhannht-metro-spinner [size]="40" />
      </div>
    } @else if (user()) {
      <div class="flex flex-col gap-4 max-w-[700px] mx-auto">
        <nhannht-metro-card>
          <div class="flex gap-6 items-center mb-4 max-sm:flex-col max-sm:text-center">
            <div class="relative">
              @if (user()!.avatar_url) {
                <img [src]="user()!.avatar_url" alt="Avatar"
                     class="w-24 h-24 rounded-full object-cover border-2 border-fg">
              } @else {
                <nhannht-metro-icon name="account_circle" [size]="96" />
              }
              @if (isOwnProfile()) {
                <label class="absolute bottom-0 right-0 bg-fg text-bg rounded-full p-1.5 cursor-pointer"
                       for="avatar-input">
                  <nhannht-metro-icon name="camera_alt" [size]="18" />
                  <input id="avatar-input" type="file" accept="image/*"
                         (change)="onAvatarChange($event)" hidden>
                </label>
              }
            </div>
            <div>
              <h2 class="font-display text-xl tracking-[1px] text-fg m-0 mb-1">{{ user()!.name }}</h2>
              <p class="text-muted text-[13px] m-0 mb-1">{{ user()!.email }}</p>
              <p class="flex items-center gap-1 text-muted text-[13px] m-0 mb-2">
                <nhannht-metro-icon name="school" [size]="16" /> {{ user()!.university }}
              </p>
              @if (user()!.is_verified) {
                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 border border-fg text-fg text-[11px] font-bold tracking-[1px] mr-2">
                  <nhannht-metro-icon name="verified" [size]="14" /> VERIFIED
                </span>
              }
              @if (user()!.is_tasker) {
                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 border border-fg text-fg text-[11px] font-bold tracking-[1px]">
                  <nhannht-metro-icon name="handyman" [size]="14" /> TASKER
                </span>
              }
            </div>
          </div>

          <nhannht-metro-divider />

          <div class="grid grid-cols-4 max-sm:grid-cols-2 gap-4 my-5 text-center">
            <div class="flex flex-col items-center gap-1">
              <nhannht-metro-icon name="star" [size]="24" />
              <span class="text-lg font-bold font-body">{{ user()!.rating | number:'1.1-1' }}</span>
              <span class="font-display text-[10px] tracking-[1px] text-muted">RATING</span>
            </div>
            <div class="flex flex-col items-center gap-1">
              <nhannht-metro-icon name="task_alt" [size]="24" />
              <span class="text-lg font-bold font-body">{{ user()!.total_tasks_completed }}</span>
              <span class="font-display text-[10px] tracking-[1px] text-muted">COMPLETED</span>
            </div>
            <div class="flex flex-col items-center gap-1">
              <nhannht-metro-icon name="post_add" [size]="24" />
              <span class="text-lg font-bold font-body">{{ user()!.total_tasks_posted }}</span>
              <span class="font-display text-[10px] tracking-[1px] text-muted">POSTED</span>
            </div>
            <div class="flex flex-col items-center gap-1">
              <nhannht-metro-icon name="payments" [size]="24" />
              <span class="text-lg font-bold font-body">{{ user()!.total_earnings | vnd }}</span>
              <span class="font-display text-[10px] tracking-[1px] text-muted">EARNED</span>
            </div>
          </div>

          @if (user()!.bio) {
            <div class="mt-4">
              <h4 class="font-display text-[10px] tracking-[1px] text-muted m-0 mb-2">BIO</h4>
              <p class="font-body text-[13px] text-fg m-0">{{ user()!.bio }}</p>
            </div>
          }

          @if (user()!.tasker_skills?.length) {
            <div class="mt-4">
              <h4 class="font-display text-[10px] tracking-[1px] text-muted m-0 mb-2">SKILLS</h4>
              <div class="flex flex-wrap gap-2">
                @for (skill of user()!.tasker_skills; track skill) {
                  <nhannht-metro-badge [label]="skill" />
                }
              </div>
            </div>
          }

          @if (isOwnProfile()) {
            <nhannht-metro-divider />
            <div class="flex flex-wrap gap-3 mt-2">
              <nhannht-metro-button variant="secondary"
                [label]="editing() ? 'Cancel' : 'Edit Profile'"
                (clicked)="editing.set(!editing())" />
              @if (!user()!.is_tasker) {
                <nhannht-metro-button variant="secondary" label="Become Tasker"
                  (clicked)="becomeTasker()" />
              }
              <a routerLink="/my-jobs/posted"
                 class="font-body text-[13px] text-muted tracking-[1px] hover:text-fg transition-colors duration-200">
                My Posted Jobs &gt;
              </a>
              <a routerLink="/my-jobs/applied"
                 class="font-body text-[13px] text-muted tracking-[1px] hover:text-fg transition-colors duration-200">
                My Applied Jobs &gt;
              </a>
              <nhannht-metro-button variant="secondary" label="Logout"
                (clicked)="logout()" />
            </div>
          }
        </nhannht-metro-card>

        @if (editing()) {
          <nhannht-metro-card>
            <h3 class="font-display text-[11px] tracking-[2px] text-fg m-0 mb-4">EDIT PROFILE</h3>
            <form class="flex flex-col gap-1" (ngSubmit)="saveProfile()">
              <nhannht-metro-input label="NAME" [(ngModel)]="editName" name="name" />
              <nhannht-metro-input label="PHONE" [(ngModel)]="editPhone" name="phone" type="tel" />
              <nhannht-metro-input label="BIO" [(ngModel)]="editBio" name="bio"
                                   placeholder="Tell us about yourself" />
              <div class="mt-3">
                @if (saving()) {
                  <nhannht-metro-spinner [size]="20" label="Saving" />
                } @else {
                  <nhannht-metro-button variant="primary" label="Save Changes"
                    type="submit" />
                }
              </div>
            </form>
          </nhannht-metro-card>
        }
      </div>
    }
  `,
})
export class ProfileComponent implements OnInit {
  id = input.required<string>();

  private userService = inject(UserService);
  private auth = inject(AuthService);
  private snackbar = inject(NhannhtMetroSnackbarService);

  user = signal<User | null>(null);
  loading = signal(true);
  editing = signal(false);
  saving = signal(false);
  editName = '';
  editPhone = '';
  editBio = '';

  isOwnProfile() {
    return this.user()?.id === this.auth.currentUser()?.id;
  }

  ngOnInit() {
    const userId = Number(this.id());
    const req =
      userId === this.auth.currentUser()?.id
        ? this.userService.getMyProfile()
        : this.userService.getProfile(userId);

    req.subscribe({
      next: u => {
        this.user.set(u);
        this.editName = u.name;
        this.editPhone = u.phone ?? '';
        this.editBio = u.bio ?? '';
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  saveProfile() {
    this.saving.set(true);
    this.userService
      .updateProfile({
        name: this.editName,
        phone: this.editPhone || undefined,
        bio: this.editBio || undefined,
      })
      .subscribe({
        next: u => {
          this.user.set(u);
          this.editing.set(false);
          this.saving.set(false);
          this.snackbar.show('Profile updated', undefined, { duration: 3000 });
        },
        error: err => {
          this.saving.set(false);
          this.snackbar.show(err.error?.error || 'Update failed', undefined, { duration: 3000 });
        },
      });
  }

  onAvatarChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.userService.uploadAvatar(file).subscribe({
      next: u => {
        this.user.set(u);
        this.snackbar.show('Avatar updated', undefined, { duration: 3000 });
      },
      error: err =>
        this.snackbar.show(err.error?.error || 'Upload failed', undefined, { duration: 3000 }),
    });
  }

  logout() {
    this.auth.logout();
  }

  becomeTasker() {
    this.userService.becomeTasker().subscribe({
      next: u => {
        this.user.set(u);
        this.snackbar.show('You are now a tasker!', undefined, { duration: 3000 });
      },
      error: err =>
        this.snackbar.show(err.error?.error || 'Failed', undefined, { duration: 3000 }),
    });
  }
}
