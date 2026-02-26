# UI Component Catalog

**Last Updated:** 2026-02-25
**Framework:** Angular 21 | **Design System:** nhannht-metro-meow
**Source:** `web/src/app/shared/components/` | **Service:** `web/src/app/shared/services/`

---

## 1. Quick Reference

| # | Selector | Class | Category | Key Inputs | Status |
|---|----------|-------|----------|------------|--------|
| 1 | `nhannht-metro-button` | `NhannhtMetroButtonComponent` | Atomic | `variant`, `label`, `disabled` | Active |
| 2 | `nhannht-metro-spinner` | `NhannhtMetroSpinnerComponent` | Atomic | `size`, `label` | Active |
| 3 | `nhannht-metro-icon` | `NhannhtMetroIconComponent` | Atomic | `name`, `size` | Active |
| 4 | `nhannht-metro-divider` | `NhannhtMetroDividerComponent` | Atomic | (none) | Active |
| 5 | `nhannht-metro-badge` | `NhannhtMetroBadgeComponent` | Atomic | `label`, `status` | Active |
| 6 | `nhannht-metro-input` | `NhannhtMetroInputComponent` | Form | `label`, `type`, `error` | Active |
| 7 | `nhannht-metro-textarea` | `NhannhtMetroTextareaComponent` | Form | `label`, `rows`, `error` | Active |
| 8 | `nhannht-metro-select` | `NhannhtMetroSelectComponent` | Form | `label`, `options`, `error` | Active |
| 9 | `nhannht-metro-datepicker` | `NhannhtMetroDatepickerComponent` | Form | `label`, `min`, `max`, `error` | Active |
| 10 | `nhannht-metro-bank-select` | `NhannhtMetroBankSelectComponent` | Form | `label`, `banks`, `error` | Active |
| 11 | `nhannht-metro-location-picker` | `NhannhtMetroLocationPickerComponent` | Form | `label`, `placeholder`, `error` | Active |
| 12 | `nhannht-metro-card` | `NhannhtMetroCardComponent` | Layout | `featured`, `hoverable` | Active |
| 13 | `nhannht-metro-dialog` | `NhannhtMetroDialogComponent` | Layout | `open`, `title` | Active |
| 14 | `nhannht-metro-snackbar` | `NhannhtMetroSnackbarComponent` | Layout | `visible`, `message` | Active |
| 15 | `nhannht-metro-tabs` | `NhannhtMetroTabsComponent` | Layout | `tabs`, `activeTab` | Active |
| 16 | `nhannht-metro-nav` | `NhannhtMetroNavComponent` | Layout | `logo`, `links` | Active |
| 17 | `nhannht-metro-menu` | `NhannhtMetroMenuComponent` | Layout | `open` | Active |
| 18 | `nhannht-metro-task-card` | `NhannhtMetroTaskCardComponent` | Domain | `task`, `isOwner` | Active |
| 19 | `nhannht-metro-application-card` | `NhannhtMetroApplicationCardComponent` | Domain | `application`, `showAccept` | Active |
| 20 | `nhannht-metro-chat-bubble` | `NhannhtMetroChatBubbleComponent` | Domain | `message`, `isMine` | Active |
| 21 | `nhannht-metro-transaction-row` | `NhannhtMetroTransactionRowComponent` | Domain | `transaction` | Active |
| 22 | `nhannht-metro-price-card` | `NhannhtMetroPriceCardComponent` | Domain | `tier`, `price`, `features` | Active |
| 23 | `nhannht-metro-step` | `NhannhtMetroStepComponent` | Domain | `number`, `title` | Active |
| 24 | `nhannht-metro-ascii-art` | `NhannhtMetroAsciiArtComponent` | Domain | `src`, `width`, `height` | Active |
| 25 | `app-empty-state` | `EmptyStateComponent` | Utility | `icon`, `title`, `actionLabel` | Active |
| 26 | `app-error-fallback` | `ErrorFallbackComponent` | Utility | `title`, `message`, `retryFn` | Active |
| 27 | `app-loading-skeleton` | `LoadingSkeletonComponent` | Utility | `variant`, `count` | Active |
| 28 | `app-message-bubble` | `MessageBubbleComponent` | Utility | `message`, `isMine` | Legacy |
| 29 | `app-task-card` | `TaskCardComponent` | Legacy | `task` | Legacy |
| 30 | `app-category-chips` | `CategoryChipsComponent` | Legacy | (none) | Legacy |

