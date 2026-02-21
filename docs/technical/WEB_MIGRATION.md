# Web Client Migration Guide: Angular Material → nhannht-metro-meow + Tailwind CSS 4

**Last Updated:** 2026-02-21
**YouTrack:** KNS-98
**Design System Reference:** [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)

---

## 1. Overview

Migrate the Viecz web client from Angular Material 3 to the nhannht-metro-meow design system using Tailwind CSS 4 and Storybook for component development.

**Before:** Angular Material 3, SCSS, Roboto, azure palette, rounded corners, elevation shadows
**After:** Tailwind CSS 4, nhannht-metro-meow tokens, Press Start 2P + Space Mono, square corners, 1px borders

---

## 2. Current State Inventory

### 2.1 Material Modules in Use (18 modules)

| Module | Package | Used In |
|--------|---------|---------|
| MatButton, MatIconButton, MatFabButton | `material/button` | 16 components |
| MatIcon | `material/icon` | 17 components |
| MatCard, MatCardContent, etc. | `material/card` | 9 components |
| MatFormField, MatLabel, MatError | `material/form-field` | 8 components |
| MatInput | `material/input` | 8 components |
| MatProgressSpinner | `material/progress-spinner` | 11 components |
| MatSnackBar | `material/snack-bar` | 7 components + interceptor |
| MatDialog, MatDialogRef, etc. | `material/dialog` | 4 components |
| MatDivider | `material/divider` | 6 components |
| MatToolbar | `material/toolbar` | 1 (shell) |
| MatMenu, MatMenuItem, MatMenuTrigger | `material/menu` | 1 (shell) |
| MatBadge | `material/badge` | 1 (shell) |
| MatChip, MatChipListbox, etc. | `material/chips` | 3 components |
| MatList, MatListItem, MatNavList | `material/list` | 3 components |
| MatTabGroup, MatTab | `material/tabs` | 1 (my-jobs) |
| MatSelect, MatOption | `material/select` | 1 (task-form) |
| MatDatepickerModule | `material/datepicker` | 1 (task-form) |
| MatNativeDateModule | `material/core` | 1 (task-form) |

### 2.2 Files Touching Material (24 files)

**Layout:** shell.component.ts
**Auth:** login.component.ts, register.component.ts
**Task:** task-detail.component.ts, task-form.component.ts, marketplace.component.ts, my-jobs.component.ts, apply-task.component.ts
**Wallet:** wallet.component.ts, deposit-dialog.component.ts, transaction-list.component.ts
**Chat:** chat.component.ts, conversation-list.component.ts
**Profile:** profile.component.ts
**Notifications:** notification-list.component.ts
**Dialogs:** confirm-escrow-dialog.component.ts, confirm-delete-dialog.component.ts
**Shared:** task-card.component.ts, application-card.component.ts, category-chips.component.ts, message-bubble.component.ts, error-fallback.component.ts, empty-state.component.ts
**Core:** error.interceptor.ts

### 2.3 Global Styles

`src/styles.scss` — Material theme config (azure palette, Roboto, density 0) + status chip classes.

### 2.4 Build Config

- `angular.json`: `inlineStyleLanguage: scss`, global style `src/styles.scss`
- Package manager: Yarn 1.22

---

## 3. Phase 0: Setup

### 3.1 Install Tailwind CSS 4

```bash
cd web
yarn add tailwindcss @tailwindcss/postcss postcss
```

Create `.postcssrc.json` in `web/`:
```json
{
  "plugins": {
    "@tailwindcss/postcss": {}
  }
}
```

### 3.2 Create Tailwind Entry Point

Tailwind v4 uses plain CSS (`@import`), not SCSS. Create a separate CSS file:

`src/tailwind.css`:
```css
@import "tailwindcss";
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Space+Mono:wght@400;700&display=swap');

@theme {
  /* nhannht-metro-meow tokens */
  --color-bg: #f0ede8;
  --color-fg: #1a1a1a;
  --color-muted: #6b6b6b;
  --color-border: #d4d0ca;
  --color-card: #ffffff;

  --font-display: 'Press Start 2P', monospace;
  --font-body: 'Space Mono', monospace;
}
```

