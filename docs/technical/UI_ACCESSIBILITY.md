# UI Accessibility Audit

**Project:** Viecz - Angular Web Client
**Last Updated:** 2026-02-21
**Scope:** nhannht-metro design system + shared components + shell layout

---

## Current Status

Overall coverage: **~70%** of components have adequate accessibility.

The nhannht-metro design system has good foundational accessibility: proper ARIA attributes on form inputs, semantic HTML, and screen reader support on indicators. Key gaps exist in keyboard navigation (menu, dialog) and landmark labeling (shell).

**Critical gaps:** dialog focus trap, menu keyboard navigation, shell landmarks.

---

## Component ARIA Audit

### Design System Components

| Component | ARIA Attributes | Semantic HTML | Status |
|-----------|----------------|---------------|--------|
| nhannht-metro-input | aria-label, aria-invalid, aria-describedby (error role="alert") | `<label>` + `<input>` with for/id | Done |
| nhannht-metro-textarea | aria-label, aria-invalid, error role="alert" | `<label>` + `<textarea>` with for/id | Partial (missing aria-describedby) |
| nhannht-metro-select | aria-label, error role="alert" | `<label>` + native `<select>` with for/id | Done |
| nhannht-metro-datepicker | aria-label, error role="alert" | `<label>` + `<input type="date">` with for/id | Partial (missing aria-describedby) |
| nhannht-metro-button | disabled attribute | `<button>` with type | Partial (no aria-disabled) |
| nhannht-metro-spinner | role="progressbar", aria-label="Loading" | `<div>` | Done |
| nhannht-metro-icon | aria-hidden (default true), aria-label when ariaHidden=false | `<span>` wrapping Material Icons | Done |
| nhannht-metro-badge | None needed (text content is self-descriptive) | `<span>` | Done |
| nhannht-metro-divider | Implicit separator role | `<hr>` | Done |
| nhannht-metro-card | None needed (presentational) | `<div>` with ng-content | Done |
| nhannht-metro-dialog | role="dialog", aria-modal="true", aria-label | `<div>` overlay | Partial (no focus trap, no Escape, no focus restore) |
| nhannht-metro-snackbar | role="status", aria-live="polite" | `<div>` | Done |
| nhannht-metro-tabs | role="tablist", role="tab", aria-selected, role="tabpanel" | `<div>` + `<button>` tabs | Done |
| nhannht-metro-nav | None | `<nav>` element | Partial (missing aria-label) |
| nhannht-metro-menu | role="menu", Escape key handler | `<div>` | Partial (no focus trap, no menuitem roles, no arrow key nav) |
| nhannht-metro-task-card | None needed | `<a>` link with `<h3>` heading | Done |
| nhannht-metro-application-card | None needed | Heading hierarchy, link, button | Done |
| nhannht-metro-chat-bubble | None | `<div>` | Done (minor: read receipt icon could use aria-label) |
| nhannht-metro-transaction-row | None needed | `<div>` with text hierarchy | Done |
| nhannht-metro-price-card | None | `<h3>` heading, `<ul>/<li>` features | Partial (POPULAR badge is visual only) |
| nhannht-metro-step | None | `<h3>` heading | Partial (no list semantics for sequential steps) |

### Shared Components

| Component | ARIA Attributes | Semantic HTML | Status |
|-----------|----------------|---------------|--------|
| app-empty-state | None | `<h3>` heading, button | Partial (icon needs aria-label) |
| app-error-fallback | None | `<h3>` heading, button | Partial (icon needs aria-label) |
| app-loading-skeleton | None | `<div>` | Done (should add aria-hidden="true") |
| app-message-bubble | None | `<div>` | Partial (no semantic structure) |
| app-task-card | None needed | `<a>` link, `<h3>` heading | Done |
| app-category-chips | None | `<button>` elements | Partial (no aria-pressed/aria-current for selected state) |
| app-application-card | None | Material MatCard | Missing (needs migration to nhannht-metro) |

### Shell Layout

- Has `<main>` landmark with router-outlet
- `<nav>` element but missing `aria-label`
- No skip-to-main link
- Notification badge count not labeled for screen readers
- Menu icons (notifications, account) lack aria-labels

---

## Known Gaps

| Gap | Component(s) | Severity | Remediation |
|-----|-------------|----------|-------------|
| No focus trap in dialog | nhannht-metro-dialog | High | Add cdkTrapFocus from @angular/cdk |
| No Escape key for dialog | nhannht-metro-dialog | High | Add @HostListener('document:keydown.escape') |
| No focus restoration on dialog close | nhannht-metro-dialog | High | Store trigger element ref, restore on close |
| No keyboard nav in menu | nhannht-metro-menu | High | Implement Arrow Up/Down, Home/End key handlers |
| No role="menuitem" on items | nhannht-metro-menu | Medium | Document that projected items need role="menuitem" |
| No focus management in menu | nhannht-metro-menu | High | Move focus into menu on open |
| No skip-to-main link | Shell | Medium | Add `<a href="#main" class="sr-only">Skip to content</a>` |
| No aria-label on nav | Shell | Medium | Add aria-label="Main navigation" to `<nav>` |
| Notification badge unlabeled | Shell | Low | Add aria-label with unread count |
| Icon buttons unlabeled | Shell | Medium | Add aria-label to notification + account icon buttons |
| Missing aria-describedby | Textarea, Datepicker | Low | Link error span via aria-describedby like Input does |
| No aria-pressed on category chips | category-chips | Low | Add aria-pressed to selected category button |
| Loading skeleton not hidden | loading-skeleton | Low | Add aria-hidden="true" to container |
| Price card popular badge visual-only | price-card | Low | Add aria-label or sr-only text |

---

## Keyboard Navigation Status

| Component | Enter | Space | Escape | Arrow Keys | Tab |
|-----------|-------|-------|--------|------------|-----|
| nhannht-metro-button | Native | Native | -- | -- | Native |
| nhannht-metro-input | -- | -- | -- | -- | Native |
| nhannht-metro-select | Native | Native | -- | Native (browser) | Native |
| nhannht-metro-dialog | -- | -- | Missing | -- | No trap |
| nhannht-metro-menu | -- | -- | Yes (closes) | Missing | No trap |
| nhannht-metro-tabs | Native (button) | Native | -- | -- | Native |
| nhannht-metro-nav | Native (links) | -- | -- | -- | Native |
| FAB button | Native (link) | -- | -- | -- | Native |
| category-chips | Native (buttons) | Native | -- | -- | Native |

---

## Guidelines for New Components

Checklist for every new component:

1. Use semantic HTML (`<button>`, `<nav>`, `<dialog>`, `<ul>`, `<label>`)
2. All interactive elements must be keyboard accessible (Tab + Enter/Space)
3. Form inputs need `<label>` with for/id linking
4. Error states need role="alert" + aria-describedby
5. Decorative icons: aria-hidden="true". Semantic icons: aria-label
6. Modals: focus trap + Escape to close + focus restoration
7. Loading states: aria-live="polite" or role="status"
8. Color must not be the only indicator -- always pair with text/icon

---

## Testing Tools

| Tool | Purpose | When to Use |
|------|---------|-------------|
| axe-core | Automated WCAG audit | After each component migration |
| Lighthouse a11y | Page-level audit score | Before and after migration |
| Keyboard-only testing | Tab through entire page | Every page after migration |
| Screen reader (NVDA/VoiceOver) | Real user experience | Auth + wallet flows (critical) |
| Chrome DevTools a11y tree | Inspect ARIA tree | When debugging specific components |
