# Feature Research

**Domain:** Docker Desktop image analysis extension (Dive)
**Researched:** 2026-01-28
**Confidence:** MEDIUM

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Analyze local images by tag/digest | Core purpose of image analysis | MEDIUM | Needs image picker, validation, and backend job orchestration. |
| Layer-by-layer file tree with change markers | Dive’s core value is per-layer inspection | MEDIUM | Show added/modified/removed indicators and allow browsing layer contents. |
| Image efficiency/wasted-space metrics | Dive reports efficiency and wasted bytes | LOW | Surface dive’s efficiency score and wasted bytes prominently. |
| Multi-source image support (engine, archive) | Users often analyze built artifacts | MEDIUM | Dive supports docker engine and docker-archive; surface source choice. |
| Responsive Docker Desktop-native UI | Marketplace UX expectation | MEDIUM | Use Docker MUI theme, light/dark support, no embedded terminal UI. |
| Robust job status + error handling | Extensions UI resets on navigation | MEDIUM | Backend should persist state and report progress over socket. |
| Basic help/usage and links | Onboarding expected in extensions | LOW | Include in-app help and links to Dive docs and shortcuts. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| CI-ready efficiency gates | Helps teams enforce image size budgets | MEDIUM | Wrap Dive CI rules and expose thresholds UI; export to `.dive-ci`. |
| Saved analysis history per image/tag | Faster regression detection | MEDIUM | Store reports in backend volume; show deltas across runs. |
| Compare two images/tags | Pinpoint regressions between releases | HIGH | Needs diff view of layer/file changes and metric deltas. |
| Export/share analysis report | Improves collaboration | MEDIUM | Export JSON/HTML and copy summary for PR comments. |
| Optional Scout handoff | Adds security context beyond size | HIGH | Deep link or optional integration with Docker Scout results. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Embedded terminal for Dive | Feels “authentic” for CLI users | Conflicts with Docker UX guidance; poor onboarding | Build native UI with clear calls to action. |
| Auto-uploading images to third parties | “Better analysis” in the cloud | Privacy/IP risk and trust barriers | Keep analysis local; explicit opt-in for uploads. |
| Arbitrary host executables | “Let me run any tooling” | High security risk; extension runs with user perms | Restrict to bundled, audited binaries. |
| Always-on background scanning | “Continuous insights” | Resource drain; unexpected behavior in Desktop | On-demand scans with user-triggered schedules. |

## Feature Dependencies

```
[Image selection]
    └──requires──> [Analysis run + backend job orchestration]
                       └──requires──> [Dive CLI integration]

[Layer view UI] ──requires──> [Analysis results parsing]

[Saved history] ──requires──> [Backend storage volume]

[Compare images] ──requires──> [Saved history]

[CI gates + .dive-ci export] ──requires──> [Efficiency metrics]

[Scout handoff] ──requires──> [Docker account auth]
```

### Dependency Notes

- **Image selection requires analysis run + backend job orchestration:** UI restarts on navigation; backend must hold state and run Dive.  
- **Layer view UI requires analysis results parsing:** Dive output must be structured for UI rendering.  
- **Saved history requires backend storage volume:** Persistence needed across sessions.  
- **Compare images requires saved history:** Baseline reports are needed for diffs.  
- **CI gates + .dive-ci export requires efficiency metrics:** Thresholds map to Dive’s CI rules.  
- **Scout handoff requires Docker account auth:** Scout features depend on Docker login and enablement.  

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the concept.

- [ ] Analyze local images by tag/digest — core task for Dive users
- [ ] Layer-by-layer file tree + change markers — primary insight
- [ ] Efficiency/wasted-space metrics — decision support
- [ ] Docker Desktop-native UI (light/dark, no terminal) — marketplace readiness
- [ ] Robust job status + error reporting — prevents UX dead ends

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] CI-ready efficiency gates — when teams want to enforce budgets
- [ ] Saved analysis history — when users review regressions
- [ ] Export/share report — when collaboration needs arise

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Compare two images/tags — higher complexity, big UX payoff
- [ ] Scout handoff/integration — depends on auth, licensing, and scope

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Analyze local images | HIGH | MEDIUM | P1 |
| Layer-by-layer view | HIGH | MEDIUM | P1 |
| Efficiency metrics | HIGH | LOW | P1 |
| Docker-native UI | HIGH | MEDIUM | P1 |
| Job status + error handling | HIGH | MEDIUM | P1 |
| CI gates + .dive-ci export | MEDIUM | MEDIUM | P2 |
| Saved history | MEDIUM | MEDIUM | P2 |
| Export/share report | MEDIUM | MEDIUM | P2 |
| Compare images | HIGH | HIGH | P3 |
| Scout handoff | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Docker Scout | Other image scanners (e.g., Trivy) | Our Approach |
|---------|--------------|-------------------------------------|--------------|
| Vulnerability findings | Strong focus | Strong focus | Out of scope; link/hand-off only |
| SBOM inventory | Strong focus | Varies | Out of scope; link/hand-off only |
| Layer content exploration | Limited | Limited | Core (Dive UI) |
| Image efficiency/waste | Limited | Limited | Core (Dive metrics) |
| CI gating | Policy-based | Policy-based | Dive CI thresholds for size/efficiency |

## Sources

- https://docs.docker.com/extensions/extensions-sdk/design/design-guidelines/
- https://docs.docker.com/extensions/extensions-sdk/design/
- https://docs.docker.com/extensions/extensions-sdk/architecture/
- https://docs.docker.com/extensions/extensions-sdk/architecture/security/
- https://docs.docker.com/extensions/marketplace/
- https://github.com/wagoodman/dive
- https://docs.docker.com/scout/
- https://docs.docker.com/scout/quickstart/

---
*Feature research for: Docker Desktop image analysis extension (Dive)*
*Researched: 2026-01-28*
