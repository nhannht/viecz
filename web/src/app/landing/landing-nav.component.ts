import { Component, inject, signal, PLATFORM_ID, afterNextRender, HostListener } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { NhannhtMetroIconComponent } from '../shared/components/nhannht-metro-icon.component';
import { LanguageService } from '../core/language.service';

@Component({
  selector: 'app-landing-nav',
  standalone: true,
  imports: [RouterLink, TranslocoDirective, NhannhtMetroIconComponent],
  template: `
    <ng-container *transloco="let t">
      <nav class="landing-nav" [class.scrolled]="scrolled()" [class.visible]="visible()">
        <a routerLink="/landing" class="nav-logo font-display text-[13px] tracking-[2px] text-fg no-underline">
          {{ t('common.viecz') }}
        </a>
        <div class="nav-actions">
          <button class="lang-toggle" (click)="lang.toggle()"
                  [attr.title]="lang.activeLang === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'">
            {{ lang.activeLang === 'vi' ? '🇻🇳 VI' : '🇬🇧 EN' }}
          </button>
          <a routerLink="/login" class="sign-in-btn">
            {{ t('common.signIn') }}
          </a>
        </div>
      </nav>
    </ng-container>
  `,
  styles: `
    .landing-nav {
      position: fixed;
      top: 16px;
      left: 50%;
      transform: translateX(-50%) translateY(-12px);
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.5rem;
      padding: 10px 24px;
      border-radius: 20px;
      border: 1px solid rgba(255, 255, 255, 0.25);
      background: rgba(255, 255, 255, calc(0.20 + var(--whale-darkness, 0) * 0.35));
      backdrop-filter: blur(30px) saturate(150%);
      -webkit-backdrop-filter: blur(30px) saturate(150%);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
      min-width: 280px;
      max-width: 600px;
      width: 90vw;
      opacity: 0;
      transition: opacity 400ms ease, transform 400ms ease,
                  background 300ms ease, border-color 300ms ease, box-shadow 300ms ease;
    }
    .landing-nav.visible {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
    .landing-nav.scrolled {
      background: rgba(255, 255, 255, calc(0.25 + var(--whale-darkness, 0) * 0.40));
      border-color: rgba(255, 255, 255, calc(0.25 + var(--whale-darkness, 0) * 0.15));
      box-shadow: 0 4px 24px rgba(0, 0, 0, calc(0.08 + var(--whale-darkness, 0) * 0.12));
    }
    .nav-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .lang-toggle {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.25);
      color: var(--color-fg);
      padding: 4px 10px;
      font-family: var(--font-display);
      font-size: 9px;
      letter-spacing: 1px;
      cursor: pointer;
      border-radius: 10px;
      transition: background 200ms ease;
    }
    .lang-toggle:hover { background: rgba(255, 255, 255, 0.1); }
    .sign-in-btn {
      display: inline-flex;
      align-items: center;
      padding: 6px 16px;
      background: var(--color-fg);
      color: var(--color-bg);
      font-family: var(--font-display);
      font-size: 10px;
      letter-spacing: 1px;
      text-decoration: none;
      border-radius: 12px;
      transition: opacity 200ms ease;
    }
    .sign-in-btn:hover { opacity: 0.9; }
  `,
})
export class LandingNavComponent {
  lang = inject(LanguageService);
  private platformId = inject(PLATFORM_ID);
  scrolled = signal(false);
  visible = signal(false);

  constructor() {
    afterNextRender(() => {
      setTimeout(() => this.visible.set(true), 50);
    });
  }

  @HostListener('window:scroll')
  onScroll() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.scrolled.set(window.scrollY > 60);
  }
}
