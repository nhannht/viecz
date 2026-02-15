---
name: code-review
description: Pre-commit code review for Viecz project. Reviews staged changes for bugs, security issues, and code quality.
user-invocable: true
---

# Pre-Commit Code Review

## Overview

Reviews staged Git changes before committing. Focuses on catching bugs, security vulnerabilities, and code quality issues specific to the Viecz stack (Go backend + Kotlin/Compose Android app).

## Usage

```bash
# Review all staged changes
/code-review

# Review specific path only
/code-review server/internal/handlers/

# Review with focus area
/code-review --focus security
/code-review --focus performance
```

## Arguments

- **path** (positional, optional): Limit review to changes in this path
- **--focus <area>**: Focus on a specific area: `security`, `performance`, `logic`, `style`

## Workflow

1. **Get staged changes**: Run `git diff --cached` (or `git diff` if nothing staged)
2. **Classify changes**: Identify which files changed and their types (Go, Kotlin, config, docs)
3. **Skip non-code**: Skip review for docs-only, config-only, or formatting-only changes — just report "No code review needed"
4. **Run checks**: Apply the relevant checklist based on file types
5. **Report**: Output findings grouped by severity

## Checklist

### All Code (Go + Kotlin)

**Logic**:
- Off-by-one errors in loops and slices
- Nil/null pointer dereferences
- Missing error handling or swallowed errors
- Race conditions in concurrent code
- Edge cases: empty inputs, zero values, negative numbers

**Security**:
- SQL injection (raw string concatenation in queries)
- Hardcoded secrets, tokens, or credentials
- Missing auth checks on protected endpoints
- Input validation gaps (user-supplied data used without sanitization)
- Sensitive data in logs (passwords, tokens, emails)

### Go Backend (`server/`)

**MANDATORY**: All Go code MUST follow the Uber Go Style Guide. Reference guidelines in `docs/go-guild/` when reviewing. Key guidelines to check:
- `error-wrap.md` — Errors must be wrapped with `%w` when propagating
- `error-once.md` — Handle errors exactly once (don't log AND return)
- `goroutine-forget.md` — No fire-and-forget goroutines
- `nest-less.md` — Reduce nesting with early returns
- `else-unnecessary.md` — Eliminate unnecessary else
- `container-capacity.md` — Pre-allocate slices/maps when size is known
- `import-group.md` — Imports grouped: stdlib, external, internal
- `interface-compliance.md` — Verify interface compliance at compile time
- `defer-clean.md` — Use defer for cleanup
- `strconv.md` — Use strconv over fmt for conversions

When a Go style violation is found, reference the specific guideline file (e.g., "See `docs/go-guild/error-wrap.md`").

**Bugs**:
- Unchecked errors (`err` assigned but not checked)
- Goroutine leaks (no cancellation or WaitGroup)
- Deferred function in a loop (resource leak)
- Missing `ctx` propagation
- GORM query errors silently ignored

**Security**:
- Missing JWT middleware on new endpoints
- PayOS webhook signature not verified
- CORS misconfiguration
- Wallet/escrow balance manipulation without validation

**Architecture**:
- Business logic in handlers (should be in services)
- Direct DB access in services (should use repository interface)
- Missing interface method when adding to repository

**Testing**:
- New public functions without test coverage
- Mock not updated when interface changes
- Test assertions that always pass (e.g., checking wrong variable)

### Kotlin/Android (`android/`)

**Bugs**:
- Unhandled exceptions in coroutines (missing try/catch)
- State not collected safely (missing `collectAsStateWithLifecycle`)
- Navigation crashes (missing null checks on arguments)
- Memory leaks (context references in ViewModels)

**Security**:
- API keys or tokens in source code
- Sensitive data stored in SharedPreferences without encryption
- HTTP instead of HTTPS in API URLs

**UI/UX**:
- Missing loading states for network calls
- Missing error states/messages for failures
- Hardcoded strings (should use string resources for i18n)
- Click handlers without debounce on critical actions (payments, submit)

**Architecture**:
- UI logic in Composables (should be in ViewModel)
- Repository calls in ViewModel init without error handling
- Missing `@Inject` on new dependencies

## Report Format

```markdown
## Pre-Commit Code Review

**Files changed**: 5 (3 Go, 2 Kotlin)
**Findings**: 2 critical, 1 warning, 3 info

---

### CRITICAL

**server/internal/handlers/wallet.go:45** — Missing auth middleware
> New endpoint `GET /wallet/history` has no JWT middleware.
> Any unauthenticated user can access wallet history.
>
> Fix: Add to the `authorized` route group instead of `api` group.

---

### WARNING

**android/.../CreateTaskScreen.kt:120** — Missing loading state
> `createTask()` is called but no loading indicator is shown.
> User can tap "Create" multiple times, causing duplicate tasks.
>
> Fix: Disable button and show spinner while `isLoading` is true.

---

### INFO

**server/internal/services/task.go:89** — Consider error wrapping
> `return err` loses context. Consider `fmt.Errorf("failed to create task: %w", err)`.

---

### OK (no issues)

- `server/internal/models/task.go` — Model field added, looks correct
- `docs/technical/API_REFERENCE.md` — Documentation only, skipped
```

## When to Use

Use `/code-review` before committing:
- Business logic changes (services, handlers, ViewModels)
- Security-sensitive code (auth, payments, wallet)
- New API endpoints
- Complex algorithms or state management

Skip for:
- Documentation-only changes
- Dependency version bumps
- Simple renames or formatting
- Git config or CI changes

## Tools Required

- **Bash**: Run `git diff --cached`, `git diff`
- **Read**: Read changed files for full context
- **Grep**: Search for patterns (hardcoded secrets, missing error checks)
- **Glob**: Find related test files
