---
phase: 02-reliable-analysis-runs
plan: 01
type: execute
wave: 2
depends_on: ["01-04"]
files_modified:
  - vm/main.go
  - ui/src/App.tsx
  - ui/src/models.ts
  - ui/src/utils.ts
autonomous: true
must_haves:
  truths:
    - "User can start an analysis without blocking the UI and see job status."
    - "User can select a local image by tag or digest for analysis."
    - "User can select Docker engine vs archive source for analysis."
    - "User receives clear, actionable errors when analysis fails or times out."
    - "Successful analysis returns Dive results rendered in the UI."
  artifacts:
    - path: "vm/main.go"
      provides: "Async job lifecycle, status endpoints, and analysis execution"
    - path: "ui/src/App.tsx"
      provides: "UI flow for analysis request, status, and results"
    - path: "ui/src/models.ts"
      provides: "Types for analysis jobs and status responses"
  key_links:
    - from: "ui/src/App.tsx"
      to: "vm/main.go"
      via: "HTTP calls to /analyze and /analysis/:id/*"
      pattern: "/analysis/"
    - from: "vm/main.go"
      to: "dive CLI"
      via: "exec.CommandContext with timeout + --source flag"
      pattern: "exec.CommandContext"
---
<objective>
Move analysis execution to a reliable async backend job model and wire the UI to show progress, status, and errors.

Purpose: Ensure Dive analyses are non-blocking, traceable, and resilient with clear outcomes.
Output: Backend job endpoints, UI polling flow, and status/progress/error UX.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/02-reliable-analysis-runs/02-RESEARCH.md
@vm/main.go
@ui/src/App.tsx
@ui/src/models.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add async analysis job model and status endpoints</name>
  <files>vm/main.go</files>
  <action>
    - Introduce an in-memory job store (map + mutex) with job states: queued, running, succeeded, failed.
    - Change `POST /analyze` to accept image info + source selection, create a job ID, enqueue execution in a goroutine, and return `{jobId, status}` immediately.
    - Add `GET /analysis/:id/status` to return status + optional message (including failure reasons).
    - Add `GET /analysis/:id/result` to return Dive JSON only when status is succeeded; return structured error otherwise.
    - Execute Dive with `exec.CommandContext` and a timeout; propagate timeout as a clear error (REL-02/03).
    - Support Dive `--source` for docker engine vs docker-archive; use request payload to choose `--source` and target value.
    - Replace fatal logging with non-fatal responses to keep the server alive and return actionable error payloads.
  </action>
  <verify>go test ./...</verify>
  <done>Backend exposes async job endpoints with timeout-safe execution and structured error responses.</done>
</task>

<task type="auto">
  <name>Task 2: Wire UI to backend jobs and source selection</name>
  <files>ui/src/App.tsx, ui/src/models.ts, ui/src/utils.ts</files>
  <action>
    - Add job/status/result types in `ui/src/models.ts` for the new backend responses.
    - Replace UI-side Docker CLI `run` execution with fetch calls to `POST /analyze` and polling `GET /analysis/:id/status`.
    - Confirm the image selection flow supports tags and digests, and send the selected image reference to the backend.
    - Add explicit source selection in the UI (Docker engine vs archive) and include it in analyze requests.
    - For archive source, collect a local archive path via a text input (manual entry) and validate it before enabling Analyze.
    - On status `succeeded`, fetch `GET /analysis/:id/result` and populate `analysis` state.
  </action>
  <verify>npm --prefix ui run build</verify>
  <done>UI starts analyses via backend job IDs and can retrieve results after polling status.</done>
</task>

<task type="auto">
  <name>Task 3: Add status/progress UI and error handling for reliability</name>
  <files>ui/src/App.tsx</files>
  <action>
    - Display per-image job status (queued/running/succeeded/failed) with a progress indicator while running.
    - Surface structured backend errors (including timeouts) as MUI alerts with actionable text.
    - Ensure Analyze buttons are disabled while a job is running and reset state on failure or cancellation.
    - Add a retry path that clears prior job state and allows a new analysis request.
  </action>
  <verify>npm --prefix ui run build</verify>
  <done>Users can see live job status, understand failures, and retry without reloading the UI.</done>
</task>

</tasks>

<verification>
- `go test ./...` succeeds with the updated backend API.
- `npm --prefix ui run build` succeeds with the new async UI flow.
</verification>

<success_criteria>
- UI no longer executes Dive directly; analysis runs via backend job IDs.
- Users can select Docker engine or archive sources and see progress/state.
- Failures show actionable errors, including timeouts, without crashing the backend.
</success_criteria>

<output>
After completion, create `.planning/phases/02-reliable-analysis-runs/02-01-SUMMARY.md`
</output>
