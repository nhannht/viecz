---
name: code-review
description: Pre-commit code review for Viecz project. Reviews staged changes for bugs, security issues, and code quality.
user-invocable: true
---

# Pre-Commit Code Review

## Overview

Reviews staged Git changes before committing. Focuses on catching bugs, security vulnerabilities, and code quality issues specific to the Viecz stack (Go backend + Angular web app + Kotlin/Compose Android app).

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
2. **Classify changes**: Identify which files changed and their types (Go, Angular/TypeScript, Kotlin, config, docs)
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

### Angular/Web (`web/`)

**Bugs**:
- Unsubscribed observables (missing `takeUntilDestroyed()`, `async` pipe, or manual unsubscribe)
- Missing `isPlatformBrowser()` guard for SSR — direct `window`/`document`/`localStorage` access breaks server rendering
- Signal misuse (`update()` vs `set()`, missing `computed()` for derived state)
- `@for` loops without `track` expression (causes full re-render)

**Security**:
- XSS via `[innerHTML]` or `bypassSecurityTrustHtml()` without sanitization
- API keys or secrets outside `environment.ts` files
- Missing CSRF protection or Turnstile verification on public forms

**SSR Compatibility**:
- Direct `window`, `document`, `navigator`, or `localStorage` access without platform check
- `setTimeout`/`setInterval` without `isPlatformBrowser()` guard
- Browser-only libraries imported at module level (should be dynamic imports behind platform check)

**Component Patterns**:
- Must be standalone components (no `NgModule` declarations)
- Use `inject()` function instead of constructor injection
- Use new control flow syntax (`@if`/`@for`/`@switch`, not `*ngIf`/`*ngFor`/`[ngSwitch]`)
- Use signals and `computed()` for reactive state
- Component selector prefix must be `app-` (not `nhannht-metro-*` — that's Storybook only)

**Testing**:
- Tests must use Vitest (`vi.fn()`, `vi.spyOn()`) not Jasmine (`jasmine.createSpy`)
- Run with `npx ng test` (not `npx vitest run`)
- TestBed providers must include all injected dependencies
- Missing assertions on observable emissions or signal values

### Cross-Platform (All Languages)

**Design Simplicity**:
- Is there a simpler, more standard approach? Prefer stdlib/framework solutions over custom implementations
- Could this be done with fewer abstractions, fewer files, or fewer indirections?
- If the change adds a new pattern, is it justified or does the codebase already have one that works?

**Testability**:
- Is the code structured for unit testing? Dependencies should be injectable, not hardcoded
- Can you test the logic without spinning up external services (DB, HTTP, filesystem)?
- Are side effects isolated from pure logic? (e.g., computation separate from I/O)

**Code Duplication**:
- Is the same logic repeated across files? Extract to a shared function/service if 3+ occurrences
- Are there near-identical functions that differ only in a parameter? Consolidate with a parameter
- Check for copy-paste from other parts of the codebase — often carries stale logic or wrong variable names

**Error Message Quality**:
- User-facing errors must be actionable ("Payment failed — please try again" not "Error 500")
- Internal errors must include debug context (function name, input values, upstream error)
- No secrets, tokens, or PII in error messages or logs

**Dependency Hygiene**:
- New dependencies must be justified (no duplicate functionality with existing deps)
- Check for known vulnerabilities (`go mod audit`, `npm audit`)
- Pin dependency versions — no floating ranges in production

**Backwards Compatibility**:
- API changes must be additive (no breaking removals without versioning)
- Database migrations must be reversible (`DOWN` migration required)
- New environment variables must have sensible defaults (don't break existing deploys)

**Maintainability (6-Month Test)**:
- No magic numbers — use named constants with explanation
- Inline "why" comments for non-obvious decisions (not "what" comments)
- Functions under 50 lines; split if longer
- No dead code, commented-out blocks, or TODO placeholders for real features

**API Design**:
- RESTful conventions (proper HTTP methods, status codes, resource naming)
- Consistent error response format across endpoints
- Pagination on list endpoints (no unbounded result sets)
- Input validation at the handler/controller boundary

### Performance

**Database**:
- N+1 query patterns (missing `Preload()` or `Joins()` in GORM)
- Missing indexes on columns used in `WHERE`, `ORDER BY`, or `JOIN`
- Unbounded queries without `LIMIT` (risk of full table scan)
- Large transactions holding locks too long

**Memory & Resources**:
- Goroutine leaks (no cancellation context, no WaitGroup, no select on done channel)
- Observable/subscription leaks (missing unsubscribe, missing `takeUntilDestroyed()`)
- Unbounded in-memory caches or maps that grow without eviction
- Unclosed resources (`io.Reader`, HTTP response bodies, DB connections)

**Network**:
- HTTP clients without timeouts (use `http.Client{Timeout: ...}`)
- Missing retry with exponential backoff on transient failures
- Missing context cancellation propagation (long-running requests can't be aborted)

**Frontend (Angular)**:
- Large bundle imports (import specific modules, not entire libraries)
- Missing lazy loading on feature routes
- Heavy computation in templates (use `computed()` signals instead)
- Large lists without virtual scrolling (`@angular/cdk/scrolling`)

**Scalability**:
- No single-instance assumptions (in-memory state that won't survive restart/scale-out)
- Rate limiting on public-facing endpoints
- File uploads without size limits

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
