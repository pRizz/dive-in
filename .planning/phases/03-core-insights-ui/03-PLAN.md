---
phase: 03-core-insights-ui
plan: 01
type: execute
wave: 3
depends_on: ["02-01"]
files_modified:
  - ui/src/analysis.tsx
  - ui/src/models.ts
  - ui/src/utils.ts
  - ui/src/layerstable.tsx
  - ui/src/imagetable.tsx
  - ui/src/filetree.tsx
autonomous: true
must_haves:
  truths:
    - "User can browse a layer-by-layer file tree with change markers."
    - "User can view efficiency and wasted-space metrics for an image."
    - "User sees a Docker Desktop-native UI with light/dark support."
    - "User can access basic help/usage links from the UI."
  artifacts:
    - path: "ui/src/models.ts"
      provides: "DiveResponse types including file tree and change metadata"
    - path: "ui/src/filetree.tsx"
      provides: "Layer file tree UI with change markers and layer toggles"
    - path: "ui/src/analysis.tsx"
      provides: "Insights composition, metrics cards, and help/usage links"
  key_links:
    - from: "ui/src/analysis.tsx"
      to: "ui/src/filetree.tsx"
      via: "File tree component props"
      pattern: "FileTree"
    - from: "ui/src/filetree.tsx"
      to: "ui/src/models.ts"
      via: "Typed file tree nodes with change status"
      pattern: "FileNode|change"
    - from: "ui/src/analysis.tsx"
      to: "ui/src/utils.ts"
      via: "Metric formatting helpers"
      pattern: "format"
---

<objective>
Expand the insights UI to include layer file exploration, richer metrics, and native Docker Desktop polish.

Purpose: Deliver core insights that are actionable and readable in Docker Desktop.
Output: File tree with change markers, improved metrics, and help/usage links.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/03-core-insights-ui/03-RESEARCH.md
@ui/src/analysis.tsx
@ui/src/models.ts
@ui/src/utils.ts
@ui/src/layerstable.tsx
@ui/src/imagetable.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Extend Dive data model for file tree + change metadata</name>
  <files>ui/src/models.ts, ui/src/utils.ts</files>
  <action>
    - Inspect a real `/analysis/:id/result` payload to confirm file tree field names and change marker values.
    - Add typed models for file tree nodes (path/name, size, fileType, change status, children) and layer change metadata in `ui/src/models.ts`.
    - Add normalization helpers in `ui/src/utils.ts` to map raw change markers to a stable enum and to safely handle missing/optional fields.
    - Keep types resilient (optional fields and fallbacks) so older Dive payloads do not break the UI.
  </action>
  <verify>npm --prefix ui run build</verify>
  <done>Models include file tree/change metadata, and helpers can normalize raw change markers.</done>
</task>

<task type="auto">
  <name>Task 2: Add layer file tree UI with change markers</name>
  <files>ui/src/filetree.tsx, ui/src/analysis.tsx</files>
  <action>
    - Create `ui/src/filetree.tsx` rendering a tree view using MUI List/Collapse with lazy expansion for large trees.
    - Show per-node change badges (Added/Modified/Removed) using theme-aware tokens and compact chips.
    - Include a layer selector (single layer vs aggregate) and a change-type filter (all/added/modified/removed).
    - Wire the component into `analysis.tsx` so it receives the normalized tree data and selected layer.
  </action>
  <verify>npm --prefix ui run build</verify>
  <done>Users can expand a file tree and see change markers per layer or aggregate view.</done>
</task>

<task type="auto">
  <name>Task 3: Enhance metrics, add help links, and polish layout</name>
  <files>ui/src/analysis.tsx, ui/src/imagetable.tsx, ui/src/layerstable.tsx, ui/src/utils.ts</files>
  <action>
    - Add a “Wasted space” metric card showing inefficient bytes and percent of total size with helper copy.
    - Add explanatory tooltip/help text to the efficiency score metric (what it measures and how to interpret it).
    - Add a small help/usage section with MUI Links (Dive docs, “How to read layer changes”) near the title or footer.
    - Align spacing, typography, and card variants to Docker Desktop styling (use MUI theme tokens only).
  </action>
  <verify>npm --prefix ui run build</verify>
  <done>Metrics provide clearer context, help links are visible, and UI retains native light/dark styling.</done>
</task>

</tasks>

<verification>
- `npm --prefix ui run build` succeeds after UI changes.
- UI shows file tree with change markers, improved metrics, and help links.
</verification>

<success_criteria>
- Layer file tree renders with change markers and supports layer/marker filtering.
- Metrics show wasted-space context and efficiency explanation.
- UI uses Docker Desktop-native MUI styling with no custom color tokens.
- Help/usage links are visible from the insights view.
</success_criteria>

<output>
After completion, create `.planning/phases/03-core-insights-ui/03-01-SUMMARY.md`
</output>
