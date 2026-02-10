# AGENTS Guide

## Local bootstrap

1. Install Bun `1.3.8` and Go (version from `vm/go.mod`).
2. Install project dependencies:
   ```bash
   just install
   ```
3. Install the local Docker Desktop extension image (optional for UI-only changes):
   ```bash
   just install-development-extension
   ```

## Daily workflow

- Start UI dev server:
  ```bash
  just ui-dev
  ```
- Run all local quality checks (same gate as CI):
  ```bash
  just check
  ```
- Auto-fix JS/TS formatting:
  ```bash
  just fix
  ```

## Useful targeted checks

- UI formatting check: `just ui-format-check`
- UI lint: `just ui-lint`
- UI tests: `just ui-test`
- UI build: `just ui-build`
- Go formatting check: `just vm-fmt-check`
- Go vet: `just vm-vet`
- Go tests: `just vm-test`

## Pre-commit requirement

Run this before every commit:

```bash
just check
```

If formatting fails, run:

```bash
just fix
```

Then re-run `just check`.

## Generated skills

- `just build-skills` generates repo-local Codex skills at `.codex/skills/deep-dive-*/SKILL.md`.
- `just build`, `just check`, and `just dev` may update these generated files by design.
- If prompt data or skill-generation code changes, generated skill diffs are expected and must be committed.

## Git push default

- When asked to push and no branch is specified, push to `main`.
- Only push to a different branch when explicitly requested in the current thread.

## PR readiness checklist

- [ ] `just check` passes locally.
- [ ] Extension can be built: `just docker-build`.
- [ ] Relevant docs were updated for behavior or workflow changes.
