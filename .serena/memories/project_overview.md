# Viecz — Project Overview

## Purpose
Student micro-task marketplace. Students post small tasks (errands, tutoring, deliveries), other students apply, work is tracked with escrow payments.

## Tech Stack
- **Go backend** (Gin, GORM, PostgreSQL, gorilla/websocket, golang-jwt, PayOS payments)
- **Angular 21 web client** (TypeScript 5.9, nhannht-metro-meow design system (MD3-inspired aesthetic, Tailwind 4, NO @angular/material), SSR with Express 5, Vitest, Storybook 9)
- **Android app** (Kotlin, Jetpack Compose, MVVM, Hilt DI)

## Architecture
- Go: Handler → Service → Repository → GORM/PostgreSQL (interface-based DI)
- Angular: Standalone components, Signals + RxJS, core services, shared components
- Android: MVVM with ViewModel + StateFlow

## Key Domains
- Auth (JWT, email verification, Google OAuth)
- Tasks (CRUD, marketplace, search via Meilisearch)
- Applications (apply, accept, escrow flow)
- Wallet (deposit via PayOS, withdrawal via PayOS payout, escrow hold/release/refund)
- Chat (WebSocket, conversations, messages)
- Notifications
- Bank accounts (for withdrawals)

## Active Languages in Serena
- TypeScript (Angular web client)
- Go (backend server)