Add to `angular.json` styles array:
```json
"styles": [
  "src/tailwind.css",
  "src/styles.scss"
]
```

**Note:** Both files coexist during migration. `styles.scss` keeps Material theme until all components are migrated, then gets removed.

### 3.3 Change inlineStyleLanguage

Component inline styles can use Tailwind's `@apply` directive in CSS. Keep `scss` for now — existing components still use it. Switch to `css` after full migration.

### 3.4 Install Storybook with @storybook/angular (Webpack-based)

Using `@storybook/angular` ^9.0.0 with the Webpack 5 builder. Angular 21 works despite peer dep warnings.

**Step 1: Install packages**

```bash
cd web
yarn add -D storybook @storybook/angular @storybook/addon-docs @compodoc/compodoc
```

Compatibility: All `@storybook/*` packages must be on the same major version (v9). Mixing v9 with v10 causes ESM/CJS loading errors.

**Step 2: Create `.storybook/` directory manually**

```bash
mkdir -p web/.storybook
```

**Step 3: Configure `.storybook/main.ts`**

```typescript
import type { StorybookConfig } from '@storybook/angular';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs'],
  framework: '@storybook/angular',
  docs: {},
};

export default config;
```

**Step 4: Update `angular.json` targets**

Run Storybook via `ng run web:storybook`. Set `compodoc: false` — the builder's `compodocArgs` don't pass correctly; run compodoc manually via npm script instead.

```json
{
  "storybook": {
    "builder": "@storybook/angular:start-storybook",
    "options": {
      "browserTarget": "web:build:development",
      "configDir": ".storybook",
      "port": 6006,
      "compodoc": false,
      "tsConfig": ".storybook/tsconfig.json",
      "styles": [".storybook/tailwind-built.css"]
    }
  },
  "build-storybook": {
    "builder": "@storybook/angular:build-storybook",
    "options": {
      "browserTarget": "web:build:development",
      "configDir": ".storybook",
      "compodoc": false,
      "tsConfig": ".storybook/tsconfig.json",
      "styles": [".storybook/tailwind-built.css"]
    }
  }
}
```

**Step 5: Add npm scripts** in `package.json`:
```json
"compodoc": "compodoc -p .storybook/tsconfig.json -e json -d .storybook",
"storybook": "yarn compodoc && ng run web:storybook",
"build-storybook": "yarn compodoc && ng run web:build-storybook"
```

### 3.5 Configure Storybook with Tailwind + Compodoc

`.storybook/preview.ts`:
```typescript
import type { Preview } from '@storybook/angular';
import { setCompodocJson } from '@storybook/addon-docs/angular';
import docJson from './documentation.json';

setCompodocJson(docJson);

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'nhannht-metro',
      values: [
        { name: 'nhannht-metro', value: '#f0ede8' },
        { name: 'white', value: '#ffffff' },
        { name: 'dark', value: '#1a1a1a' },
      ],
    },
  },
};

export default preview;
```

### 3.6 Verify Setup

After setup, verify the full chain works:

```bash
cd web
npx storybook dev -p 6006
# Should open http://localhost:6006 with default stories
# Background should be #f0ede8 (meow cream)
# Tailwind classes should work in story templates
```

If AnalogJS integration breaks with Angular 21, fallback:
- Build a `/dev/components` route in the Angular app itself
- Render each component with manual controls
- Loses Storybook addons but zero compatibility risk

---

## 4. Phase 1: Build Shared Components in Storybook

Build each nhannht-metro-meow component in isolation before using it in pages. Each component gets a Storybook story.

### 4.1 Component Build Order

Build in dependency order — leaf components first, composite components later.

