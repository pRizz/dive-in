# Coding Conventions

**Analysis Date:** 2026-01-28

## Naming Patterns

**Files:**
- Match surrounding file naming in `ui/src/`: PascalCase for root component (`ui/src/App.tsx`), lowercase for most UI components (`ui/src/analysis.tsx`, `ui/src/imagetable.tsx`, `ui/src/layerstable.tsx`, `ui/src/ring.tsx`).

**Functions:**
- Use camelCase for helpers and handlers in `ui/src/App.tsx` and `ui/src/utils.ts`.
- Use PascalCase for React components in `ui/src/App.tsx`, `ui/src/analysis.tsx`, `ui/src/imagetable.tsx`, `ui/src/layerstable.tsx`, `ui/src/ring.tsx`.

**Variables:**
- Use camelCase for local variables and state in `ui/src/App.tsx` and `ui/src/analysis.tsx`.

**Types:**
- Use PascalCase for interfaces and types in `ui/src/models.ts` and `vm/main.go`.

## Code Style

**Formatting:**
- No dedicated formatter config detected outside `ui/package.json`.
- Indent with 2 spaces in UI TypeScript/TSX files like `ui/src/App.tsx`, `ui/src/analysis.tsx`, `ui/src/imagetable.tsx`.

**Linting:**
- ESLint via CRA presets in `ui/package.json` (`react-app`, `react-app/jest`).
- No standalone ESLint config files detected in repo root or `ui/`.

## Import Organization

**Order:**
1. External libraries first in `ui/src/App.tsx`, `ui/src/analysis.tsx`, `ui/src/index.tsx`.
2. Local relative imports after a blank line in `ui/src/App.tsx`, `ui/src/analysis.tsx`, `ui/src/index.tsx`.

**Path Aliases:**
- Not detected; imports are relative in `ui/src/App.tsx`, `ui/src/analysis.tsx`, `ui/src/imagetable.tsx`.

## Error Handling

**Patterns:**
- UI async handlers generally rely on promise rejection propagation in `ui/src/App.tsx` (no explicit try/catch).
- Go handlers return errors directly and log fatals in `vm/main.go`.

## Logging

**Framework:** `console.log` in `ui/src/App.tsx`; `log`/`logrus` in `vm/main.go`.

**Patterns:**
- Log informational messages before/after actions in `vm/main.go`.

## Comments

**When to Comment:**
- Use short context notes for environment constraints in `ui/src/App.tsx`.
- Use inline comments for control flow in `vm/main.go`.

**JSDoc/TSDoc:**
- Not detected in `ui/src/*.ts` and `ui/src/*.tsx`.

## Function Design

**Size:** Small-to-medium functions and inline callbacks in `ui/src/App.tsx`, `ui/src/analysis.tsx`.

**Parameters:** Destructure props or pass typed props objects in `ui/src/analysis.tsx`, `ui/src/imagetable.tsx`.

**Return Values:** React components return JSX; helpers return primitives/strings in `ui/src/utils.ts`.

## Module Design

**Exports:** Default exports for components in `ui/src/analysis.tsx`, `ui/src/imagetable.tsx`, `ui/src/layerstable.tsx`, `ui/src/ring.tsx`; named exports for helpers in `ui/src/utils.ts` and types in `ui/src/models.ts`.

**Barrel Files:** Not detected in `ui/src/`.

---

*Convention analysis: 2026-01-28*
