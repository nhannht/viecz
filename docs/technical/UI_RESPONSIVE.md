# Responsive Design Patterns (Web Client)

**Last Updated:** 2026-02-21
**Framework:** Angular 21 + Tailwind CSS 4
**Design System:** nhannht-metro-meow (see [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md))

---

## 1. Breakpoints

| Breakpoint | Min Width | Source | Usage in Viecz |
|------------|-----------|--------|----------------|
| `sm` | 640px | Tailwind default | Task card grid switches from 1-col to auto-fill |
| `md` | 768px | Tailwind default | Not heavily used |
| `lg` | 1024px | Tailwind default | Not heavily used |
| `xl` | 1280px | Tailwind default | Not used |
| Custom | `max-width: 600px` | Component CSS | Nav labels hidden, form rows stack, shell padding reduced, profile header stacks |
| Custom | `min-width: 960px` | Component CSS | Task detail switches to 2-column layout |
| Design system ref | 900px | DESIGN_SYSTEM.md | nhannht-metro-meow reference breakpoint (not directly used in app) |

No custom Tailwind breakpoints are defined. The project uses Tailwind 4 defaults plus two `@media` queries in component styles.

---

## 2. Grid Strategies

### 2.1 Marketplace Task Grid

```
grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4
```

| Viewport | Columns | Card Min Width |
|----------|---------|----------------|
| < 640px | 1 | Full width |
| >= 640px | auto-fill | 320px |

Gap: 16px (`gap-4`).

### 2.2 My Jobs Task Grid

```
grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4
```

| Viewport | Columns | Card Min Width |
|----------|---------|----------------|
| < 640px | 1 | Full width |
| >= 640px | auto-fill | 300px |

### 2.3 Profile Stats Grid

```css
.stats-grid { grid-template-columns: repeat(4, 1fr); gap: 16px; }
@media (max-width: 600px) { grid-template-columns: repeat(2, 1fr); }
```

| Viewport | Layout | Cells |
|----------|--------|-------|
| > 600px | 4 columns | Rating / Completed / Posted / Earned |
| <= 600px | 2x2 grid | Same cells, wrapped |

### 2.4 Task Detail Two-Column

```css
.detail-page { grid-template-columns: 1fr; gap: 16px; }
@media (min-width: 960px) { grid-template-columns: 2fr 1fr; }
```

| Viewport | Layout |
|----------|--------|
| < 960px | Single column (stacked) |
| >= 960px | Main content (2fr) + applications sidebar (1fr) |

### 2.5 Task Form Two-Column Row

```css
.form-row { display: flex; gap: 16px; }
@media (max-width: 600px) {
  .form-row { flex-direction: column; }
  .half-width { width: 100%; }
}
```

| Viewport | Layout |
|----------|--------|
| > 600px | Side-by-side fields (flex row) |
| <= 600px | Stacked fields (flex column, full width) |

---

## 3. Navigation Responsive Behavior

### Desktop (> 600px)

Sticky top navbar with icon + text label links.

```
[Viecz]  [Marketplace]  [Wallet]  [Chat]  [Bell] [User Menu]
```

- `routerLinkActive="active-link"` highlights current page.
- Links render icon + `.nav-label` text span.

### Mobile (<= 600px)

Same sticky navbar, icons only.

```
[Viecz]  [icon] [icon] [icon]  [Bell] [User Menu]
```

```css
@media (max-width: 600px) {
  .nav-label { display: none; }
  .shell-content { padding: 8px; }  /* reduced from 16px */
}
```

Logo, notification bell, and user menu remain visible at all widths.

---

## 4. Container Widths

| Context | Class / CSS | Max Width | Notes |
|---------|-------------|-----------|-------|
| Main content shell | `max-w-[1200px] mx-auto p-4` | 1200px | Shell wrapper, My Jobs page |
| Marketplace | `min-h-[60vh]` (no max-w) | Full width | Grid handles card sizing |
| Task form | `max-width: 700px; margin: 0 auto` | 700px | Component CSS |
| Profile | `max-width: 700px; margin: 0 auto` | 700px | Component CSS |
| Auth forms | `max-w-[420px]` | 420px | Login, Register (centered) |
| Chat list | `max-w-[600px] mx-auto p-4` | 600px | Conversation list |
| Apply task | `max-w-[600px] mx-auto` | 600px | Application form |
| Notifications | `max-w-[700px] mx-auto` | 700px | Notification list |
| Chat window | Full height flex | Full width | Constrained by shell max-w |

---

## 5. Component-Level Responsiveness

| Component | Adaptive Behavior |
|-----------|-------------------|
| `nhannht-metro-button` | `fullWidth` input applies `w-full block` for mobile forms |
| `nhannht-metro-nav` | Hosts nav links; shell CSS hides `.nav-label` at 600px |
| `nhannht-metro-card` | No internal breakpoints; parent grid controls sizing |
| `nhannht-metro-task-card` | Fixed internal layout; parent grid controls column count |
| `nhannht-metro-menu` | Absolute dropdown, `min-w-[160px]`, `z-50`; no breakpoint logic |
| `app-loading-skeleton` | Variants (card/list/line) match content shape; no breakpoint changes |
| `app-empty-state` | Centered flex column; works at any width |
| Profile header | `flex gap-24px` at desktop; `flex-direction: column; text-align: center` at <= 600px |

---

## 6. Testing Checklist

| Viewport | Width | What to Verify |
|----------|-------|----------------|
| Mobile S | 320px | Auth forms fit without overflow, nav shows icons only, single-column grids |
| Mobile M | 375px | Same as Mobile S (typical iPhone width) |
| Mobile L | 425px | Cards still single-column below 640px |
| Tablet | 768px | Card grid starts auto-filling, task detail still stacked (< 960px) |
| Desktop | 1024px | Task detail switches to 2-column (960px threshold), nav labels visible |
| Desktop L | 1440px | Content centered within `max-w-[1200px]` container, no horizontal stretch |

---

## 7. Summary of Custom Media Queries

Only two custom `@media` breakpoints are used across the web client:

| Query | Where Used | Effect |
|-------|-----------|--------|
| `@media (max-width: 600px)` | Shell, Profile, Task Form | Hide nav labels, reduce padding, stack form rows, reflow profile header |
| `@media (min-width: 960px)` | Task Detail | Switch to 2-column grid (main + sidebar) |

Everything else uses Tailwind responsive prefixes (`sm:`, `md:`, etc.) inline in templates.
