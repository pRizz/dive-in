# Roadmap: Deep Dive

## Overview

This roadmap modernizes the extension platform and then delivers reliable Dive analysis, core insights, and advanced sharing/compare flows inside Docker Desktop. Phases are ordered to stabilize tooling and backend execution before expanding UI capabilities and differentiators.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Platform + CI Baseline** - Modern toolchain, CI, and release foundations
- [x] **Phase 2: Reliable Analysis Runs** - Run analyses with status and actionable errors
- [x] **Phase 3: Core Insights UI** - Layer exploration, metrics, and native UI polish
- [x] **Phase 4: History + Export + CI Gates** - Persist results and enable sharing/thresholds
- [ ] **Phase 5: Compare + Scout Handoff** - Advanced comparisons and integrations
- [ ] **Phase 6: on long running tasks, ensure they are asynchronous so the UI is not blocked and try to show a better progress indicator if we can show status of progress, for example when clicking "Analyze" on a docker image.** - [To be planned]
- [ ] **Phase 7: add simple instructions to the readme for allowing for local development of this and instructions for loading the local extension in Docker Desktop** - [To be planned]

## Phase Details

### Phase 1: Platform + CI Baseline
**Goal**: Maintainers can build, test, and release the extension reliably with a modern toolchain.
**Depends on**: Nothing (first phase)
**Requirements**: PLAT-01, PLAT-02, PLAT-03, PLAT-04
**Success Criteria** (what must be TRUE):
  1. Maintainer can build and verify the extension image in Linux CI.
  2. Maintainer can run a release workflow that updates versions and tags.
  3. Maintainer can develop the UI with Vite and run lint/tests locally.
  4. Maintainer can run Go tests/vet as part of CI.
**Plans**: 4 plans

Plans:
- [x] 01-01-PLAN.md — Migrate UI toolchain to Vite
- [x] 01-02-PLAN.md — Add lint/test tooling + justfile + Dockerfile updates
- [x] 01-03-PLAN.md — Add Linux CI build/test/validate workflow
- [x] 01-04-PLAN.md — Add release automation with Changesets + semantic-release

### Phase 2: Reliable Analysis Runs
**Goal**: Users can run Dive analyses and always know job status or failure details.
**Depends on**: Phase 1
**Requirements**: ANAL-01, ANAL-02, REL-01, REL-02, REL-03
**Success Criteria** (what must be TRUE):
  1. User can select a local image by tag/digest and run analysis.
  2. User can choose the image source (Docker engine or archive) and run analysis.
  3. User can see analysis job status/progress while it runs.
  4. User receives clear, actionable error messages when analysis fails.
**Plans**: 1

Plans:
- [x] 02-01-PLAN.md — Add async analysis jobs with status + source selection

### Phase 3: Core Insights UI
**Goal**: Users can explore layers and metrics in a Docker Desktop-native UI.
**Depends on**: Phase 2
**Requirements**: LAYR-01, METR-01, UI-01, UI-02
**Success Criteria** (what must be TRUE):
  1. User can browse a layer-by-layer file tree with change markers.
  2. User can view efficiency and wasted-space metrics for an image.
  3. User sees a Docker Desktop-native UI with light/dark support.
  4. User can access basic help/usage links from the UI.
**Plans**: 1

Plans:
- [x] 03-01-PLAN.md — Add core insights UI for layers and metrics

### Phase 4: History + Export + CI Gates
**Goal**: Users can retain analyses and share or gate results.
**Depends on**: Phase 3
**Requirements**: HIST-01, SHARE-01, CI-01
**Success Criteria** (what must be TRUE):
  1. User can view saved analysis history per image/tag.
  2. User can export analysis reports (JSON/HTML) and share a summary.
  3. User can generate CI thresholds or `.dive-ci` rules from analysis.
**Plans**: 1

Plans:
- [x] 04-01-PLAN.md — Add history, export, and CI gate actions

### Phase 5: Compare + Scout Handoff
**Goal**: Users can compare images and hand off to Docker Scout when available.
**Depends on**: Phase 4
**Requirements**: COMP-01, INTEG-01
**Success Criteria** (what must be TRUE):
  1. User can compare two images/tags and see metric and layer deltas.
  2. User can hand off to Docker Scout when available.
**Plans**: 1

Plans:
- [ ] 05-01-PLAN.md — Add compare workflows and Scout handoff

### Phase 6: on long running tasks, ensure they are asynchronous so the UI is not blocked and try to show a better progress indicator if we can show status of progress, for example when clicking "Analyze" on a docker image.

**Goal:** Users see detailed progress messages during long-running analysis tasks instead of generic "running" status.
**Depends on:** Phase 5
**Plans:** 1 plan

Plans:
- [ ] 06-01-PLAN.md — Capture Dive CLI progress output and enhance UI progress indicators

**Details:**
[To be added during planning]

### Phase 7: add simple instructions to the readme for allowing for local development of this and instructions for loading the local extension in Docker Desktop

**Goal:** [To be planned]
**Depends on:** Phase 6
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 7 to break down)

**Details:**
[To be added during planning]

## Progress

**Execution Order:**
Phases execute in numeric order: 2 → 2.1 → 2.2 → 3 → 3.1 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Platform + CI Baseline | 4/4 | Complete | 2026-01-29 |
| 2. Reliable Analysis Runs | 1/1 | Complete | 2026-01-29 |
| 3. Core Insights UI | 1/1 | Complete | 2026-01-29 |
| 4. History + Export + CI Gates | 1/1 | Complete | 2026-01-29 |
| 5. Compare + Scout Handoff | 0/TBD | Not started | - |
| 6. on long running tasks, ensure they are asynchronous so the UI is not blocked and try to show a better progress indicator if we can show status of progress, for example when clicking "Analyze" on a docker image. | 0/1 | Not started | - |
| 7. add simple instructions to the readme for allowing for local development of this and instructions for loading the local extension in Docker Desktop | 0/TBD | Not started | - |
