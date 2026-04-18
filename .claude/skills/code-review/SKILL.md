---
name: code-review
description: Pre-commit code review for Viecz project. Reviews staged changes for bugs, security issues, and code quality.
user-invocable: true
---

# Pre-Commit Code Review

## Overview

Three-pass code review: mechanical linters, JetBrains IDE inspections, then Claude semantic review. Only applies checklist sections relevant to the changed platforms. Blocks commits unless all CRITICAL and WARNING findings are resolved.

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

### Step 1 — Get Staged Changes

Run `git diff --cached` (or `git diff` if nothing staged). Save the output for analysis.

### Step 2 — Classify Files

Parse the diff for file paths. Determine which platforms are affected:

| Changed paths | Platform |
|---------------|----------|
| `server/` | `go` |
| `web/` | `angular` |
| `mobile/` | `capacitor` |
| `.md`, `.yml`, `.json`, config files only | `non-code` |

### Step 3 — Skip Non-Code

If ALL changed files are non-code (docs, config, formatting only):
- Report: "No code review needed — docs/config changes only"
- Create the marker file (see Marker File section below)
- Stop. No further review needed.

### Step 4 — Pass 1: Linters (Mechanical)

Run platform-specific linters on changed files ONLY. Do not run linters for platforms with no changes.

**Go changes** (`server/`):
```bash
cd server && golangci-lint run --new-from-rev=HEAD ./...
```

**Angular changes** (`web/`):
```bash
cd web && bunx eslint <space-separated list of changed .ts files relative to web/>
```
ESLint now includes complexity rules (`sonarjs/cognitive-complexity`, `complexity`, `max-lines-per-function`). Any complexity warnings from the linter pass should be reported as **WARNING** findings with the specific metric and threshold.

**If any linter fails:**
- Report each linter error as a **CRITICAL** finding with the linter output
- Do NOT proceed to Pass 2
- Do NOT create the marker file
- Tell the user: "Fix linter errors before re-running /code-review"

**If all linters pass:** proceed to Pass 2.

### Step 5 — Pass 2: JetBrains IDE Inspections

Run `mcp__jetbrains__get_file_problems` on each changed **code file** (`.go`, `.ts`, `.kt`). Skip non-code files (`.md`, `.yml`, `.json`, `.css`, `.html`, binary assets).

Call inspections in parallel batches (up to 10 files per batch) for speed:
```
mcp__jetbrains__get_file_problems(filePath="<relative-path>", projectPath="/home/ubuntu/nhannht-projects/viecz")
```

**Severity mapping:**
- JetBrains `ERROR` → report as **CRITICAL** (unused imports, unresolved references, type errors, missing symbols)
- JetBrains `WARNING` → report as **WARNING**

**Known false positives to IGNORE (do not report):**
- `Cannot resolve '--<name>' custom property` — CSS custom properties set dynamically via JS at runtime
- `Unresolved reference 'SENTRY_DSN'` or any `BuildConfig.*` — Android `BuildConfig` fields are generated at compile time from `build.gradle.kts`
- Any `BuildConfig` unresolved reference in Kotlin files

