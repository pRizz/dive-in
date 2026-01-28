# Testing Patterns

**Analysis Date:** 2026-01-28

## Test Framework

**Runner:**
- React Scripts (CRA/Jest) via `ui/package.json`.
- Config: `ui/package.json` (`eslintConfig` includes `react-app/jest`; no separate test config files).

**Assertion Library:**
- Jest (implied by `react-scripts test` and `@types/jest` in `ui/package.json`).

**Run Commands:**
```bash
cd ui && npm run test        # CRA/Jest runner from `ui/package.json`
```

## Test File Organization

**Location:**
- Not detected; no `*.test.*` or `*.spec.*` files in `ui/src/` or `vm/`.

**Naming:**
- Not detected in `ui/` and `vm/`.

**Structure:**
```
Not detected in `ui/` or `vm/`.
```

## Test Structure

**Suite Organization:**
```typescript
Not detected in `ui/src/`.
```

**Patterns:**
- Setup: Not detected in `ui/`.
- Teardown: Not detected in `ui/`.
- Assertions: Not detected in `ui/`.

## Mocking

**Framework:** Not detected in `ui/`.

**Patterns:**
```typescript
Not detected in `ui/src/`.
```

**What to Mock:**
- Not detected in `ui/`.

**What NOT to Mock:**
- Not detected in `ui/`.

## Fixtures and Factories

**Test Data:**
```typescript
Not detected in `ui/src/`.
```

**Location:**
- Not detected in `ui/`.

## Coverage

**Requirements:** Not detected in `ui/` or `vm/`.

**View Coverage:**
```bash
Not detected in `ui/package.json`.
```

## Test Types

**Unit Tests:**
- Not detected in `ui/` or `vm/`.

**Integration Tests:**
- Not detected in `ui/` or `vm/`.

**E2E Tests:**
- Not detected in `ui/` or `vm/`.

## Common Patterns

**Async Testing:**
```typescript
Not detected in `ui/src/`.
```

**Error Testing:**
```typescript
Not detected in `ui/src/`.
```

---

*Testing analysis: 2026-01-28*
