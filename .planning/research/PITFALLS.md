# Pitfalls Research

**Domain:** Docker Desktop extensions (image analysis via Dive)
**Researched:** 2026-01-28
**Confidence:** MEDIUM

## Critical Pitfalls

### Pitfall 1: Treating the UI as a long-lived process

**What goes wrong:**
Long-running analysis is started in the UI, but Docker Desktop destroys the UI whenever users leave the extension tab, so analysis stalls or loses state.

**Why it happens:**
It is easy to assume the frontend behaves like a normal SPA; in extensions, the UI is re-initialized each time it is opened.

**How to avoid:**
Move long-running Dive analysis, caching, and state into the backend service; keep UI stateless and poll/stream results from the backend.

**Warning signs:**
Analysis results disappear when switching tabs; background tasks restart from scratch; users report "lost progress."

**Phase to address:**
Backend hardening and state management phase (early, before UI refactors).

---

### Pitfall 2: Using host socket paths or ports incorrectly

**What goes wrong:**
Backend fails to talk to Docker Engine due to permission errors or port collisions; works on one machine but not others.

**Why it happens:**
Extensions run inside the Desktop VM; mounting `/var/run/docker.sock` from the host or exposing HTTP ports bypasses the intended socket/named-pipe transport.

**How to avoid:**
Mount `/var/run/docker.sock.raw` inside the backend container and communicate from the UI via the Extensions SDK socket APIs.

**Warning signs:**
"permission denied" on Docker socket; random conflicts on port usage; failures in constrained environments.

**Phase to address:**
Backend hardening and Docker API integration phase.

---

### Pitfall 3: Shipping host executables without cross-platform support

**What goes wrong:**
Extension installs but Dive (or helper binaries) fail on one OS/arch; marketplace reviews fail; users on ARM Macs or Windows can't run analysis.

**Why it happens:**
Host executables must be provided per OS/arch; extensions can invoke any host binaries, and missing variants are common during upgrades.

**How to avoid:**
Package platform-specific binaries for macOS (amd64/arm64), Windows, and Linux; enforce checks in CI for each platform artifact.

**Warning signs:**
Works on developer laptop only; "file not found" or "exec format error" on other platforms.

**Phase to address:**
Release packaging and CI phase (before semantic-release/changesets rollout).

---

### Pitfall 4: Underestimating extension security scope

**What goes wrong:**
Security review fails or users distrust the extension because it can run arbitrary commands with user permissions.

**Why it happens:**
Extensions execute with the same permissions as the Docker Desktop user and can run commands beyond the listed host binaries.

**How to avoid:**
Treat the extension as fully trusted code: minimize host binary usage, document permissions, and harden backend surfaces (input validation, least-privileged operations).

**Warning signs:**
Broad "runs arbitrary commands" behavior in audit; unclear permissions in README; no threat model for Docker socket usage.

**Phase to address:**
Security and hardening phase (before publishing or internal rollout).

---

### Pitfall 5: CI assumes Linux runners for Docker Desktop tests

**What goes wrong:**
CI pipelines fail or silently skip extension E2E validation because Docker Desktop Action only supports macOS runners.

**Why it happens:**
Docker Desktop tests require a Desktop environment; the official CI tools are experimental and macOS-only.

**How to avoid:**
Use `macOS-latest` for extension E2E tests; keep unit tests separate for Linux; document CI constraints.

**Warning signs:**
CI green on Linux but extension fails to install in Desktop; flaky UI tests due to missing Desktop environment.

**Phase to address:**
CI and release automation phase.

---

### Pitfall 6: Dive version upgrades break image analysis unexpectedly

**What goes wrong:**
After upgrading Dive, analysis fails on certain images or registries (e.g., schema 1 deprecation, Docker 25+ compatibility).

**Why it happens:**
Dive evolves with Docker/OCI changes; breaking behavior can appear between versions, and older registry formats are deprecated.