---

## 2. Design System Components

### 2.1 Atomic

#### nhannht-metro-button

**Selector:** `nhannht-metro-button` | **Class:** `NhannhtMetroButtonComponent`
**Replaces:** `MatButton`, `MatRaisedButton`

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `variant` | `'primary' \| 'secondary'` | `'primary'` | Visual style |
| `label` | `string` | `''` | Button text (or use `<ng-content>`) |
| `fullWidth` | `boolean` | `false` | Stretch to container width |
| `disabled` | `boolean` | `false` | Disable interaction |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | HTML button type |

| Output | Type | Description |
|--------|------|-------------|
| `clicked` | `MouseEvent` | Emitted on click |

```html
<nhannht-metro-button
  label="Submit"
  variant="primary"
  [fullWidth]="true"
  (clicked)="onSubmit($event)">
</nhannht-metro-button>
```

---

#### nhannht-metro-spinner

**Selector:** `nhannht-metro-spinner` | **Class:** `NhannhtMetroSpinnerComponent`
**Replaces:** `MatProgressSpinner`

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `size` | `number` | `24` | Diameter in px |
| `label` | `string` | `'Loading'` | ARIA label |

**Accessibility:** `role="progressbar"`, `aria-label`

```html
<nhannht-metro-spinner [size]="32" label="Fetching tasks"></nhannht-metro-spinner>
```

---

#### nhannht-metro-icon

**Selector:** `nhannht-metro-icon` | **Class:** `NhannhtMetroIconComponent`
**Replaces:** `MatIcon`

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `name` | `string` | *required* | Material icon name |
| `size` | `number` | `24` | Icon size in px |
| `ariaHidden` | `boolean` | `true` | Hide from screen readers |

When `ariaHidden=false`, `aria-label` is set to the `name` value.

```html
<nhannht-metro-icon name="search" [size]="20"></nhannht-metro-icon>
<nhannht-metro-icon name="warning" [ariaHidden]="false"></nhannht-metro-icon>
```

---

#### nhannht-metro-divider

**Selector:** `nhannht-metro-divider` | **Class:** `NhannhtMetroDividerComponent`
**Replaces:** `MatDivider`

No inputs. No outputs. Renders a styled `<hr>` element.

```html
<nhannht-metro-divider></nhannht-metro-divider>
```

---

#### nhannht-metro-badge

**Selector:** `nhannht-metro-badge` | **Class:** `NhannhtMetroBadgeComponent`
**Replaces:** `MatChip` (status indicators)

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `label` | `string` | *required* | Badge text |
| `status` | `'open' \| 'in_progress' \| 'completed' \| 'cancelled' \| 'default'` | `'default'` | Visual status variant |

**Status styles:**

| Status | Background | Border | Text | Extra |
|--------|------------|--------|------|-------|
| `open` | solid fg | -- | bg | -- |
| `in_progress` | transparent | fg | fg | -- |
| `completed` | solid muted | -- | bg | -- |
| `cancelled` | transparent | muted | muted | strikethrough |
| `default` | transparent | border | fg | -- |

```html
<nhannht-metro-badge label="Open" status="open"></nhannht-metro-badge>
<nhannht-metro-badge label="In Progress" status="in_progress"></nhannht-metro-badge>
```

---

### 2.2 Form (ControlValueAccessor)

All form components implement `ControlValueAccessor` and work with Angular reactive forms and template-driven forms.

#### nhannht-metro-input

**Selector:** `nhannht-metro-input` | **Class:** `NhannhtMetroInputComponent`
**Replaces:** `MatFormField` + `MatInput` + `MatLabel` + `MatError`

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `label` | `string` | `''` | Field label |
| `placeholder` | `string` | `''` | Placeholder text |
| `type` | `'text' \| 'email' \| 'password' \| 'number' \| 'tel' \| 'url'` | `'text'` | HTML input type |
| `error` | `string` | `''` | Error message (displayed when non-empty) |
| `inputId` | `string` | auto-generated | HTML `id` attribute |

**Accessibility:** `aria-label`, `aria-invalid` (when error present), `aria-describedby` pointing to error `<span role="alert">`.

