import { Injectable, signal, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type Theme = 'light' | 'sang-frostglass' | 'dracula';

export const THEMES: Theme[] = ['light', 'sang-frostglass', 'dracula'];
const THEME_CLASSES: Theme[] = ['sang-frostglass', 'dracula'];
const STORAGE_KEY = 'metro-theme';

export const THEME_META: Record<Theme, { label: string; colors: string[] }> = {
  'light':           { label: 'Light',      colors: ['#f0ede8', '#1a1a1a', '#6b6b6b', '#d4d0ca', '#ffffff'] },
  'sang-frostglass': { label: 'Frostglass', colors: ['#FCFCF9', '#191C1D', '#21808D', '#5E6C70', '#32B8C6'] },
  'dracula':         { label: 'Dracula',    colors: ['#282A36', '#F8F8F2', '#BD93F9', '#6272A4', '#44475A'] },
};

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
