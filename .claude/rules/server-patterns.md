---
paths:
  - "server/**"
description: Go server patterns and gotchas
---

# Server Patterns

- **Auth flow**: Email OTP (not password). `/api/v1/auth/otp/request` + `/otp/verify`. Phone: mocked in dev via `NoOpFirebaseVerifier`.
- **PayOS**: Returns `200 OK` before signature check for test payloads (`"VQRIO123"`).
- **golangci-lint v2**: Config uses `linters.settings` (not top-level). Config at `server/.golangci.yml`.
- **Jellyfish submodule**: Serena/JetBrains cannot index git submodules — use `Read`/`Edit` directly.
