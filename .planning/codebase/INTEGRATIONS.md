# External Integrations

**Analysis Date:** 2026-01-28

## APIs & External Services

**Docker Desktop Extension Host:**
- Docker Desktop Extension API - UI calls host Docker API via `@docker/extension-api-client` in `ui/src/App.tsx`
  - SDK/Client: `@docker/extension-api-client` in `ui/package.json`
  - Auth: Managed by Docker Desktop (no explicit tokens in repo)

**Docker Engine / CLI:**
- Docker CLI via extension API - `ddClient.docker.cli.exec(...)` in `ui/src/App.tsx`
  - SDK/Client: Docker Desktop client in `ui/src/App.tsx`
  - Auth: Docker Desktop session (no explicit creds in repo)

**Dive CLI (image analysis):**
- `dive` CLI for image inspection - invoked by backend in `vm/main.go` and by UI via Docker CLI in `ui/src/App.tsx`
  - SDK/Client: external CLI binary/image (referenced in `README.md`)
  - Auth: none

## Data Storage

**Databases:**
- None detected (no DB config in `vm/main.go` or `ui/package.json`)

**File Storage:**
- Local filesystem JSON output in backend (`*.json` in `vm/main.go`)

**Caching:**
- None detected

## Authentication & Identity

**Auth Provider:**
- None detected (no auth middleware in `vm/main.go`)

## Monitoring & Observability

**Error Tracking:**
- None detected

**Logs:**
- Go standard log + logrus in `vm/main.go`

## CI/CD & Deployment

**Hosting:**
- Docker Desktop extension image built via `Dockerfile`

**CI Pipeline:**
- Not detected

## Environment Configuration

**Required env vars:**
- `DESKTOP_PLUGIN_IMAGE` used by `docker-compose.yaml`
- `BROWSER` in `ui/.env` (UI dev behavior)

**Secrets location:**
- Not detected

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- None detected

---

*Integration audit: 2026-01-28*
