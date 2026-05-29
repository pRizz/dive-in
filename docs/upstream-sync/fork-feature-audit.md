# Fork Feature Audit

## 2026-02-05
- Switched bundled Dive CLI to the fork at [pRizz/dive](https://github.com/pRizz/dive) (DIVE_VERSION 0.14.7).
- Updated UI, README, and extension metadata to point to the fork and note it is a fork of [wagoodman/dive](https://github.com/wagoodman/dive).

## 2026-02-07
- Updated the Dockerfile to resolve and install the latest stable [pRizz/dive](https://github.com/pRizz/dive) release at build time (instead of a pinned `DIVE_VERSION`).

## 2026-05-29
- Pinned the bundled [pRizz/dive](https://github.com/pRizz/dive) CLI to `v14.8` and added checksum verification for the selected Linux release tarball.
- Upgraded compatible repo dependencies while preserving Docker Desktop theme compatibility on React 18 and MUI 6.
- Updated Docker build bases to Go 1.26.3 on Alpine 3.23, Bun 1.3.14, and Alpine 3.23.4.
- Replaced the Docker Scout CLI `main` installer with the pinned `v1.21.0` Linux release asset and checksum verification.
- `bun audit --audit-level=low` still reports vulnerable nested `micromatch/picomatch@2.3.1` and `@actions/http-client/undici@6.23.0` copies from release tooling. The patched versions fit those packages' upstream ranges, but Bun only supports top-level overrides, and global overrides would conflict with Vite/jsdom/semantic-release consumers on newer major lines.
