---
phase: 04-history-export-ci-gates
plan: 01
type: execute
wave: 4
depends_on: ["03-01"]
files_modified:
  - docker-compose.yaml
  - vm/main.go
  - vm/history/store.go
  - vm/history/types.go
  - vm/exports/exports.go
  - vm/ci/rules.go
  - vm/go.mod
  - vm/go.sum
  - ui/src/models.ts
  - ui/src/App.tsx
  - ui/src/analysis.tsx
  - ui/src/history.tsx
  - ui/src/exportdialog.tsx
  - ui/src/cigatedialog.tsx
autonomous: true
must_haves:
  truths:
    - "User can view saved analysis history per image/tag across UI reloads."
    - "User can export an analysis report in JSON, CSV, and HTML summary formats."
    - "User can generate a `.dive-ci` rule file from thresholds and download it."
  artifacts:
    - path: "vm/history/store.go"
      provides: "Persistent history storage backed by extension volume"
    - path: "vm/main.go"
      provides: "History, export, and CI gate API routes"
    - path: "ui/src/history.tsx"
      provides: "History list UI with selection and actions"
    - path: "ui/src/exportdialog.tsx"
      provides: "Export dialog for format selection and download"
    - path: "ui/src/cigatedialog.tsx"
      provides: "CI gate dialog with threshold inputs and .dive-ci preview"
  key_links:
    - from: "vm/main.go"
      to: "vm/history/store.go"
      via: "Save on StatusSucceeded and list endpoints"
      pattern: "HistoryStore"
    - from: "ui/src/history.tsx"
      to: "/history"
      via: "Backend API fetch"
      pattern: "/history"
    - from: "ui/src/analysis.tsx"
      to: "ui/src/exportdialog.tsx"
      via: "Export action button"
      pattern: "Export"
    - from: "ui/src/analysis.tsx"
      to: "ui/src/cigatedialog.tsx"
      via: "CI gate action button"
      pattern: "CI Gate"
    - from: "ui/src/exportdialog.tsx"
      to: "/history/:id/export"
      via: "Backend API export request"
      pattern: "/history/:id/export"
    - from: "ui/src/exportdialog.tsx"
      to: "/history/:id/export/:format"
      via: "Backend API download request"
      pattern: "/history/:id/export/:format"
    - from: "ui/src/cigatedialog.tsx"
      to: "/ci/rules"
      via: "Backend API rules request"
      pattern: "/ci/rules"
---

<objective>
Add durable analysis history, exports, and CI gate rule generation so results can be retained and shared.

Purpose: Persist completed runs across UI restarts and enable shareable exports + `.dive-ci` gating.
Output: History storage and API endpoints, export and CI rule generation, and UI actions to access them.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/04-history-export-ci-gates/04-RESEARCH.md
@docker-compose.yaml
@vm/main.go
@ui/src/App.tsx
@ui/src/analysis.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Persist completed analyses and expose history endpoints</name>
  <files>docker-compose.yaml, vm/main.go, vm/history/store.go, vm/history/types.go</files>
  <action>
    - Add a named volume to `docker-compose.yaml` and mount it into the backend container (e.g., `/data/history`) for persistence.
    - Create `vm/history/types.go` for history metadata (run id, image/tag, source, timestamps, summary stats).
    - Create `vm/history/store.go` for load/save/index logic with atomic writes (temp file + rename) and pruning by count (default 50).
    - Update `vm/main.go` to persist only `StatusSucceeded` runs on job completion and add endpoints:
      - `GET /history` (list metadata only)
      - `GET /history/:id` (metadata + summary)
      - `DELETE /history/:id` (remove run + exports)
    - Ensure history entries reference image/tag + source so UI can filter per image/tag.
  </action>
  <verify>go test ./vm/...</verify>
  <done>Completed runs persist to the extension volume and history list/detail endpoints return data after UI reloads.</done>
</task>

<task type="auto">
  <name>Task 2: Add export + CI gate generation helpers and API routes</name>
  <files>vm/main.go, vm/exports/exports.go, vm/ci/rules.go, vm/go.mod, vm/go.sum</files>
  <action>
    - Add `vm/exports/exports.go` to generate exports from stored Dive JSON:
      - JSON: raw Dive JSON
      - CSV: summary metrics (size, wasted bytes, efficiency, top files)
      - HTML: a simple summary page with key metrics and top files table
    - Add `vm/ci/rules.go` using `gopkg.in/yaml.v3` to serialize `.dive-ci` rules (keys match Dive README).
    - Wire routes in `vm/main.go`:
      - `POST /history/:id/export` with `{format}` and returns export metadata/filename
      - `GET /history/:id/export/:format` to download export blobs
      - `POST /ci/rules` to generate `.dive-ci` from thresholds and return YAML blob
    - Store generated exports alongside history entries in the volume to allow re-download.
  </action>
  <verify>go test ./vm/...</verify>
  <done>Exports and `.dive-ci` rules are generated from stored runs and can be downloaded via the API.</done>
</task>

<task type="auto">
  <name>Task 3: Add history list and export/CI gate actions in the UI</name>
  <files>ui/src/models.ts, ui/src/App.tsx, ui/src/analysis.tsx, ui/src/history.tsx, ui/src/exportdialog.tsx, ui/src/cigatedialog.tsx</files>
  <action>
    - Extend `ui/src/models.ts` with history metadata, export formats, and CI rule payload types.
    - Add `ui/src/history.tsx` to list recent runs (filter by image/tag, show status, timestamps) and allow selecting a run to view details.
    - Add `ui/src/exportdialog.tsx` for format selection (JSON/CSV/HTML) and download actions.
    - Add `ui/src/cigatedialog.tsx` for threshold inputs (efficiency, wasted bytes/percent) and `.dive-ci` preview/download.
    - Update `App.tsx` to fetch history on load and allow opening a saved run in the `Analysis` view.
    - Update `analysis.tsx` to expose Export and CI Gate actions for the current analysis or selected history item.
    - Ensure UI actions call the export and CI endpoints (`POST /history/:id/export`, `GET /history/:id/export/:format`, `POST /ci/rules`) via the extension service API.
  </action>
  <verify>npm --prefix ui run build</verify>
  <done>History list renders from backend, and export/CI gate actions are available from the analysis view.</done>
</task>

</tasks>

<verification>
- `go test ./vm/...` succeeds after backend updates.
- `npm --prefix ui run build` succeeds after UI updates.
- History list persists across UI reloads and supports selecting prior runs.
- Exports download in JSON/CSV (and HTML if implemented) and `.dive-ci` downloads as YAML.
</verification>

  <success_criteria>
- History persists to a volume-backed store and can be listed and retrieved via API.
  - Export endpoints generate JSON/CSV/HTML summary from stored Dive results.
- `.dive-ci` rules are generated from UI thresholds and download as valid YAML.
- UI surfaces history, export, and CI gate actions without disrupting existing analysis flow.
</success_criteria>

<output>
After completion, create `.planning/phases/04-history-export-ci-gates/04-01-SUMMARY.md`
</output>
