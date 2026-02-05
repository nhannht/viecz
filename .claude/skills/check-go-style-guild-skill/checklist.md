# Uber Go Style Guide - Critical Checklist

Use this checklist for quick reviews. Check off each item as you verify compliance.

## Errors

- [ ] **Error variables exported** as `var ErrXxx = errors.New("message")`
- [ ] **Errors wrapped** with `%w` when propagating: `fmt.Errorf("context: %w", err)`
- [ ] **Each error handled exactly once** (not logged AND returned)
- [ ] **Unexported error variables** named `errXxx` (lowercase)
- [ ] **Error types** chosen appropriately (simple vs custom structs)

## Goroutines & Concurrency

- [ ] **No fire-and-forget goroutines** - all have stop mechanism
- [ ] **Goroutines have WaitGroup or context** for lifecycle management
- [ ] **No goroutines in `init()`** functions
- [ ] **Channels sized** 0 or 1 (unbuffered or single-buffer)
- [ ] **Atomic operations** use `go.uber.org/atomic` (not `sync/atomic`)

## Interfaces

- [ ] **No pointers to interfaces** - use `io.Reader` not `*io.Reader`
- [ ] **Interface compliance verified** at compile time: `var _ Interface = (*Type)(nil)`
- [ ] **Receiver types consistent** - don't mix pointer/value receivers

## Mutexes & Synchronization

- [ ] **Mutexes use zero-value** - `var mu sync.Mutex` (not `new(sync.Mutex)`)
- [ ] **Mutexes not copied** - embedded in structs by value
- [ ] **defer used** for cleanup (unlock, close, etc.)

## Performance

- [ ] **Prefer `strconv` over `fmt`** for primitive conversions: `strconv.Itoa()` not `fmt.Sprintf("%d")`
- [ ] **Container capacity specified** when size known: `make([]T, 0, size)`
- [ ] **Avoid repeated string ↔ []byte conversions** in loops

## General Safety

- [ ] **No panic in library code** - return errors instead
- [ ] **Avoid mutable globals** - use dependency injection
- [ ] **Type assertions checked**: `value, ok := x.(Type)`
- [ ] **Avoid built-in names** - don't shadow `error`, `string`, etc.

## Style (Most Critical)

- [ ] **Import grouping**: stdlib, external, internal (blank lines between)
- [ ] **Package names**: lowercase, no underscores
- [ ] **Function names**: MixedCaps, no underscores
- [ ] **Unexported globals** prefixed with `_`: `var _defaultConfig`
- [ ] **Reduce nesting** - prefer early returns
- [ ] **Eliminate unnecessary else** after return/break/continue

## Testing

- [ ] **Table-driven tests** for multiple test cases
- [ ] **Subtests** use `t.Run(name, func(t *testing.T) {...})`

---

**Total critical items**: 30

**Quick check**: Run through this list in ~5 minutes for fast style compliance verification.

**Full guide**: See [SKILL.md](SKILL.md) for complete checking logic and examples.

**Source**: `docs/style-guild/` (relative to repository root)