**Tier 1 — Atomic (no dependencies):**
1. `NhannhtMetroButtonComponent` — Primary + Secondary variants
2. `NhannhtMetroSpinnerComponent` — Replace MatProgressSpinner
3. `NhannhtMetroIconComponent` — Wrapper around Google Material Icons font (kept as-is)
4. `NhannhtMetroDividerComponent` — 1px border line
5. `NhannhtMetroBadgeComponent` — Status indicators (open, in_progress, completed, cancelled)

**Tier 2 — Form elements:**
6. `NhannhtMetroInputComponent` — Text input, replaces MatFormField + MatInput
7. `NhannhtMetroTextareaComponent` — Multi-line input
8. `NhannhtMetroSelectComponent` — Dropdown, replaces MatSelect
9. `NhannhtMetroDatepickerComponent` — Date input, replaces MatDatepicker

**Tier 3 — Layout & containers:**
10. `NhannhtMetroCardComponent` — Replaces MatCard (feature card style)
11. `NhannhtMetroDialogComponent` — Modal, replaces MatDialog
12. `NhannhtMetroSnackbarComponent` — Toast notification, replaces MatSnackBar
13. `NhannhtMetroTabsComponent` — Tab navigation, replaces MatTabGroup
14. ~~`NhannhtMetroNavComponent`~~ — **Not yet implemented** (top navigation bar)
15. ~~`NhannhtMetroMenuComponent`~~ — **Not yet implemented** (dropdown menu)

**Tier 4 — Domain-specific:**
16. `NhannhtMetroTaskCardComponent` — Marketplace task card
17. `NhannhtMetroApplicationCardComponent` — Task application card
18. `NhannhtMetroChatBubbleComponent` — Message bubble
19. `NhannhtMetroTransactionRowComponent` — Wallet transaction
20. `NhannhtMetroPriceCardComponent` — Pricing tier (from reference)
21. `NhannhtMetroStepComponent` — Numbered step (from reference)

### 4.2 Story File Pattern

```typescript
// src/app/shared/components/nhannht-metro-button/nhannht-metro-button.stories.ts
import type { Meta, StoryObj } from '@storybook/angular';
import { NhannhtMetroButtonComponent } from './nhannht-metro-button.component';

const meta: Meta<NhannhtMetroButtonComponent> = {
  title: 'nhannht-metro/Button',
  component: NhannhtMetroButtonComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<NhannhtMetroButtonComponent>;

export const Primary: Story = {
  args: { variant: 'primary', label: 'Get Started' },
};

export const Secondary: Story = {
  args: { variant: 'secondary', label: 'See How It Works' },
};

export const FullWidth: Story = {
  args: { variant: 'primary', label: 'Start Free', fullWidth: true },
};
```

### 4.3 Component File Pattern

```typescript
// src/app/shared/components/nhannht-metro-button/nhannht-metro-button.component.ts
import { Component, input } from '@angular/core';

@Component({
  selector: 'nhannht-metro-button',
  standalone: true,
  template: `
    @if (variant() === 'primary') {
      <button class="inline-block px-8 py-3.5 bg-fg text-bg font-body text-[13px] font-bold
                      tracking-[2px] border-2 border-fg cursor-pointer
                      hover:bg-transparent hover:text-fg transition-all duration-250"
              [class.w-full]="fullWidth()"
              [class.block]="fullWidth()">
        {{ label() }}
      </button>
    } @else {
      <button class="font-body text-[13px] text-muted tracking-[1px] cursor-pointer
                      hover:text-fg transition-colors duration-200 bg-transparent border-none
                      after:content-['>'] after:ml-1">
        {{ label() }}
      </button>
    }
  `,
})
export class NhannhtMetroButtonComponent {
  variant = input<'primary' | 'secondary'>('primary');
  label = input.required<string>();
  fullWidth = input(false);
}
```

---

## 5. Phase 2: Migrate Pages (One at a Time)

Migrate one page/feature at a time. Each page is fully functional and testable before moving to the next.

### 5.1 Migration Order

