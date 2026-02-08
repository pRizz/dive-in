# CLAUDE Workflow Notes

## Setup

- Install Bun `1.3.8`.
- Install Go (see `vm/go.mod`).
- Install dependencies:
  ```bash
  just install
  ```

## Primary commands

- Full local CI parity checks:
  ```bash
  just check
  ```
- Auto-format JS/TS files:
  ```bash
  just fix
  ```
- Run UI dev server:
  ```bash
  just ui-dev
  ```

## Focused command list

- `just ui-format-check`
- `just ui-lint`
- `just ui-test`
- `just ui-build`
- `just vm-fmt-check`
- `just vm-vet`
- `just vm-test`

## Pre-commit requirement

1. Run `just check`.
2. If formatting issues are reported, run `just fix`.
3. Re-run `just check`.
4. Commit only when the checks pass.

## Git push default

- When asked to push and no branch is specified, push to `main`.
- Only push to a different branch when explicitly requested in the current thread.

## Release sanity checks

Before publish/release-related changes:

- Verify `just check` is green.
- Verify extension image builds: `just docker-build`.
- Confirm docs/workflow updates are included when tooling changes.
