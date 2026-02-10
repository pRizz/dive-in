---
name: slim-base-image
description: "Reduce image size by selecting a tighter base and cleaner package strategy."
---

# Slim Down Base Image and Packages

## Use this when
The final image is much larger than expected and includes tools not needed at runtime.

## How to use
Reduce image size by selecting a tighter base and cleaner package strategy. Smaller image downloads and faster container startup on cold nodes.

### Required inputs
1. Current Dockerfile (full file)
2. Runtime dependencies that must remain installed
3. Optional build-only dependencies
4. Current image size or target size goal

### Steps
1. Review whether the base image is oversized for runtime needs
2. Propose a leaner base image option and explain tradeoffs
3. Remove unnecessary package install steps and package manager caches
4. Keep only runtime artifacts in the final stage

### Constraints
1. Preserve application behavior and required system libraries
2. Do not remove diagnostic tooling unless alternatives are provided
3. Avoid speculative changes that are not grounded in the provided Dockerfile
4. Call out risks for Alpine or musl adoption if relevant

### Expected output
1. Section: Current size risks
2. Section: Recommended Dockerfile changes
3. Section: Before and after size estimate
4. Section: Runtime verification steps
