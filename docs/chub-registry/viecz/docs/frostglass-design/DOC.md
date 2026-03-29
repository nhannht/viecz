---
name: frostglass-design
description: "Viecz frostglass design system — glassmorphism theme, CSS variables, component catalog, directives, animations"
metadata:
  languages: "typescript"
  versions: "1.0.0"
  source: maintainer
  tags: "viecz,angular,design-system,glassmorphism,tailwind,css,frostglass"
  updated-on: "2026-03-29"
---

# Frostglass Design System

Glassmorphism-based UI system for the Viecz Angular web app. Uses Tailwind CSS v4 with CSS custom properties.

## Themes

Three themes toggled via class on `<html>`:

| Theme | Class | Background | Card |
|-------|-------|-----------|------|
| Default (metro) | _(none)_ | `#f0ede8` warm paper | `#ffffff` solid |
| Dracula | `.dracula` | `#282A36` dark | `#44475A` solid |
| Frostglass | `.sang-frostglass` | `#FCFCF9` with gradient mesh | `rgba(255,255,255,0.6)` glass |

### CSS Variables

```css
/* Defined in @theme block (tailwind.css) — available as Tailwind utilities */
--color-bg: #f0ede8;     /* bg-bg */
--color-fg: #1a1a1a;     /* text-fg */
--color-muted: #6b6b6b;  /* text-muted */
--color-border: #d4d0ca; /* border-border */
--color-card: #ffffff;   /* bg-card */
--font-display: 'JetBrains Mono', monospace;  /* font-display */
--font-body: 'Space Mono', monospace;         /* font-body */
```

Frostglass overrides:

```css
.sang-frostglass {
  --color-bg: #FCFCF9;
  --color-fg: #191C1D;
  --color-muted: #5E6C70;
  --color-border: rgba(255, 255, 255, 0.5);
  --color-card: rgba(255, 255, 255, 0.6);
  --font-display: 'Montserrat', sans-serif;
  --font-body: 'Inter', sans-serif;
}
```

### ThemeService

```typescript
import { ThemeService } from '../core/theme.service';

const theme = inject(ThemeService);
theme.toggle()    // cycles: default → dracula → sang-frostglass
theme.current()   // signal: string
```

## Glass Card Effects

When `.sang-frostglass` is active, any element with `bg-card` class gets:

1. **Frosted glass** — `backdrop-filter: blur(24px) saturate(180%)`
2. **Directional borders** — brighter top-left (light source simulation)
3. **Chromatic aberration** — RGB edge split shadows
4. **Specular highlight** (`::before`) — cursor-tracking radial gradient + ambient pulse
5. **Light sweep** (`::after`) — sweep animation on scroll-into-view and hover
6. **Frost depth** (`.glass-frost-depth`) — radial gradient overlay
7. **Frost noise** (`.glass-noise`) — SVG turbulence texture overlay
8. **Condensation dots** (`.glass-condensation`) — animated pseudo-water droplets
9. **Caustics** (`.glass-caustics`) — hue-rotating prismatic edge glow

### Using glass cards

```html
<!-- Basic glass card — effects automatic in frostglass theme -->
<div class="bg-card border border-border p-6">
  <div class="glass-frost-depth"></div>
  <div class="glass-noise"></div>
  <div class="relative z-10">
    <!-- Card content must be z-10+ to sit above overlays -->
    <h3 class="font-display text-fg">Title</h3>
    <p class="font-body text-muted">Content</p>
  </div>
</div>
```

## Directives

### GlassSpecularDirective

Tracks mouse position and updates `--specular-x` / `--specular-y` CSS vars for the specular highlight effect.

```typescript
import { GlassSpecularDirective } from '../shared/directives/glass-specular.directive';

// In template:
<div appGlassSpecular class="bg-card">...</div>
```

## Component Catalog

All components use `nhannht-metro-*` prefix. They work across all themes.

### Form Components

```html
<nhannht-metro-input
  [label]="'Email'"
  [placeholder]="'Enter email'"
  [(ngModel)]="email"
  name="email"
  [error]="emailError" />

<nhannht-metro-textarea
  [label]="'Description'"
  [(ngModel)]="description"
  name="desc" />

<nhannht-metro-select
  [label]="'Category'"
  [options]="categoryOptions"
  [(ngModel)]="categoryId"
  name="cat" />

<nhannht-metro-datepicker
  [label]="'Deadline'"
  [(ngModel)]="deadline"
  name="deadline" />

<nhannht-metro-smart-deadline
  [label]="'Deadline'"
  [(ngModel)]="deadline"
  name="deadline" />
```

### Action Components

```html
<nhannht-metro-button
  variant="primary"           <!-- "primary" | "secondary" | "danger" -->
  [label]="'Submit'"
  type="submit"
  [disabled]="saving()"
  (clicked)="onSubmit()" />

<nhannht-metro-icon name="schedule" [size]="18" />

<nhannht-metro-spinner />
<nhannht-metro-spinner size="sm" />
```

### Layout Components

```html
<nhannht-metro-card class="block max-w-[700px] mx-auto">
  <!-- Content -->
</nhannht-metro-card>

<nhannht-metro-dialog [open]="showDialog" (closed)="showDialog = false">
  <!-- Dialog content -->
</nhannht-metro-dialog>

<nhannht-metro-nav>
  <!-- Navigation items -->
</nhannht-metro-nav>

<nhannht-metro-step [steps]="steps" [current]="currentStep" />
```

### Display Components

```html
<nhannht-metro-badge [label]="'OPEN'" [status]="'open'" />

<nhannht-metro-application-card [application]="app" />

<nhannht-metro-price-card [price]="50000" [label]="'Task Price'" />
```

### Special Components

```html
<nhannht-metro-location-picker
  [label]="'Location'"
  [(ngModel)]="locationValue"
  name="location" />
<!-- locationValue: { location: string, latitude: number, longitude: number } -->

<nhannht-metro-bank-select
  [banks]="bankList"
  [(ngModel)]="selectedBank"
  name="bank" />
```

### Snackbar Service

```typescript
import { NhannhtMetroSnackbarService } from '../shared/services/nhannht-metro-snackbar.service';

const snackbar = inject(NhannhtMetroSnackbarService);
snackbar.show('Task created!', undefined, { duration: 3000 });
```

## Typography

```html
<!-- Display heading -->
<h2 class="font-display text-[11px] tracking-[1px] text-fg uppercase">
  SECTION TITLE
</h2>

<!-- Body text -->
<p class="font-body text-[13px] text-muted leading-[1.7]">
  Body content here
</p>

<!-- Small label -->
<span class="font-body text-[10px] opacity-80">Label</span>
```

## Animations

```css
/* Keyframes defined in tailwind.css */
@keyframes specular-pulse    /* ambient glass highlight */
@keyframes glass-sweep       /* light sweep across card */
@keyframes condensation-drift /* water droplet movement */
@keyframes caustics-hue      /* prismatic color rotation */
```

## Responsive Patterns

```html
<!-- Common responsive pattern -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <app-task-card [task]="task" />
</div>

<!-- Mobile-first container -->
<div class="max-w-[700px] mx-auto px-4 md:px-0">
  <!-- Content -->
</div>
```

## Production vs Storybook

- **Production**: Use `app-task-card` from `shared/components/task-card.component.ts`
- **Storybook/dev**: `nhannht-metro-*` components have `.stories.ts` exports
- Never use storybook-only components in production routing
