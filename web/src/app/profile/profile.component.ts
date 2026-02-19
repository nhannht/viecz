import { Component, inject, OnInit, signal, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle, MatCardActions } from '@angular/material/card';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatDivider } from '@angular/material/divider';
import { MatChipSet, MatChip } from '@angular/material/chips';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { UserService } from '../core/user.service';
import { AuthService } from '../core/auth.service';
import { User } from '../core/models';
import { VndPipe } from '../core/pipes';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    FormsModule,
    MatCard,
    MatCardContent,
    MatCardHeader,
    MatCardTitle,
    MatCardActions,
    MatButton,
    MatIcon,
    MatFormField,
    MatLabel,
    MatInput,
    MatDivider,
    MatChipSet,
    MatChip,
    MatProgressSpinner,
    VndPipe,
    DecimalPipe,
    RouterLink,
  ],
  template: `
    @if (loading()) {
      <div class="loading"><mat-spinner diameter="40"></mat-spinner></div>
    } @else if (user()) {
      <div class="profile-page">
        <mat-card class="profile-card">
          <mat-card-content>
            <div class="profile-header">
              <div class="avatar-container">
                @if (user()!.avatar_url) {
                  <img [src]="user()!.avatar_url" alt="Avatar" class="avatar">
                } @else {
                  <mat-icon class="avatar-placeholder">account_circle</mat-icon>
                }
                @if (isOwnProfile()) {
                  <label class="avatar-upload" for="avatar-input">
                    <mat-icon>camera_alt</mat-icon>
                    <input id="avatar-input" type="file" accept="image/*"
                           (change)="onAvatarChange($event)" hidden>
                  </label>
                }
              </div>
              <div class="profile-info">
                <h2>{{ user()!.name }}</h2>
                <p class="email">{{ user()!.email }}</p>
                <p class="university">
                  <mat-icon>school</mat-icon> {{ user()!.university }}
                </p>
                @if (user()!.is_verified) {
                  <span class="verified-badge">
                    <mat-icon>verified</mat-icon> Verified
                  </span>
                }
                @if (user()!.is_tasker) {
                  <span class="tasker-badge">
                    <mat-icon>handyman</mat-icon> Tasker
                  </span>
                }
              </div>
            </div>

            <mat-divider></mat-divider>

            <div class="stats-grid">
              <div class="stat">
                <mat-icon>star</mat-icon>
                <span class="stat-value">{{ user()!.rating | number:'1.1-1' }}</span>
                <span class="stat-label">Rating</span>
              </div>
              <div class="stat">
                <mat-icon>task_alt</mat-icon>
                <span class="stat-value">{{ user()!.total_tasks_completed }}</span>
                <span class="stat-label">Completed</span>
              </div>
              <div class="stat">
                <mat-icon>post_add</mat-icon>
                <span class="stat-value">{{ user()!.total_tasks_posted }}</span>
                <span class="stat-label">Posted</span>
              </div>
              <div class="stat">
                <mat-icon>payments</mat-icon>
                <span class="stat-value">{{ user()!.total_earnings | vnd }}</span>
                <span class="stat-label">Earned</span>
              </div>
            </div>

            @if (user()!.bio) {
              <div class="bio-section">
                <h4>Bio</h4>
                <p>{{ user()!.bio }}</p>
              </div>
            }

            @if (user()!.tasker_skills?.length) {
              <div class="skills-section">
                <h4>Skills</h4>
                <mat-chip-set>
                  @for (skill of user()!.tasker_skills; track skill) {
                    <mat-chip>{{ skill }}</mat-chip>
                  }
                </mat-chip-set>
              </div>
            }
          </mat-card-content>

          @if (isOwnProfile()) {
            <mat-card-actions>
              <button mat-button (click)="editing.set(!editing())">
                <mat-icon>{{ editing() ? 'close' : 'edit' }}</mat-icon>
                {{ editing() ? 'Cancel' : 'Edit Profile' }}
              </button>
              @if (!user()!.is_tasker) {
                <button mat-button (click)="becomeTasker()">
                  <mat-icon>handyman</mat-icon> Become Tasker
                </button>
              }
              <a mat-button routerLink="/my-jobs/posted">
                <mat-icon>post_add</mat-icon> My Posted Jobs
              </a>
              <a mat-button routerLink="/my-jobs/applied">
                <mat-icon>work</mat-icon> My Applied Jobs
              </a>
              <button mat-button color="warn" (click)="logout()">
                <mat-icon>logout</mat-icon> Logout
              </button>
            </mat-card-actions>
          }
        </mat-card>

        @if (editing()) {
          <mat-card class="edit-card">
            <mat-card-header>
              <mat-card-title>Edit Profile</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <form class="edit-form" (ngSubmit)="saveProfile()">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Name</mat-label>
                  <input matInput [(ngModel)]="editName" name="name">
                </mat-form-field>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Phone</mat-label>
                  <input matInput [(ngModel)]="editPhone" name="phone">
                </mat-form-field>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Bio</mat-label>
                  <input matInput [(ngModel)]="editBio" name="bio"
                         maxlength="500" placeholder="Tell us about yourself">
                </mat-form-field>
                <button mat-raised-button type="submit" [disabled]="saving()">
                  @if (saving()) {
                    <mat-spinner diameter="20"></mat-spinner>
                  } @else {
                    Save Changes
                  }
                </button>
              </form>
            </mat-card-content>
          </mat-card>
        }
      </div>
    }
  `,
  styles: `
    .loading { display: flex; justify-content: center; padding: 64px 0; }
    .profile-page { display: flex; flex-direction: column; gap: 16px; max-width: 700px; margin: 0 auto; }
    .profile-header { display: flex; gap: 24px; align-items: center; margin-bottom: 16px; }
    .avatar-container { position: relative; }
    .avatar {
      width: 96px; height: 96px; border-radius: 50%; object-fit: cover;
      border: 3px solid var(--mat-sys-primary);
    }
    .avatar-placeholder {
      font-size: 96px; width: 96px; height: 96px;
      color: var(--mat-sys-on-surface-variant);
    }
    .avatar-upload {
      position: absolute; bottom: 0; right: 0;
      background: var(--mat-sys-primary);
      color: var(--mat-sys-on-primary);
      border-radius: 50%; padding: 6px;
      cursor: pointer;
    }
    .avatar-upload mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .profile-info h2 { margin: 0 0 4px; }
    .email { color: var(--mat-sys-on-surface-variant); margin: 0 0 4px; font-size: 0.875rem; }
    .university {
      display: flex; align-items: center; gap: 4px;
      color: var(--mat-sys-on-surface-variant); font-size: 0.875rem; margin: 0 0 8px;
    }
    .university mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .verified-badge, .tasker-badge {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 2px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 600;
      margin-right: 8px;
    }
    .verified-badge { background: #e3f2fd; color: #1565c0; }
    .tasker-badge { background: #e8f5e9; color: #2e7d32; }
    .verified-badge mat-icon, .tasker-badge mat-icon {
      font-size: 14px; width: 14px; height: 14px;
    }
    .stats-grid {
      display: grid; grid-template-columns: repeat(4, 1fr);
      gap: 16px; margin: 20px 0; text-align: center;
    }
    .stat { display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .stat mat-icon { color: var(--mat-sys-primary); }
    .stat-value { font-size: 1.1rem; font-weight: 700; }
    .stat-label { font-size: 0.75rem; color: var(--mat-sys-on-surface-variant); }
    .bio-section, .skills-section { margin-top: 16px; }
    .bio-section h4, .skills-section h4 {
      margin: 0 0 8px; color: var(--mat-sys-on-surface-variant); font-size: 0.875rem;
    }
    .edit-form { display: flex; flex-direction: column; gap: 4px; }
    .full-width { width: 100%; }
    @media (max-width: 600px) {
      .profile-header { flex-direction: column; text-align: center; }
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
    }
  `,
})
export class ProfileComponent implements OnInit {
  id = input.required<string>();

  private userService = inject(UserService);
  private auth = inject(AuthService);
  private snackBar = inject(MatSnackBar);

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
          this.snackBar.open('Profile updated', 'Close', { duration: 3000 });
        },
        error: err => {
          this.saving.set(false);
          this.snackBar.open(err.error?.error || 'Update failed', 'Close', { duration: 3000 });
        },
      });
  }

  onAvatarChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.userService.uploadAvatar(file).subscribe({
      next: u => {
        this.user.set(u);
        this.snackBar.open('Avatar updated', 'Close', { duration: 3000 });
      },
      error: err =>
        this.snackBar.open(err.error?.error || 'Upload failed', 'Close', { duration: 3000 }),
    });
  }

  logout() {
    this.auth.logout();
  }

  becomeTasker() {
    this.userService.becomeTasker().subscribe({
      next: u => {
        this.user.set(u);
        this.snackBar.open('You are now a tasker!', 'Close', { duration: 3000 });
      },
      error: err =>
        this.snackBar.open(err.error?.error || 'Failed', 'Close', { duration: 3000 }),
    });
  }
}
