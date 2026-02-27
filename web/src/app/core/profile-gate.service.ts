import { Injectable, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { UserService } from './user.service';
import { Observable, throwError } from 'rxjs';
import { switchMap } from 'rxjs/operators';

/** Structured error returned by the server when profile is incomplete. */
export interface ProfileIncompleteResponse {
  error: 'profile_incomplete';
  missing_fields: string[];
  action: string;
  message: string;
}

/** Data passed to the profile completion drawer. */
export interface ProfileGateRequest {
  missingFields: string[];
  action: string;
  message: string;
  /** Called after the user fills in the fields and taps "Complete & [Action]". */
  onComplete: () => void;
}

/**
 * Detects profile_incomplete API errors and manages the inline completion
 * drawer. Components call `handleError()` in their error callbacks —
 * if the error is a profile gate, the drawer opens; otherwise, it rethrows.
 */
@Injectable({ providedIn: 'root' })
export class ProfileGateService {
  private userService = inject(UserService);

  /** Currently active gate request, if any. Drives the drawer visibility. */
  activeRequest = signal<ProfileGateRequest | null>(null);

  /** Whether the profile update is in progress. */
  saving = signal(false);

  /**
   * Checks whether an HTTP error is a profile_incomplete response.
   * Returns the parsed response if yes, null otherwise.
   */
  isProfileGate(err: HttpErrorResponse): ProfileIncompleteResponse | null {
    const body = err.error;
    if (err.status === 403 && body?.error === 'profile_incomplete') {
      return body as ProfileIncompleteResponse;
    }
    return null;
  }

  /**
   * Opens the profile completion drawer for the given gate response.
   * `retryFn` is called after the profile is successfully updated.
   */
  openGate(gate: ProfileIncompleteResponse, retryFn: () => void): void {
    this.activeRequest.set({
      missingFields: gate.missing_fields,
      action: gate.action,
      message: gate.message,
      onComplete: retryFn,
    });
  }

  /**
   * Updates the user's profile with the provided fields, then calls onComplete
   * to retry the original action.
   */
  submitProfile(fields: Record<string, string>): void {
    const request = this.activeRequest();
    if (!request) return;

    this.saving.set(true);
    this.userService.updateProfile(fields).subscribe({
      next: () => {
        this.saving.set(false);
        this.activeRequest.set(null);
        request.onComplete();
      },
      error: () => {
        this.saving.set(false);
      },
    });
  }

  /** Dismisses the drawer without completing. */
  dismiss(): void {
    this.activeRequest.set(null);
    this.saving.set(false);
  }
}
