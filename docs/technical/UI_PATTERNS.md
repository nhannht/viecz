# UI Patterns -- Angular Web Client

> Last Updated: 2026-02-25

Page-level UI patterns used across the Viecz Angular web client. Covers state management, forms, layout, navigation, feedback, and data display.

**Design system context**: The web client uses the **nhannht-metro-meow** design system with Tailwind 4. Legacy component wrappers still exist in a few screens, but Angular Material runtime components are no longer used.

---

## 1. Four-State Page Pattern

Every data-driven page renders one of four mutually exclusive states:

```typescript
@if (loading && items.length === 0) {
  // Loading -- skeleton or spinner
} @else if (error) {
  // Error -- fallback component or snackbar
} @else if (items.length === 0) {
  // Empty -- illustration + message + optional CTA
} @else {
  // Content -- the actual page
}
```

### Loading Implementations

| Page | Component | System | Notes |
|------|-----------|--------|-------|
| Marketplace | `<app-loading-skeleton variant="card" [count]="6">` | Custom | Skeleton cards matching card grid |
| My Jobs | `<nhannht-metro-spinner [size]="40">` | nhannht-metro | Centered |
| Wallet | `<nhannht-metro-spinner [size]="40">` | nhannht-metro | Centered |
| Chat | `<nhannht-metro-spinner [size]="30">` | nhannht-metro | Inline |
| Conversation List | `<nhannht-metro-spinner [size]="36">` | nhannht-metro | Centered |
| Apply Task | `<nhannht-metro-spinner [size]="40">` | nhannht-metro | Centered |
| Notifications | `<nhannht-metro-spinner [size]="40">` | nhannht-metro | Centered |

### Empty State Implementations

| Page | Icon | Title | Action |
|------|------|-------|--------|
| Marketplace | `assignment` | Custom message | None |
| My Jobs (Posted) | `assignment` | "No tasks posted yet" | "Post a Task" -> `/tasks/new` |
| My Jobs (Applied) | `work_outline` | "No applications yet" | "Browse Marketplace" -> `/` |
| My Jobs (Completed) | `done_all` | "No completed tasks" | None |
| Wallet Transactions | `receipt_long` | "No transactions" | None |
| Conversation List | `chat_bubble_outline` | "No conversations" | "Browse Marketplace" -> `/` |
| Notifications | `notifications_off` | "No notifications" | None |

### Error State

| Pattern | System | Usage |
|---------|--------|-------|
| `<app-error-fallback [title] [message] [retryFn]>` | Custom | Most pages -- inline retry |
| Snackbar + `router.navigate` | nhannht-metro | Task Form, Apply Task -- redirect on error |

---

## 2. Form Patterns

### Centered Auth Form (Login, Register, Phone Login)

Used by `LoginComponent`, `RegisterComponent` (legacy path), and `PhoneLoginComponent` (default flow).

```
+---------------------------------------+
|  flex justify-center items-center     |
|  min-h-screen                         |
|                                       |
|  +-------------------------------+    |
|  | w-full max-w-[420px]          |    |
|  | bg-card border border-border  |    |
|  | p-8                           |    |
|  |                               |    |
|  |  [work icon 28px] Viecz       |    |
|  |  LOGIN (13px, tracking 2px)   |    |
|  |                               |    |
|  |  [Email field]                |    |
|  |  [Password field]             |    |
|  |  [Error box if error]         |    |
|  |  [CTA button, full-width]     |    |
|  |  [Link to register/login]    |    |
|  +-------------------------------+    |
+---------------------------------------+
```

| Element | Implementation | System |
|---------|---------------|--------|
| Container | `flex justify-center items-center min-h-screen` | Tailwind |
| Card | `w-full max-w-[420px] bg-card border border-border p-8` | Tailwind |
| Header | Icon (`work`, 28px) + brand text (`Viecz`, 16px display font) | nhannht-metro |
| Title | `font-display text-[13px] tracking-[2px] text-fg` -- all caps | nhannht-metro |
| Fields | `flex flex-col gap-4` with `NhannhtMetroInput` | nhannht-metro |
| Error box | `bg-fg/20 text-fg border border-fg px-4 py-3` | Tailwind |
| CTA | Full-width `nhannht-metro-button variant="primary"` | nhannht-metro |
| Link | `routerLink` to alternate auth page | Angular Router |

### Wide Form (Task Form)

Used by `TaskFormComponent`.

| Element | Implementation | System |
|---------|---------------|--------|
| Container | `max-width: 700px; margin: 0 auto` | Inline CSS |
| Wrapper | `nhannht-metro-card` (`max-w-[700px] mx-auto`) | nhannht-metro |
| Two-column row | `flex gap-16px` for Price + Location; `flex-direction: column` at 600px | CSS media query |
| Balance card | Utility classes (`bg-fg text-bg` / `bg-card border border-fg text-fg`) | Tailwind |

### Modal-Style Form (Apply Task)

Used by `ApplyTaskComponent`.

| Element | Implementation | System |
|---------|---------------|--------|
| Container | `max-w-[600px] mx-auto` | Tailwind |
| Sections | `border-b border-border` separators | Tailwind |
| Info box | `bg-bg border border-border px-4 py-3` | Tailwind |
| Button row | `flex` with Cancel (secondary) + Submit (primary) | nhannht-metro |

---

## 3. Layout Patterns

### Card Grid (Marketplace, My Jobs)

```html
<div class="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
  <!-- <nhannht-metro-task-card> or <app-task-card> -->
</div>
```

- **Mobile**: 1 column
- **Tablet+**: auto-fill, 320px minimum card width

### Stats Grid (Profile)

```css
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
@media (max-width: 600px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
}
```

- **Desktop**: 4 columns
- **Mobile**: 2 columns