Order by complexity (simplest first) and dependency (shared components first):

| Order | Page | Components to Replace | Complexity |
|-------|------|----------------------|------------|
| 1 | Auth (login + register) | Card, FormField, Input, Button, Icon, Spinner | Low |
| 2 | Shell (nav bar) | Toolbar, Button, Icon, Menu, Badge, Divider | Medium |
| 3 | Marketplace | FormField, Input, FabButton, Icon, Spinner, TaskCard | Medium |
| 4 | Task Detail | Card, Button, Icon, Divider, Spinner, SnackBar, Dialog | High |
| 5 | Task Form | Card, FormField, Input, Select, Datepicker, Button, Icon, Spinner, SnackBar | High |
| 6 | Wallet | Card, Button, Icon, FormField, Input, Divider, List, Spinner, SnackBar, Dialog | High |
| 7 | Chat | Button, Icon, FormField, Input, Spinner, List, Divider | Medium |
| 8 | Profile | Card, Button, Icon, FormField, Input, Divider, Chips, Spinner, SnackBar | High |
| 9 | Notifications | Card, Button, Icon, Spinner, Divider | Low |
| 10 | My Jobs | Tabs, Spinner, Icon | Low |
| 11 | Apply Task | Card, Button, Icon, FormField, Input, Spinner, SnackBar | Medium |
| 12 | Error interceptor | SnackBar | Low |

### 5.2 Per-Page Migration Steps

For each page:

1. **Read the component** — Understand current Material usage and inline styles
2. **Replace Material imports** — Swap `MatX` imports with `NhannhtMetroX` components
3. **Replace template** — Swap `<mat-card>`, `<mat-button>`, etc. with Tailwind classes + NhannhtMetro components
4. **Replace inline styles** — Convert SCSS to Tailwind utility classes
5. **Run unit test** — `npx ng test` — verify existing tests still pass
6. **Visual check** — `ng serve` — verify the page looks correct
7. **Commit** — One commit per page

### 5.3 Material Import Replacement Map

| Material | Replace With |
|----------|-------------|
| `<mat-card>` | `<div class="border border-border bg-card p-8">` or `<nhannht-metro-card>` |
| `<button mat-button>` | `<nhannht-metro-button>` |
| `<button mat-raised-button>` | `<nhannht-metro-button variant="primary">` |
| `<button mat-icon-button>` | `<button class="...">` with icon |
| `<mat-form-field>` + `<mat-label>` + `<input matInput>` | `<nhannht-metro-input>` |
| `<mat-icon>` | `<nhannht-metro-icon>` (wraps Google Material Icons font) |
| `<mat-progress-spinner>` | `<nhannht-metro-spinner>` |
| `MatSnackBar.open()` | `NhannhtMetroSnackbarService.show()` |
| `MatDialog.open()` | `NhannhtMetroDialogService.open()` |
| `<mat-toolbar>` | `<nav class="...">` |
| `<mat-menu>` | `<nhannht-metro-menu>` |
| `<mat-tab-group>` | `<nhannht-metro-tabs>` |
| `<mat-select>` | `<nhannht-metro-select>` |
| `<mat-datepicker>` | `<nhannht-metro-datepicker>` |
| `<mat-chip>` | `<span class="...">` or `<nhannht-metro-badge>` |
| `<mat-list>` | `<ul class="...">` or `<nhannht-metro-list>` |
| `<mat-divider>` | `<hr class="border-border">` or `<nhannht-metro-divider>` |

---

## 6. Phase 3: Cleanup

After all pages are migrated:

### 6.1 Remove Angular Material

```bash
cd web
yarn remove @angular/material @angular/cdk @angular/animations
```

Remove from `package.json`:
- `@angular/material` (both dependencies and devDependencies)
- `@angular/cdk`
- `@angular/animations` (only if nothing else uses it)

### 6.2 Replace Global Styles