```html
<nhannht-metro-input
  formControlName="email"
  label="Email"
  type="email"
  placeholder="you@example.com"
  [error]="form.controls.email.hasError('required') ? 'Email is required' : ''">
</nhannht-metro-input>
```

---

#### nhannht-metro-textarea

**Selector:** `nhannht-metro-textarea` | **Class:** `NhannhtMetroTextareaComponent`
**Replaces:** `MatFormField` + `textarea matInput`

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `label` | `string` | `''` | Field label |
| `placeholder` | `string` | `''` | Placeholder text |
| `rows` | `number` | `4` | Visible text rows |
| `error` | `string` | `''` | Error message |
| `textareaId` | `string` | auto-generated | HTML `id` attribute |

**Accessibility:** `aria-label`, `aria-invalid`, error `<span role="alert">`.

```html
<nhannht-metro-textarea
  formControlName="description"
  label="Description"
  [rows]="6"
  placeholder="Describe the task..."
  [error]="form.controls.description.hasError('required') ? 'Required' : ''">
</nhannht-metro-textarea>
```

---

#### nhannht-metro-select

**Selector:** `nhannht-metro-select` | **Class:** `NhannhtMetroSelectComponent`
**Replaces:** `MatSelect` + `MatOption`

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `label` | `string` | `''` | Field label |
| `placeholder` | `string` | `''` | Placeholder for empty state |
| `options` | `{value: string; label: string}[]` | `[]` | Dropdown options |
| `error` | `string` | `''` | Error message |
| `selectId` | `string` | auto-generated | HTML `id` attribute |

Uses native `<select>` element for maximum accessibility and mobile compatibility.

```html
<nhannht-metro-select
  formControlName="category"
  label="Category"
  placeholder="Select a category"
  [options]="[
    {value: '1', label: 'Cleaning'},
    {value: '2', label: 'Delivery'},
    {value: '3', label: 'Tutoring'}
  ]"
  [error]="form.controls.category.hasError('required') ? 'Required' : ''">
</nhannht-metro-select>
```

---

#### nhannht-metro-datepicker

**Selector:** `nhannht-metro-datepicker` | **Class:** `NhannhtMetroDatepickerComponent`
**Replaces:** `MatDatepicker` + `MatDatepickerInput` + `MatNativeDateModule`

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `label` | `string` | `''` | Field label |
| `error` | `string` | `''` | Error message |
| `min` | `string` | `''` | Minimum date (ISO format) |
| `max` | `string` | `''` | Maximum date (ISO format) |
| `dateId` | `string` | auto-generated | HTML `id` attribute |

Uses native `<input type="date">` for OS-level date picker UI.

```html
<nhannht-metro-datepicker
  formControlName="deadline"
  label="Deadline"
  [min]="today"
  [error]="form.controls.deadline.hasError('required') ? 'Required' : ''">
</nhannht-metro-datepicker>
```

---

#### nhannht-metro-bank-select

**Selector:** `nhannht-metro-bank-select` | **Class:** `NhannhtMetroBankSelectComponent`
**Replaces:** custom `<select>` + bank option rendering

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `label` | `string` | `''` | Field label |
| `placeholder` | `string` | `''` | Placeholder text |
| `banks` | `VietQRBank[]` | `[]` | Bank options from VietQR list |
| `error` | `string` | `''` | Validation error |

| CVA Value | Type | Description |
|-----------|------|-------------|
| model | `string` | Selected bank BIN |

```html
<nhannht-metro-bank-select
  [label]="'Bank'"
  [placeholder]="'Select bank'"
  [banks]="vietnamBanks"
  [(ngModel)]="bankBin"
  [error]="bankError">
</nhannht-metro-bank-select>
```

---

#### nhannht-metro-location-picker

**Selector:** `nhannht-metro-location-picker` | **Class:** `NhannhtMetroLocationPickerComponent`
**Replaces:** text-only location input (adds map + autocomplete)

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `label` | `string` | `''` | Field label |
| `placeholder` | `string` | `''` | Search placeholder |
| `error` | `string` | `''` | Validation error |

| CVA Value | Type | Description |
|-----------|------|-------------|
| model | `LocationPickerValue` | `{ location, latitude, longitude }` |

Features:
- Nominatim-based search autocomplete via `GeocodingService`
- MapLibre map with click-to-select + draggable marker
- Reverse geocoding to fill human-readable location

