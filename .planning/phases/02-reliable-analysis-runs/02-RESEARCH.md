# Phase 2: Reliable Analysis Runs - Research

**Researched:** 2026-01-28
**Domain:** Reliable Dive analysis execution (UI + Go backend)
**Confidence:** MEDIUM

## Summary

Current flow runs Dive directly from the UI (`ui/src/App.tsx`) by executing a Docker CLI `run` against `prakhar1989/dive` and parsing `stdout` JSON. The backend (`vm/main.go`) exposes `/analyze` and `/checkdive`, but the UI does not call it. The backend currently runs `dive` synchronously, caches results in a local JSON file by image ID, and has no job lifecycle or status tracking.

Phase 2 needs to meet ANAL-01/02 and REL-01/02/03 by introducing a reliable async job pipeline with explicit status, consistent error handling, and selectable image sources (engine vs archive). This implies moving the analysis orchestration to the backend, returning job IDs, and polling for status/results, rather than blocking the UI while CLI runs.

**Primary recommendation:** Route analysis through the backend with async job IDs, status polling, and explicit error/timeout handling; add `--source` support for Docker archive selection and make UI source choice explicit.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@docker/extension-api-client` | repo default | UI access to Docker Desktop APIs | Required for extension context and Docker CLI |
| `github.com/labstack/echo` | repo default | Backend HTTP server | Already used in `vm/main.go` |
| Dive CLI (`wagoodman/dive`) | latest | Image analysis engine | Official Dive distribution and CLI surface |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Go `os/exec` + `context` | stdlib | Run Dive with timeouts/cancel | Required for REL-01/02/03 |
| Go `sync` (mutex/map) | stdlib | In-memory job store | Minimal state for job tracking |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| In-memory job store | Persistent store (sqlite/bolt) | Adds durability but more scope |
| Direct UI exec | Backend-managed exec | Needed for consistent status/error handling |

**Installation:**
```bash
# No new dependencies required for Phase 2
```

## Architecture Patterns

### Recommended Project Structure
```
ui/src/App.tsx              # Image selection and analysis UI
ui/src/models.ts            # Dive response types
vm/main.go                  # HTTP API for analyze/status/results
```

### Pattern 1: Async analysis job with status polling
**What:** POST returns a job ID immediately; UI polls `/analysis/:id/status` and `/analysis/:id/result`.
**When to use:** Long-running Dive runs where UI must remain responsive (REL-01).
**Example:**
```text
POST /analyze
-> { jobId, status: "queued" }

GET /analysis/:jobId/status
-> { status: "running" | "succeeded" | "failed", message? }

GET /analysis/:jobId/result
-> { ...Dive JSON... }
```

### Pattern 2: Explicit source selection for ANAL-02
**What:** Use Dive `--source` for docker-archive vs docker engine; UI indicates source.
**When to use:** When user selects an archive file instead of local engine image.
**Example:**
```bash
# Source: https://raw.githubusercontent.com/wagoodman/dive/master/README.md
dive --source docker-archive /path/to/image.tar
```

### Anti-Patterns to Avoid
- **UI blocking on analysis:** Direct CLI exec in UI hides status/progress and yields ambiguous errors.
- **Fatal logging in backend:** `c.Logger().Fatal` aborts the server; prefer error responses.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Timeout/cancel | Custom goroutine timers | `exec.CommandContext` + context timeout | Correct process termination and cleanup |
| Image source parsing | Custom heuristics | Dive `--source` flag | Official CLI behavior |

**Key insight:** Reliable execution comes from explicit job states and standard process control, not UI-side CLI calls.

## Common Pitfalls

### Pitfall 1: Inconsistent Dive binary/source
**What goes wrong:** UI uses `prakhar1989/dive` container, backend uses host `dive` binary. Results may differ.
**Why it happens:** Two execution paths exist in different runtimes.
**How to avoid:** Centralize execution in backend and standardize Dive image/binary choice.
**Warning signs:** Same image yields different JSON between UI and backend.

### Pitfall 2: No status for long runs
**What goes wrong:** Users see indefinite spinners or no progress (REL-01).
**Why it happens:** Synchronous exec blocks UI and has no job state.
**How to avoid:** Async job IDs with polling endpoints.
**Warning signs:** UI stays in loading state with no recovery.

### Pitfall 3: Errors crash server or are swallowed
**What goes wrong:** Backend exits or returns empty/opaque errors (REL-02/03).
**Why it happens:** `Fatal` logging and missing structured error responses.
**How to avoid:** Use structured error responses with actionable hints.
**Warning signs:** 500 errors with no UI feedback.

## Code Examples

Verified patterns from official sources:

### Dive image source selection
```bash
# Source: https://raw.githubusercontent.com/wagoodman/dive/master/README.md
dive --source docker-archive /path/to/image.tar
dive --source docker nginx:latest
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| UI runs Dive directly | Backend-managed jobs + polling | Phase 2 | Reliable status/errors and async UX |

**Deprecated/outdated:**
- Direct UI CLI execution for analysis: does not meet REL-01/02/03.

## Open Questions

1. **Archive selection UX**
   - What we know: Dive supports `--source docker-archive` for tar files.
   - What's unclear: Preferred UX in Docker Desktop extension for choosing a local archive path.
   - Recommendation: Decide on file picker or manual path entry in UI.

2. **Job persistence**
   - What we know: In-memory job map is simplest for Phase 2.
   - What's unclear: Whether job history must persist across extension restarts (HIST-01 is Phase 4).
   - Recommendation: Keep in-memory for Phase 2 and document that results reset on restart.

## Sources

### Primary (HIGH confidence)
- https://raw.githubusercontent.com/wagoodman/dive/master/README.md - Dive CLI sources and `--source` options

### Secondary (MEDIUM confidence)
- Internal repo inspection: `ui/src/App.tsx`, `vm/main.go`, `ui/src/models.ts`

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM - repo-defined stack, Dive CLI verified
- Architecture: MEDIUM - based on repo structure and requirements
- Pitfalls: MEDIUM - derived from current code paths

**Research date:** 2026-01-28
**Valid until:** 2026-02-27
