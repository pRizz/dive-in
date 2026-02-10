---
name: speed-up-deps
description: "Make dependency steps deterministic and cache-friendly across local and CI builds."
---

# Speed Up Dependency Install Layers

## Use this when
Dependency install steps dominate build time or produce inconsistent results.

## How to use
Make dependency steps deterministic and cache-friendly across local and CI builds. Faster and more predictable builds across environments.

### Required inputs
1. Current Dockerfile
2. Dependency manager and lockfile details
3. Current install commands
4. Whether private registries or auth are involved

### Steps
1. Restructure Dockerfile to copy lockfiles before source code
2. Recommend dependency install flags for deterministic installs
3. Identify when cache mounts or package mirrors are useful
4. Separate dev and production dependencies if applicable

### Constraints
1. Do not weaken dependency integrity checks
2. Preserve current dependency versions unless explicitly requested
3. Keep secrets out of image layers
4. Call out compatibility caveats for package-manager-specific flags

### Expected output
1. Section: Current bottlenecks
2. Section: Updated Dockerfile dependency flow
3. Section: Suggested install command changes
4. Section: Performance validation steps
