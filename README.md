# Deep Dive

A Docker extension that helps you explore a docker image, layer contents, and discover ways to shrink the size of your Docker/OCI image.

Quick install:
```
docker extension install prizz/deep-dive:latest
```

Built on the top of excellent CLI tool - https://github.com/wagoodman/dive

Based on the original extension by Prakhar Srivastav:
https://github.com/prakhar1989/dive-in

## Highlights

- Analysis and History are split into dedicated tabs.
- Image list includes filtering, sorting, refresh, and metadata chips.
- History supports compare, export, and delete actions.
- CI gate rules can be generated for `.dive-ci`.

![List of images](screenshots/1.png)
![Analysis results](screenshots/2.png)
![History](screenshots/3.png)

## Installation

Make sure your Docker desktop supports extensions. This extension can be installed
from [Docker Hub](https://hub.docker.com/extensions/prizz/deep-dive) or in
Docker Desktop.

Publishing guide: see `PUBLISHING.md`.

## Development

Go through [the official docs](https://docs.docker.com/desktop/extensions-sdk/quickstart/) to understand the basic setting up of the Docker extension.

### Prerequisites

- **Docker Desktop 4.10.0+** (extensions must be enabled)
- **Node.js 20+** (matches package.json engines)
- **Go 1.19+** (matches vm/go.mod)
- **Note:** Dive CLI is bundled in the extension VM and not required locally

### Fast dev loop (primary workflow)

For rapid UI iteration with hot-reload:

1. Start the UI dev server: `just ui-dev` (runs Vite on http://localhost:5173)
2. In another terminal, connect Docker Desktop to the dev server:
   ```bash
   docker extension dev ui-source deep-dive:dev http://localhost:5173
   ```
3. Optional: Enable debug mode:
   ```bash
   docker extension dev debug deep-dive:dev
   ```

This workflow allows hot-reload of UI changes without rebuilding the extension image.

### Initial setup

1. Install UI dependencies: `npm --prefix ui install`
2. Build and install the local extension: `just install-development-extension`
   - This builds the image as `deep-dive:dev` and installs it in Docker Desktop

### Updating local extension

After making code changes, rebuild and update:

- **Recommended:** `just reinstall-development-extension`
- **Manual:** `just docker-build` then `docker extension update deep-dive:dev --force`

### Troubleshooting

- **Extension appears stale:** Run `just reinstall-development-extension` to clear caches
- **Docker-archive analyses:** Use full absolute paths (Docker Desktop requirement)
- **UI changes don't appear:** Ensure the dev server is running (`just ui-dev`) and `docker extension dev ui-source` is active
