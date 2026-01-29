# Phase 4: History + Export + CI Gates - Research

**Researched:** 2026-01-28
**Domain:** Docker Desktop extension persistence, export, CI gating (Dive)
**Confidence:** MEDIUM

## Summary

Phase 4 adds history, export, and CI gate generation on top of the current in-memory job store in `vm/main.go`. The backend must persist completed analysis results and metadata to survive UI restarts, while the UI surfaces a history list, per-run detail views, and export/CI rule actions. Existing endpoints already return Dive JSON results; new endpoints should wrap history management, export creation, and CI config generation without changing current analysis flow.

Docker extensions can define backend services using a Compose file in `metadata.json`, and the docs explicitly show volumes in the Compose file for persistence. Use an extension-managed volume (configured in `docker-compose.yaml`) and store completed runs in a backend folder. Generate `.dive-ci` rules from thresholds surfaced in the UI and export formats derived from the existing Dive JSON.

**Primary recommendation:** Persist completed analysis results to an extension volume and add API endpoints for history listing, export generation, and `.dive-ci` rule output.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Go | 1.19 | Backend service | Current repo runtime and build image; no CGO. |
| Echo | v3.3.10+incompatible | HTTP API | Existing API server in `vm/main.go`. |
| React | 19.2.4 | UI framework | Current UI stack for extension dashboard. |
| MUI | 7.3.7 | UI components | Current UI stack for layouts, actions. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Go stdlib (`encoding/json`, `encoding/csv`, `io/fs`) | Go 1.19 | Serialization and file I/O | History persistence and export formats. |
| `gopkg.in/yaml.v3` | v3 | YAML serialization | Generate `.dive-ci` config without hand-rolling YAML. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| JSON file store | SQLite (pure-Go driver) | DB adds query power but more complexity for small history sets. |
| CSV export | Markdown export | Markdown is easier for PR comments but loses structure. |

**Installation:**
```bash
go get gopkg.in/yaml.v3
```

## Architecture Patterns

### Recommended Project Structure
```
vm/
├── history/          # persistence helpers (load/save/index)
├── exports/          # export format helpers
├── ci/               # .dive-ci generation helpers
└── main.go           # route wiring
```

### Pattern 1: Persist completed analysis results
**What:** Save completed analysis metadata + Dive JSON to a volume-backed path.
**When to use:** On job completion (`StatusSucceeded`) before returning result.
**Example:**
```go
// Source: repo (current flow) + Docker docs for volume-backed compose
// Pseudocode: persist only when run succeeded.
jobStore.Update(jobID, func(job *Job) { ... })
saveHistory(jobID, req, job.Result, time.Now())
```

### Pattern 2: History + export endpoints
**What:** Add dedicated endpoints for listing history, fetching details, and exporting.
**When to use:** After persistence is in place.
**Example endpoints (proposed):**
```
GET  /history                     # list runs (metadata only)
GET  /history/:id                 # single run (metadata + summary)
DELETE /history/:id               # remove run
POST /history/:id/export          # create export (format, filename)
GET  /history/:id/export/:format  # download export blob
POST /ci/rules                    # generate .dive-ci from thresholds
```

### Pattern 3: UI surfaces
**What:** Expose a history list and per-run actions in the UI.
**When to use:** After backend endpoints are available.
**UI surfaces (proposed):**
- History panel on the landing view (recent runs, filter by image/tag).
- Analysis detail page adds “Export” and “CI Gate” actions.
- Export dialog shows available formats and downloads via backend.
- CI gate dialog generates `.dive-ci` preview + download.

### Anti-Patterns to Avoid
- **Persisting in UI memory/localStorage:** UI restarts discard state; backend must persist.
- **Hand-writing YAML/CSV:** Use serializers to avoid invalid output.
- **Saving failed/incomplete runs:** Store only `StatusSucceeded` entries.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| YAML generation | String concat `.dive-ci` | `gopkg.in/yaml.v3` | Avoid syntax errors and quoting bugs. |
| CSV export | Manual formatting | `encoding/csv` | Handles commas/escaping reliably. |
| History index | UI-only cache | Backend file index | UI restarts lose cache. |

**Key insight:** The UI is ephemeral; persistence must live in the backend volume.

## Common Pitfalls

### Pitfall 1: History disappears after tab switch
**What goes wrong:** UI reloads, losing all history.
**Why it happens:** History stored in memory or UI state only.
**How to avoid:** Persist completed runs to a backend volume and fetch on load.
**Warning signs:** History list empty after reload; no data after Desktop restart.

### Pitfall 2: Corrupted or partial history entries
**What goes wrong:** Exports fail or history entry loads invalid JSON.
**Why it happens:** Concurrent writes or saving failed runs.
**How to avoid:** Write to temp file then atomically rename; only save succeeded runs.
**Warning signs:** JSON parse errors, missing fields on load.

### Pitfall 3: CI config does not match Dive rules
**What goes wrong:** `.dive-ci` generated with wrong keys or types.
**Why it happens:** Hand-crafted YAML or mismatched units.
**How to avoid:** Serialize structured data; validate keys against Dive docs.
**Warning signs:** CI run fails with config parse error or unexpected pass/fail.

## Code Examples

### Dive CI configuration rules
```yaml
# Source: https://raw.githubusercontent.com/wagoodman/dive/master/README.md
rules:
  lowestEfficiency: 0.95
  highestWastedBytes: 20MB
  highestUserWastedPercent: 0.20
```

### Extension backend with Compose + volumes
```yaml
# Source: https://docs.docker.com/extensions/extensions-sdk/architecture/metadata/
services:
  myExtension:
    image: ${DESKTOP_PLUGIN_IMAGE}
    volumes:
      - /host/path:/container/path
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual CI checks | `.dive-ci` rules with `CI=true` | Dive CI integration | Standardized pass/fail gates in pipelines. |

**Deprecated/outdated:**
- Hand-maintained CI thresholds outside `.dive-ci`: use Dive’s supported rules instead.

## Open Questions

1. **Volume path and naming convention for persistence**
   - What we know: Compose volumes are supported in extension backend configuration.
   - What's unclear: Preferred volume name/path for extension data in this repo.
   - Recommendation: Decide a fixed container path (e.g., `/data/history`) and define a named volume in `docker-compose.yaml`.

2. **History retention limits**
   - What we know: No existing retention logic.
   - What's unclear: Max number of runs or size budget.
   - Recommendation: Cap by count (e.g., 50) and prune oldest on write.

3. **Export format scope**
   - What we know: Dive JSON is already produced by backend.
   - What's unclear: Which extra formats are required (CSV, Markdown, HTML).
   - Recommendation: Start with raw Dive JSON + summary CSV; add Markdown if needed for PR comments.

## Sources

### Primary (HIGH confidence)
- https://raw.githubusercontent.com/wagoodman/dive/master/README.md — CI config rules and formats
- https://docs.docker.com/extensions/extensions-sdk/architecture/metadata/ — backend compose/volume support

### Secondary (MEDIUM confidence)
- Internal repo context: `vm/main.go`, `ui/src/App.tsx`, `ui/src/analysis.tsx`, `.planning/research/FEATURES.md`

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM - grounded in repo versions; YAML lib not yet pinned here.
- Architecture: MEDIUM - based on existing endpoint patterns + Docker docs.
- Pitfalls: MEDIUM - aligns with extension UX pitfalls and persistence risks.

**Research date:** 2026-01-28
**Valid until:** 2026-02-27
