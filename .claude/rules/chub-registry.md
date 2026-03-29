# Chub Local Registry

A local chub registry exists at `docs/chub-registry/` with docs for our APIs, models, payment flow, services, and frostglass design system.

## Annotate Discoveries (MANDATORY)

When you discover something new about a viecz API, service, model, or pattern that isn't in the existing docs, **immediately annotate it**:

```bash
~/.bun/bin/chub annotate viecz/<doc-id> "your discovery note"
```

### When to annotate

- Found a gotcha, edge case, or non-obvious behavior
- Discovered an undocumented parameter, field, or constraint
- Hit an error with a workaround that others would hit too
- Noticed the existing doc is wrong or incomplete about something
- Learned a pattern from debugging that isn't captured anywhere

### Doc IDs

| ID | Covers |
|----|--------|
| `viecz/server-api` | REST endpoints, auth, rate limiting |
| `viecz/data-models` | Go structs, TypeScript interfaces |
| `viecz/payment-flow` | PayOS, escrow, deposit, withdrawal |
| `viecz/web-services` | Angular services, guards, pipes |
| `viecz/frostglass-design` | Theme, CSS vars, components |

### Examples

```bash
# Discovered that wallet deposit minimum is 2000 VND, not documented
~/.bun/bin/chub annotate viecz/payment-flow "Minimum deposit is 2000 VND, enforced by WalletService validation"

# Found that task search requires Meilisearch running or it falls back silently
~/.bun/bin/chub annotate viecz/server-api "Task search silently falls back to DB LIKE query when Meilisearch is down"

# Discovered a component gotcha
~/.bun/bin/chub annotate viecz/frostglass-design "nhannht-metro-select requires options as {value: string, label: string}[] — value must be string even for numeric IDs"
```

## Fetching Docs

```bash
~/.bun/bin/chub get viecz/server-api --lang go
~/.bun/bin/chub get viecz/web-services --lang ts
~/.bun/bin/chub search viecz
```

## Rebuilding Registry

After updating any `DOC.md` file in `docs/chub-registry/`:
```bash
~/.bun/bin/chub build docs/chub-registry/ -o docs/chub-registry/dist
```