```html
<nhannht-metro-location-picker
  label="Location"
  placeholder="Search location"
  [(ngModel)]="locationValue"
  [error]="locationError">
</nhannht-metro-location-picker>
```

---

### 2.3 Layout & Containers

#### nhannht-metro-card

**Selector:** `nhannht-metro-card` | **Class:** `NhannhtMetroCardComponent`
**Replaces:** `MatCard`

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `featured` | `boolean` | `false` | Apply featured border/accent |
| `hoverable` | `boolean` | `false` | Enable hover lift effect |

**Content projection:** `<ng-content>`
**Hover effect:** `translateY(-2px)` + shadow elevation when `hoverable=true`.

```html
<nhannht-metro-card [hoverable]="true">
  <h3>Task Title</h3>
  <p>Task description goes here.</p>
</nhannht-metro-card>
```

---

#### nhannht-metro-dialog

**Selector:** `nhannht-metro-dialog` | **Class:** `NhannhtMetroDialogComponent`
**Replaces:** `MatDialog`

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `open` | `boolean` | `false` | Show/hide the dialog |
| `title` | `string` | `''` | Dialog header |
| `confirmLabel` | `string` | `'Confirm'` | Confirm button text |
| `cancelLabel` | `string` | `'Cancel'` | Cancel button text |

| Output | Type | Description |
|--------|------|-------------|
| `confirmed` | `void` | User clicked confirm |
| `cancelled` | `void` | User clicked cancel or backdrop |

**Content projection:** `<ng-content>` for dialog body.
**Accessibility:** `role="dialog"`, `aria-modal="true"`, `aria-label` bound to `title`.

```html
<nhannht-metro-dialog
  [open]="showDeleteDialog"
  title="Delete Task?"
  confirmLabel="Delete"
  cancelLabel="Keep"
  (confirmed)="deleteTask()"
  (cancelled)="showDeleteDialog = false">
  <p>This action cannot be undone.</p>
</nhannht-metro-dialog>
```

---

#### nhannht-metro-snackbar

**Selector:** `nhannht-metro-snackbar` | **Class:** `NhannhtMetroSnackbarComponent`
**Replaces:** `MatSnackBar`

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `visible` | `boolean` | `false` | Show/hide the snackbar |
| `message` | `string` | `''` | Notification text |
| `actionLabel` | `string` | `''` | Action button text (hidden if empty) |

| Output | Type | Description |
|--------|------|-------------|
| `actionClicked` | `void` | User clicked the action button |

**Accessibility:** `role="status"`, `aria-live="polite"`.

Typically driven by `NhannhtMetroSnackbarService` (see Section 5) rather than used directly.

```html
<nhannht-metro-snackbar
  [visible]="snackbar.visible()"
  [message]="snackbar.message()"
  actionLabel="Undo"
  (actionClicked)="undoAction()">
</nhannht-metro-snackbar>
```

---

#### nhannht-metro-tabs

**Selector:** `nhannht-metro-tabs` | **Class:** `NhannhtMetroTabsComponent`
**Replaces:** `MatTabGroup` + `MatTab`

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `tabs` | `{value: string; label: string}[]` | `[]` | Tab definitions |
| `activeTab` | `string` | `''` | Currently active tab value |

| Output | Type | Description |
|--------|------|-------------|
| `tabChanged` | `string` | Emits the new tab `value` |

**Content projection:** `<ng-content>` for the active tab panel.
**Accessibility:** `role="tablist"`, each tab has `role="tab"` + `aria-selected`, panel has `role="tabpanel"`.

```html
<nhannht-metro-tabs
  [tabs]="[
    {value: 'posted', label: 'Posted'},
    {value: 'applied', label: 'Applied'},
    {value: 'completed', label: 'Completed'}
  ]"
  [activeTab]="currentTab"
  (tabChanged)="currentTab = $event">
  <!-- Tab panel content rendered here -->
  @if (currentTab === 'posted') { <app-posted-tasks /> }
  @if (currentTab === 'applied') { <app-applied-tasks /> }
</nhannht-metro-tabs>
```

---

#### nhannht-metro-nav

