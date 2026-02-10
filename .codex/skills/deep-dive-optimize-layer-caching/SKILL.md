---
name: optimize-layer-caching
description: "Reorder steps so small code changes do not force full rebuilds."
---

# Optimize Dockerfile Layer Caching

## Use this when
Your builds rerun dependency install or compile steps on almost every change.

## How to use
Reorder steps so small code changes do not force full rebuilds. Faster repeat builds and less wasted CI time.

### Required inputs
1. Current Dockerfile (full file)
2. Project type and package manager
3. Typical files changed between builds
4. Current build command and runtime command

### Steps
1. Identify cache-busting instructions and explain why they invalidate too much
2. Propose a reordered Dockerfile that moves stable steps earlier and volatile steps later
3. Split dependency metadata copy from application source copy when possible
4. Add a short explanation of cache behavior per changed block

### Constraints
1. Do not change application runtime behavior
2. Keep base image family unless a clear reason is provided
3. Prefer deterministic installs and pinned dependency resolution files
4. Explain every instruction you add, remove, or reorder

### Expected output
1. Section: Issues found
2. Section: Updated Dockerfile
3. Section: Why this improves caching
4. Section: Validation checklist
