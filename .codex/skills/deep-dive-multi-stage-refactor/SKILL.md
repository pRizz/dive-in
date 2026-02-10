---
name: multi-stage-refactor
description: "Separate build and runtime responsibilities for cleaner, smaller images."
---

# Refactor into Multi-Stage Build

## Use this when
Your runtime image still includes compilers, package managers, or source files.

## How to use
Separate build and runtime responsibilities for cleaner, smaller images. Smaller runtime images and reduced attack surface.

### Required inputs
1. Current Dockerfile (full file)
2. Build command and produced artifacts
3. Runtime entrypoint/command
4. Any files required at runtime (configs, assets, certs)

### Steps
1. Design clear build and runtime stages with meaningful stage names
2. Copy only required artifacts into runtime stage
3. Ensure runtime stage excludes source code and build tooling unless needed
4. Document how each stage contributes to size and maintainability

### Constraints
1. Do not alter runtime command semantics
2. Keep artifact paths explicit and deterministic
3. Avoid introducing additional stages unless they provide real value
4. Preserve required environment variables and exposed ports

### Expected output
1. Section: Stage design summary
2. Section: Updated Dockerfile
3. Section: Artifact flow diagram (text)
4. Section: Validation checklist