**Selector:** `nhannht-metro-nav` | **Class:** `NhannhtMetroNavComponent`
**Replaces:** `MatToolbar`

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `logo` | `string` | `'Viecz'` | Brand text |
| `logoRoute` | `string` | `'/'` | Logo click route |
| `links` | `{label: string; route: string; icon?: string}[]` | `[]` | Navigation links |

**Content projection:** `<ng-content select="[actions]">` for right-side action buttons.
Uses `<nav>` element with frosted glass backdrop-filter.

```html
<nhannht-metro-nav
  logo="Viecz"
  [links]="[
    {label: 'Marketplace', route: '/marketplace', icon: 'store'},
    {label: 'My Jobs', route: '/my-jobs', icon: 'work'},
    {label: 'Wallet', route: '/wallet', icon: 'account_balance_wallet'}
  ]">
  <div actions>
    <nhannht-metro-button label="Logout" variant="secondary" (clicked)="logout()"></nhannht-metro-button>
  </div>
</nhannht-metro-nav>
```

---

#### nhannht-metro-menu

**Selector:** `nhannht-metro-menu` | **Class:** `NhannhtMetroMenuComponent`
**Replaces:** `MatMenu` + `MatMenuTrigger`

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `open` | `boolean` | `false` | Show/hide the menu |

| Output | Type | Description |
|--------|------|-------------|
| `closed` | `void` | Menu dismissed |

**Content projection:** `<ng-content>` for menu items.
**Accessibility:** `role="menu"`, Escape key closes, click-outside detection.

```html
<button (click)="menuOpen = !menuOpen">Options</button>
<nhannht-metro-menu [open]="menuOpen" (closed)="menuOpen = false">
  <button role="menuitem" (click)="edit()">Edit</button>
  <button role="menuitem" (click)="delete()">Delete</button>
</nhannht-metro-menu>
```

---

### 2.4 Domain-Specific

#### nhannht-metro-task-card

**Selector:** `nhannht-metro-task-card` | **Class:** `NhannhtMetroTaskCardComponent`

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `task` | `Task` | *required* | Task data object |
| `isOwner` | `boolean` | `false` | Whether current user owns this task |

**Displays:** status badge, title, truncated description (line clamp), price in VND, location, deadline.

```html
<nhannht-metro-task-card
  [task]="task"
  [isOwner]="task.posterId === currentUserId">
</nhannht-metro-task-card>
```

---

#### nhannht-metro-application-card

**Selector:** `nhannht-metro-application-card` | **Class:** `NhannhtMetroApplicationCardComponent`

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `application` | `TaskApplication` | *required* | Application data |
| `showAccept` | `boolean` | `false` | Show accept button |

| Output | Type | Description |
|--------|------|-------------|
| `acceptClick` | `number` | Emits the application ID |

**Displays:** tasker link, status badge, proposed price, message, timestamp.

```html
<nhannht-metro-application-card
  [application]="app"
  [showAccept]="isTaskOwner"
  (acceptClick)="acceptApplication($event)">
</nhannht-metro-application-card>
```

---

#### nhannht-metro-chat-bubble

**Selector:** `nhannht-metro-chat-bubble` | **Class:** `NhannhtMetroChatBubbleComponent`

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `message` | `Message` | *required* | Chat message data |
| `isMine` | `boolean` | `false` | Whether the current user sent this |

**Layout:**
- Mine: right-aligned, `bg-fg text-bg`
- Theirs: left-aligned, `bg-card border-border`
- Shows read receipt (`done_all` icon) for sent messages.

```html
@for (msg of messages; track msg.id) {
  <nhannht-metro-chat-bubble
    [message]="msg"
    [isMine]="msg.senderId === currentUserId">
  </nhannht-metro-chat-bubble>
}
```

---

#### nhannht-metro-transaction-row

**Selector:** `nhannht-metro-transaction-row` | **Class:** `NhannhtMetroTransactionRowComponent`

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `transaction` | `WalletTransaction` | *required* | Transaction record |

Auto-computes icon, sign (+/-), and color based on `transaction.type`.

```html
@for (tx of transactions; track tx.id) {
  <nhannht-metro-transaction-row [transaction]="tx"></nhannht-metro-transaction-row>
}
```

---

#### nhannht-metro-price-card

