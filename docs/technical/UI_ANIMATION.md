# UI Animation & Transition Patterns

**Last Updated:** 2026-02-21
**Scope:** Angular web client (`web/`)
**Design System:** nhannht-metro-meow

---

## 1. Duration Scale

| Duration | Tailwind Class | CSS Value | Usage |
|----------|---------------|-----------|-------|
| 150ms | `duration-150` (default) | `transition-duration: 150ms` | Opacity transitions on icons/links |
| 200ms | `duration-200` | `0.2s` | Link color, input focus border, secondary button, nav link color |
| 250ms | `duration-250` | `0.25s` | Primary button hover (bg + text invert) |
| 300ms | `duration-300` | `0.3s` | Card hover (lift + shadow), price card hover |
| 1500ms | N/A (keyframe) | `1.5s` | Loading skeleton shimmer animation |

---

## 2. Easing Functions

| Easing | CSS Value | Usage |
|--------|-----------|-------|
| Default (ease) | `ease` | All transitions |
| Linear | `linear` | Not used |

No custom `cubic-bezier` curves. All transitions use CSS default `ease`.

---

## 3. Hover Effects

### Button Primary (invert)

```css
/* Resting: bg-fg text-bg border-fg */
/* Hover: bg-transparent text-fg */
transition: all 0.25s;
```

Full color inversion -- dark background becomes transparent, light text becomes dark.

### Button Secondary (color shift)

```css
/* Resting: text-muted, no bg, no border */
/* Hover: text-fg */
transition: color 0.2s;
```

Muted text darkens. Appends ` >` via `::after`.

### Card Hover (lift + shadow)

```css
/* Only when hoverable=true */
/* Hover: border-fg, translateY(-2px), box-shadow: 0 4px 20px rgba(0,0,0,0.08) */
transition: all 0.3s;
```

### Nav Link / List Item (color)

```css
/* Resting: text-muted */
/* Hover: text-fg */
transition: color 0.2s;
```

### Icon/Link Opacity

```css
/* Hover: opacity-80 */
transition: opacity; /* default 150ms */
```

### FAB (Floating Action Button)

```css
/* Resting: bg-fg text-bg border-2 border-fg */
/* Hover: bg-transparent text-fg */
transition: all 0.2s;
```

### Notification Item

```css
/* Hover: bg-bg */
transition: colors 0.15s;
```

---

## 4. Loading Animations

### Spinner (rotate)

```html
<div class="inline-block border-2 border-border border-t-fg animate-spin"></div>
```

| Property | Value |
|----------|-------|
| Animation | `animate-spin` (360deg, 1s linear infinite) |
| Top border | `--fg` color |
| Other borders | `--border` color |
| Size | Configurable via `[size]` input (px) |

### Skeleton Shimmer

```css
.skeleton-line {
  background: linear-gradient(90deg,
    var(--color-border) 25%,
    var(--color-card) 50%,
    var(--color-border) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

| Property | Value |
|----------|-------|
| Duration | 1.5s infinite |
| Direction | Horizontal gradient sweep (border -> card -> border) |
| Variants | Card (4 lines), List (circle + 2 lines), Line (single) |

---

## 5. Page Transitions

**Status:** Not implemented.

Angular Router does not use route transition animations. Navigation is instant.

The nhannht-metro-meow reference implementation uses Intersection Observer fade-in (`opacity` + `translateY`) for on-scroll reveals, but this is not used in the Angular app.

**Future:** If added, use Angular `@angular/animations` or CSS `view-transition-api`. Cap at 200ms.

---

## 6. Design System Reference Animations

Animations defined in the nhannht-metro-meow reference and their adoption status in the Angular app:

| Animation | Duration | Used in Angular? |
|-----------|----------|-----------------|
| Nav link color | 0.2s | Yes (shell navbar) |
| Button primary hover | 0.25s | Yes |
| Button secondary color | 0.2s | Yes |
| Card hover (lift + shadow) | 0.3s | Yes |
| Intersection Observer fade-in | 0.6s | No |
| Scroll indicator bob | 2s infinite | No |
| Canvas glitch effects | 60fps loop | No (reference site only) |

---

## 7. Guidelines

| # | Rule |
|---|------|
| 1 | **Use the duration scale** -- pick from 150/200/250/300ms. No custom durations. |
| 2 | **No custom easing** -- use CSS default `ease`. If specific easing is needed, add to design tokens first. |
| 3 | **Respect `prefers-reduced-motion`** -- not yet implemented. Future: wrap in `@media (prefers-reduced-motion: no-preference) { ... }`. |
| 4 | **Hover only on desktop** -- touch devices lack hover. All hover effects must be purely decorative. |
| 5 | **Subtle loading indicators** -- only Spinner (rotate) and Skeleton (shimmer). No bouncing dots, pulsing circles, etc. |
| 6 | **No page transitions yet** -- keep navigation instant. If added later, cap at 200ms. |
| 7 | **Button state feedback** -- primary buttons invert colors on hover (most visible). Secondary buttons shift text color only. |
