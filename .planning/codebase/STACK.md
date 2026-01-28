# Technology Stack

**Analysis Date:** 2026-01-28

## Languages

**Primary:**
- TypeScript/JavaScript - React UI in `ui/src/` with config in `ui/tsconfig.json`
- Go 1.19 - Backend service in `vm/main.go` (version in `vm/go.mod`)

**Secondary:**
- Shell/Dockerfile - Build/runtime orchestration in `Dockerfile`

## Runtime

**Environment:**
- Go 1.19 build runtime in `Dockerfile`
- Node.js 18.9 (build stage) in `Dockerfile`

**Package Manager:**
- npm - `ui/package.json`
- Go modules - `vm/go.mod`
- Lockfile: present (`ui/package-lock.json`, `vm/go.sum`)

## Frameworks

**Core:**
- React 17 (`react`, `react-dom`) - UI in `ui/package.json`
- Docker Desktop Extension API Client 0.3.0 - UI host integration in `ui/package.json`
- Echo v3.3.10 - HTTP server in `vm/go.mod`

**Testing:**
- Jest (via `react-scripts test`) - `ui/package.json`

**Build/Dev:**
- React Scripts 5.0.1 - UI build/dev in `ui/package.json`
- Docker build - `Dockerfile`
- Extension packaging - `Makefile`

## Key Dependencies

**Critical:**
- `@docker/extension-api-client` 0.3.0 - Docker Desktop host API access in `ui/package.json`
- `@docker/docker-mui-theme` <0.1.0 - Docker Desktop UI theming in `ui/package.json`
- `@mui/material` 5.6.1 - UI component library in `ui/package.json`
- `github.com/labstack/echo` v3.3.10 - Backend HTTP routing in `vm/go.mod`

**Infrastructure:**
- `github.com/sirupsen/logrus` v1.9.0 - Backend logging in `vm/go.mod`

## Configuration

**Environment:**
- UI env file in `ui/.env` (BROWSER)
- Extension metadata in `metadata.json`

**Build:**
- Docker build config in `Dockerfile`
- Extension runtime wiring in `docker-compose.yaml`
- TypeScript config in `ui/tsconfig.json`

## Platform Requirements

**Development:**
- Docker Desktop Extensions SDK workflow (documented in `README.md`)
- Docker CLI/buildx for packaging in `Makefile`

**Production:**
- Docker Desktop extension image built from `Dockerfile`

---

*Stack analysis: 2026-01-28*
