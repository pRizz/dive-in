# Project Research Summary

**Project:** Dive In
**Domain:** Docker Desktop extension for local image analysis (Dive)
**Researched:** 2026-01-28
**Confidence:** MEDIUM

## Executive Summary

Dive In is a Docker Desktop extension that runs Dive against local images and presents layer and efficiency insights in a native Desktop UI. The dominant pattern is a stateless React UI that delegates all long-running analysis and state to a VM backend accessed via the Extensions SDK socket APIs. Experts build these extensions by packaging UI assets + a backend container inside a single extension image, with explicit metadata labels and a pinned Dive CLI to stabilize behavior across Docker versions.

The recommended approach is to formalize backend APIs first, integrate Dive behind a stable JSON parser, and build UI views on top of those APIs while persisting job state in the backend. This preserves UX across tab switches, keeps analysis reliable, and isolates CLI version drift. The largest risks are UI lifecycle resets, incorrect Docker socket wiring, and platform/CI assumptions. Mitigate them by keeping analysis in the backend, using `/var/run/docker.sock.raw`, and planning explicit CI coverage for Desktop-specific scenarios.

## Key Findings

### Recommended Stack

The stack is aligned with the Docker Extensions SDK: React 19 + Vite + MUI for the UI and Go 1.25 for the VM backend. Dive 0.13.1 should be pinned and invoked by the backend with stable JSON output to shield the UI from CLI churn. Required Docker labels (notably `com.docker.desktop.extension.api.version`) must track the SDK API version for compatibility.

**Core technologies:**
- Docker Desktop Extensions SDK + required API labels: extension build, validate, and install — mandatory for compatibility.
- React 19.2.4 + React DOM 19.2.4: UI framework — stable, MUI-supported.
- Vite 7.3.1: frontend build pipeline — fast dev loop, stable release line.
- MUI 7.3.7 + Emotion 11: UI components — common Desktop extension pattern.
- Go 1.25.6: backend service — current secure runtime.
- Dive CLI 0.13.1: analysis engine — pinned for deterministic output.

### Expected Features

The MVP must focus on local image selection, layer/file exploration, and core efficiency metrics, wrapped in a Docker Desktop-native UI with reliable job status and errors. Differentiators like CI gates, saved history, and export/share come next; comparison and Scout handoff are better deferred.

**Must have (table stakes):**
- Analyze local images by tag/digest — core use case.
- Layer-by-layer file tree with change markers — primary insight.
- Efficiency and wasted-space metrics — decision support.
- Docker Desktop-native UI — marketplace readiness.
- Robust job status + error handling — avoids dead ends.

**Should have (competitive):**
- CI-ready efficiency gates — budget enforcement.
- Saved analysis history — regression tracking.
- Export/share report — collaboration.

**Defer (v2+):**
- Compare two images/tags — high complexity.
- Scout handoff/integration — auth and scope risk.

### Architecture Approach

The standard architecture is a React UI packaged as static assets plus a Go VM service that runs Dive and exposes APIs via `ddClient.extension.vm.service`. The UI should be stateless and rehydrate from backend state on load, with all long-running work and parsing handled server-side.

**Major components:**
1. Extension UI — image selection, progress, and results rendering.
2. VM backend service — Dive execution, parsing, and job/state management.
3. Dive CLI — image analysis engine invoked by backend.

### Critical Pitfalls

1. **Running analysis in the UI** — UI is destroyed on tab switch; keep analysis and state in backend.
2. **Wrong Docker socket integration** — use `/var/run/docker.sock.raw` inside the VM; avoid host port exposure.
3. **Missing multi-arch binaries** — package per OS/arch or gate releases.
4. **Underestimating security scope** — treat extension as privileged; minimize host binaries and validate inputs.
5. **CI assumes Linux Desktop tests** — Desktop E2E needs macOS runners; keep build-only on Linux.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Backend API + Dive Integration
**Rationale:** UI depends on stable backend APIs and persisted state.  
**Delivers:** Go service, `/analyze` API, job store, Dive JSON parsing.  
**Addresses:** Core analysis capability, job status reliability.  
**Avoids:** UI lifecycle pitfall, Dive output coupling.

### Phase 2: MVP UI + Core Features
**Rationale:** UI should be built on stable APIs with known data shapes.  
**Delivers:** Image picker, layer tree, efficiency metrics, Desktop-native UX.  
**Implements:** UI ↔ backend ddClient pattern; stateless UI with rehydrate.  
**Avoids:** UI long-running work, brittle CLI parsing in UI.

### Phase 3: Reliability + Packaging + CI Basics
**Rationale:** Extension correctness depends on socket wiring, packaging, and CI checks.  
**Delivers:** Docker socket `.raw` wiring, error handling, minimal CI build/verify.  
**Uses:** Required Docker labels, pinned Dive version, Go/React stack.  
**Avoids:** Socket misconfig, CI Desktop gaps, hidden regressions.

### Phase 4: Value Additions (History, Export, CI Gates)
**Rationale:** These build on persisted backend state and stable metrics.  
**Delivers:** Saved history, export/share, CI threshold exports.  
**Addresses:** Differentiators without destabilizing core flows.

### Phase 5: Advanced Features (Comparison, Scout Handoff)
**Rationale:** Requires history, diff views, and potential auth integration.  
**Delivers:** Image comparisons and optional Scout integration.  
**Avoids:** Auth scope creep and UX complexity too early.

### Phase Ordering Rationale

- Backend APIs and state must precede UI to survive tab resets and avoid CLI coupling.
- Packaging/CI/labels are required to ship a valid Desktop extension.
- Differentiators build on persisted state and stable metrics.
- Advanced integrations should wait for validated core usage.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3:** CI/packaging constraints for Desktop E2E on macOS runners.
- **Phase 5:** Scout handoff/auth licensing and UX implications.

Phases with standard patterns (skip research-phase):
- **Phase 1:** Backend + Dive integration using Extensions SDK APIs.
- **Phase 2:** React/MUI UI on ddClient backend APIs.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Versions validated via official sources; some tools optional. |
| Features | MEDIUM | Strong MVP consensus, but competitive items depend on user feedback. |
| Architecture | HIGH | Directly aligned with Docker Extensions SDK guidance. |
| Pitfalls | MEDIUM | Common issues backed by docs + community reports. |

**Overall confidence:** MEDIUM

### Gaps to Address

- **CI execution environment:** validate feasible Desktop E2E strategy on macOS runners and fallback when unavailable.
- **Scout integration scope:** confirm auth requirements, licensing, and handoff UX before committing.
- **Multi-arch packaging:** decide when to broaden beyond Linux and define release gates.

## Sources

### Primary (HIGH confidence)
- https://docs.docker.com/extensions/extensions-sdk/ — SDK packaging and architecture
- https://docs.docker.com/extensions/extensions-sdk/architecture/metadata/ — required metadata and labels
- https://docs.docker.com/extensions/extensions-sdk/dev/api/backend/ — UI ↔ backend API patterns
- https://docs.docker.com/extensions/extensions-sdk/design/ — Desktop UX requirements

### Secondary (MEDIUM confidence)
- https://github.com/wagoodman/dive/releases/latest — Dive versioning and changes
- https://docs.docker.com/extensions/extensions-sdk/dev/continuous-integration/ — CI constraints for Desktop
- https://docs.docker.com/scout/ — Scout integration context

---
*Research completed: 2026-01-28*
*Ready for roadmap: yes*
