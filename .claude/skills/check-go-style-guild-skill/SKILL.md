---
name: check-go-style-guild
description: Check Go code against Uber Go Style Guide for writing and reviewing code. Supports both proactive guidance and retrospective review.
user-invocable: true
---

# Check Go Style Guide

## Overview

This skill helps you write and review Go code according to the [Uber Go Style Guide](https://github.com/uber-go/guide/blob/master/style.md). It operates in two modes:

1. **Review Mode** (default): Analyzes existing Go files for style violations
2. **Write Mode**: Provides proactive guidance when writing new code

The skill references 61 guidelines across 5 major categories:
- **Guidelines**: Core Go best practices (interfaces, errors, goroutines, mutexes, etc.)
- **Performance**: Optimization patterns
- **Style**: Code formatting and conventions
- **Patterns**: Common design patterns (test tables, functional options)
- **Linting**: Tool recommendations

All guidelines are available in: `docs/style-guild/`

## Usage

### Review existing code

```bash
# Check a single file
/check-go-style-guild main.go

# Check a directory
/check-go-style-guild ./pkg/handlers

# Check with category filter
/check-go-style-guild --category errors ./pkg

# Only critical issues
/check-go-style-guild --critical-only ./cmd

# With fix suggestions
/check-go-style-guild --fix main.go
```

### Get guidance while writing

```bash
# Get help on a topic
/check-go-style-guild --write "error handling"

# Get guidance on specific patterns
/check-go-style-guild --write "goroutines"

# Get help with interfaces
/check-go-style-guild --write "interfaces"
```

## Arguments

- **path** (positional): File or directory to check (default: current directory)
- **--write <topic>**: Switch to write mode, provide guidance on a topic
- **--category <name>**: Filter by category (errors, goroutines, interfaces, performance, style, patterns)
- **--critical-only**: Only check top critical rules
- **--fix**: Suggest specific fixes for violations

## Style Guide Reference

### Complete Table of Contents

- [Introduction](intro.md)
- Guidelines
  - [Pointers to Interfaces](interface-pointer.md)
  - [Verify Interface Compliance](interface-compliance.md)
  - [Receivers and Interfaces](interface-receiver.md)
  - [Zero-value Mutexes are Valid](mutex-zero-value.md)
  - [Copy Slices and Maps at Boundaries](container-copy.md)
  - [Defer to Clean Up](defer-clean.md)
  - [Channel Size is One or None](channel-size.md)
  - [Start Enums at One](enum-start.md)
  - [Use `"time"` to handle time](time.md)
  - Errors
    - [Error Types](error-type.md)
    - [Error Wrapping](error-wrap.md)
    - [Error Naming](error-name.md)
    - [Handle Errors Once](error-once.md)
  - [Handle Type Assertion Failures](type-assert.md)
  - [Don't Panic](panic.md)
  - [Use go.uber.org/atomic](atomic.md)
  - [Avoid Mutable Globals](global-mut.md)
  - [Avoid Embedding Types in Public Structs](embed-public.md)
  - [Avoid Using Built-In Names](builtin-name.md)
  - [Avoid `init()`](init.md)
  - [Exit in Main](exit-main.md)
    - [Exit Once](exit-once.md)
  - [Use field tags in marshaled structs](struct-tag.md)
  - [Don't fire-and-forget goroutines](goroutine-forget.md)
    - [Wait for goroutines to exit](goroutine-exit.md)
    - [No goroutines in `init()`](goroutine-init.md)
- [Performance](performance.md)
  - [Prefer strconv over fmt](strconv.md)
  - [Avoid repeated string-to-byte conversions](string-byte-slice.md)
  - [Prefer Specifying Container Capacity](container-capacity.md)
- Style
  - [Avoid overly long lines](line-length.md)
  - [Be Consistent](consistency.md)
  - [Group Similar Declarations](decl-group.md)
  - [Import Group Ordering](import-group.md)
  - [Package Names](package-name.md)
  - [Function Names](function-name.md)
  - [Import Aliasing](import-alias.md)
  - [Function Grouping and Ordering](function-order.md)
  - [Reduce Nesting](nest-less.md)
  - [Unnecessary Else](else-unnecessary.md)
  - [Top-level Variable Declarations](global-decl.md)
  - [Prefix Unexported Globals with _](global-name.md)
  - [Embedding in Structs](struct-embed.md)
  - [Local Variable Declarations](var-decl.md)
  - [nil is a valid slice](slice-nil.md)
  - [Reduce Scope of Variables](var-scope.md)
  - [Avoid Naked Parameters](param-naked.md)
  - [Use Raw String Literals to Avoid Escaping](string-escape.md)
  - Initializing Structs
    - [Use Field Names to Initialize Structs](struct-field-key.md)
    - [Omit Zero Value Fields in Structs](struct-field-zero.md)
    - [Use `var` for Zero Value Structs](struct-zero.md)
    - [Initializing Struct References](struct-pointer.md)
  - [Initializing Maps](map-init.md)
  - [Format Strings outside Printf](printf-const.md)
  - [Naming Printf-style Functions](printf-name.md)
- Patterns
  - [Test Tables](test-table.md)
  - [Functional Options](functional-option.md)
- [Linting](lint.md)

### Quick Critical Checklist

See [checklist.md](checklist.md) for the top 15 most critical rules.

## Tools Required

- **Read**: Read Go source files and guideline markdown files
- **Glob**: Find all .go files in directories
- **Grep**: Search for specific patterns in code
- **Bash**: Run gofmt, go vet if available (optional)

## Workflow

### Review Mode (Default)

1. **Parse Arguments**: Extract file/directory path and options
2. **Scan Code**:
   - Single file: Read and analyze directly
   - Directory: Use Glob to find all .go files (recursively)
3. **Category-based Analysis**:
   - **Guidelines**: Check errors, goroutines, interfaces, mutexes
   - **Performance**: Check strconv usage, container capacity
   - **Style**: Check naming, imports, nesting
   - **Patterns**: Check test tables, functional options
4. **Reference Guidelines**: Read relevant files from `docs/style-guild/` on-demand
5. **Generate Report**: List violations with code snippets and guideline references

### Write Mode (--write flag)

1. **Parse Topic**: Extract what user wants to write
2. **Find Relevant Guidelines**: Search SUMMARY.md, read matching files
3. **Provide Guidance**: Show Bad vs Good examples from guidelines
4. **Interactive Support**: Answer follow-up questions

## Checking Logic

### Core Checks by Category

#### Error Handling (error-*.md)

**Critical checks:**
- ✅ Exported error variables named `ErrXxx`
- ✅ Errors wrapped with `%w` when propagating
- ✅ Errors handled exactly once (not logged and returned)
- ✅ Error variables named `errXxx` (unexported)

**Patterns to detect:**
```go
// BAD: Not wrapped
if err != nil {
    return err
}

// GOOD: Wrapped
if err != nil {
    return fmt.Errorf("failed to process: %w", err)
}

// BAD: Handled twice
if err != nil {
    log.Error("failed", err)
    return err  // Don't log AND return
}

// BAD: Exported error not named ErrXxx
var FailedError = errors.New("failed")

// GOOD: Proper naming
var ErrFailed = errors.New("failed")
```

#### Goroutines (goroutine-*.md)

**Critical checks:**
- ✅ No fire-and-forget goroutines (missing stop channel/WaitGroup)
- ✅ Goroutines have proper synchronization
- ✅ No goroutines in `init()`

**Patterns to detect:**
```go
// BAD: Fire-and-forget
go func() {
    // No way to stop this
    for {
        doWork()
    }
}()

// GOOD: Proper lifecycle management
func (s *Server) Start(ctx context.Context) {
    go func() {
        for {
            select {
            case <-ctx.Done():
                return
            default:
                doWork()
            }
        }
    }()
}

// BAD: Goroutine in init
func init() {
    go backgroundTask()
}
```

#### Interfaces (interface-*.md)

**Critical checks:**
- ✅ No pointers to interfaces (`*Interface`)
- ✅ Interface compliance verified at compile time
- ✅ Receiver type consistency

**Patterns to detect:**
```go
// BAD: Pointer to interface
func process(i *io.Reader) {
    // interfaces are already references
}

// GOOD: Interface by value
func process(r io.Reader) {
    // correct usage
}

// BAD: No compliance check
type Handler struct{}
func (h Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {}

// GOOD: Verify compliance
var _ http.Handler = (*Handler)(nil)
```

#### Mutexes (mutex-zero-value.md)

**Critical checks:**
- ✅ Mutexes use zero-value initialization
- ✅ Mutexes are not copied (embedded in structs by value)

**Patterns to detect:**
```go
// BAD: Mutex initialization
mu := new(sync.Mutex)

// GOOD: Zero-value
var mu sync.Mutex

// GOOD: Embedded in struct
type Counter struct {
    mu    sync.Mutex
    value int
}
```

#### Performance (strconv.md, container-capacity.md, string-byte-slice.md)

**Critical checks:**
- ✅ Use `strconv` instead of `fmt` for primitive conversions
- ✅ Specify container capacity when size is known
- ✅ Avoid repeated string ↔ []byte conversions

**Patterns to detect:**
```go
// BAD: fmt.Sprintf for numbers
s := fmt.Sprintf("%d", 123)

// GOOD: Use strconv
s := strconv.Itoa(123)

// BAD: No capacity
data := make([]int, 0)
for i := 0; i < 100; i++ {
    data = append(data, i)
}

// GOOD: Pre-allocate
data := make([]int, 0, 100)

// BAD: Repeated conversions
for i := 0; i < n; i++ {
    b := []byte(str)
    // use b
}

// GOOD: Convert once
b := []byte(str)
for i := 0; i < n; i++ {
    // use b
}
```

#### Style - Imports (import-group.md)

**Checks:**
- ✅ Imports grouped: stdlib, external, internal
- ✅ Groups separated by blank lines
- ✅ Groups sorted alphabetically

**Patterns to detect:**
```go
// BAD: Mixed groups
import (
    "fmt"
    "github.com/external/pkg"
    "os"
    "myproject/internal/pkg"
)

// GOOD: Proper grouping
import (
    "fmt"
    "os"

    "github.com/external/pkg"

    "myproject/internal/pkg"
)
```

#### Style - Naming (package-name.md, function-name.md, global-name.md)

**Checks:**
- ✅ Package names: lowercase, no underscores
- ✅ Function names: MixedCaps, no underscores
- ✅ Unexported globals prefixed with `_`

**Patterns to detect:**
```go
// BAD: Package name
package my_package

// GOOD: Package name
package mypackage

// BAD: Function name
func Get_User_By_ID() {}

// GOOD: Function name
func GetUserByID() {}

// BAD: Unexported global
var defaultConfig = Config{}

// GOOD: Unexported global
var _defaultConfig = Config{}
```

#### Style - Nesting (nest-less.md, else-unnecessary.md)

**Checks:**
- ✅ Reduce nesting depth (prefer early returns)
- ✅ Eliminate unnecessary else clauses

**Patterns to detect:**
```go
// BAD: Deep nesting
if condition1 {
    if condition2 {
        if condition3 {
            // do work
        }
    }
}

// GOOD: Early returns
if !condition1 {
    return
}
if !condition2 {
    return
}
if !condition3 {
    return
}
// do work

// BAD: Unnecessary else
if condition {
    return true
} else {
    return false
}

// GOOD: No else needed
if condition {
    return true
}
return false
```

#### Style - Variable Declarations (var-decl.md, var-scope.md)

**Checks:**
- ✅ Use `:=` for local variables with initialization
- ✅ Use `var` for zero values or explicit type
- ✅ Reduce variable scope

**Patterns to detect:**
```go
// BAD: Unnecessary var for initialized local
var s string = "hello"

// GOOD: Short declaration
s := "hello"

// GOOD: var for zero value
var count int

// BAD: Wide scope
var data []byte
if condition {
    data = fetchData()
    process(data)
}

// GOOD: Narrow scope
if condition {
    data := fetchData()
    process(data)
}
```

#### Patterns - Test Tables (test-table.md)

**Checks:**
- ✅ Test tables used for multiple test cases
- ✅ Subtests with `t.Run()`
- ✅ Test case naming clear

**Patterns to detect:**
```go
// BAD: Repetitive tests
func TestAdd(t *testing.T) {
    if Add(1, 2) != 3 {
        t.Error("failed")
    }
    if Add(2, 3) != 5 {
        t.Error("failed")
    }
}

// GOOD: Table-driven
func TestAdd(t *testing.T) {
    tests := []struct {
        name string
        a, b int
        want int
    }{
        {"positive", 1, 2, 3},
        {"negative", -1, -2, -3},
    }
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            if got := Add(tt.a, tt.b); got != tt.want {
                t.Errorf("Add(%d, %d) = %d, want %d", tt.a, tt.b, got, tt.want)
            }
        })
    }
}
```

### Analysis Algorithm

For each Go file:

1. **Parse file structure** (imports, functions, types)
2. **Run category-specific checks**:
   - If `--category` specified: Only run checks for that category
   - If `--critical-only`: Only run critical checks
   - Otherwise: Run all applicable checks
3. **For each violation found**:
   - Record line number and context
   - Identify applicable guideline(s)
   - Extract code snippet (3-5 lines of context)
4. **On-demand guideline reading**:
   - When violation detected, read the specific guideline file
   - Extract "Bad" and "Good" examples
   - Generate fix suggestion if `--fix` flag set
5. **Compile report** with all findings

### Guideline File Reading Strategy

Only read guideline files when violations are detected or when specific guidance is requested. This keeps context usage efficient.

**Example**: If error wrapping violation found at line 42:
1. Detect pattern: `return err` without `%w`
2. Read `docs/style-guild/error-wrap.md`
3. Extract examples and explanation
4. Include in report for that violation

## Report Format

### Review Mode Output

```markdown
# Go Style Guide Check Report

**File**: path/to/file.go
**Issues**: 12 (3 critical, 9 style)
**Categories**: errors, performance, style

---

## Critical Issues (3)

### Line 45: Error not wrapped
**Category**: Errors
**Guideline**: error-wrap.md
**Severity**: Critical

**Found:**
```go
if err := process(); err != nil {
    return err
}
```

**Issue**: Error should be wrapped with context when propagating up the call stack.

**Suggested fix:**
```go
if err := process(); err != nil {
    return fmt.Errorf("failed to process: %w", err)
}
```

**Reference**: docs/style-guild/error-wrap.md

---

### Line 78: Fire-and-forget goroutine
**Category**: Goroutines
**Guideline**: goroutine-forget.md
**Severity**: Critical

**Found:**
```go
go func() {
    for {
        worker.Run()
    }
}()
```

**Issue**: Goroutine has no way to be stopped. It will leak if the parent exits.

**Suggested fix:**
```go
go func() {
    for {
        select {
        case <-ctx.Done():
            return
        default:
            worker.Run()
        }
    }
}()
```

**Reference**: docs/style-guild/goroutine-forget.md

---

## Style Issues (9)

### Line 12-18: Import grouping
**Category**: Style
**Guideline**: import-group.md
**Severity**: Style

**Found:**
```go
import (
    "fmt"
    "github.com/pkg/errors"
    "os"
)
```

**Issue**: Imports should be grouped (stdlib, external, internal) with blank lines between groups.

**Suggested fix:**
```go
import (
    "fmt"
    "os"

    "github.com/pkg/errors"
)
```

**Reference**: docs/style-guild/import-group.md

---

## Summary

- **Critical issues**: 3 (must fix)
- **Style issues**: 9 (should fix)
- **Files checked**: 1
- **Guidelines referenced**: error-wrap.md, goroutine-forget.md, import-group.md, strconv.md

**Next steps:**
1. Fix critical issues first (error wrapping, goroutine lifecycle)
2. Address style issues for consistency
3. Run `gofmt` and `go vet` to catch additional issues
```

### Write Mode Output

```markdown
# Error Handling in Go - Uber Style Guide

Based on: error-type.md, error-wrap.md, error-name.md, error-once.md

## Key Principles

1. **Choose the right error type** for your use case
2. **Wrap errors** with context when propagating
3. **Name errors** consistently (ErrXxx for exported, errXxx for unexported)
4. **Handle errors once** (don't log AND return)

---

## Error Types

Use `errors.New()` for simple errors:
```go
var ErrInvalidConfig = errors.New("invalid configuration")
```

Use custom types when you need structured information:
```go
type NotFoundError struct {
    Resource string
    ID       string
}

func (e *NotFoundError) Error() string {
    return fmt.Sprintf("%s not found: %s", e.Resource, e.ID)
}
```

---

## Error Wrapping

**Always wrap errors** when adding context:

❌ Bad:
```go
if err := db.Query(); err != nil {
    return err  // Lost context
}
```

✅ Good:
```go
if err := db.Query(); err != nil {
    return fmt.Errorf("failed to query users: %w", err)
}
```

**Use `%w`** to preserve error chain for `errors.Is()` and `errors.As()`:
```go
if err := process(); err != nil {
    return fmt.Errorf("processing failed: %w", err)
}

// Caller can check
if errors.Is(err, ErrNotFound) {
    // handle not found
}
```

---

## Error Naming

**Exported errors** (package-level):
```go
var ErrNotFound = errors.New("not found")
var ErrInvalidInput = errors.New("invalid input")
```

**Unexported errors** (function-level):
```go
func process() error {
    errTimeout := errors.New("timeout")
    // use locally
}
```

---

## Handle Errors Once

❌ Bad - handled twice:
```go
if err := process(); err != nil {
    log.Error("process failed", err)
    return err  // Logged AND returned
}
```

✅ Good - handle at one level:
```go
// Low-level: just return
if err := process(); err != nil {
    return fmt.Errorf("process failed: %w", err)
}

// Top-level: handle and log
if err := service.Run(); err != nil {
    log.Error("service failed", err)
    // Don't return to caller
}
```

---

**Full guidelines**: docs/style-guild/error-*.md
```

## Error Handling

### No .go files found
```
No Go files found in <path>.

Please check:
- Path is correct
- Directory contains .go files
- You have read permissions

Try: /check-go-style-guild <different-path>
```

### Guideline file missing
```
Warning: Could not read guideline file: docs/style-guild/error-wrap.md
Skipping detailed examples for this check.

(Check will still run based on built-in patterns)
```

### Large codebase (>100 files)
```
Found 247 Go files in <path>.

This may take a while to analyze. Options:
1. Continue with full analysis
2. Narrow scope to specific subdirectory
3. Use --category to filter checks
4. Use --critical-only for faster check

Proceed with full analysis? (yes/no)
```

### Invalid category
```
Unknown category: "perfomance"

Valid categories:
- errors
- goroutines
- interfaces
- performance
- style
- patterns

Try: /check-go-style-guild --category performance <path>
```

## Implementation Notes

### Efficiency Considerations

1. **Lazy guideline reading**: Only read guideline files when violations detected
2. **Category filtering**: Skip entire check categories when not needed
3. **Critical-only mode**: Fast path for pre-commit hooks
4. **Caching**: Remember which guidelines have been read in this session

### Extensibility

The skill can be extended by:
1. Adding new check patterns to the "Checking Logic" section
2. Adding new categories to filter options
3. Adding integration with Go tools (go vet, staticcheck, golangci-lint)
4. Adding auto-fix capabilities (not just suggestions)

### Limitations

- **No AST parsing**: Uses pattern matching, not full Go syntax trees
- **False positives possible**: Some patterns may match incorrectly
- **No semantic analysis**: Cannot understand complex control flow
- **Manual verification needed**: Always review suggestions before applying

For most accurate results, combine with:
- `gofmt` for formatting
- `go vet` for common mistakes
- `golangci-lint` for comprehensive linting
- This skill for style guide compliance

---

**Full style guide location**: `docs/style-guild/` (relative to repository root)

**Skill files**:
- `SKILL.md` (this file) - Main skill definition
- `checklist.md` - Quick reference for critical rules
- `guidelines-index.md` - Category mapping for quick lookups
