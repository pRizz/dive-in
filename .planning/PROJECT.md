# Deep Dive

## What This Is

A Docker Desktop extension that analyzes local Docker images using the Dive CLI and presents layer and image insights in a React UI. It targets Docker Desktop users who want quick, trustworthy image analysis without leaving the desktop app.

## Core Value

Users can run Dive analysis on their images from Docker Desktop and trust the results they see.

## Requirements

### Validated

- ✓ User can list local Docker images and select one to analyze — existing
- ✓ User can run Dive analysis on a selected image and retrieve JSON results — existing
- ✓ User can view image and layer details in the UI — existing
- ✓ Extension bundles UI + VM backend for Docker Desktop — existing

### Active

- [x] Modernize UI stack to Vite and upgrade React/MUI dependencies
- [ ] Upgrade Go runtime and backend dependencies to current stable versions
- [ ] Update Dive integration to latest release and surface useful new flags/features
- [x] Harden backend (timeouts, input validation, safe file handling, non-fatal errors)
- [x] Add CI to build and verify Docker Desktop extension images on Linux
- [x] Add semantic-release + changesets for versioning and release automation
- [x] Replace Makefile with a justfile (dev/build/test/package/ci targets)
- [x] Update README to reflect new tooling, workflow, and requirements
- [x] Establish basic UI and Go test hooks in CI (even if minimal initially)
- [x] Core insights UI for layers and metrics (Phase 3)
- [x] History, export, and CI gate actions (Phase 4)

### Out of Scope

- Publishing extension images/releases to registries — defer until CI/release automation is stable
- Multi-arch or multi-OS build matrix — keep Linux runner for now
- Major UI redesign or feature re-scope — focus on maintainability and reliability
- Rewriting backend in a new language — keep Go

## Context

- Existing Docker Desktop extension with React UI (`ui/`) and Go backend (`vm/`) using a Unix socket.
- Current UI runs Dive via Docker CLI and renders layer/image tables.
- Backend runs Dive CLI and writes JSON to disk with limited validation and error handling.
- No automated tests detected; CI and release automation are missing.
- Dependency stack is outdated (React 17, Echo v3, Go 1.19, CRA).

## Constraints

- **Compatibility**: Maintain Docker Desktop extension compatibility and existing platform support — extension runtime is fixed by Docker Desktop.
- **Tooling**: Move from CRA to Vite while preserving UI behavior — required for modernization.
- **Versioning**: Semver across `metadata.json`, Docker labels, and git tags — align with semantic-release/changesets.
- **CI**: Linux runner only for now — matches current build assumptions.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Migrate UI to Vite | Improve build speed and modern tooling | Completed |
| Upgrade Go + dependencies | Security and maintainability | — Pending |
| Use semantic-release + changesets | Consistent versioning and changelog automation | Completed |
| Replace Makefile with justfile | Simpler developer workflow | Completed |
| Keep backend in single file | Scope is small and refactor not required | Confirmed |

---
*Last updated: 2026-01-29 after Phase 4 completion*
