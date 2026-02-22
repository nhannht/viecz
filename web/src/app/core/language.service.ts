import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TranslocoService } from '@jsverse/transloco';

const STORAGE_KEY = 'viecz_lang';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private transloco = inject(TranslocoService);
  private platformId = inject(PLATFORM_ID);

  init() {
    if (isPlatformBrowser(this.platformId)) {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && (stored === 'vi' || stored === 'en')) {
        this.transloco.setActiveLang(stored);
      } else {
        const browserLang = navigator.language?.split('-')[0];
        const lang = browserLang === 'vi' ? 'vi' : 'en';
        this.transloco.setActiveLang(lang);
      }
    }
  }

  get activeLang(): string {
    return this.transloco.getActiveLang();
  }

  setLanguage(lang: string) {
    this.transloco.setActiveLang(lang);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(STORAGE_KEY, lang);
    }
  }

  toggle() {
    const next = this.activeLang === 'vi' ? 'en' : 'vi';
    this.setLanguage(next);
  }
}
