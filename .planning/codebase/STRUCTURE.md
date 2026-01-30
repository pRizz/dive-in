# Codebase Structure

**Analysis Date:** 2026-01-28

## Directory Layout

```
deep-dive/
├── ui/                 # React UI for Docker Desktop extension
├── vm/                 # Go VM service for extension backend
├── screenshots/        # Marketing screenshots referenced in README/Dockerfile
├── .planning/          # Planning artifacts
├── Dockerfile          # Extension image build
├── docker-compose.yaml # Extension VM wiring
├── metadata.json       # Extension metadata and UI/VM config
├── README.md           # Project overview and dev notes
└── Makefile            # Build/install helper targets
```

## Directory Purposes

**ui/:**
- Purpose: React-based extension UI
- Contains: App entry, components, models, utilities
- Key files: `ui/src/index.tsx`, `ui/src/App.tsx`, `ui/src/analysis.tsx`

**vm/:**
- Purpose: Backend service running inside extension VM
- Contains: Single Go entrypoint and module files
- Key files: `vm/main.go`, `vm/go.mod`

**screenshots/:**
- Purpose: Extension screenshots referenced by README and Docker labels
- Contains: `screenshots/1.png`, `screenshots/2.png`

**.planning/:**
- Purpose: Codebase mapping outputs
- Contains: `.planning/codebase/`

## Key File Locations

**Entry Points:**
- `ui/src/index.tsx`: React root render
- `vm/main.go`: Go server entrypoint

**Configuration:**
- `metadata.json`: Extension wiring for UI and VM socket
- `docker-compose.yaml`: VM service definition
- `ui/tsconfig.json`: TypeScript compiler configuration
- `ui/.env`: UI environment overrides (if used)

**Core Logic:**
- `ui/src/App.tsx`: Main UI behavior and Docker CLI calls
- `ui/src/analysis.tsx`: Results view for analysis
- `vm/main.go`: API endpoints and dive execution

**Testing:**
- Not detected in repo (no `*.test.*` or `*.spec.*` files)

## Naming Conventions

**Files:**
- React components in `ui/src/` use lowercase filenames: `analysis.tsx`, `imagetable.tsx`
- Utilities and models use descriptive lowercase: `utils.ts`, `models.ts`

**Directories:**
- Top-level feature areas are short and descriptive: `ui/`, `vm/`

## Where to Add New Code

**New Feature:**
- Primary UI code: `ui/src/`
- Backend endpoints: `vm/main.go` (single-file service)

**New Component/Module:**
- Implementation: `ui/src/<component>.tsx`

**Utilities:**
- Shared helpers: `ui/src/utils.ts`
- Type definitions: `ui/src/models.ts`

## Special Directories

**.planning/:**
- Purpose: Planning and mapping documents
- Generated: Yes
- Committed: Yes

---

*Structure analysis: 2026-01-28*
