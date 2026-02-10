---
name: harden-runtime-image
description: "Tighten runtime security while keeping behavior and operability intact."
---

# Harden Runtime Image (Least Privilege)

## Use this when
You want stronger runtime defaults and reduced risk in production containers.

## How to use
Tighten runtime security while keeping behavior and operability intact. Lower attack surface and better baseline security posture.

### Required inputs
1. Current Dockerfile
2. Required runtime user, ports, and writable paths
3. Any runtime capabilities or privileged operations needed
4. Current deployment platform constraints

### Steps
1. Apply non-root user setup with explicit UID/GID where reasonable
2. Reduce installed packages to runtime essentials
3. Set secure file permissions for app files and entrypoints
4. Suggest additional runtime flags outside Dockerfile when relevant

### Constraints
1. Do not assume root-only runtime operations unless provided
2. Preserve health checks and startup behavior
3. Avoid introducing breaking permission changes
4. Explain each hardening tradeoff clearly

### Expected output
1. Section: Security gaps identified
2. Section: Hardened Dockerfile
3. Section: Operational tradeoffs
4. Section: Runtime validation checklist