**Selector:** `nhannht-metro-price-card` | **Class:** `NhannhtMetroPriceCardComponent`

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `tier` | `string` | *required* | Plan name (e.g., "Basic") |
| `price` | `string` | *required* | Price display (e.g., "50,000") |
| `period` | `string` | `'/mo'` | Billing period suffix |
| `description` | `string` | `''` | Plan description |
| `features` | `string[]` | `[]` | Feature bullet list |
| `ctaLabel` | `string` | `'Get Started'` | Call-to-action button text |
| `featured` | `boolean` | `false` | Highlight as recommended |

| Output | Type | Description |
|--------|------|-------------|
| `ctaClick` | `void` | CTA button clicked |

```html
<nhannht-metro-price-card
  tier="Pro"
  price="200,000"
  period="/mo"
  description="For power users"
  [features]="['Unlimited tasks', 'Priority support', 'Analytics']"
  [featured]="true"
  ctaLabel="Upgrade"
  (ctaClick)="selectPlan('pro')">
</nhannht-metro-price-card>
```

---

#### nhannht-metro-step

**Selector:** `nhannht-metro-step` | **Class:** `NhannhtMetroStepComponent`

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `number` | `string` | *required* | Step number display |
| `title` | `string` | *required* | Step heading |
| `description` | `string` | `''` | Step detail text |

```html
<nhannht-metro-step number="1" title="Post a Task" description="Describe what you need done."></nhannht-metro-step>
<nhannht-metro-step number="2" title="Get Applications" description="Taskers apply with price proposals."></nhannht-metro-step>
<nhannht-metro-step number="3" title="Pay Securely" description="Funds held in escrow until completion."></nhannht-metro-step>
```

---

#### nhannht-metro-ascii-art

**Selector:** `nhannht-metro-ascii-art` | **Class:** `NhannhtMetroAsciiArtComponent`

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `src` | `string` | *required* | Source image URL |
| `width` | `number` | `452` | Canvas width |
| `height` | `number` | `380` | Canvas height |
| `alt` | `string` | `''` | Accessible label for canvas output |

Renders animated canvas ASCII-art style visuals with:
- scanlines + periodic glitch bursts
- reduced-motion fallback (`prefers-reduced-motion`)
- hover-triggered glitch intensification

```html
<nhannht-metro-ascii-art
  src="/assets/mascot.png"
  [width]="452"
  [height]="380"
  alt="Viecz mascot in ASCII art style">
</nhannht-metro-ascii-art>
```

---

## 3. Utility Components

#### app-empty-state

**Selector:** `app-empty-state` | **Class:** `EmptyStateComponent`

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `icon` | `string` | `'inbox'` | Material icon name |
| `title` | `string` | `'Nothing here'` | Heading text |
| `message` | `string` | `''` | Subtitle/description |
| `actionLabel` | `string` | `''` | Action button text (hidden if empty) |
| `action` | `() => void` | -- | Callback when action button clicked |

```html
<app-empty-state
  icon="search_off"
  title="No tasks found"
  message="Try adjusting your filters."
  actionLabel="Clear Filters"
  [action]="clearFilters">
</app-empty-state>
```

---

#### app-error-fallback

**Selector:** `app-error-fallback` | **Class:** `ErrorFallbackComponent`

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | `string` | `'Something went wrong'` | Error heading |
| `message` | `string` | `'Please try again later.'` | Error detail |
| `retryFn` | `(() => void) \| null` | `null` | Retry callback (shows button when non-null) |

```html
<app-error-fallback
  title="Failed to load tasks"
  message="Network error. Check your connection."
  [retryFn]="loadTasks">
</app-error-fallback>
```

---

#### app-loading-skeleton

**Selector:** `app-loading-skeleton` | **Class:** `LoadingSkeletonComponent`

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `variant` | `'card' \| 'list' \| 'line'` | `'card'` | Skeleton shape |
| `count` | `number` | `3` | Number of skeleton items |

**Animation:** 1.5s infinite shimmer gradient sweep.

```html
<!-- Card placeholders while loading -->
@if (loading) {
  <app-loading-skeleton variant="card" [count]="6"></app-loading-skeleton>
}
```

---

#### app-message-bubble (LEGACY)

**Selector:** `app-message-bubble` | **Class:** `MessageBubbleComponent`

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `message` | `Message` | *required* | Chat message data |
| `isMine` | `boolean` | *required* | Sent by current user |

> **Migrate to:** `nhannht-metro-chat-bubble`

---

## 4. Legacy Components

