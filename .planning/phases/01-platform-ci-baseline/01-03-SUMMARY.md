---
phase: 01-platform-ci-baseline
plan: 03
subsystem: ci
tags: [github-actions, docker-extension, node, go]

# Dependency graph
requires:
  - 01-02
provides:
  - Linux CI for UI/Go checks and extension validation
affects: [platform-ci-baseline, ui, vm, extension]

# Tech tracking
tech-stack:
  added: [actions/setup-node, actions/setup-go, docker extensions cli]
  patterns: [Go version via go.mod, UI lint/test/build in ui]

key-files:
  created:
    - .github/workflows/ci.yml
  modified: []

key-decisions:
  - "Use GitHub Actions on ubuntu-latest to run UI/Go checks and extension validation."
  - "Install Docker Extensions CLI from extension-sdk releases for validation."

patterns-established:
  - "CI runs UI lint/test/build, then Go test/vet, then extension validation."

# Metrics
duration: 18 min
completed: 2026-01-28
---

# Phase 01: Platform + CI Baseline Summary

**Linux CI pipeline validates UI, Go, and extension image readiness.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-01-28T19:05:00Z
- **Completed:** 2026-01-28T19:23:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Added GitHub Actions workflow to run UI lint/test/build and Go test/vet on Linux.
- Installed Docker Extensions CLI in CI and enforced image validation.
- Built the extension image in CI to ensure validation runs against the current Dockerfile.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add CI workflow for UI + Go checks** - `ea120b0` (chore)
2. **Task 2: Build and validate the extension image in CI** - `592ab93` (chore)

**Plan metadata:** (this commit)

## Files Created/Modified
- `.github/workflows/ci.yml` - Linux CI workflow for UI/Go checks and extension validation.

## Decisions Made
- Use `actions/setup-go` with `go-version-file` to pin the CI Go version to `vm/go.mod`.
- Enforce `docker extension validate` in CI to ensure extension packaging stays compliant.

## Deviations from Plan

None.

---

**Total deviations:** 0
**Impact on plan:** None.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- CI baseline is in place for UI/Go checks and extension validation.
- No blockers identified.

---
*Phase: 01-platform-ci-baseline*
*Completed: 2026-01-28*