**How to avoid:**
Pin Dive versions, run regression tests on local images and common registries, and validate against Docker Desktop versions in CI.

**Warning signs:**
"cannot fetch image" errors; unexpected remote pulls for local images; failures only after Docker upgrades.

**Phase to address:**
Dive integration upgrade phase (paired with regression tests).

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Keep analysis logic in the UI | Faster refactor | State loss on tab switch; brittle UX | Never |
| Avoid multi-arch packaging | Faster build setup | Broken installs for ARM/Windows users | MVP only if audience is tightly scoped |
| Skip backend hardening | Faster ship | Security and stability regressions | Never |
| Treat CI as "build only" | Quicker pipelines | Undetected install/run failures | Only for early spikes |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Docker Engine API | Mount `/var/run/docker.sock` from host | Use `/var/run/docker.sock.raw` inside Desktop VM |
| Extension backend | Expose HTTP port for UI | Use SDK socket API for UI-backend comms |
| Extension backend | Multiple services, assuming UI can reach any | SDK only reaches the first service in Compose |
| Dive CLI | Assume older registry formats still work | Validate OCI / schema2; avoid deprecated formats |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Re-running Dive per UI render | UI jank, duplicated analysis | Cache results by image digest in backend | Large images; repeated navigation |
| Running Dive in UI thread | UI freeze, reload cancels analysis | Run analysis in backend worker | Any image with many layers |
| Pulling images during analysis | Slow analysis, unexpected network | Prefer local image ID; show explicit pull option | Offline or air-gapped setups |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Trusting unreviewed extension binaries | Full user-level access abuse | Treat extension as privileged; audit binaries and dependencies |
| Overbroad Docker socket usage | Container control, filesystem access | Gate operations; validate inputs; avoid arbitrary command execution |
| Shipping host binaries without explicit disclosure | Security review failure | Document host binaries and permissions in README |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No persistence across tab switches | "Lost work" perception | Show resumable analysis and cached results |
| Errors lack actionable guidance | Users blame Docker Desktop | Provide next steps (pull image, check permissions, retry) |
| Implicit network pulls | Unexpected delays or failures | Explicit prompt before pull |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Docker socket integration:** Uses `.raw` socket and works in Desktop VM
- [ ] **Backend tests:** E2E tests run on macOS with Docker Desktop Action
- [ ] **Multi-arch support:** Host binaries packaged for macOS/Windows/Linux
- [ ] **Dive upgrade:** Regression tested on local images and common registries

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| UI-based analysis breaks on tab switch | MEDIUM | Move analysis to backend; add cache; ship patch |
| Wrong Docker socket mounted | LOW | Update compose/metadata; rebuild extension |
| Platform binary missing | MEDIUM | Add OS/arch builds; release hotfix |
| Dive upgrade regression | MEDIUM/HIGH | Pin known-good version; add regression suite; re-release |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| UI state loss on tab switch | Backend hardening + state phase | Switch tabs mid-analysis and resume |
| Wrong Docker socket mount | Backend integration phase | Run analysis using engine socket in Desktop VM |
| Missing multi-arch binaries | Packaging + CI phase | Install extension on macOS ARM + Windows |
| Extension security scope underestimated | Security hardening phase | Threat model + dependency audit |
| CI assumes Linux runners | CI automation phase | E2E tests on macOS-latest pass |
| Dive upgrade regressions | Dive integration phase | Run regression suite on local images |

## Sources

- https://docs.docker.com/extensions/extensions-sdk/architecture/security/
- https://docs.docker.com/extensions/extensions-sdk/architecture/
- https://docs.docker.com/extensions/extensions-sdk/guides/use-docker-socket-from-backend
- https://docs.docker.com/extensions/extensions-sdk/dev/continuous-integration/
- https://github.com/wagoodman/dive/releases
- https://github.com/wagoodman/dive/issues/541

---
*Pitfalls research for: Docker Desktop extensions (Dive image analysis)*
*Researched: 2026-01-28*
