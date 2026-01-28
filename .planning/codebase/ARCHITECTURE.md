# Architecture

**Analysis Date:** 2026-01-28

## Pattern Overview

**Overall:** Docker Desktop extension with a React UI and a Go service exposed over a Unix socket.

**Key Characteristics:**
- React SPA renders the extension UI and calls Docker Desktop APIs in `ui/src/App.tsx`
- Go HTTP service (Echo) exposes endpoints over a Unix domain socket in `vm/main.go`
- Extension metadata wires UI + VM socket in `metadata.json`

## Layers

**UI Presentation:**
- Purpose: Render extension UI and present analysis results
- Location: `ui/src/`
- Contains: React components, MUI UI, view state
- Depends on: Docker Desktop extension API client, MUI
- Used by: `ui/src/index.tsx`

**UI Models/Utilities:**
- Purpose: Typed data models and formatting helpers
- Location: `ui/src/models.ts`, `ui/src/utils.ts`
- Contains: TypeScript interfaces and pure helpers
- Depends on: None
- Used by: UI components such as `ui/src/App.tsx`, `ui/src/analysis.tsx`

**VM Service:**
- Purpose: Run dive CLI and return JSON results over HTTP
- Location: `vm/main.go`
- Contains: Echo server, endpoints, CLI execution, JSON response
- Depends on: `github.com/labstack/echo`, OS/exec, filesystem
- Used by: Docker Desktop extension socket defined in `metadata.json`

**Extension Packaging:**
- Purpose: Build and package UI + VM into a Docker extension image
- Location: `Dockerfile`, `docker-compose.yaml`, `metadata.json`
- Contains: Multi-stage build, extension labels, socket wiring
- Depends on: Go toolchain, Node toolchain
- Used by: Docker Desktop extension runtime

## Data Flow

**Image Analysis (UI-driven):**
1. UI lists Docker images via Docker Desktop API in `ui/src/App.tsx`
2. UI runs `docker cli exec run` for the `prakhar1989/dive` image in `ui/src/App.tsx`
3. UI parses JSON results and renders tables/cards in `ui/src/analysis.tsx`

**Image Analysis (VM service endpoint):**
1. Client POSTs image payload to `/analyze` in `vm/main.go`
2. Service runs `dive` CLI and writes JSON to a local file in `vm/main.go`
3. Service returns JSON response from the file in `vm/main.go`

**State Management:**
- Local component state with `useState` and lifecycle with `useEffect` in `ui/src/App.tsx`

## Key Abstractions

**Dive Result Models:**
- Purpose: Describe dive JSON response shape and UI inputs
- Examples: `ui/src/models.ts`
- Pattern: TypeScript interface definitions

**Tables as Components:**
- Purpose: Render structured results in MUI tables
- Examples: `ui/src/imagetable.tsx`, `ui/src/layerstable.tsx`
- Pattern: Small, prop-driven functional components

## Entry Points

**UI Entry:**
- Location: `ui/src/index.tsx`
- Triggers: Browser render within Docker Desktop extension
- Responsibilities: Theme provider setup and root render

**VM Entry:**
- Location: `vm/main.go`
- Triggers: Container `CMD /service -socket ...` in `Dockerfile`
- Responsibilities: Start Echo server and bind to Unix socket

## Error Handling

**Strategy:** Direct error returns or fatal logging.

**Patterns:**
- HTTP handlers return errors directly in `vm/main.go`
- Fatal logging on startup/exec failures in `vm/main.go`
- No explicit try/catch in UI async flows in `ui/src/App.tsx`

## Cross-Cutting Concerns

**Logging:** Console logging in `ui/src/App.tsx`, log/logrus in `vm/main.go`
**Validation:** Minimal request binding validation in `vm/main.go`
**Authentication:** None detected in `ui/src/*` or `vm/main.go`

---

*Architecture analysis: 2026-01-28*
