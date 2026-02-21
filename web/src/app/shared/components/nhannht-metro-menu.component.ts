import { Component, input, output, signal, ElementRef, HostListener } from '@angular/core';

/**
 * Dropdown menu triggered by an external button or element.
 *
 * Uses a simple open/close toggle with click-outside detection.
 * Menu items are projected via `<ng-content>` — wrap each item in a
 * `<button>` or `<a>` with the `nhannht-metro-menu-item` class.
 *
 * Replaces `MatMenu` / `MatMenuItem` / `MatMenuTrigger` from Angular Material.
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
      <div class="absolute right-0 top-full mt-1 bg-card border border-border z-50
                  min-w-[160px] font-body text-[13px]"
           role="menu">
        <ng-content />
      </div>
    }
  `,
  styles: `
    :host {
      position: relative;
      display: inline-block;
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
      background-color: var(--color-bg);
    }
    ::ng-deep .nhannht-metro-menu-item + .nhannht-metro-menu-item {
      border-top: 1px solid var(--color-border);
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
