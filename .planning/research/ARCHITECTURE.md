# Architecture Research

**Domain:** Docker Desktop extensions for image analysis (Dive)
**Researched:** 2026-01-28
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Docker Desktop UI (Extensions Tab, sandboxed web UI)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────┐  ddClient API  ┌────────────────────────────┐   │
│  │ Extension Frontend (UI) │───────────────▶│ Extension VM Service (API) │   │
│  │ React/Vite static assets│  HTTP over     │ Go service in VM container  │   │
│  └────────────┬────────────┘  socket/pipe   └───────────────┬────────────┘   │
│               │                                           Dive CLI           │
│               │                                            /docker.sock      │
├───────────────┴─────────────────────────────────────────────────────────────┤
│ Docker Desktop Extension Image                                                │
│  - /metadata.json (ui/vm/host sections)                                      │
│  - /ui (built frontend assets)                                               │
│  - /vm (backend image or compose.yaml)                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Extension UI | Render analysis views, accept image input, show progress/results | React UI, built to static assets (Vite/React) |
| Extension VM backend | Run Dive analysis, expose REST endpoints, manage long tasks | Go HTTP service in VM container |
| Dive CLI | Perform image layer analysis | Dive binary invoked by backend |
| Docker engine access | Pull images, inspect layers, provide image tar data | Docker socket access in VM container |
| metadata.json | Declare UI entrypoint, VM service, optional host binaries | Extension metadata at image root |
| Extension image | Package UI assets + backend image or compose | Docker image pushed to registry |

## Recommended Project Structure

```
/
├── metadata.json          # Extension entrypoint (ui/vm/host)
├── ui/                    # Frontend app (Vite/React)
│   ├── public/            # Static assets for UI
│   └── src/               # UI components, state, data clients
├── vm/                    # Backend service (Go)
│   ├── cmd/               # Main entrypoint
│   ├── internal/          # Core services (Dive runner, Docker access)
│   └── pkg/               # API contracts, shared types
├── compose.yaml           # Optional: VM service + dependencies
├── justfile               # Local build/dev tasks
└── .github/workflows/     # CI build/test/release pipelines
```

### Structure Rationale

- **`ui/`:** Keep UI isolated; Vite builds static assets for Docker Desktop extraction.
- **`vm/`:** Backend services are containerized and run in the Desktop VM.
- **`metadata.json`:** Single source of truth for extension components and entrypoints.

## Architectural Patterns

### Pattern 1: UI → VM Service via ddClient

**What:** Use `ddClient.extension.vm.service` to call backend APIs over socket/pipe.
**When to use:** Any long-running work or tasks needing Docker access.
**Trade-offs:** Cleaner separation and persistence; requires API design and error handling.

**Example:**
```typescript
// UI calls backend to start Dive analysis
await ddClient.extension.vm.service.post("/analyze", { image: "alpine:latest" });
```

### Pattern 2: Backend Exec Wrapper for Dive CLI

**What:** Backend exposes a stable API; internally invokes Dive CLI and parses output.
**When to use:** Need consistent JSON output regardless of Dive version changes.
**Trade-offs:** Extra parsing/maintenance; shields UI from CLI changes.

**Example:**
```go
// Backend runs Dive and returns parsed results
cmd := exec.Command("dive", "--json", imageRef)
```

### Pattern 3: Stateless UI with Backend State

**What:** UI rehydrates from backend state on load because UI is reset on tab switches.
**When to use:** Docker Desktop reinitializes UI on every tab visit.
**Trade-offs:** Requires backend state storage; improves UX consistency.

## Data Flow

### Request Flow

```
[User selects image]
    ↓
[UI Form] → ddClient.vm.service → [Backend API] → [Dive CLI]
    ↓              ↓                 ↓            ↓
[UI Poll] ← [Status JSON] ← [Result Parser] ← [Dive output]
```

### State Management

```
[Backend job store]
    ↓ (fetch on load)
[UI state] ←→ [Actions] → [Backend API] → [Job updates]
```

### Key Data Flows

1. **Image analysis:** UI submits image ref → backend runs Dive → parsed JSON results → UI renders tables/graphs.
2. **Progress updates:** UI polls or subscribes to backend status endpoints → UI renders progress and errors.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k users | Single backend container per extension instance is fine |
| 1k-100k users | Optimize Dive invocation, reduce re-analysis via caching |
| 100k+ users | Not typical for Desktop extensions; focus on local performance |

### Scaling Priorities

1. **First bottleneck:** Dive runtime on large images → add caching and limit analyses.
2. **Second bottleneck:** UI responsiveness → paginate and virtualize large layer lists.

## Anti-Patterns

### Anti-Pattern 1: Running long analysis in the UI

**What people do:** Execute Dive from the UI or rely on UI process lifetime.
**Why it's wrong:** UI is destroyed on tab switch; tasks get killed.
**Do this instead:** Run analysis in backend container and persist job state.

### Anti-Pattern 2: Coupling UI to raw Dive output

**What people do:** Parse CLI output directly in UI.
**Why it's wrong:** Breaks on Dive changes and increases UI complexity.
**Do this instead:** Normalize output in backend; keep UI simple and stable.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Docker Engine | Backend container uses Docker socket | Required for image pull/inspect |
| Dive CLI | Backend executes Dive binary | Keep version pinned in image |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| UI ↔ Backend | ddClient VM service HTTP | Socket/pipe, no host port collisions |
| Backend ↔ Dive | CLI exec + parser | Provide stable JSON contracts |
| Build ↔ Extension image | CI builds image | Package UI assets + VM service |

## Build Order Implications

1. **Define API contracts first:** Backend endpoints and response schemas drive UI integration.
2. **Build backend container:** Needs Dive integration and Docker access before UI can show real data.
3. **Implement UI on stable APIs:** UI should rehydrate from backend state.
4. **Finalize metadata.json and packaging:** UI root + VM image/compose wiring.
5. **CI/release automation:** Build extension image, run verification, then semantic-release.

## Sources

- https://docs.docker.com/extensions/extensions-sdk/architecture/
- https://docs.docker.com/extensions/extensions-sdk/architecture/metadata/
- https://docs.docker.com/extensions/extensions-sdk/dev/api/overview/
- https://docs.docker.com/extensions/extensions-sdk/dev/api/backend/

---
*Architecture research for: Docker Desktop image analysis extensions*
*Researched: 2026-01-28*
