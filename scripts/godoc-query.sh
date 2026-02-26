#!/usr/bin/env bash
# CLI helper for querying Go project documentation.
#
# Usage:
#   godoc-query.sh models              # List all models with fields
#   godoc-query.sh model <Name>        # Show specific model (e.g., User, Task, Wallet)
#   godoc-query.sh handlers            # List all handler types and methods
#   godoc-query.sh handler <Name>      # Show specific handler methods
#   godoc-query.sh services            # List all service interfaces
#   godoc-query.sh service <Name>      # Show specific service interface
#   godoc-query.sh repos               # List all repository interfaces
#   godoc-query.sh repo <Name>         # Show specific repository interface
#   godoc-query.sh routes              # List all registered routes
#   godoc-query.sh search <term>       # Search across all packages

set -euo pipefail

PROJ_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVER_DIR="$PROJ_ROOT/server"

cd "$SERVER_DIR"

case "${1:-help}" in
    models)
        go doc -all ./internal/models 2>&1
        ;;
    model)
        [ -z "${2:-}" ] && echo "Usage: godoc-query.sh model <Name>" && exit 1
        go doc ./internal/models "$2" 2>&1
        ;;
    handlers)
        go doc -all ./internal/handlers 2>&1
        ;;
    handler)
        [ -z "${2:-}" ] && echo "Usage: godoc-query.sh handler <Name>" && exit 1
        go doc -all ./internal/handlers "$2" 2>&1
        ;;
    services)
        go doc -all ./internal/services 2>&1
        ;;
    service)
        [ -z "${2:-}" ] && echo "Usage: godoc-query.sh service <Name>" && exit 1
        go doc -all ./internal/services "$2" 2>&1
        ;;
    repos)
        go doc -all ./internal/repository 2>&1
        ;;
    repo)
        [ -z "${2:-}" ] && echo "Usage: godoc-query.sh repo <Name>" && exit 1
        go doc -all ./internal/repository "$2" 2>&1
        ;;
    routes)
        echo "=== Registered Routes (from cmd/server/main.go) ==="
        grep -E '\.(GET|POST|PUT|DELETE|PATCH)\(' "$SERVER_DIR/cmd/server/main.go" | \
            sed 's/^[[:space:]]*//' | \
            sed 's/,.*$//'
        echo ""
        echo "Total: $(grep -cE '\.(GET|POST|PUT|DELETE|PATCH)\(' "$SERVER_DIR/cmd/server/main.go") routes"
        ;;
    search)
        [ -z "${2:-}" ] && echo "Usage: godoc-query.sh search <term>" && exit 1
        echo "=== Models ===" && go doc -all ./internal/models 2>&1 | grep -i "$2" || true
        echo "=== Handlers ===" && go doc -all ./internal/handlers 2>&1 | grep -i "$2" || true
        echo "=== Services ===" && go doc -all ./internal/services 2>&1 | grep -i "$2" || true
        echo "=== Repository ===" && go doc -all ./internal/repository 2>&1 | grep -i "$2" || true
        ;;
    help|*)
        head -12 "$0" | tail -11
        ;;
esac
