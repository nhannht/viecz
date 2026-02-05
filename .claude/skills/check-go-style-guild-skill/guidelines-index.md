# Uber Go Style Guide - Guidelines Index

Quick reference for finding specific guidelines by category and topic.

## Errors (14, 15, 16, 17, 18)

| Topic | File | Key Points |
|-------|------|------------|
| Error types | `error-type.md` | Choose between simple errors and custom types |
| Error wrapping | `error-wrap.md` | Use `%w` to preserve error chain |
| Error naming | `error-name.md` | ErrXxx for exported, errXxx for unexported |
| Handle once | `error-once.md` | Don't log AND return errors |

**Category pattern**: All error-related checks focus on proper error propagation, naming, and handling patterns.

## Goroutines & Concurrency (8, 29, 30, 31)

| Topic | File | Key Points |
|-------|------|------------|
| Fire-and-forget | `goroutine-forget.md` | All goroutines need stop mechanism |
| Goroutine exit | `goroutine-exit.md` | Use WaitGroup, context, or channels |
| No init goroutines | `goroutine-init.md` | Don't start background work in init() |
| Mutex zero-value | `mutex-zero-value.md` | Use `var mu sync.Mutex` |
| Atomic operations | `atomic.md` | Prefer go.uber.org/atomic |
| Channel sizing | `channel-size.md` | Size 0 (unbuffered) or 1 |

**Category pattern**: Focus on proper lifecycle management and synchronization.

## Interfaces (5, 6, 7)

| Topic | File | Key Points |
|-------|------|------------|
| Pointer to interface | `interface-pointer.md` | Don't use `*Interface` |
| Compliance check | `interface-compliance.md` | Verify: `var _ I = (*T)(nil)` |
| Receivers | `interface-receiver.md` | Consistent pointer/value receivers |

**Category pattern**: Ensuring proper interface usage and compile-time verification.

## Performance (33, 34, 35)

| Topic | File | Key Points |
|-------|------|------------|
| strconv over fmt | `strconv.md` | Use strconv.Itoa() not fmt.Sprintf() |
| String/byte conversion | `string-byte-slice.md` | Avoid repeated conversions in loops |
| Container capacity | `container-capacity.md` | Pre-allocate: make([]T, 0, size) |

**Category pattern**: Micro-optimizations that add up in hot paths.

## Style - Imports & Organization (36-44)

| Topic | File | Key Points |
|-------|------|------------|
| Line length | `line-length.md` | Keep lines under 99 characters |
| Consistency | `consistency.md` | Follow existing patterns |
| Declaration groups | `decl-group.md` | Group related declarations |
| Import grouping | `import-group.md` | stdlib, external, internal (critical) |
| Import aliasing | `import-alias.md` | When and how to alias imports |
| Package names | `package-name.md` | lowercase, no underscores |
| Function names | `function-name.md` | MixedCaps, no underscores |
| Function ordering | `function-order.md` | Logical grouping and ordering |

**Category pattern**: Code organization and readability.

## Style - Control Flow (45, 46)

| Topic | File | Key Points |
|-------|------|------------|
| Reduce nesting | `nest-less.md` | Prefer early returns (critical) |
| Unnecessary else | `else-unnecessary.md` | Eliminate else after return |

**Category pattern**: Simplifying control flow for readability.

## Style - Variables & Declarations (47-53)

| Topic | File | Key Points |
|-------|------|------------|
| Global declarations | `global-decl.md` | Use var for top-level declarations |
| Global naming | `global-name.md` | Prefix unexported with _ (critical) |
| Struct embedding | `struct-embed.md` | When to embed vs compose |
| Local variables | `var-decl.md` | Use := for initialized vars |
| nil slices | `slice-nil.md` | nil is a valid zero-value slice |
| Variable scope | `var-scope.md` | Reduce scope to minimum needed |
| Naked parameters | `param-naked.md` | Avoid bool/int params without names |

**Category pattern**: Variable declaration and scoping best practices.

## Style - Strings & Formatting (54, 61, 62)

