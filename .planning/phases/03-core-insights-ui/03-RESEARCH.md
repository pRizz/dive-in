# Phase 3: Core Insights UI - Research

**Researched:** 2026-01-28  
**Domain:** Docker image insights UI (React + MUI + Dive JSON)  
**Confidence:** MEDIUM

## Summary

The current insights UI lives in `ui/src/analysis.tsx` and renders three metric cards (total size, inefficient bytes, efficiency score), a "Largest Files" table, and a basic layers table. It consumes `DiveResponse` models that only include image metrics, file references, and layer metadata. The backend returns raw Dive JSON, but the UI types only model a subset of possible fields.

Phase 3 must add a layer-by-layer file tree with change markers (added/modified/removed), improve metrics presentation, and polish the UI for Docker Desktop (light/dark via Docker MUI theme) while adding help/usage links. This requires expanding the data model to include file tree and change metadata (likely already present in Dive JSON) and building a file tree UI that can toggle layer diffs and change types.

**Primary recommendation:** Extend `DiveResponse` to include file tree + change metadata from the Dive JSON result, then build a tree view with change markers and layer toggles using existing MUI components and Docker MUI theme styling.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.2.0 | UI framework | Existing UI is React-based |
| @mui/material | 5.6.1 | UI components | Current UI uses MUI Cards/Tables/Stack |
| @docker/docker-mui-theme | 0.0.9 | Docker Desktop theming | Provides native DD light/dark styling |
| @docker/extension-api-client | 0.3.0 | Docker Desktop API | Required to call backend + Docker APIs |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @emotion/react | 11.9.0 | MUI styling | For theme-aware styling overrides |
| @emotion/styled | 11.8.1 | Styled components | For custom UI elements (badges/chips) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom tree UI | MUI TreeView (@mui/x-tree-view) | Adds dependency; existing stack can use List/Collapse |

**Installation:**
```bash
npm install @mui/material @docker/docker-mui-theme @docker/extension-api-client
```

## Architecture Patterns

### Recommended Project Structure
```
ui/src/
├── analysis.tsx         # Insights page layout
├── layerstable.tsx      # Layer summary list
├── imagetable.tsx       # Largest files list
├── models.ts            # DiveResponse types (extend here)
└── utils.ts             # Formatting helpers
```

### Pattern 1: Analysis page as a composition root
**What:** `Analysis` composes the insights UI from smaller tables and metric cards.  
**When to use:** Adding new panels (file tree, help links, metrics) without reworking App routing.  
**Example:**
```typescript
// Source: ui/src/analysis.tsx
<Stack direction="column" spacing={4} align-items="baseline">
  <Typography variant="h3">Analyzing: {image.name}</Typography>
  <Stack direction="row" spacing={4}>
    {/* metric cards */}
  </Stack>
  <ImageTable rows={dive.image.fileReference} />
  <LayersTable rows={dive.layer} />
</Stack>
```

### Pattern 2: Docker Desktop theming wrapper
**What:** App is wrapped with Docker MUI theme provider for light/dark.  
**When to use:** Any new UI should use MUI components to inherit theme tokens.  
**Example:**
```typescript
// Source: ui/src/index.tsx
<DockerMuiThemeProvider>
  <CssBaseline />
  <App />
</DockerMuiThemeProvider>
```

### Anti-Patterns to Avoid
- **Custom color tokens:** hard-coding colors breaks Docker Desktop theming; rely on theme palette.
- **Client-side diffing:** avoid recomputing layer file changes in UI if Dive provides change metadata.

## Current Insights UI (Repo Observations)

**Analysis screen (`analysis.tsx`):**
- Metrics shown: total size, inefficient bytes, efficiency score.
- Largest files table from `dive.image.fileReference`.
- Layers table showing index, id, size, command.

**Data model (`models.ts`):**
- `DiveResponse` includes `layer[]` and `image` only.
- `DiveImageStats` includes `sizeBytes`, `inefficientBytes`, `efficiencyScore`, `fileReference[]`.
- No file tree or per-layer file change metadata modeled.

**Backend (`vm/main.go`):**
- `dive --json` output is returned directly as the analysis result.
- UI model may be a subset of the Dive JSON schema (unknown until inspected).

## Gaps vs Requirements

### LAYR-01: Layer-by-layer file tree with change markers
- **Current:** No file tree UI; only a layers table.  
- **Gap:** Must add a file tree view and show per-layer change markers (added/modified/removed).  
- **Implication:** Need Dive JSON fields for file tree + change info, plus UI to render and filter.

### METR-01: Efficiency and wasted-space metrics
- **Current:** Efficiency score and inefficient bytes are displayed.  
- **Gap:** Metrics exist but lack explanations and waste context (e.g., percent of total, user-wasted bytes).  
- **Implication:** Expand metric card copy and derive percentages from totals; verify Dive JSON fields.

