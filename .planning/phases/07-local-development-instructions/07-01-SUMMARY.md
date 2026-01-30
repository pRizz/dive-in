---
phase: 07-local-development-instructions
plan: 01
subsystem: documentation
tags: [readme, just, docker-extension, vite, local-development]

# Dependency graph
requires:
  - phase: 06-long-running-task-progress-ux
    provides: Completed extension development workflow
provides:
  - Clear local development instructions in README.md
  - Prerequisites with version requirements
  - Fast dev loop workflow documentation
  - Troubleshooting guidance
affects: [future contributors, onboarding]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified: [README.md]

key-decisions:
  - "Use just commands as primary workflow path"
  - "Document fast dev loop (ui-dev + docker extension dev ui-source) as primary workflow"
  - "Emphasize Dive CLI is bundled (not required locally)"
  - "Include troubleshooting for common issues (stale installs, docker-archive paths)"

patterns-established:
  - "Documentation pattern: Prerequisites → Fast dev loop → Initial setup → Updating → Troubleshooting"

# Metrics
duration: <1min
completed: 2026-01-30
---

# Phase 7 Plan 1: Local Development Instructions Summary

**README.md updated with command-focused local development instructions using just commands, fast dev loop workflow, and troubleshooting guidance**

## Performance

- **Duration:** <1min
- **Started:** 2026-01-30T03:48:48Z
- **Completed:** 2026-01-30T03:48:56Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Updated README.md Development section with comprehensive local development instructions
- Documented prerequisites with specific version requirements (Docker Desktop 4.10.0+, Node.js 20+, Go 1.19+)
- Established fast dev loop as primary workflow (just ui-dev + docker extension dev ui-source)
- Added troubleshooting section for common development issues
- Clarified that Dive CLI is bundled in extension VM (not required locally)

## Task Commits

Each task was committed atomically:

1. **Task 1: Update README.md Development section with improved local development instructions** - `8040554` (docs)

**Plan metadata:** [pending - will be committed after summary creation]

## Files Created/Modified

- `README.md` - Updated Development section with improved local development instructions including prerequisites, fast dev loop, initial setup, updating, and troubleshooting sections

## Decisions Made

- Used `just` commands as primary workflow path throughout documentation
- Documented fast dev loop (UI dev server + Docker Desktop extension dev mode) as primary workflow
- Emphasized Dive CLI bundling to clarify it's not a local dependency
- Included troubleshooting guidance for stale installs and docker-archive path requirements
- Maintained reference to official Docker extension docs for additional context

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Local development instructions are now clear and actionable
- New contributors can follow documented workflow to set up and iterate locally
- No blockers identified

---
*Phase: 07-local-development-instructions*
*Completed: 2026-01-30*
