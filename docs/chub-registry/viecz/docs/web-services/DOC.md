---
name: web-services
description: "Viecz Angular services — AuthService, TaskService, WalletService, WebSocketService, and all core services with API patterns"
metadata:
  languages: "typescript"
  versions: "1.0.0"
  source: maintainer
  tags: "viecz,angular,services,rxjs,signals,transloco,i18n"
  updated-on: "2026-03-29"
---

# Viecz Web Services

Angular 21 standalone app with signals, Transloco i18n, SSR.

## Project Structure

```
web/src/app/
├── core/               # Services, guards, interceptors, models
├── shared/components/  # Reusable UI components (frostglass design system)
├── shared/directives/  # Custom directives
├── layout/             # Shell (nav, sidebar)
├── landing/            # Landing page with 3D scenes
├── marketplace/        # Task listing
├── task-detail/        # Single task view
├── task-form/          # Create/edit task
├── my-jobs/            # User's posted tasks
├── wallet/             # Wallet & transactions
├── profile/            # User profile
├── chat/               # Real-time messaging
├── notifications/      # Notification list
├── auth/               # Login, register
└── app.routes.ts       # Routing
```

## AuthService

```typescript
// core/auth.service.ts
import { AuthService } from '../core/auth.service';

const auth = inject(AuthService);

// Signals (reactive state)
auth.currentUser()        // User | null
auth.isAuthenticated()    // boolean

// Auth methods (return Observable)
auth.requestOTP(email, turnstileToken?)
auth.verifyOTP(email, code, name?)
auth.phoneLogin(idToken)
auth.googleLogin(idToken)
auth.verifyPhone(idToken)
auth.verifyEmail(token)
auth.refresh()
auth.logout()

// Token storage
localStorage: viecz_access_token, viecz_refresh_token, viecz_user
```

## TaskService

```typescript
// core/task.service.ts
const taskService = inject(TaskService);

// List with filters
taskService.list({
  category_id: 1,
  status: 'open',
  search: 'laptop',
  price_min: 10000,
  price_max: 500000,
  lat: 10.7769,
  lng: 106.7009,
  radius: 5,
  sort: 'newest',
  page: 1,
  limit: 20,
}).subscribe(res => {
  // res: { data: Task[], total: number, page: number, limit: number }
});

taskService.get(id)                          // Observable<Task>
taskService.create(body)                     // Observable<Task>
taskService.update(id, body)                 // Observable<Task>
taskService.delete(id)                       // Observable<void>
taskService.apply(taskId, { proposed_price, message })
taskService.getApplications(taskId)          // Observable<TaskApplication[]>
taskService.acceptApplication(applicationId)
taskService.complete(taskId)
```

## WalletService

```typescript
// core/wallet.service.ts
const walletService = inject(WalletService);

walletService.get()                          // Observable<Wallet>
walletService.deposit(amount, description)   // Observable<DepositResponse>
walletService.getDepositStatus(orderCode)    // Observable<any>
walletService.getTransactions(limit, offset) // Observable<WalletTransaction[]>
walletService.withdraw(amount, bankAccountId)
walletService.getBankAccounts()              // Observable<BankAccount[]>
walletService.addBankAccount(body)
walletService.deleteBankAccount(id)
```

## PaymentService

```typescript
// core/payment.service.ts
const paymentService = inject(PaymentService);

paymentService.createEscrow(taskId)
paymentService.releasePayment(taskId)
paymentService.refundPayment(taskId, reason)
```

## WebSocketService

```typescript
// core/websocket.service.ts
const ws = inject(WebSocketService);

// Connection
ws.connect()
ws.connectionStatus  // signal: 'disconnected' | 'connecting' | 'connected' | 'reconnecting'

// Messaging
ws.sendMessage(conversationId, content)
ws.sendTyping(conversationId)
ws.markRead(conversationId)
ws.joinConversation(conversationId)

// Listen
ws.messages$  // Observable<Message> — incoming messages
```

## ChatService

```typescript
// core/chat.service.ts
const chatService = inject(ChatService);

chatService.getConversations()               // Observable<Conversation[]>
chatService.createConversation(taskId, taskerId)
chatService.getConversation(id)              // Observable<Conversation>
chatService.getMessages(conversationId, limit, offset)
```

## NotificationService

```typescript
// core/notification.service.ts
const notifService = inject(NotificationService);

notifService.getNotifications()              // Observable<NotificationListResponse>
notifService.getUnreadCount()                // Observable<number>
notifService.markRead(id)
notifService.markAllRead()
notifService.delete(id)
```

## UserService

```typescript
// core/user.service.ts
const userService = inject(UserService);

userService.getProfile(id)                   // Observable<User>
userService.getMe()                          // Observable<User>
userService.updateMe(body)                   // Observable<User>
userService.uploadAvatar(file: File)         // Observable<User>
```

## CategoryService

```typescript
// core/category.service.ts
const categoryService = inject(CategoryService);

categoryService.categories()  // signal: Category[]
categoryService.load()        // triggers fetch
```

## Other Services