### Two-Column Detail (Task Detail)

```css
.detail-page {
  display: grid;
  grid-template-columns: 1fr;
}
@media (min-width: 960px) {
  .detail-page { grid-template-columns: 2fr 1fr; }
}
```

- **Mobile**: stacked
- **Desktop**: main content (2fr) + sidebar (1fr)

### Chat Layout

Full-height flex column with scrollable message area:

```html
<div class="flex flex-col h-full">
  <header><!-- Chat header --></header>
  <div class="msg-list flex-1 overflow-y-auto p-4 flex flex-col gap-2">
    <!-- Messages -->
  </div>
  <footer><!-- Input bar --></footer>
</div>
```

### List with Dividers

```html
@for (item of items; track item.id) {
  <div class="...">{{ item content }}</div>
  @if (!$last) { <nhannht-metro-divider /> }
}
```

Uses `$last` from Angular's `@for` block to suppress trailing divider.

---

## 4. Navigation Patterns

### Declarative (routerLink)

```html
<!-- Static route -->
<a routerLink="/tasks/new">Create Task</a>

<!-- Dynamic route -->
<a [routerLink]="['/tasks', task.id]">View Task</a>

<!-- With active class -->
<a routerLink="/"
   routerLinkActive="active-link"
   [routerLinkActiveOptions]="{exact: true}">
  Home
</a>
```

### Programmatic (router.navigate)

```typescript
this.router.navigate(['/tasks', task.id]);  // After create
this.router.navigate(['/']);                 // After error/cancel
this.router.navigate(['/messages']);         // Back from chat
```

### Back Button

```html
<button (click)="goBack()">
  <nhannht-metro-icon name="arrow_back" [size]="20" />
</button>
```

### Floating Action Button (FAB)

```html
<a routerLink="/tasks/new"
   class="fixed bottom-6 right-6 z-50 w-14 h-14 bg-fg text-bg border-2 border-fg
          flex items-center justify-center hover:bg-transparent hover:text-fg
          transition-all duration-200"
   aria-label="Create Task">
  <nhannht-metro-icon name="add" [size]="28" />
</a>
```

Square, no border-radius -- consistent with nhannht-metro design language.

---

## 5. Feedback Patterns

### Snackbar / Toast

| Method | System | Usage |
|--------|--------|-------|
| `NhannhtMetroSnackbarService.show(msg, action, opts)` | nhannht-metro | Standard feedback channel |

```typescript
// nhannht-metro
this.snackbar.show('Task created successfully', 'Close', { duration: 3000 });
```

Global snackbar rendered in shell:

```html
<nhannht-metro-snackbar
  [visible]="snackbarService.visible()"
  [message]="snackbarService.message()" />
```

### Inline Error Box (Auth Pages)

```html
@if (error()) {
  <div class="bg-fg/20 text-fg border border-fg px-4 py-3 mb-4">
    {{ error() }}
  </div>
}
```

### Chat Closed Banner

```html
@if (chatClosed()) {
  <div class="flex items-center gap-2 px-4 py-2 bg-bg border-b border-border">
    <nhannht-metro-icon name="lock" [size]="16" />
    <span>This chat is closed</span>
  </div>
}
```

### WebSocket Connection Status (Chat)

| State | Background | Text Color |
|-------|-----------|------------|
| Connected | `#c8e6c9` | `#2e7d32` |
| Connecting | `#fff9c4` | `#f57f17` |
| Disconnected | `#ffcdd2` | `#c62828` |

---

## 6. Data Display Patterns

### Page Heading

All page headings use the display font in uppercase with wide tracking:

```html
<h2 class="font-display text-[13px] tracking-[2px] text-fg">PAGE TITLE</h2>
```

### Price (VND)

```html
{{ price | vnd }}
<!-- Output: "50,000 VND" -->
```

Uses custom `VndPipe`.

### Status Badge

```html
<nhannht-metro-badge [label]="task.status" [status]="task.status" />
```

### Timestamp

```html
{{ createdAt | timeAgo }}
<!-- Output: "2 hours ago", "just now" -->
```

Uses custom `TimeAgoPipe`.

### Transaction Row

| Element | Logic |
|---------|-------|
| Icon | `arrow_downward` (deposit), `arrow_upward` (withdrawal), etc. |
| Amount (positive) | `text-fg`, prefixed with `+` |
| Amount (negative) | `text-muted`, prefixed with `-` |

### Notification Item

```html
<div class="flex items-start gap-3 px-6 py-3 hover:bg-bg transition-colors"
     [class.unread]="!n.is_read">
  <nhannht-metro-icon [name]="getTypeIcon(n.type)" [size]="20" />
  <div class="flex-1 flex flex-col gap-0.5">
    <span class="font-body text-[13px]" [class.font-bold]="!n.is_read">
      {{ n.title }}
    </span>
    <span class="text-[12px] text-muted">{{ n.message }}</span>
    <span class="text-[11px] text-muted">{{ n.created_at | timeAgo }}</span>
  </div>
</div>
```

Unread items get `font-bold` on the title.

---

## Quick Reference: Current System Status

| Pattern | Current System | Status |
|---------|---------------|--------|
| Spinners | nhannht-metro | Stable |
| Task Form wrapper | nhannht-metro-card | Stable |
| Snackbar | nhannht-metro service + component | Stable |
| Auth forms | nhannht-metro + Tailwind | Stable |
| Task cards | `app-task-card` + `nhannht-metro-task-card` | Mixed (legacy + new) |
| Icons | `nhannht-metro-icon` | Stable |
| Inputs | `nhannht-metro-input` / `nhannht-metro-location-picker` | Stable |
| Buttons | `nhannht-metro-button` | Stable |
