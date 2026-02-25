import { Injectable, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class FirebasePhoneAuthService {
  private platformId = inject(PLATFORM_ID);
  private app: any = null;
  private auth: any = null;
  private confirmationResult: any = null;
  private recaptchaVerifier: any = null;

  sending = signal(false);
  verifying = signal(false);
  codeSent = signal(false);

  private async ensureInitialized() {
    if (this.app) return;
    if (!isPlatformBrowser(this.platformId)) return;
    if (!environment.firebase.apiKey) return;

    const { initializeApp } = await import('firebase/app');
    this.app = initializeApp(environment.firebase);

    const { getAuth } = await import('firebase/auth');
    this.auth = getAuth(this.app);
  }

  async sendVerificationCode(phoneNumber: string, buttonId: string): Promise<void> {
    await this.ensureInitialized();
    if (!this.auth) throw new Error('Firebase not configured');

    this.sending.set(true);
    try {
      const { RecaptchaVerifier, signInWithPhoneNumber } = await import('firebase/auth');

      if (this.recaptchaVerifier) {
        this.recaptchaVerifier.clear();
        this.recaptchaVerifier = null;
      }
      const container = document.getElementById(buttonId);
      if (container) container.innerHTML = '';

      this.recaptchaVerifier = new RecaptchaVerifier(this.auth, buttonId, {
        size: 'invisible',
      });

      this.confirmationResult = await signInWithPhoneNumber(
        this.auth,
        phoneNumber,
        this.recaptchaVerifier,
      );
      this.codeSent.set(true);
    } finally {
      this.sending.set(false);
    }
  }

  async confirmCode(code: string): Promise<string> {
    if (!this.confirmationResult) throw new Error('No verification in progress');

    this.verifying.set(true);
    try {
      const result = await this.confirmationResult.confirm(code);
      const idToken = await result.user.getIdToken(true);
      return idToken;
    } finally {
      this.verifying.set(false);
    }
  }

  reset() {
    this.confirmationResult = null;
    this.codeSent.set(false);
    this.sending.set(false);
    this.verifying.set(false);
    if (this.recaptchaVerifier) {
      this.recaptchaVerifier.clear();
      this.recaptchaVerifier = null;
    }
    // Clear leftover reCAPTCHA DOM elements that .clear() misses
    if (isPlatformBrowser(this.platformId)) {
      const container = document.getElementById('phone-verify-recaptcha');
      if (container) container.innerHTML = '';
    }
  }
}
