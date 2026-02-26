# UI Platform Parity: Android vs Web

> **Last Updated:** 2026-02-26

Cross-platform comparison of the Viecz Android app (Kotlin/Jetpack Compose) and web client (Angular 21). Both platforms share the same Go backend API.

**Overall parity: High (~95%+)** -- core marketplace, payment, chat, and profile flows are implemented on both platforms. Remaining differences are mostly UX-level.

| Platform | Stack |
|----------|-------|
| Android | Kotlin + Jetpack Compose + Material Design 3 |
| Web | Angular 21 + nhannht-metro-meow design system |

---

## Screen-by-Screen Comparison

| Feature | Android Screen | Web Component | Parity |
|---------|---------------|---------------|--------|
| Login | `LoginScreen` | `login.component` | Full |
| Phone / OTP Login | `PhoneLoginScreen` | `phone-login.component` | Full |
| Register (email/password) | `RegisterScreen` | `/register` redirects to `/phone` (email register UI hidden) | Partial |
| Splash / Auth Guard | `SplashScreen` | Auth guard (route-based) | Partial |
| Browse Tasks (List + Map) | `MainScreen` (tab 0) / `HomeScreen` | `marketplace.component` + `marketplace-map.component` | Full |
| Near-Me Filtering | `MainScreen` location toggle | `marketplace.component` geolocation + radius filters | Full |
| Task Detail | `TaskDetailScreen` | `task-detail.component` | Full |
| Create Task | `CreateTaskScreen` | `task-form.component` | Full |
| Edit Task | `CreateTaskScreen` (taskId param) | `task-form.component` (route param) | Full |
| Apply for Task | `ApplyTaskScreen` | `apply-task.component` | Full |
| Profile (own/other) | `ProfileScreen` | `profile.component` | Full |
| Edit Profile | `EditProfileScreen` (dedicated) | `profile.component` (inline edit) | Partial |
| Become Tasker | `MainScreen` tab 1 | `profile.component` (dialog) | Full |
| My Jobs | `MyJobsScreen` (3 tabs) | `my-jobs.component` (3 tabs) | Full |
| View Wallet | `WalletScreen` | `wallet.component` | Full |
| Deposit Funds | `WalletScreen` + `DepositDialog` | `wallet.component` | Full |
| Transaction History | `WalletScreen` (inline list) | `wallet.component` (inline list) | Full |
| Conversation List | `ConversationListScreen` | `conversation-list.component` | Full |
| Chat Window | `ChatScreen` | `chat.component` | Full |
| Notifications | `NotificationScreen` | `notification-list.component` | Full |

Unused/demo Android screens (not in web): `PaymentScreen`, `FirstScreen`, `SecondScreen`.

---

## Navigation Comparison

### Android: Bottom Tab Navigation (persistent)

```
+------------------------------------------+
|                Content                    |
|                                          |
|                                          |
+----------+--------+-----------+----------+
|  Market  |Profile | Messages  |  Wallet  |
+----------+--------+-----------+----------+
```

- 4 tabs: Marketplace, Profile, Messages, Wallet
- Stack-based navigation within each tab
- Persistent across all screens

### Web: Top Horizontal Navbar (sticky)

```
+----------------------------------------------------+
| * Viecz   Marketplace   Wallet   Chat    [bell] [u] |
+----------------------------------------------------+
|                                                     |
|                   Content                           |
|                                                     |
+-----------------------------------------------------+
```

- Sticky top bar with logo + links + icon actions
- Route-based navigation (Angular Router)
- Notification dropdown menu + user dropdown menu
- Mobile: text labels hidden, icons only

---

## Design Language Comparison

