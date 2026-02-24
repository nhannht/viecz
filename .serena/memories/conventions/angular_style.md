# Angular Code Conventions

## Naming
- Components: kebab-case files (`nhannht-metro-button.component.ts`)
- Services: kebab-case files (`auth.service.ts`)
- Spec files: `*.component.spec.ts`, `*.service.spec.ts`
- Stories: `*.stories.ts`
- Classes: PascalCase (`AuthService`, `NhannhtMetroButtonComponent`)

## Component Patterns
- Standalone components (no NgModules)
- Signal-based state management with Angular Signals
- RxJS for async streams (HTTP, WebSocket)
- Prefix shared components with `nhannht-metro-`

## Testing
- MUST use `npx ng test` (Angular builder wraps Vitest with globals)
- NEVER run `npx vitest run` directly (causes "describe is not defined")

## Design System
- nhannht-metro-meow: Tailwind 4, monochrome theme, beige background (#f0ede8)
- Symmetry-first layout (text-center, mx-auto for hero sections)
- Storybook 9 for component documentation