```typescript
// core/theme.service.ts — Dark/light/frostglass theme toggle
const theme = inject(ThemeService);
theme.toggle()  // cycles themes
theme.current() // signal: 'default' | 'dracula' | 'sang-frostglass'

// core/language.service.ts — i18n via Transloco
const lang = inject(LanguageService);
lang.activeLang  // 'en' | 'vi'
lang.toggle()

// core/geolocation.service.ts — Browser geolocation API
const geo = inject(GeolocationService);
geo.getCurrentPosition()  // Observable<GeolocationPosition>

// core/geocoding.service.ts — Nominatim geocoding
const geocoding = inject(GeocodingService);
geocoding.search(query)    // Observable<GeocodingResult[]>
geocoding.reverse(lat, lng)

// core/firebase.service.ts — Firebase phone auth
const firebase = inject(FirebaseService);
firebase.sendVerificationCode(phoneNumber, recaptchaVerifier)
firebase.confirmCode(verificationId, code)

// core/profile-gate.service.ts — Incomplete profile checks
const gate = inject(ProfileGateService);
gate.isProfileGate(httpError)  // checks if 403 is profile-incomplete
gate.openGate(gate, retryFn)   // opens profile completion drawer
```

## Interceptors

```typescript
// core/auth.interceptor.ts
// Auto-injects Authorization: Bearer <token> on every request to API

// core/error.interceptor.ts
// Handles 401 → logout, other errors → snackbar
```

## Guards

```typescript
// core/auth.guard.ts — Redirects to /login if not authenticated
// core/guest.guard.ts — Redirects to /marketplace if already logged in
```

## i18n (Transloco)

Translation files at `web/public/i18n/{en,vi}.json`.

```typescript
// In component template:
<ng-container *transloco="let t">
  {{ t('taskForm.titleLabel') }}
</ng-container>

// In component class:
const transloco = inject(TranslocoService);
transloco.translate('taskForm.titleLabel')
transloco.getActiveLang()  // 'en' | 'vi'
transloco.langChanges$     // Observable<string>
```

## Routing

```typescript
// app.routes.ts — key routes:
/landing           // Landing page (public)
/login             // Login (guest only)
/marketplace       // Task listing (public)
/tasks/new         // Create task (auth)
/tasks/:id         // Task detail (public)
/tasks/:id/edit    // Edit task (auth)
/my-jobs           // User's tasks (auth)
/wallet            // Wallet (auth)
/profile/:id       // User profile (public)
/profile/me        // Own profile (auth)
/chat              // Conversations (auth)
/notifications     // Notifications (auth)
```

## Landing Page 3D Scene

```typescript
// whale-canvas.component.ts — single unified WebGL context for entire landing
// Replaces old dual-context setup (HeroEgg3dComponent + WhaleScrollComponent)

// Architecture:
// - All imports dynamic: await import('three'), await import('GLTFLoader'), etc.
// - Loads glow_whale_landing.glb (561 KB, 3 animations: surface, move f, move d)
// - Stripped from 3MB/20 animations via gltf-transform
// - No postprocessing library — CSS filter: brightness(1.15) contrast(1.05) for glow
// - No secondary scene (no particles, mountains, fish, ocean floor)

// Two rendering phases:
// Phase 1 — Hero (scroll 0% to hero pin end):
//   - Whale centered, plays 'surface' animation
//   - Dark ocean gradient background (scene.background = equirect gradient texture)
//   - FogExp2 for depth
//   - setHeroProgress(p): camera zooms out + whale fades as hero scrolls away
//
// Phase 2 — Scroll (after hero, rest of page):
//   - scene.background = null (transparent canvas overlay)
//   - Whale follows figure-8 path: x=1.5sin(t), y=0.4sin(2t)+yOffset, z=2.5cos(t)
//   - Animation blending by progress: surface → swim (move f) → dive (move d)
//   - Smoothstep enter from below / exit diving down

// Mobile fallback — skips WebGL entirely on:
//   - navigator.connection.effectiveType === '2g' | 'slow-2g'
//   - navigator.connection.saveData === true
//   - prefers-reduced-motion: reduce

// Material: MeshPhysicalMaterial with clearcoat (wet whale look)
//   emissiveIntensity: 12, roughness: 0.15
//   clearcoat: 1.0, clearcoatRoughness: 0.05, envMapIntensity: 2.5

// GSAP wiring (in landing.component.ts):
//   Hero pin onUpdate → whaleCanvas.setHeroProgress(p)
//   Post-hero scroll listener → whaleCanvas.setPhase('scroll') + setScrollProgress(p)
//   CSS --whale-darkness custom property for page background dimming
```

## Landing Minimap

```typescript
// landing-minimap.component.ts — pure CSS/SVG, no MapLibre GL
// Replaced MapLibre (263 KB gzipped + MapTiler tile fetches) with:
//   - Inline SVG road grid pattern (curved paths mimicking HCMC streets + river)
//   - CSS-positioned markers at approximate % coords for 4 HCMC districts
//   - Pulsing dot + expanding ripple ring (CSS @keyframes, staggered delays)
//   - Dark background: linear-gradient simulating desaturated map tiles
//   - Frost overlay: linear-gradient(160deg, teal→deep blue)
//   - Glass card opacity adapts to --whale-darkness CSS custom property
//   - Zero JavaScript, zero runtime dependencies, zero network requests
```

## SSR Configuration

```typescript
// app.routes.server.ts
// RenderMode.Client for most routes (CSR)
// RenderMode.Prerender for /report (static HTML)
```

## Pipes

```typescript
// core/pipes.ts
{{ amount | vnd }}       // Formats VND: 100000 → "100.000 ₫"
{{ date | timeAgo }}     // Relative time: "2 hours ago"
```
