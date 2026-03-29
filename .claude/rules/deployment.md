---
description: Build commands for production deployment
---

# Build Commands

- **Go API**: `cd server && CGO_ENABLED=0 go build -ldflags="-s -w" -o bin/server-linux ./cmd/server`
- **Web SSR**: `cd web && bun run build`
- **Jellyfish**: `uv run python -m jellyfish.main`

Ports, domains, systemd units, and env var details are in `deployment.local.md` (gitignored).