These components predate the nhannht-metro design system and remain in selective flows.

#### app-task-card (LEGACY)

**Selector:** `app-task-card` | **Class:** `TaskCardComponent`

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `task` | `Task` | *required* | Task data object |

Similar to `nhannht-metro-task-card` but determines ownership internally via `AuthService` injection rather than an `isOwner` input.

> **Migrate to:** `nhannht-metro-task-card` with explicit `[isOwner]` binding.

---

#### app-category-chips

**Selector:** `app-category-chips` | **Class:** `CategoryChipsComponent`

| Output | Type | Description |
|--------|------|-------------|
| `categorySelected` | `number` | Emits category ID (0 = All) |

No inputs. Auto-loads categories via `CategoryService` on init.

> **Note:** No direct metro replacement yet. Consider migrating to `nhannht-metro-badge` with click handlers or a dedicated filter component.

---

## 5. Services

### NhannhtMetroSnackbarService

**Location:** `web/src/app/shared/services/nhannht-metro-snackbar.service.ts`
**Provided in:** `'root'` (singleton)

| Signal | Type | Description |
|--------|------|-------------|
| `visible` | `Signal<boolean>` | Current visibility state |
| `message` | `Signal<string>` | Current message text |

| Method | Signature | Description |
|--------|-----------|-------------|
| `show` | `show(message: string, action?: string, options?: {duration?: number, panelClass?: string})` | Display a snackbar notification |
| `dismiss` | `dismiss()` | Immediately hide the snackbar |

**Default duration:** 4000ms (auto-dismiss).

```typescript
import { NhannhtMetroSnackbarService } from './shared/services/nhannht-metro-snackbar.service';

@Component({ /* ... */ })
export class TaskFormComponent {
  private snackbar = inject(NhannhtMetroSnackbarService);

  onSave() {
    this.taskService.create(this.form.value).subscribe({
      next: () => this.snackbar.show('Task created successfully!'),
      error: () => this.snackbar.show('Failed to create task', 'Retry', { duration: 6000 }),
    });
  }
}
```

Wire the service to the snackbar component in the shell/root template:

```html
<nhannht-metro-snackbar
  [visible]="snackbar.visible()"
  [message]="snackbar.message()">
</nhannht-metro-snackbar>
```

---

## 6. Migration Status

| Material Component | Metro Replacement | Status |
|---|---|---|
| `MatButton` / `MatRaisedButton` | `nhannht-metro-button` | Migrated |
| `MatProgressSpinner` | `nhannht-metro-spinner` | Migrated |
| `MatIcon` | `nhannht-metro-icon` | Migrated |
| `MatDivider` | `nhannht-metro-divider` | Migrated |
| `MatChip` (status) | `nhannht-metro-badge` | Migrated |
| `MatFormField` + `MatInput` | `nhannht-metro-input` | Migrated |
| `MatFormField` + `textarea` | `nhannht-metro-textarea` | Migrated |
| `MatSelect` + `MatOption` | `nhannht-metro-select` | Migrated |
| `MatDatepicker` | `nhannht-metro-datepicker` | Migrated |
| Bank dropdown `<select>` + manual logo rendering | `nhannht-metro-bank-select` | Migrated |
| `MatCard` | `nhannht-metro-card` | Migrated |
| `MatDialog` | `nhannht-metro-dialog` | Migrated |
| `MatSnackBar` | `nhannht-metro-snackbar` + service | Migrated |
| `MatTabGroup` + `MatTab` | `nhannht-metro-tabs` | Migrated |
| `MatToolbar` | `nhannht-metro-nav` | Migrated |
| `MatMenu` + `MatMenuTrigger` | `nhannht-metro-menu` | Migrated |
| Text-only location input | `nhannht-metro-location-picker` | Migrated |
| Hero/mascot static image | `nhannht-metro-ascii-art` | Migrated |
| `app-task-card` | `nhannht-metro-task-card` | Legacy (pending migration) |
| `app-message-bubble` | `nhannht-metro-chat-bubble` | Legacy (pending migration) |
| `app-category-chips` | -- | No replacement yet |
| `app-empty-state` | -- | N/A (utility, no Material original) |
| `app-error-fallback` | -- | N/A (utility, no Material original) |
| `app-loading-skeleton` | -- | N/A (utility, no Material original) |
