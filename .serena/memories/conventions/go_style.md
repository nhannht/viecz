# Go Code Conventions

## Naming
- Package names: lowercase, no underscores (`handlers`, `services`, `models`)
- Files: snake_case (`user_handler.go`, `wallet_test.go`)
- Exported: PascalCase (`UserService`, `CreateUser`)
- Unexported: camelCase (`userRepository`, `validateEmail`)

## Architecture
- Constructor pattern: `func NewXxxService(...) *XxxService`
- Repository interface + GORM impl (separate files)
- Handlers receive services via constructor injection
- Models use GORM hooks for validation (`BeforeCreate`, `BeforeUpdate`)
- Test files: `*_test.go` in same package

## Testing
- PostgreSQL for both prod and tests (never SQLite)
- Test server uses tmpfs-backed PostgreSQL on port 5433
- Mock at dependency boundary (interfaces), not inside services
- No `if mockMode` branching in business logic

## Patterns to Follow
- Same code path for test and production
- Validate at system boundaries only
- Interface-based DI for all external dependencies
