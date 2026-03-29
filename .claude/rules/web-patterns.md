---
paths:
  - "web/**"
description: Angular/web patterns and gotchas
---

# Web Patterns

- **Dev mode on client**: Use Angular's `isDevMode()` from `@angular/core`, NOT custom `environment.production` checks.
- **Dev mode banners**: Use `<app-dev-mode-banner>` (`DevModeBannerComponent`) for any dev-only UI hints — don't inline styles.
- **Web components**: Production uses `app-task-card` (shared/), NOT `viecz-*` (Storybook only).
- **Theming**: 5 CSS vars via Tailwind. Global theme = `sang-frostglass` on `<html>` (`ThemeService`).
- **Tailwind unused classes**: New utility classes (e.g. `bg-yellow-50`) won't work if never used before — use inline styles or add to safelist.
- **Three.js GLB**: Inspect GLB header before rendering. See `docs/human_docs/by-claude-threejs-learned-patterns.md`.
