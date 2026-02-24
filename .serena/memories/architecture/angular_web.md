# Angular Web Client Architecture

## Directory Structure
```
web/src/app/
├── core/           # Singleton services (auth, task, wallet, chat, etc.)
├── shared/         # Reusable UI components (nhannht-metro-* design system)
│   ├── components/ # 28+ shared components with Storybook stories
│   ├── directives/
│   ├── pipes/
│   └── services/
├── auth/           # Login, register pages
├── marketplace/    # Browse/search tasks
├── task-detail/    # Task detail page
├── task-form/      # Create/edit task form
├── apply-task/     # Apply to a task
├── my-jobs/        # User's jobs
├── wallet/         # Balance, deposit, transactions
├── chat/           # WebSocket real-time chat
├── profile/        # User profile
├── notifications/  # Notification list
├── verify-email/   # Email verification flow
├── payment-return/ # PayOS return page
├── layout/         # App shell, navigation
├── features/       # Feature modules
└── environments/   # Dev/prod configs
```

## Core Services (11)
auth, task, user, wallet, payment, chat, websocket, notification, category, application, language

## Design System: nhannht-metro-meow
- All shared components prefixed `nhannht-metro-*`
- Tailwind 4 for styling
- Storybook 9 for component docs
- Components: button, input, textarea, select, card, badge, dialog, tabs, spinner, icon, nav, datepicker, snackbar, etc.

## Key Patterns
- Standalone components (no NgModules)
- Angular Signals + RxJS for state
- Vitest via `npx ng test` (never run vitest directly)
- SSR with Express 5, port 4001 in production
- i18n: English + Vietnamese
