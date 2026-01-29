---
created: 2026-01-29T15:50
title: Fix up justfile for new extension image
area: tooling
files:
  - justfile
---

## Problem

The justfile still references the old extension image name. It should point to
the current local image tag used for development.

## Solution

Update justfile targets to use the new extension image name/tag and keep the
commands aligned with current README dev flow.
