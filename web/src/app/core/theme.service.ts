import { Injectable, signal, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type Theme = 'light' | 'sang-frostglass' | 'dracula';

const THEMES: Theme[] = ['light', 'sang-frostglass', 'dracula'];
const THEME_CLASSES: Theme[] = ['sang-frostglass', 'dracula'];
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
    const current = this.theme();
    const idx = THEMES.indexOf(current);
    this.setTheme(THEMES[(idx + 1) % THEMES.length]);
  }

  /** Apply the initial class on first browser render. */
  init(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.applyClass(this.theme());
  }

  private loadTheme(): Theme {
    if (typeof localStorage === 'undefined') return 'light';
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && THEMES.includes(stored as Theme)) return stored as Theme;
    return 'light';
  }

  private applyClass(t: Theme): void {
    const html = document.documentElement;
    THEME_CLASSES.forEach(cls => html.classList.remove(cls));
    if (t !== 'light') {
      html.classList.add(t);
    }
  }
}
