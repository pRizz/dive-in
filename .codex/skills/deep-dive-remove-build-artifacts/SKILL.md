---
name: remove-build-artifacts
description: "Eliminate caches, temporary files, and leftovers that inflate the final image."
---

# Remove Build Artifacts and Temporary Files

## Use this when
Dive shows wasted bytes from files that are created and later removed or overwritten.

## How to use
Eliminate caches, temporary files, and leftovers that inflate the final image. Less wasted space and cleaner layers.

### Required inputs
1. Current Dockerfile (full file)
2. Largest wasted files or folders from analysis
3. Build tools and package manager in use
4. Any temporary directories currently used during build

### Steps
1. Identify where temporary files, caches, or archives are left behind
2. Rewrite RUN steps to create and clean temporary data in the same layer
3. Minimize apt, npm, pip, or apk caches in final layers
4. Call out which wasted paths should disappear after the change

### Constraints
1. Do not remove files needed at runtime
2. Keep commands readable and maintainable
3. Prefer explicit cleanup over hidden side effects
4. Retain deterministic install behavior

### Expected output
1. Section: Waste sources identified
2. Section: Updated Dockerfile
3. Section: Expected layer cleanup impact
4. Section: Post-build verification commands
