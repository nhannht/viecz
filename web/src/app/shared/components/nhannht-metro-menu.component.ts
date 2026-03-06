import { Component, input, output, ElementRef, HostListener } from '@angular/core';

/**
 * Dropdown menu triggered by an external button or element.
 *
 * Uses a simple open/close toggle with click-outside detection.
 * Menu items are projected via `<ng-content>` — wrap each item in a
 * `<button>` or `<a>` with the `nhannht-metro-menu-item` class.
 *
 * @example
 * ```html
 * <nhannht-metro-menu [open]="menuOpen()" (closed)="menuOpen.set(false)">
 *   <button class="nhannht-metro-menu-item" (click)="onProfile()">Profile</button>
 *   <button class="nhannht-metro-menu-item" (click)="onLogout()">Logout</button>
 * </nhannht-metro-menu>
 * ```
 */
@Component({
  selector: 'nhannht-metro-menu',
  standalone: true,
  template: `
    @if (open()) {
      <div class="menu-panel" role="menu">
        <ng-content />
      </div>
    }
  `,
  styles: `
    :host {
      position: relative;
      display: inline-block;
    }
    .menu-panel {
      position: absolute;
      right: 0;
      top: calc(100% + 6px);
      min-width: 160px;
      background: color-mix(in srgb, var(--color-bg) 92%, transparent);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid color-mix(in srgb, var(--color-border) 60%, transparent);
      border-radius: 12px;
      box-shadow: 0 8px 32px color-mix(in srgb, var(--color-fg) 10%, transparent),
                  0 2px 8px color-mix(in srgb, var(--color-fg) 5%, transparent);
      z-index: 50;
      overflow: hidden;
      animation: menu-enter 180ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes menu-enter {
      from { opacity: 0; transform: translateY(-6px) scale(0.96); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    ::ng-deep .nhannht-metro-menu-item {
      display: block;
      width: 100%;
      padding: 10px 16px;
      text-align: left;
      font-family: var(--font-body);
      font-size: 13px;
      color: var(--color-fg);
      background: transparent;
      border: none;
      cursor: pointer;
      transition: background-color 0.15s;
      text-decoration: none;
    }
    ::ng-deep .nhannht-metro-menu-item:hover {
      background-color: color-mix(in srgb, var(--color-fg) 5%, transparent);
    }
    ::ng-deep .nhannht-metro-menu-item + .nhannht-metro-menu-item {
      border-top: 1px solid color-mix(in srgb, var(--color-border) 40%, transparent);
    }
  `,
})
export class NhannhtMetroMenuComponent {
  /** Controls menu visibility. */
  open = input(false);

  /** Emits when the menu should close (click outside or Escape key). */
  closed = output<void>();

  constructor(private el: ElementRef) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.open() && !this.el.nativeElement.contains(event.target)) {
      this.closed.emit();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.open()) {
      this.closed.emit();
    }
  }
}
