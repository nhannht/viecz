import { Injectable, signal } from '@angular/core';

/**
 * Imperative snackbar service for showing toast notifications.
 *
 * Replaces `MatSnackBar` from Angular Material. The Shell component
 * renders an `<nhannht-metro-snackbar>` bound to this service's signals.
 */
@Injectable({ providedIn: 'root' })
export class NhannhtMetroSnackbarService {
  visible = signal(false);
  message = signal('');
  private timeout?: ReturnType<typeof setTimeout>;

  show(message: string, _action?: string, options?: { duration?: number; panelClass?: string }) {
    if (this.timeout) clearTimeout(this.timeout);
    this.message.set(message);
    this.visible.set(true);
    const duration = options?.duration ?? 4000;
    this.timeout = setTimeout(() => this.visible.set(false), duration);
  }

  dismiss() {
    if (this.timeout) clearTimeout(this.timeout);
    this.visible.set(false);
  }
}