| Aspect | Android (Material 3) | Web (nhannht-metro-meow) |
|--------|---------------------|--------------------------|
| Design System | Material Design 3 | nhannht-metro-meow (custom) |
| Typography | Roboto (Material type scale) | JetBrains Mono (display) + Space Mono (body) |
| Colors | Material 3 dynamic colors | Fixed: fg `#1a1a1a`, bg `#f0ede8`, muted `#6b6b6b` |
| Corners | Rounded (Material shape system) | Square (`border-radius: 0`) |
| Elevation | Material elevation/shadow | Flat with 1px borders |
| Icons | Material Icons (`Icons.Default.*`) | Material Icons (font ligatures via `nhannht-metro-icon`) |
| Buttons | `Button`, `OutlinedButton`, `TextButton` | `nhannht-metro-button` (primary/secondary) |
| Cards | Material `Card` composable | `nhannht-metro-card` (1px border, no radius) |
| Form Inputs | `OutlinedTextField` | `nhannht-metro-input` (square, monospace) |
| Dialogs | `AlertDialog` composable | `nhannht-metro-dialog` (custom overlay) |
| Spinners | `CircularProgressIndicator` | `nhannht-metro-spinner` (CSS border animation) |
| Snackbar | Material Snackbar | `nhannht-metro-snackbar` + service |
| Tabs | `TabRow` + `Tab` | `nhannht-metro-tabs` |
| Bottom Nav | `NavigationBar` (Material 3) | N/A (uses top navbar) |
| Top App Bar | `TopAppBar` (Material 3) | N/A (uses top navbar) |

---

## Feature Matrix

| Feature | Android | Web |
|---------|:-------:|:---:|
| Phone-first authentication | Yes | Yes |
| Browse and search tasks | Yes | Yes |
| Category filtering | Yes | Yes |
| Map view for tasks | Yes | Yes |
| Near-me geolocation filtering | Yes | Yes |
| Infinite scroll / pagination | Yes | Yes |
| Create/Edit/Delete task | Yes | Yes |
| Task detail with applications | Yes | Yes |
| Apply for task with escrow | Yes | Yes |
| View own and others' profiles | Yes | Yes |
| Edit profile | Yes (dedicated screen) | Yes (inline) |
| Become tasker toggle | Yes | Yes |
| My Jobs (Posted/Applied/Completed) | Yes | Yes |
| Wallet balance display | Yes | Yes |
| Deposit funds (PayOS) | Yes | Yes |
| Bank withdrawal (PayOS) | Yes | Yes |
| Transaction history | Yes | Yes |
| Real-time chat (WebSocket) | Yes | Yes |
| Conversation list | Yes | Yes |
| Typing indicator | Yes | Yes |
| Push notifications | Yes (in-app) | Yes (in-app) |
| Mark notifications read | Yes | Yes |
| Delete notifications | Yes | Yes |
| Password visibility toggle | Yes | Yes |
| Email validation | Yes | Yes |
| Pull-to-refresh | Yes | No |
| Server-side rendering | No | Yes (Angular SSR) |
| PWA / offline | No | No |
| Deep linking | Yes (nav routes) | Yes (Angular routes) |

---

## Platform-Exclusive Features

### Android-Only

| Feature | Notes |
|---------|-------|
| Pull-to-refresh | Native gesture; not implemented on web |
| Splash screen | Explicit `SplashScreen` composable; web uses auth guard redirect |
| Bottom navigation | Platform convention; web uses top navbar |
| Native date picker | System-level picker; web uses `<input type="date">` |
| MapLibre marketplace map | Android uses MapLibre with OpenStreetMap tiles; web uses Google Maps component |
| Near-Me radius chips | Android shows radius chips (500m, 1km, 3km, 5km) when Near Me enabled; web uses numeric radius input |

### Web-Only

| Feature | Notes |
|---------|-------|
| Server-side rendering (SSR) | Angular SSR for SEO and initial load |
| Storybook component catalog | Design system development/documentation tool |
| Profile inline editing | Edit profile without navigating to new page |
| URL-based deep linking | Standard web URLs vs Android nav routes |
| Notification dropdown | Preview notifications without leaving current page |