### UI-01: Docker Desktop-native UI with light/dark
- **Current:** Docker MUI theme provider + CssBaseline already used.  
- **Gap:** Ensure all new components use MUI + theme tokens; align spacing/typography to DD.

### UI-02: Help/usage links
- **Current:** No help/usage links in UI.  
- **Gap:** Add a visible help section or top-right links.

## Implementation Considerations

### Layer file tree with change markers
- **Data:** Dive README confirms file tree and change indicators are core features, but JSON schema is not documented in the repo. Inspect the raw `/analysis/:id/result` output to map fields.  
- **UI:** Use a tree view built from nested nodes with collapse/expand and per-file status badges (Added/Modified/Removed).  
- **Change scope:** Dive supports “current layer changes” vs “aggregate changes”; expose a toggle (per-layer vs aggregate).
- **Performance:** Large trees should defer rendering (expand-on-demand); avoid rendering full tree by default.

### Metrics improvements
- Add a “Wasted space” card with inefficient bytes and percent of total.  
- Show efficiency as percent + explanatory tooltip (what it measures).  
- Consider a small text “Derived from Dive analysis” to set expectations.

### Native UI polish
- Keep layout in `Stack`/`Grid` with consistent spacing tokens.  
- Use `Typography` variants and `Paper`/`Card` with `variant="outlined"` to match existing style.  
- Preserve light/dark via theme; avoid custom colors.

### Help/usage links
- Add a help section near the title or footer (e.g., “What is Dive?”, “How to read layer changes”).  
- Use MUI `Link` with external URLs (README or docs) and a short inline description.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Layer change detection | Client-side diffing of file trees | Dive JSON change metadata | Avoids incorrect or slow diff logic |
| Theming tokens | Custom colors for statuses | MUI theme palette | Keeps native DD look + dark mode |

**Key insight:** The backend already runs Dive and returns JSON; use its change metadata rather than recomputing diffs.

## Common Pitfalls

### Pitfall 1: Missing JSON fields for file tree
**What goes wrong:** UI models omit file tree fields, causing runtime errors or empty views.  
**Why it happens:** `DiveResponse` only models image + layer metadata.  
**How to avoid:** Capture a sample Dive JSON result and update `models.ts` to include file tree nodes.  
**Warning signs:** “undefined” in tree rendering, empty tree despite layers.

### Pitfall 2: Non-native UI styling
**What goes wrong:** New components ignore Docker theme; light/dark mismatch.  
**Why it happens:** Custom colors and non-MUI components.  
**How to avoid:** Use MUI + `DockerMuiThemeProvider`, favor `sx` with theme tokens.  
**Warning signs:** Low-contrast text in dark mode or colors not matching existing cards.

### Pitfall 3: Tree performance regressions
**What goes wrong:** Rendering large file trees causes sluggish UI.  
**Why it happens:** Rendering entire tree at once.  
**How to avoid:** Lazy-expand nodes and reduce initial rendering size.  
**Warning signs:** UI hangs when opening the analysis view.

## Code Examples

### Theming wrapper (Docker Desktop native UI)
```typescript
// Source: ui/src/index.tsx
<DockerMuiThemeProvider>
  <CssBaseline />
  <App />
</DockerMuiThemeProvider>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Minimal insights tables | Metrics + largest files + layers table | Current | Provides baseline metrics but no file tree |

**Deprecated/outdated:**
- None observed in current UI, but “layers table only” is insufficient for LAYR-01.

## Open Questions

1. **What is the exact Dive JSON schema for file tree + change markers?**
   - What we know: Dive supports file tree and change markers in its UI.
   - What's unclear: The JSON structure from `dive --json` for file tree nodes.
   - Recommendation: Capture a real `/analysis/:id/result` payload and update models.

2. **Which change marker types are exposed in JSON?**
   - What we know: Dive distinguishes added/modified/removed/unmodified.
   - What's unclear: Field names and enum values in JSON.
   - Recommendation: Inspect JSON and map to UI badges.

## Sources

### Primary (HIGH confidence)
- https://raw.githubusercontent.com/wagoodman/dive/master/README.md - Dive feature descriptions (file tree, change markers, efficiency metrics)
- Repo source: `ui/src/analysis.tsx`, `ui/src/models.ts`, `ui/src/index.tsx`, `vm/main.go`

### Secondary (MEDIUM confidence)
- Local package manifests (`ui/package.json`) for dependency versions

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - derived from `ui/package.json` and in-repo usage
- Architecture: HIGH - based on current UI component structure
- Pitfalls: MEDIUM - inferred from UI gaps and known large-tree concerns

**Research date:** 2026-01-28  
**Valid until:** 2026-02-27
