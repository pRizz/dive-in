---
name: security-and-size-balance
description: "Balance security patching and package minimization while preserving app compatibility."
---

# Minimize CVE Surface Without Breaking Runtime

## Use this when
Security scans report many vulnerabilities and you need a practical reduction strategy.

## How to use
Balance security patching and package minimization while preserving app compatibility. Fewer known vulnerabilities with controlled image size impact.

### Required inputs
1. Current Dockerfile
2. Recent vulnerability scan summary
3. Runtime dependency requirements
4. Any package pinning or compliance constraints

### Steps
1. Identify high-value Dockerfile changes that reduce vulnerable package footprint
2. Recommend base image and package update strategy with minimal churn
3. Show where package removal is safe versus risky
4. Provide a staged rollout approach for validating security and runtime behavior

### Constraints
1. Do not recommend major version upgrades without noting compatibility risks
2. Preserve runtime-required system libraries
3. Prefer reproducible package versions and update cadence guidance
4. Separate quick wins from high-risk changes

### Expected output
1. Section: Priority security findings
2. Section: Dockerfile improvements
3. Section: Expected security and size impact
4. Section: Rollout and verification plan