Delete Material theme from `src/styles.scss`:
```scss
/* REMOVE this entire block: */
@use '@angular/material' as mat;
html {
  @include mat.theme((...));
}
```

Replace with nhannht-metro-meow base styles:
```css
/* src/styles.css (rename from .scss if no SCSS needed) */
html, body {
  height: 100%;
  margin: 0;
}
body {
  background-color: var(--color-bg);
  color: var(--color-fg);
  font-family: var(--font-body);
}
a {
  color: var(--color-fg);
  text-decoration: none;
}
```

### 6.3 Update angular.json

- Remove `src/styles.scss` from styles array (if replaced by tailwind.css)
- Change `inlineStyleLanguage` from `scss` to `css`
- Remove Material-specific schematics if any

### 6.4 Update Tests

- Remove Material test harness imports
- Update component test providers (no more `NoopAnimationsModule`, `MatDialogRef` mocks, etc.)
- Replace with NhannhtMetro component mocks

---

## 7. Accessibility Gaps

Material provides built-in a11y. After removal, manually ensure:

| Feature | Material Handled It | Manual Implementation Needed |
|---------|--------------------|-----------------------------|
| Focus management in dialogs | MatDialog traps focus | Trap focus with `cdkTrapFocus` (keep `@angular/cdk`) or custom directive |
| ARIA on form fields | MatFormField adds `aria-label`, `aria-describedby` | Add ARIA attributes to `<meow-input>` |
| Keyboard nav in menus | MatMenu handles arrow keys | Implement `keydown` handler in `<meow-menu>` |
| Keyboard nav in select | MatSelect handles arrow keys, Enter, Escape | Implement in `<meow-select>` |
| Screen reader for spinners | MatProgressSpinner has `role="progressbar"` | Add `role="progressbar"` + `aria-label` |
| Live regions for snackbar | MatSnackBar uses `aria-live` | Add `aria-live="polite"` to snackbar container |

**Recommendation:** Keep `@angular/cdk` even after removing `@angular/material`. CDK provides headless a11y utilities (focus trap, overlay, a11y module) without visual opinions.

---

## 8. Known Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| `@analogjs/storybook-angular` breaks with Angular 21 | Can't build components in Storybook | Fallback: component playground route in dev app |
| Tailwind + SCSS coexistence | Build conflicts during migration | Separate files: `tailwind.css` (Tailwind) + `styles.scss` (Material) |
| a11y regression | Screen reader / keyboard users affected | Keep `@angular/cdk`, test with axe-core |
| MatDatepicker replacement | No equivalent in Tailwind | Use native `<input type="date">` or `flatpickr` |
| MatDialog replacement | Focus trapping, overlay, escape key | Use CDK `Overlay` + `FocusTrap` or build custom |
| Bundle size increase | Tailwind + custom components may be larger initially | Tailwind purges unused classes; monitor with `ng build --stats-json` |

---

## 9. Testing Strategy

### 9.1 Per-Component (Storybook)

- Visual: Each story renders correctly
- Interaction: Click, hover, keyboard events work
- Variants: All variants (primary/secondary, states, sizes) covered

### 9.2 Per-Page (Unit Tests)

- Run `npx ng test` after each page migration
- Fix broken tests (Material mock removal, new component imports)

### 9.3 Visual Regression (Manual)

- Screenshot each page before migration (save to `docs/ui/web-before/`)
- Screenshot after migration (save to `docs/ui/web-after/`)
- Compare for unintended changes

### 9.4 a11y

- Run `axe-core` or Lighthouse a11y audit before and after
- Test keyboard-only navigation on every page
- Test with screen reader on auth + wallet flows (most critical)

---

## 10. Rollback Plan

If migration fails mid-way:
- Each phase is committed separately — `git revert` per page
- Material and Tailwind coexist during migration — no "point of no return" until Phase 3 (cleanup)
- Keep Material packages installed until ALL pages are migrated and verified

---

**Last Updated:** 2026-02-21
**Design System:** nhannht-metro-meow