**If any real errors found:**
- Report each as CRITICAL/WARNING with the JetBrains description, file path, and line number
- Continue to Pass 3 (unlike linter failures, IDE issues don't block the semantic review pass — collect all findings together)

**If JetBrains MCP is unavailable** (connection error):
- Log: "JetBrains IDE not connected — skipping IDE inspection pass"
- Continue to Pass 3. Do NOT fail the review because the IDE is offline.

### Step 6 — Pass 3: Claude Semantic Review

Read changed files using Serena/JetBrains tools for code files (`jet_brains_find_symbol`, `jet_brains_get_symbols_overview`, `search_for_pattern`). Use `Read` only for non-code files or when IDE is unavailable.

Apply ONLY the checklist sections relevant to the detected platforms:

| Platform | Checklist sections to apply |
|----------|---------------------------|
| `go` only | Go Backend + Cross-Platform + Performance (DB, Memory, Network, Scalability) |
| `angular` only | Angular/Web + Cross-Platform + Performance (Frontend, Memory) |
| `kotlin` only | Kotlin/Android + Cross-Platform |
| Mixed | Union of relevant sections |

Focus on things linters **cannot** catch: logic bugs, security gaps, architectural issues, design problems.

### Step 7 — Report

Output findings grouped by severity: **CRITICAL → WARNING → INFO → OK**

Include the source of each finding (Linter, IDE, or Claude) in the report.

Use the report format defined below.

### Step 8 — Severity Gate

- If ANY **CRITICAL** or **WARNING** findings exist → do NOT create marker. Report: "Fix these before committing."
- If only **INFO** or no findings → create the marker file (see below).

## Marker File (MANDATORY)

After review completes, the marker file determines whether `git commit` will be allowed by the pre-commit hook.

**If ANY CRITICAL or WARNING findings remain:**
- Do NOT create the marker file
- Tell the user to fix issues and re-run `/code-review`

**If only INFO or no findings:**
- Create the marker with the hash of the exact staged content:
```bash
git diff --cached | sha256sum | cut -d' ' -f1 > /tmp/claude-code-review-passed
```
This hash ensures the marker is only valid for the exact staged content that was reviewed. If the user stages additional files after review, the pre-commit hook will block and require a new review.

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

### Capacitor/Mobile (`mobile/`)

**Bugs**:
- Missing back button handler (`@capacitor/app` backButton listener)
- Capacitor config pointing to wrong server URL
- Missing `www/` directory for `cap sync`

**Security**:
- API keys or tokens in source code
- Keystore passwords in unprotected files
- HTTP instead of HTTPS in server URL

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

**Complexity** (enforced by ESLint — `sonarjs/cognitive-complexity`, `complexity`, `max-lines-per-function`):
- Cognitive complexity > 15 per function — break into smaller functions or extract helper
- Cyclomatic complexity > 10 — too many branches, simplify control flow
- Functions > 100 lines — split into focused units
- Deeply nested callbacks or promise chains — flatten with early returns or extract steps
- Components growing beyond 300 lines — consider extracting services or child components

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

**Database** (apply for `go` platform):
- N+1 query patterns (missing `Preload()` or `Joins()` in GORM)
- Missing indexes on columns used in `WHERE`, `ORDER BY`, or `JOIN`
- Unbounded queries without `LIMIT` (risk of full table scan)
- Large transactions holding locks too long

**Memory & Resources** (apply for `go` and `angular` platforms):
- Goroutine leaks (no cancellation context, no WaitGroup, no select on done channel)
- Observable/subscription leaks (missing unsubscribe, missing `takeUntilDestroyed()`)
- Unbounded in-memory caches or maps that grow without eviction
- Unclosed resources (`io.Reader`, HTTP response bodies, DB connections)

**Network** (apply for `go` platform):
- HTTP clients without timeouts (use `http.Client{Timeout: ...}`)
- Missing retry with exponential backoff on transient failures
- Missing context cancellation propagation (long-running requests can't be aborted)

**Frontend** (apply for `angular` platform):
- Large bundle imports (import specific modules, not entire libraries)
- Missing lazy loading on feature routes
- Heavy computation in templates (use `computed()` signals instead)
- Large lists without virtual scrolling (`@angular/cdk/scrolling`)

**Scalability** (apply for `go` platform):
- No single-instance assumptions (in-memory state that won't survive restart/scale-out)
- Rate limiting on public-facing endpoints
- File uploads without size limits

## Report Format

```markdown
## Pre-Commit Code Review

**Files changed**: 5 (3 Go, 2 TypeScript)
**Platforms detected**: go, angular
**Checklist sections applied**: Go Backend, Angular/Web, Cross-Platform, Performance (DB, Memory, Network, Frontend)
**Pass 1 (Linters)**: PASSED / FAILED
**Pass 2 (JetBrains IDE)**: PASSED / FAILED / SKIPPED (IDE offline)
**Findings**: 2 critical, 1 warning, 3 info

---

### CRITICAL

**[IDE]** **web/src/app/marketplace/hero-liquidglass.component.ts:27** — Unused import
> `NhannhtMetroButtonComponent` is imported but never used in the component template.
>
> Fix: Remove from `imports` array and import statement.

**[Claude]** **server/internal/handlers/wallet.go:45** — Missing auth middleware
> New endpoint `GET /wallet/history` has no JWT middleware.
> Any unauthenticated user can access wallet history.
>
> Fix: Add to the `authorized` route group instead of `api` group.

---

### WARNING

**[Claude]** **web/src/app/task/task-list.component.ts:120** — Missing loading state
> `loadTasks()` is called but no loading indicator is shown.
> User sees blank screen during slow network.
>
> Fix: Add a `loading` signal and show a spinner.

---

### INFO

**server/internal/services/task.go:89** — Consider error wrapping
> `return err` loses context. Consider `fmt.Errorf("failed to create task: %w", err)`.

---

### OK (no issues)

- `server/internal/models/task.go` — Model field added, looks correct
- `docs/technical/API_REFERENCE.md` — Documentation only, skipped
```

## Tools & Model Requirements

- **Code reading**: Use Serena/JetBrains tools when IDE is available (`jet_brains_find_symbol`, `jet_brains_get_symbols_overview`, `search_for_pattern`). Fall back to `Read` only for non-code files or when IDE is unavailable.
- **IDE inspections**: Use `mcp__jetbrains__get_file_problems` for each changed code file. Parallel batches of up to 10. If MCP connection fails, skip gracefully.
- **Linter execution**: Use `Bash` tool to run `golangci-lint` and `eslint`
- **Diff inspection**: Use `Bash` for `git diff --cached`
- **Sub-agents**: If spawning agents for review tasks, use `model: "opus"` (NOT haiku)
