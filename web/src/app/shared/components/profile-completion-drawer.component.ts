import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { ProfileGateService } from '../../core/profile-gate.service';
import { AuthService } from '../../core/auth.service';
import { VieczInputComponent } from './viecz-input.component';
import { VieczTextareaComponent } from './viecz-textarea.component';
import { VieczButtonComponent } from './viecz-button.component';
import { VieczSpinnerComponent } from './viecz-spinner.component';
import { VieczIconComponent } from './viecz-icon.component';

/**
 * Inline bottom-sheet drawer that appears when a user tries to perform an action
 * but their profile is missing required fields. Shows only the missing fields
 * with contextual messaging. On submit, updates profile and retries the action.
 *
 * Driven entirely by `ProfileGateService.activeRequest` signal — when non-null,
 * the drawer slides up. When the user completes or dismisses, it slides away.
 */
@Component({
  selector: 'app-profile-completion-drawer',
  standalone: true,
  imports: [
    FormsModule,
    TranslocoDirective,
    VieczInputComponent,
    VieczTextareaComponent,
    VieczButtonComponent,
    VieczSpinnerComponent,
    VieczIconComponent,
  ],
  template: `
    @if (gate.activeRequest(); as req) {
      <ng-container *transloco="let t">
        <!-- backdrop -->
        <div class="fixed inset-0 z-50 flex items-end justify-center"
             (click)="onBackdropClick($event)">
          <div class="absolute inset-0 bg-fg/20 transition-opacity"></div>

          <!-- drawer -->
          <div class="relative z-10 w-full max-w-[560px] bg-card border border-border border-b-0
                      animate-slide-up mx-auto">
            <!-- handle -->
            <div class="flex justify-center pt-3 pb-1">
              <div class="w-10 h-1 bg-border rounded-full"></div>
            </div>

            <div class="px-6 pb-6">
              <!-- header -->
              <div class="flex items-start gap-3 mb-4">
                <viecz-icon name="person" [size]="20" />
                <div>
                  <h3 class="font-display text-[11px] tracking-[1px] text-fg m-0">
                    {{ heading(t, req.missingFields) }}
                  </h3>
                  <p class="font-body text-[12px] text-muted mt-1 mb-0">
                    {{ contextMessage(t, req.action, req.missingFields) }}
                  </p>
                </div>
              </div>

              <!-- fields -->
              <form class="flex flex-col gap-3" (ngSubmit)="onSubmit()">
                @if (req.missingFields.includes('name')) {
                  <viecz-input
                    [label]="t('profileGate.nameLabel')"
                    [placeholder]="t('profileGate.namePlaceholder')"
                    [(ngModel)]="name"
                    name="name"
                    [error]="submitted && !name.trim() ? t('profileGate.nameRequired') : ''" />
                }

                @if (req.missingFields.includes('bio')) {
                  <viecz-textarea
                    [label]="t('profileGate.bioLabel')"
                    [placeholder]="t('profileGate.bioPlaceholder')"
                    [rows]="3"
                    [(ngModel)]="bio"
                    name="bio"
                    [error]="submitted && !bio.trim() ? t('profileGate.bioRequired') : ''" />
                }

                <!-- actions -->
                <div class="flex items-center justify-between pt-2">
                  <a class="font-body text-[11px] text-muted underline cursor-pointer hover:text-fg transition-colors"
                     (click)="goToProfile()">
                    {{ t('profileGate.goToProfile') }}
                  </a>

                  <div class="flex gap-3">
                    <viecz-button
                      variant="secondary"
                      [label]="t('profileGate.notNow')"
                      type="button"
                      (clicked)="gate.dismiss()" />

                    @if (gate.saving()) {
                      <viecz-spinner size="sm" />
                    } @else {
                      <viecz-button
                        variant="primary"
                        type="submit">
                        <span class="inline-flex items-center gap-2">
                          <viecz-icon name="check" [size]="16" />
                          {{ buttonLabel(t, req.action) }}
                        </span>
                      </viecz-button>
                    }
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </ng-container>
    }
  `,
  styles: [`
    @keyframes slideUp {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }
    .animate-slide-up {
      animation: slideUp 0.25s ease-out;
    }
  `],
})
export class ProfileCompletionDrawerComponent {
  gate = inject(ProfileGateService);
  private router = inject(Router);
  private auth = inject(AuthService);

  name = '';
  bio = '';
  submitted = false;

  heading(t: (key: string) => string, missingFields: string[]): string {
    if (missingFields.includes('name') && missingFields.includes('bio')) {
      return t('profileGate.headingBoth');
    }
    if (missingFields.includes('name')) return t('profileGate.headingName');
    if (missingFields.includes('bio')) return t('profileGate.headingBio');
    return t('profileGate.headingBoth');
  }

  contextMessage(t: (key: string) => string, action: string, missingFields: string[]): string {
    switch (action) {
      case 'post_task': return t('profileGate.messagePostTask');
      case 'apply_task':
        return missingFields.includes('bio')
          ? t('profileGate.messageApplyTask')
          : t('profileGate.messageApplyTaskName');
      case 'send_message': return t('profileGate.messageSendMessage');
      default: return t('profileGate.messageDefault');
    }
  }

  buttonLabel(t: (key: string) => string, action: string): string {
    switch (action) {
      case 'post_task': return t('profileGate.completeAndPost');
      case 'apply_task': return t('profileGate.completeAndApply');
      case 'send_message': return t('profileGate.completeAndSend');
      default: return t('profileGate.completeAndContinue');
    }
  }

  goToProfile(): void {
    this.gate.dismiss();
    const user = this.auth.currentUser();
    if (user) {
      this.router.navigate(['/profile', user.id]);
    }
  }

  onSubmit(): void {
    this.submitted = true;
    const req = this.gate.activeRequest();
    if (!req) return;

    const fields: Record<string, string> = {};
    if (req.missingFields.includes('name')) {
      if (!this.name.trim()) return;
      fields['name'] = this.name.trim();
    }
    if (req.missingFields.includes('bio')) {
      if (!this.bio.trim()) return;
      fields['bio'] = this.bio.trim();
    }

    this.gate.submitProfile(fields);
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('fixed')) {
      this.gate.dismiss();
    }
  }
}
