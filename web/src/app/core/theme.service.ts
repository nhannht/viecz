import { Injectable, signal, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type Theme = 'light' | 'dracula';

const STORAGE_KEY = 'metro-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private platformId = inject(PLATFORM_ID);
  theme = signal<Theme>(this.loadTheme());

  setTheme(t: Theme): void {
    this.theme.set(t);
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.setItem(STORAGE_KEY, t);
    this.applyClass(t);
  }

  toggle(): void {
    this.setTheme(this.theme() === 'light' ? 'dracula' : 'light');
  }

  /** Apply the initial class on first browser render. */
  init(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.applyClass(this.theme());
  }

  private loadTheme(): Theme {
    if (typeof localStorage === 'undefined') return 'light';
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'dracula' ? 'dracula' : 'light';
  }

  private applyClass(t: Theme): void {
    const html = document.documentElement;
    if (t === 'dracula') {
      html.classList.add('dracula');
    } else {
      html.classList.remove('dracula');
    }
  }
}