| Topic | File | Key Points |
|-------|------|------------|
| Raw strings | `string-escape.md` | Use backticks for complex strings |
| Printf constants | `printf-const.md` | Format strings should be constants |
| Printf naming | `printf-name.md` | Name Printf-style functions XxxF |

**Category pattern**: String handling and formatted output.

## Style - Struct Initialization (55-60)

| Topic | File | Key Points |
|-------|------|------------|
| Field names | `struct-field-key.md` | Always use field names in literals |
| Zero fields | `struct-field-zero.md` | Omit zero-value fields |
| Zero structs | `struct-zero.md` | Use var for zero-value structs |
| Struct pointers | `struct-pointer.md` | Use &T{} for pointer initialization |
| Map init | `map-init.md` | Prefer make() over map literal with capacity |

**Category pattern**: Struct and map initialization patterns.

## Safety & Correctness (9, 10, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28)

| Topic | File | Key Points |
|-------|------|------------|
| Slices/maps at boundaries | `container-copy.md` | Copy to prevent mutations |
| Defer cleanup | `defer-clean.md` | Use defer for unlock, close |
| Enum start | `enum-start.md` | Start enums at 1, not 0 |
| Time handling | `time.md` | Use time package, not int64 |
| Type assertions | `type-assert.md` | Check ok: value, ok := x.(T) |
| Don't panic | `panic.md` | Return errors in libraries (critical) |
| Mutable globals | `global-mut.md` | Avoid or protect with mutex (critical) |
| Embedding in public | `embed-public.md` | Be careful with public embedded types |
| Built-in names | `builtin-name.md` | Don't shadow built-ins |
| Avoid init | `init.md` | Minimize init() usage |
| Exit in main | `exit-main.md` | Only call os.Exit in main |
| Exit once | `exit-once.md` | Call os.Exit only once |
| Struct tags | `struct-tag.md` | Use tags for marshaling |

**Category pattern**: Preventing common bugs and unsafe patterns.

## Patterns (64, 65)

| Topic | File | Key Points |
|-------|------|------------|
| Test tables | `test-table.md` | Table-driven tests with subtests (critical) |
| Functional options | `functional-option.md` | Option pattern for config |

**Category pattern**: Idiomatic Go design patterns.

## Meta (1, 67)

| Topic | File | Key Points |
|-------|------|------------|
| Introduction | `intro.md` | Overview of style guide |
| Linting | `lint.md` | Recommended linters and tools |

---

## Category Quick Reference

**Run checks by category:**

```bash
# Error handling (4 guidelines)
/check-go-style-guild --category errors ./pkg

# Concurrency (6 guidelines)
/check-go-style-guild --category goroutines ./pkg

# Interfaces (3 guidelines)
/check-go-style-guild --category interfaces ./pkg

# Performance (3 guidelines)
/check-go-style-guild --category performance ./pkg

# Style (40+ guidelines)
/check-go-style-guild --category style ./pkg

# Patterns (2 guidelines)
/check-go-style-guild --category patterns ./pkg
```

---

## Search by Topic

**Common topics and their related files:**

- **Error handling**: error-type.md, error-wrap.md, error-name.md, error-once.md
- **Goroutines**: goroutine-forget.md, goroutine-exit.md, goroutine-init.md
- **Concurrency**: mutex-zero-value.md, atomic.md, channel-size.md
- **Interfaces**: interface-pointer.md, interface-compliance.md, interface-receiver.md
- **Performance**: strconv.md, string-byte-slice.md, container-capacity.md
- **Naming**: package-name.md, function-name.md, global-name.md, error-name.md
- **Testing**: test-table.md
- **Initialization**: struct-field-key.md, struct-zero.md, map-init.md
- **Control flow**: nest-less.md, else-unnecessary.md
- **Imports**: import-group.md, import-alias.md

---

**Total guidelines**: 61 (plus intro and linting)

**Source location**: `docs/style-guild/` (relative to repository root)

**Usage**: Reference this index to quickly locate guidelines during code review or when seeking guidance on specific Go patterns.
