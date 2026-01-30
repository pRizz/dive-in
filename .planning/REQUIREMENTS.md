# Requirements: Deep Dive

**Defined:** 2026-01-28  
**Core Value:** Users can run Dive analysis on their images from Docker Desktop and trust the results they see.

## v1 Requirements

Requirements for the modernization release. Each maps to roadmap phases.

### Analysis

- [ ] **ANAL-01**: User can select a local image by tag/digest and run analysis
- [ ] **ANAL-02**: User can choose image source (Docker engine or archive)

### Layer Exploration

- [ ] **LAYR-01**: User can browse a layer-by-layer file tree with change markers

### Metrics

- [ ] **METR-01**: User can view efficiency and wasted-space metrics for an image

### UI/UX

- [ ] **UI-01**: User sees a Docker Desktop-native UI with light/dark support
- [ ] **UI-02**: User can access basic help/usage links from the UI

### Reliability

- [ ] **REL-01**: User can see analysis job status/progress
- [ ] **REL-02**: User receives clear error messages when analysis fails
- [ ] **REL-03**: All errors are handled or surfaced with actionable next steps

### History

- [ ] **HIST-01**: User can view saved analysis history per image/tag

### Export/Share

- [ ] **SHARE-01**: User can export analysis reports (JSON/HTML) and share a summary

### CI Gates

- [ ] **CI-01**: User can generate CI thresholds or `.dive-ci` rules from analysis

### Comparison

- [ ] **COMP-01**: User can compare two images/tags and see metric and layer deltas

### Integration

- [ ] **INTEG-01**: User can hand off to Docker Scout when available

### Maintainability & Release

- [ ] **PLAT-01**: Maintainer can build and verify the extension image in CI (Linux)
- [ ] **PLAT-02**: Maintainer can run a release workflow that updates versions and tags
- [ ] **PLAT-03**: Maintainer can develop the UI with Vite and run lint/tests
- [ ] **PLAT-04**: Maintainer can run Go tests/vet as part of CI

## v2 Requirements

Deferred to a future release.

### Deferred

- **DEFER-01**: (None yet — all researched differentiators are in v1 scope)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Embedded terminal for Dive | Conflicts with Docker Desktop UX guidance and onboarding |
| Auto-uploading images to third parties | Privacy/IP risk and trust barrier |
| Arbitrary host executables | Security risk; extension runs with user permissions |
| Always-on background scanning | Resource drain and unexpected behavior |
| Publishing extension images | Defer until CI and versioning stabilize |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ANAL-01 | Phase 2 | Pending |
| ANAL-02 | Phase 2 | Pending |
| LAYR-01 | Phase 3 | Pending |
| METR-01 | Phase 3 | Pending |
| UI-01 | Phase 3 | Pending |
| UI-02 | Phase 3 | Pending |
| REL-01 | Phase 2 | Pending |
| REL-02 | Phase 2 | Pending |
| REL-03 | Phase 2 | Pending |
| HIST-01 | Phase 4 | Pending |
| SHARE-01 | Phase 4 | Pending |
| CI-01 | Phase 4 | Pending |
| COMP-01 | Phase 5 | Pending |
| INTEG-01 | Phase 5 | Pending |
| PLAT-01 | Phase 1 | Pending |
| PLAT-02 | Phase 1 | Pending |
| PLAT-03 | Phase 1 | Pending |
| PLAT-04 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 18 total
- Mapped to phases: 18
- Unmapped: 0 ✓

---
*Requirements defined: 2026-01-28*
*Last updated: 2026-01-28 after initial definition*
