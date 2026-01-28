# Stack Research

**Domain:** Docker Desktop extension (image analysis with Dive)
**Researched:** 2026-01-28
**Confidence:** MEDIUM

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Docker Desktop Extensions SDK / CLI | API version from `docker extension version` (set label constraint) | Build, validate, and install the extension image | Required for Docker Desktop extensions; the API version label is mandated and should track the installed SDK API version (Confidence: HIGH). |
| Docker Desktop Extension API label (`com.docker.desktop.extension.api.version`) | `>= <SDK_API_VERSION>` | Compatibility gate for extension images | Docker Desktop uses this label to determine compatibility; Docker docs explicitly require it (Confidence: HIGH). |
| React | 19.2.4 | UI framework for extension frontend | Current stable React major used widely and supported by MUI (Confidence: HIGH). |
| React DOM | 19.2.4 | DOM renderer for React UI | Matches React 19.2.4 for consistency and runtime stability (Confidence: HIGH). |
| Vite | 7.3.1 | Frontend build tool/dev server | Fast dev loop and current supported Vite line; version verified via npm registry (Confidence: HIGH). |
| Material UI (MUI) | 7.3.7 | UI component library | MUI is the most common React UI framework and supports React 19; version verified via npm registry (Confidence: HIGH). |
| Go | 1.25.6 | Backend service in extension VM | Latest supported Go release with security fixes; reduces CVE risk (Confidence: HIGH). |
| Dive CLI | 0.13.1 | Image analysis engine | Latest Dive release; keep aligned to new flags and fixes (Confidence: HIGH). |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @emotion/react | 11.14.0 | MUI styling engine runtime | Required by MUI’s default styling engine (Confidence: HIGH). |
| @emotion/styled | 11.14.1 | MUI styled API | Required by MUI for `styled()` usage (Confidence: HIGH). |
| @types/react | 19.2.10 | TypeScript types for React | Needed for TS projects with React 19 (Confidence: HIGH). |
| @types/react-dom | 19.2.3 | TypeScript types for React DOM | Needed for TS projects with React 19 (Confidence: HIGH). |
| @docker/extension-test-helper | 0.1.2 | E2E UI test helpers for extensions | Use only if adding CI UI tests with Docker Desktop + Puppeteer (Confidence: MEDIUM). |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| just | 1.46.0 | Task runner to replace Makefile | Stable cross-platform task runner; keep recipes simple for DX. |
| semantic-release | 25.0.2 | Automated semver releases | Requires conventional commits; useful for publish automation. |
| @changesets/cli | 2.29.8 | Human-authored change tracking | Use with semantic-release if you want explicit version intent per change. |
| docker/desktop-action | start@v0.1.0 | Start Docker Desktop in CI | Experimental and macOS-only per Docker docs; use for optional E2E UI checks. |

## Installation

```bash
# Core (frontend)
npm install react@19.2.4 react-dom@19.2.4 @mui/material@7.3.7 @emotion/react@11.14.0 @emotion/styled@11.14.1

# Supporting (types)
npm install -D typescript@5.9.3 @types/react@19.2.10 @types/react-dom@19.2.3 vite@7.3.1

# Dev dependencies (release + workflow)
npm install -D semantic-release@25.0.2 @changesets/cli@2.29.8
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| MUI (Emotion) | MUI + styled-components | Use if the team is standardized on styled-components; requires MUI’s styled-components integration. |
| Docker Desktop Action + @docker/extension-test-helper | Local-only UI tests | Use if CI cannot run macOS runners; keep E2E tests manual. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Vite pre-releases (alpha/beta) | Vite docs state pre-releases are unstable and can include breaking changes | Vite stable 7.3.1 |
| Material UI via CDN | MUI docs warn CDN is not recommended for production | Bundle MUI via npm + Vite |
| Extension image missing required labels | Docker Desktop considers the extension invalid without required labels | Follow Docker’s required label list and use `com.docker.desktop.extension.api.version` constraint |

## Stack Patterns by Variant

**If you need automated UI validation in CI:**
- Use Docker Desktop Action (`docker/desktop-action/start@v0.1.0`) + `@docker/extension-test-helper@0.1.2`
- Because Docker Desktop needs to run to install and validate extensions, and the SDK provides Puppeteer helpers

**If you only need build verification (no UI tests):**
- Use Docker build on Linux runners with `docker buildx`
- Because Docker Desktop is not required to build the extension image

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| @mui/material@7.3.7 | react@^17 || ^18 || ^19 | MUI peer dependency range includes React 19. |
| @mui/material@7.3.7 | @emotion/react@^11.5, @emotion/styled@^11.3 | MUI peer dependencies require Emotion 11.x. |
| react-dom@19.2.4 | react@19.2.4 | Match React and React DOM versions to avoid runtime mismatch. |

## Sources

- https://docs.docker.com/extensions/extensions-sdk/ — SDK overview and packaging rules
- https://docs.docker.com/extensions/extensions-sdk/quickstart/ — React + Go template and build steps
- https://docs.docker.com/extensions/extensions-sdk/extensions/labels/ — Required image labels and API version guidance
- https://docs.docker.com/extensions/extensions-sdk/architecture/metadata/ — `metadata.json` requirements
- https://docs.docker.com/extensions/extensions-sdk/dev/continuous-integration/ — Docker Desktop Action and test helper (experimental)
- https://react.dev/versions — React 19 current major
- https://registry.npmjs.org/react/latest — React 19.2.4
- https://registry.npmjs.org/react-dom/latest — React DOM 19.2.4
- https://vite.dev/releases — Vite release policy and pre-release guidance
- https://registry.npmjs.org/vite/latest — Vite 7.3.1
- https://mui.com/material-ui/getting-started/installation/ — MUI installation and peer dependencies
- https://registry.npmjs.org/@mui/material/latest — MUI 7.3.7
- https://registry.npmjs.org/@emotion/react/latest — Emotion 11.14.0
- https://registry.npmjs.org/@emotion/styled/latest — Emotion 11.14.1
- https://registry.npmjs.org/@types/react/latest — @types/react 19.2.10
- https://registry.npmjs.org/@types/react-dom/latest — @types/react-dom 19.2.3
- https://registry.npmjs.org/typescript/latest — TypeScript 5.9.3
- https://go.dev/doc/devel/release — Go 1.25.6 release history
- https://github.com/wagoodman/dive/releases/latest — Dive 0.13.1
- https://github.com/casey/just/releases/latest — just 1.46.0
- https://registry.npmjs.org/semantic-release/latest — semantic-release 25.0.2
- https://registry.npmjs.org/@changesets/cli/latest — changesets 2.29.8
- https://registry.npmjs.org/@docker/extension-test-helper/latest — extension-test-helper 0.1.2

---
*Stack research for: Docker Desktop extension (image analysis with Dive)*
*Researched: 2026-01-28*
