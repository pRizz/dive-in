---
phase: 01-platform-ci-baseline
verified: 2026-01-28T20:15:27Z
status: human_needed
score: 10/10 must-haves verified
human_verification:
  - test: "Run UI dev server"
    expected: "`npm --prefix ui run dev` starts Vite without errors"
    why_human: "Runtime behavior and local environment dependencies"
  - test: "CI build/test/validate workflow"
    expected: "GitHub Actions CI job passes UI lint/test/build, Go test/vet, and docker extension validate"
    why_human: "External CI execution not verifiable from static code"
  - test: "Release workflow"
    expected: "changesets/action opens a version PR; semantic-release tags and creates a GitHub release"
    why_human: "Requires GitHub workflow execution and repo permissions"
---

# Phase 01: Platform + CI Baseline Verification Report

**Phase Goal:** Maintainers can build, test, and release the extension reliably with a modern toolchain.
**Verified:** 2026-01-28T20:15:27Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Maintainer can start the UI dev server via Vite. | ✓ VERIFIED | `ui/package.json` has `dev: "vite"` and `ui/vite.config.ts` exports Vite config. |
| 2 | Maintainer can build the UI via Vite for the extension image. | ✓ VERIFIED | `ui/package.json` has `build: "vite build"`; `ui/vite.config.ts` outputs `dist`. |
| 3 | Maintainer can run lint and tests locally using npm/justfile. | ✓ VERIFIED | `ui/package.json` defines `lint`/`test`; `justfile` exposes `ui-lint`/`ui-test`. |
| 4 | Maintainer can build the extension image using Vite output. | ✓ VERIFIED | `Dockerfile` copies `/ui/dist` from client build stage. |
| 5 | Maintainer can build and validate the extension image in Linux CI. | ✓ VERIFIED | `.github/workflows/ci.yml` builds image and runs `docker extension validate`. |
| 6 | Maintainer can run Go tests/vet as part of CI. | ✓ VERIFIED | `.github/workflows/ci.yml` runs `go test ./...` and `go vet ./...` using `vm/go.mod`. |
| 7 | Maintainer can run UI lint/tests and build in CI. | ✓ VERIFIED | `.github/workflows/ci.yml` runs `npm run lint`, `npm run test -- --run`, `npm run build` in `ui/`. |
| 8 | Maintainer can run a release workflow that updates versions and creates tags. | ✓ VERIFIED | `.github/workflows/release.yml` runs `changesets/action@v1` with `npm run release`. |
| 9 | Changesets drives version/changelog updates in a version PR. | ✓ VERIFIED | `.changeset/config.json` + root `package.json` `version` script wires Changesets. |
| 10 | Semantic-release creates GitHub releases from the versioned files. | ✓ VERIFIED | `.releaserc.cjs` uses `scripts/semantic-release-version.cjs` + `@semantic-release/github`. |

**Score:** 10/10 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `ui/vite.config.ts` | Vite build/dev configuration for the UI | ✓ VERIFIED | Defines `base: './'`, `build.outDir: 'dist'`, Vitest config. |
| `ui/index.html` | Vite HTML entry wired to `ui/src/index.tsx` | ✓ VERIFIED | Loads `/src/index.tsx` via module script. |
| `justfile` | Local dev/build/test targets for UI + VM | ✓ VERIFIED | Provides `ui-dev`, `ui-build`, `ui-lint`, `ui-test`, `vm-test`, `vm-vet`. |
| `.github/workflows/ci.yml` | Linux CI pipeline for build, test, and validate | ✓ VERIFIED | Runs Node/Go checks, Docker build, and extension validation. |
| `.changeset/config.json` | Changesets configuration for version PRs | ✓ VERIFIED | Configured for `main` with standard changesets behavior. |
| `.github/workflows/release.yml` | Release workflow using Changesets + semantic-release | ✓ VERIFIED | Uses `changesets/action@v1` with `npm run release`. |
| `.releaserc.cjs` | Semantic-release configuration that reads file versions | ✓ VERIFIED | Uses custom version plugin + GitHub release plugin. |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `ui/package.json` | `vite` | npm scripts (dev/build/test) | ✓ WIRED | `dev`, `build`, `preview` map to Vite. |
| `Dockerfile` | `ui/dist` | COPY from client-builder | ✓ WIRED | `COPY --from=client-builder /ui/dist ui`. |
| `.github/workflows/ci.yml` | `vm/go.mod` | setup-go and go test/vet | ✓ WIRED | `go-version-file: vm/go.mod` then `go test`/`go vet`. |
| `.github/workflows/ci.yml` | docker extension validate | extension validation step | ✓ WIRED | `docker extension validate deep-dive:ci`. |
| `.github/workflows/release.yml` | `.changeset/config.json` | changesets/action version PR | ✓ WIRED | Uses `changesets/action@v1` with `npm run release`. |
| `.releaserc.cjs` | `ui/package.json` | custom version reader script | ✓ WIRED | `scripts/semantic-release-version.cjs` reads `ui/package.json`. |

### Requirements Coverage

| Requirement | Status | Blocking Issue |
| --- | --- | --- |
| PLAT-01 | ✓ SATISFIED | None (CI build + validate defined). |
| PLAT-02 | ✓ SATISFIED | None (release workflow + semantic-release config present). |
| PLAT-03 | ✓ SATISFIED | None (Vite scripts + lint/test tooling + justfile targets present). |
| PLAT-04 | ✓ SATISFIED | None (CI runs Go test/vet). |

### Anti-Patterns Found

None detected in phase-modified artifacts.

### Human Verification Required

### 1. Run UI dev server

**Test:** `npm --prefix ui run dev`  
**Expected:** Vite dev server starts without errors and serves the UI.  
**Why human:** Runtime behavior and local environment dependencies.

### 2. CI build/test/validate workflow

**Test:** Trigger GitHub Actions CI on a PR to `main`.  
**Expected:** UI lint/test/build, Go test/vet, docker build, and `docker extension validate` all pass.  
**Why human:** External CI execution not verifiable from static code.

### 3. Release workflow

**Test:** Run `release` workflow or merge a changeset PR on `main`.  
**Expected:** Version PR is opened and semantic-release tags and creates a GitHub release.  
**Why human:** Requires workflow execution and repo permissions.

### Gaps Summary

No structural gaps found in the codebase. Verification requires running CI and release workflows to confirm runtime success.

---

_Verified: 2026-01-28T20:15:27Z_  
_Verifier: Claude (gsd-verifier)_
