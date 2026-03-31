# Viecz — Location-Based Micro-Task Marketplace for Students

> A two-sided marketplace connecting students who need help with students ready to work, powered by real-time location and escrow payments.

**Live:** [viecz.fishcmus.io.vn](https://viecz.fishcmus.io.vn) · **User Guide:** [/howtouse](https://viecz.fishcmus.io.vn/howtouse)

<p align="center">
  <img src="docs/general/slide-viecz/public/marketplace-desktop.png" width="700" alt="Viecz Marketplace" />
</p>

## The Problem

Vietnam has 2.15 million university students. Around 22% do side work, but existing options (Zalo groups, friends, commercial services) don't serve **micro-tasks** — the 15-minute to few-hour jobs that happen every day on campus:

- Need someone to carry furniture up to the dorm — 30 min, willing to pay 50,000 VND, but no way to find help right now
- Need English speaking practice before an exam — don't need a professional tutor at 200,000 VND/hr, just a fellow student for 30 min

No platform in Vietnam, Indonesia, Thailand, or the Philippines currently combines (1) real-time location matching, (2) domestic escrow payments, and (3) a mobile-first experience for student micro-tasks.

## How It Works

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Post a task │───▶│  Discover    │───▶│  Apply &     │───▶│  Escrow      │
│  (30 sec)    │    │  on the map  │    │  Chat        │    │  payment     │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
 Description,        Students nearby     View profiles,      Funds held
 location, price     see it instantly    negotiate details   until job done
```

1. **Post a task** — Describe what you need, pick a location on the map, set a price and deadline. Takes under 30 seconds.
2. **Discover nearby** — Tasks appear on a real-time map. Filter by category, search by keyword, or browse the list view.
3. **Apply & chat** — Interested students apply with an intro message and optional price negotiation. Real-time WebSocket chat after acceptance.
4. **Escrow payment** — Money is held via PayOS (Vietnamese bank transfer) until the poster confirms completion. No international credit card needed.

### Task Categories

| Category | Examples | Price Range |
|----------|----------|-------------|
| Errands | Printing, delivery, grocery runs, saving library seats | 5,000–30,000 VND |
| Academic | Speaking practice, slide design, CV review, translation | 30,000–200,000 VND |
| Skills | Photography, video editing, graphic design, IT support | 50,000–500,000 VND |
| Daily life | Dorm cleanup, late-night food delivery, bike repair | 20,000–100,000 VND |

## Screenshots

<table>
  <tr>
    <td><img src="docs/general/slide-viecz/public/marketplace-map.png" width="350" alt="Map View" /><br/><em>Map view — tasks near you</em></td>
    <td><img src="docs/general/slide-viecz/public/task-detail.png" width="350" alt="Task Detail" /><br/><em>Task detail with applicants</em></td>
  </tr>
  <tr>
    <td><img src="docs/general/slide-viecz/public/task-create-full.png" width="350" alt="Create Task" /><br/><em>Post a task in 30 seconds</em></td>
    <td><img src="docs/general/slide-viecz/public/messages.png" width="350" alt="Chat" /><br/><em>Real-time messaging</em></td>
  </tr>
  <tr>
    <td><img src="docs/general/slide-viecz/public/wallet.png" width="350" alt="Wallet" /><br/><em>Wallet with escrow</em></td>
    <td><img src="docs/general/slide-viecz/public/login-otp.png" width="350" alt="Login" /><br/><em>Passwordless OTP login</em></td>
  </tr>
</table>

<details>
<summary>Mobile views</summary>
<table>
  <tr>
    <td><img src="docs/general/slide-viecz/public/marketplace-mobile.png" width="200" alt="Mobile Marketplace" /></td>
    <td><img src="docs/general/slide-viecz/public/task-detail-mobile.png" width="200" alt="Mobile Task Detail" /></td>
    <td><img src="docs/general/slide-viecz/public/wallet-mobile.png" width="200" alt="Mobile Wallet" /></td>
    <td><img src="docs/general/slide-viecz/public/messages-mobile.png" width="200" alt="Mobile Chat" /></td>
  </tr>
</table>
</details>

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Cloudflare                     │
│            (CDN, DDoS protection)                │
└────────────────────┬────────────────────────────┘
                     │
         ┌───────────┼───────────┐
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│   Angular 21    │    │   Android App   │
│   (SSR, Web)    │    │   (Kotlin,      │
│                 │    │   Jetpack       │
│                 │    │   Compose)      │
└────────┬────────┘    └────────┬────────┘
         │                      │
         └──────────┬───────────┘
                    ▼
         ┌─────────────────┐
         │   Go API (Gin)  │◄──── WebSocket (chat)
         │   REST + WS     │
         └──┬──────┬───┬───┘
            │      │   │
            ▼      ▼   ▼
     ┌──────┐ ┌──────┐ ┌──────┐
     │Postgr│ │Meili-│ │PayOS │
     │eSQL  │ │search│ │      │
     └──────┘ └──────┘ └──────┘
```

| Component | Technology | Role |
|-----------|-----------|------|
| Backend API | Go (Gin) | Business logic, RESTful API. Single server handles thousands of concurrent connections. |
| Database | PostgreSQL | Transactional data with ACID guarantees. |
| Search | Meilisearch | Full-text search with typo tolerance — important for quick mobile searches. |
| Web | Angular 21 (SSR) | Server-Side Rendering for fast loads and SEO. Responsive desktop + mobile. |
| Android | Kotlin + Jetpack Compose | Native Material Design 3 app (Android holds 65.7% market share in Vietnam). |
| Payments | PayOS | Vietnamese payment gateway — domestic bank transfers, no international card needed. |
| Chat | WebSocket | Real-time messaging between matched users. |
| Maps | MapLibre + MapTiler | Real-time interactive maps with location-based task discovery. |
| Monitoring | GlitchTip + Prometheus | Error tracking and performance metrics. |
| Bot | discord.py + FastAPI | Discord integration for notifications (Jellyfish submodule). |

## Getting Started

### Prerequisites

- Go 1.25+
- Bun (for Angular)
- PostgreSQL 15+
- Docker (for Meilisearch, mail server)
- Android Studio (for mobile app)

### Development Setup

```bash
# Clone with submodules
git clone --recurse-submodules https://github.com/nhannht/viecz.git
cd viecz

# Start test databases
docker compose -f docker-compose.testdb.yml up -d  # PostgreSQL :5433, Meilisearch :7700

# Backend
cd server
source .env.dev  # or: set -a && source .env.dev && set +a
go run cmd/server/main.go

# Frontend (separate terminal)
cd web
bun install
bunx ng serve  # http://localhost:4200, proxies API to :9999

# Android (separate terminal)
cd android
adb reverse tcp:9999 tcp:9999  # Required for emulator
./gradlew installDevDebug
```

### Running Tests

```bash
# Go tests
cd server && go test ./...

# Angular tests
cd web && bunx ng test

# Linting
cd server && golangci-lint run ./...
cd web && bunx eslint 'src/**/*.ts'

# Android
cd android && ./gradlew testDevDebugUnitTest
```

## User Guide

> Full interactive guide with screenshots: [viecz.fishcmus.io.vn/howtouse](https://viecz.fishcmus.io.vn/howtouse)

### 1. Sign Up & Login

Viecz uses **passwordless OTP authentication** — no password to remember. Enter your email, receive a 6-digit code, and you're in. First-time users just add their name.

### 2. Browse the Marketplace

The marketplace shows all open tasks as cards. Each card displays status, price, title, description, location, deadline, and number of applicants. Toggle **"Near me"** to switch to map view — see tasks plotted by location with distance indicators. Filter by 11 categories (Assembly, Cleaning, Delivery, Events, Pet Care, Photography, Shopping, Tech Support, Tutoring, etc.).

### 3. Post a Task

Hit the **"Create task"** button. Fill in title, description, category, price (multiples of 1,000 VND), pick a location on the map, and set a deadline. Quick deadline options: "Tonight 10PM", "Tomorrow 9AM", or custom. Your task appears on the marketplace instantly.

### 4. Apply for a Task

Found something interesting? Tap **"Apply"**, write an intro message about your experience, optionally propose a different price. The poster gets notified immediately.

### 5. Accept & Chat

When someone applies, you'll see their profile and message in the task detail. Hit **"Accept"** to choose them, then chat in real-time via the Messages tab to coordinate details.

### 6. Wallet & Payment

- **Deposit**: Minimum 2,000 VND via PayOS (QR code or bank transfer)
- **Escrow**: When a task is accepted, funds are held until completion
- **Withdrawal**: Add your bank account, then withdraw anytime
- Beta wallet cap: 200,000 VND

### 7. Complete & Rate

The poster marks the task as complete → escrow funds release to the worker's wallet. Leave a rating to build community trust.

## Market Context

| | Zalo/Facebook | Grab/Gojek | TaskRabbit (US) | GoGetter (MY) | **Viecz** |
|---|---|---|---|---|---|
| Location matching | No | Transport only | By area | No | **Real-time** |
| Escrow payments | No | Internal | International card | Yes | **VN bank transfer** |
| Diverse micro-tasks | Unstructured | No | Yes | Limited | **Yes** |
| Student-focused | No | No | No | Partial | **Yes** |
| Transaction fee | 0% | N/A | 22.5% | N/A | **10–15%** |
| Active in Vietnam | Yes | Yes | No | No | **Yes** |

## Economics

| Metric | Value |
|--------|-------|
| Monthly operating cost | ~200,000 VND (~$8) |
| Revenue model | 10–15% commission per paid transaction |
| Break-even | ~40 transactions/month |
| First-year total cost | ~10M VND (~$400) including marketing |

No external funding required to operate.

## Roadmap

| Phase | Timeline | Status |
|-------|----------|--------|
| MVP — all core features | Oct 2025 – Feb 2026 | Done |
| Pilot at HCMUS | Semester 2/2026 | In progress |
| Evaluate & iterate | Jul–Aug 2026 | Planned |
| Expand to nearby universities | Semester 1/2027 | Planned |

## Competition Entry

This project is a submission to **HCMUS I&E 2025** (Innovation & Entrepreneurship Competition), VNUHCM — University of Science, under the field: *Information Technology — AI — Digital Transformation*.

## License

This project's source code is publicly available for educational and reference purposes. See individual component licenses for third-party dependencies.

---

Built at [VNUHCM — University of Science](https://hcmus.edu.vn/) · March 2026
