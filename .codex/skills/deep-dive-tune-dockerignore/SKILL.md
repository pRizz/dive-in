---
name: tune-dockerignore
description: "Shrink build context and avoid accidental cache invalidation from irrelevant files."
---

# Tune .dockerignore for Faster Builds

## Use this when
Build context uploads are slow or changing local files trigger unnecessary rebuilds.

## How to use
Shrink build context and avoid accidental cache invalidation from irrelevant files. Faster context transfer and fewer cache misses.

### Required inputs
1. Current Dockerfile
2. Current .dockerignore (if any)
3. Repository top-level file and folder list
4. Files that must remain available during docker build

### Steps
1. Identify files and directories that should be excluded from build context
2. Propose a .dockerignore with patterns and brief rationales
3. Highlight risky excludes that could break the build
4. Recommend Dockerfile COPY adjustments to align with ignore rules

### Constraints
1. Do not exclude files required for dependency resolution or runtime
2. Keep patterns specific enough to avoid accidental omissions
3. Explain exceptions and negation patterns when used
4. Prioritize maintainability over overly clever globbing

### Expected output
1. Section: Context waste analysis
2. Section: Proposed .dockerignore
3. Section: Required Dockerfile alignment changes
4. Section: Validation checklist
