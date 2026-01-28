# Codebase Concerns

**Analysis Date:** 2026-01-28

## Tech Debt

**On-disk analysis cache with no eviction:**
- Issue: JSON results are written per image ID and never cleaned up
- Files: `vm/main.go`
- Impact: Disk usage grows over time and can fill extension storage
- Fix approach: Store under a dedicated cache dir with TTL or cleanup on startup

**Fatal logging inside request flow:**
- Issue: `c.Logger().Fatal` exits the server on a single request failure
- Files: `vm/main.go`
- Impact: One bad analyze request brings down the backend
- Fix approach: Return errors to the client without terminating the process

## Known Bugs

**Unhandled CLI/JSON parse failures:**
- Symptoms: UI throws when CLI output is non-JSON or command fails
- Files: `ui/src/App.tsx`
- Trigger: `docker cli exec` returns error or non-JSON stdout
- Workaround: None in UI; add try/catch and error display

## Security Considerations

**Path traversal via image ID file name:**
- Risk: `Image.ID` is used to build a filename without sanitization
- Files: `vm/main.go`
- Current mitigation: None
- Recommendations: Validate/normalize IDs and write only within a safe directory

**Unsafe socket path deletion:**
- Risk: `os.RemoveAll` on a flag-controlled path can delete arbitrary paths
- Files: `vm/main.go`
- Current mitigation: None
- Recommendations: Validate path prefix and use `os.Remove` for the socket

## Performance Bottlenecks

**No timeout on `dive` execution:**
- Problem: Analysis can hang indefinitely on large images
- Files: `vm/main.go`
- Cause: `exec.Command` without context/timeout
- Improvement path: Use `exec.CommandContext` with timeout and cancellation

**No caching on UI-triggered CLI run:**
- Problem: Repeated analyses always re-run `docker run`
- Files: `ui/src/App.tsx`
- Cause: No reuse of previous results on the UI side
- Improvement path: Add in-app cache keyed by image ID or reuse backend cache

## Fragile Areas

**Hard dependency on Docker Desktop runtime:**
- Files: `ui/src/App.tsx`
- Why fragile: `createDockerDesktopClient()` fails outside Docker Desktop
- Safe modification: Keep extension-only assumptions documented and guarded
- Test coverage: None for runtime availability handling

## Scaling Limits

**Per-image result files grow unbounded:**
- Current capacity: Limited by extension storage size
- Limit: Large or frequent analyses can fill disk
- Scaling path: Add size limits, TTL cleanup, or streaming responses

## Dependencies at Risk

**Deprecated Echo v3 dependency:**
- Risk: `github.com/labstack/echo v3.3.10+incompatible` is end-of-life
- Impact: Security patches and fixes are unavailable
- Migration plan: Upgrade to Echo v4 and update API usage
- Files: `vm/go.mod`

## Missing Critical Features

**Input validation for analyze requests:**
- Problem: `Image.Name`/`Image.ID` are trusted without validation
- Blocks: Safe handling of malformed or malicious requests
- Files: `vm/main.go`

## Test Coverage Gaps

**No automated tests detected:**
- What's not tested: UI rendering, CLI error handling, backend request handling
- Files: `ui/src/*`, `vm/main.go`
- Risk: Regressions in analysis flow go unnoticed
- Priority: High

---

*Concerns audit: 2026-01-28*
