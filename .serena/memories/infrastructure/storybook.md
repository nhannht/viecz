# Storybook Design System (Angular Web)

## Split Architecture (KNS-208)
Two separate Storybook projects, one per design language:

### Metro (Brutalist) — `.storybook-metro/`
- Themes: Light + Dracula (sharp corners, Space Mono, hard borders)
- Dev: `yarn storybook:metro` (port 6006)
- Build: `yarn build-storybook:metro` → `storybook-metro-static/`
- Caddy: `http://storybook.larvartar`

### Glass (Glassmorphism) — `.storybook-glass/`
- Themes: Sang Sunglass + Sang Moonriver (rounded corners, Inter font, glass effects)
- Dev: `yarn storybook:glass` (port 6007)
- Build: `yarn build-storybook:glass` → `storybook-glass-static/`
- Caddy: `http://storybook-glass.larvartar`

### Build both: `yarn build-storybook`

## Shared Resources
- Stories: `src/**/*.stories.ts` (same glob, both projects show all stories)
- Compodoc: `documentation.json` output in `.storybook/` (imported by both preview.ts)
- Tailwind CSS: built from `src/tailwind.css` via `npx @tailwindcss/cli`
  - `.storybook-metro/tailwind-metro.css` and `.storybook-glass/tailwind-glass.css`
  - Both contain full CSS; glass overrides are scoped to `.sang-*` selectors (inert in metro)

## Config Structure (each dir)
- `main.ts` — framework config, story glob
- `preview.ts` — theme toolbar, `componentWrapperDecorator`, Transloco provider
- `manager.ts` — manager UI theme switching via `channel.on('globalsUpdated')`
- `*-theme.ts` — Storybook `create()` theme definitions
- `preview-head.html` — Google Fonts links
- `tsconfig.json` — extends `../tsconfig.app.json`

## Theme CSS Architecture (`web/src/tailwind.css`)
- 5 CSS vars: `--color-bg`, `--color-fg`, `--color-muted`, `--color-border`, `--color-card`
- Glass themes add gradient mesh backgrounds, glass card effects, rounded borders, teal accents
- ~80 lines scoped to `.sang-*` transform metro components into glass style

### Theme Colors
| Token | Light | Sunglass | Dracula | Moonriver |
|-------|-------|----------|---------|-----------| 
| bg | `#f0ede8` | `#FCFCF9` | `#282A36` | `#0D1117` |
| fg | `#1a1a1a` | `#191C1D` | `#F8F8F2` | `#E6EDF3` |
| font | Space Mono | Inter | Space Mono | Inter |

## Gotchas
- `storybook/core-events` doesn't resolve in manager bundle — use string `'globalsUpdated'` directly
- All `@storybook/*` packages must be same major version
- Storybook preview applies theme via wrapper `<div>` class (not `<html>`)
- Must rebuild tailwind CSS when `tailwind.css` changes: `npx @tailwindcss/cli -i src/tailwind.css -o .storybook-*/tailwind-*.css`
- Must rebuild static when stories change (no hot reload in static mode)
