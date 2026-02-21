# nhannht-metro-meow Design System

**Last Updated:** 2026-02-21
**Source:** [meow.fishcmus.io.vn](https://meow.fishcmus.io.vn/)
**Reference Implementation:** `/tmp/meow-ai/index.html`

---

## 1. Design Tokens

Extracted from the reference implementation CSS custom properties.

### 1.1 Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#f0ede8` | Page background |
| `--fg` | `#1a1a1a` | Primary text, borders, primary button fill |
| `--muted` | `#6b6b6b` | Secondary text, nav links, descriptions |
| `--border` | `#d4d0ca` | Card borders, section dividers |
| `--card-bg` | `#ffffff` | Card surfaces |

### 1.2 Typography

**Font families:**

| Token | Value | Usage |
|-------|-------|-------|
| `--font-display` | `'JetBrains Mono', monospace` | Headings, logos, section titles, card titles, step numbers, price labels |
| `--font-body` | `'Space Mono', monospace` | Body text, buttons, nav links, descriptions |

**Google Fonts import:**
```
https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Space+Mono:wght@400;700&display=swap
```

**Font sizes (from source):**

| Element | Size | Weight | Letter-spacing |
|---------|------|--------|----------------|
| Nav logo | 16px | normal | 2px |
| Nav links | 13px | normal | 1px |
| Hero title | `clamp(32px, 5vw, 58px)` | normal | 4px |
| Hero subtitle | 15px | normal | 0 |
| Section title | 18px | normal | 4px |
| Card title (h3) | 11px | normal | 1px |
| Card body (p) | 13px | normal | 0 |
| Step number | 24px | normal | 0 |
| Step title (h3) | 16px | normal | 1px |
| Step body (p) | 13px | normal | 0 |
| Price amount | 36px | 700 | 0 |
| Price period (span) | 14px | 400 | 0 |
| Price desc | 12px | normal | 0 |
| Price features (li) | 12px | normal | 0 |
| Button primary | 13px | 700 | 2px |
| Button secondary | 13px | normal | 1px |
| Footer text | 12px | normal | 1px |
| Footer cat (ASCII) | 10px | normal | 0 |
| Scroll indicator | 10px | normal | 2px |
| "POPULAR" badge | 8px | normal | 1px |

**Line heights:**

| Context | Value |
|---------|-------|
| Hero title | 1.3 |
| Hero subtitle | 1.8 |
| Card body | 1.7 |
| Step body | 1.7 |

### 1.3 Spacing

Extracted padding/margin/gap values used in the source:

| Context | Value |
|---------|-------|
| Nav padding | `20px 60px` |
| Hero padding | `100px 60px 60px` |
| Section padding | `100px 60px` |
| Card padding | `32px` |
| Price card padding | `40px 32px` |
| Footer padding | `48px` |
| Feature icon margin-bottom | `16px` |
| Card title margin-bottom | `12px` |
| Section title margin-bottom | `64px` |
| Hero title margin-bottom | `28px` |
| Hero subtitle margin-bottom | `40px` |
| CTA group gap | `24px` |
| Nav links gap | `36px` |
| Features grid gap | `24px` |
| Steps gap | `48px` |
| Step internal gap | `24px` |
| Pricing grid gap | `24px` |
| Price features li padding | `8px 0` |
| Price features margin-bottom | `32px` |
| Footer cat margin-top | `16px` |

**Responsive breakpoint:** `900px` (single breakpoint)

Mobile overrides at `max-width: 900px`:
- Hero: single column, centered text, padding `120px 24px 60px`
- Nav: padding `16px 24px`, link gap `16px`, font `11px`
- Sections: padding `60px 24px`
- Scroll indicator: centered

### 1.4 Borders & Shadows

| Property | Value |
|----------|-------|
| Border radius | `0` (none — all elements are square) |
| Card border | `1px solid var(--border)` |
| Section divider | `border-top: 1px solid var(--border)` |
| Featured card border | `1px solid var(--fg)` |
| Card hover shadow | `0 4px 20px rgba(0,0,0,0.08)` |
| Scroll arrow border | `1.5px solid var(--muted)` |

### 1.5 Transitions & Animation

| Element | Transition |
|---------|-----------|
| Nav link color | `color 0.2s` |
| Button primary (all) | `all 0.25s` |
| Button secondary color | `color 0.2s` |
| Card (all) | `all 0.3s` |
| Price card (all) | `all 0.3s` |
| Card hover transform | `translateY(-2px)` |
| Intersection fade-in | `opacity 0.6s, transform 0.6s` (from `translateY(20px)` + `opacity: 0`) |
| Scroll indicator bob | `2s ease-in-out infinite`, `translateY(0)` → `translateY(6px)` |

---

## 2. Components

Each component below is extracted from the reference implementation. These map to Storybook stories during migration.

### 2.1 Navigation (nav)

```
┌─────────────────────────────────────────────────────┐
│  ✦    Features  How It Works  Pricing  About  Contact │
└─────────────────────────────────────────────────────┘
```

- Fixed top, full width
- Background: `rgba(240,237,232,0.85)` + `backdrop-filter: blur(12px)`
- Logo: display font, 16px, letter-spacing 2px
- Links: body font, 13px, muted color, hover → fg color
- Z-index: 100
- Flexbox: `space-between`, `align-items: center`

### 2.2 Buttons

**Primary:**
- Padding: `14px 32px`
- Background: `var(--fg)`, text: `var(--bg)`
- Border: `2px solid var(--fg)`
- Font: body, 13px, weight 700, letter-spacing 2px
- Hover: background transparent, text fg (inverted)

**Secondary:**
- No background, no border
- Color: muted, hover → fg
- Font: body, 13px, letter-spacing 1px
- Appends ` >` via `::after`

### 2.3 Feature Card

```
┌──────────────────────┐
│ ⚙                    │
│ TASK MANAGER          │
│ Description text here │
│ in muted color.       │
└──────────────────────┘
```

- Border: `1px solid var(--border)`
- Background: `var(--card-bg)`
- Padding: `32px`
- Icon: 28px emoji/symbol, margin-bottom 16px
- Title: display font, 11px, letter-spacing 1px
- Body: body font, 13px, muted color, line-height 1.7
- Hover: border → fg, translateY(-2px), box-shadow

### 2.4 Step

```
01   Connect Your Workflow
     Description text in muted color.
```

- Flexbox row, gap 24px
- Number: display font, 24px, fg color, opacity 0.15, min-width 60px
- Title: body font, 16px, fg color, letter-spacing 1px
- Body: body font, 13px, muted, line-height 1.7

### 2.5 Price Card

```
┌──────────────────────┐  ┌──── POPULAR ─────────┐  ┌──────────────────────┐
│       FREE           │  │       PRO             │  │       TEAM           │
│       $0/mo          │  │       $19/mo          │  │       $49/mo         │
│  For individuals     │  │  For power users      │  │  For teams up to 20  │
│                      │  │                       │  │                      │
│  + Feature 1         │  │  + Feature 1          │  │  + Feature 1         │
│  + Feature 2         │  │  + Feature 2          │  │  + Feature 2         │
│  + Feature 3         │  │  + Feature 3          │  │  + Feature 3         │
│                      │  │                       │  │                      │
│  [ Start Free  ]     │  │  [  Get Pro    ]      │  │  [ Contact Us  ]     │
└──────────────────────┘  └───────────────────────┘  └──────────────────────┘
```

- Border: `1px solid var(--border)` (featured: `var(--fg)`)
- Background: `var(--card-bg)`
- Padding: `40px 32px`, text-align center
- "POPULAR" badge: absolute positioned, top -1px right 24px, fg bg, bg text, display font 8px
- Title: display font, 13px, letter-spacing 1px
- Price: body font, 36px, weight 700
- Period: 14px, muted, weight 400
- Description: 12px, muted
- Feature list: no bullets, `+ ` prefix via `::before`, 12px, muted, bottom border per item
- CTA: full-width primary button

### 2.6 Section

- Padding: `100px 60px`
- Top border: `1px solid var(--border)`
- Title: display font, 18px, centered, letter-spacing 4px, margin-bottom 64px

### 2.7 Hero

- Full viewport height (`min-height: 100vh`)
- 2-column grid: content left, visual right
- Content max-width: 560px
- Subtitle max-width: 420px
- Responsive: collapses to single column at 900px

### 2.8 Footer

- Top border: `1px solid var(--border)`
- Padding: 48px, centered
- Text: 12px, muted, letter-spacing 1px
- ASCII cat: body font, 10px, muted, opacity 0.4, `white-space: pre`

### 2.9 Scroll Indicator

- Absolute bottom-left of hero
- "SCROLL" label: 10px, muted, letter-spacing 2px
- Arrow: 12px rotated square border (CSS-only chevron)
- Animation: `bob` 2s infinite, 6px vertical travel

---

## 3. Layout Patterns

### 3.1 Feature Grid

```css
grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
gap: 24px;
max-width: 1000px;
margin: 0 auto;
```

### 3.2 Pricing Grid

```css
grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
gap: 24px;
max-width: 900px;
margin: 0 auto;
```

### 3.3 Steps (Vertical)

```css
max-width: 700px;
margin: 0 auto;
flex-direction: column;
gap: 48px;
```

### 3.4 Hero (2-column)

```css
grid-template-columns: 1fr 1fr;
align-items: center;
padding: 100px 60px 60px;
/* collapses to 1fr at 900px */
```

---

## 4. Interactive Effects

### 4.1 Intersection Observer Fade-In

Applied to: `.feature-card`, `.step`, `.price-card`

- Initial: `opacity: 0`, `transform: translateY(20px)`
- On intersect (threshold 0.1): `opacity: 1`, `transform: translateY(0)`
- Transition: `opacity 0.6s, transform 0.6s`

### 4.2 Smooth Scroll

All `a[href^="#"]` links use `scrollIntoView({ behavior: 'smooth' })`.

### 4.3 Canvas Glitch Pipeline

See [ASCII_ART_SVG.md](./ASCII_ART_SVG.md) for the full mascot → ASCII → SVG → canvas pipeline.

Canvas render loop (60fps):
- Horizontal 3px slice rendering with wave distortion
- Glitch bursts: random offset per slice, decays at 0.93x per frame
- Triggered by: periodic (every 2-5s) + mouse hover
- Scanlines: 1px lines every 4px, `rgba(240,237,232,0.25)`
- Glitch bands: 2-6px thick, semi-transparent bg color
- Breathing: `sin(t * 0.03) * 1.5` — head bobs, bottom anchored
- Vignette: radial gradient from center, 0.35H → 0.75H radius

### 4.4 Nav Blur

```css
background: rgba(240,237,232,0.85);
backdrop-filter: blur(12px);
```

---

## 5. Tailwind CSS 4 Token Mapping

The design tokens above map to Tailwind's `@theme` directive as follows:

```css
@import "tailwindcss";

@theme {
  /* Colors */
  --color-bg: #f0ede8;
  --color-fg: #1a1a1a;
  --color-muted: #6b6b6b;
  --color-border: #d4d0ca;
  --color-card: #ffffff;

  /* Fonts */
  --font-display: 'JetBrains Mono', monospace;
  --font-body: 'Space Mono', monospace;
}
```

Usage in Tailwind classes:
```html
<h1 class="font-display text-fg">Title</h1>
<p class="font-body text-muted">Description</p>
<div class="bg-card border border-border">Card</div>
```

---

## 6. Storybook Component Catalog

All 13 implemented components have Storybook stories with `autodocs` tags. Run with `yarn storybook` (port 6006).

**Tier 1 — Atomic:**

| Story | Component | Variants |
|-------|-----------|----------|
| `Button` | `nhannht-metro-button` | Primary, Secondary, Full Width, Disabled |
| `Spinner` | `nhannht-metro-spinner` | Default |
| `Icon` | `nhannht-metro-icon` | Default |
| `Divider` | `nhannht-metro-divider` | Default |
| `Badge` | `nhannht-metro-badge` | Open, In Progress, Completed, Cancelled |

**Tier 2 — Form elements:**

| Story | Component | Variants |
|-------|-----------|----------|
| `Input` | `nhannht-metro-input` | Default, With Error |
| `Textarea` | `nhannht-metro-textarea` | Default |
| `Select` | `nhannht-metro-select` | Default |
| `Datepicker` | `nhannht-metro-datepicker` | Default |

**Tier 3 — Layout & containers:**

| Story | Component | Variants |
|-------|-----------|----------|
| `Card` | `nhannht-metro-card` | Default, Featured, Clickable |
| `Dialog` | `nhannht-metro-dialog` | Default |
| `Snackbar` | `nhannht-metro-snackbar` | Default |
| `Tabs` | `nhannht-metro-tabs` | Default |

**Not yet implemented** (planned for future phases):

| Component | Purpose |
|-----------|---------|
| `NhannhtMetroNavComponent` | Top navigation bar, replaces MatToolbar |
| `NhannhtMetroMenuComponent` | Dropdown menu, replaces MatMenu |

**Naming convention:** All components use the `NhannhtMetro` prefix.
- Class: `NhannhtMetroButtonComponent`
- Selector: `nhannht-metro-button`
- File: `src/app/shared/components/nhannht-metro-button.component.ts`
- Story title: `nhannht-metro/Button`

---

**Last Updated:** 2026-02-21
**Design System:** nhannht-metro-meow
