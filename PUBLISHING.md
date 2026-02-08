## Publishing a Docker Desktop Extension

To publish a new Docker Desktop extension, ship it as a Docker image with the
right labels and `metadata.json`, push it to a registry (usually Docker Hub),
and then either:

1. let people install it by image reference (non-Marketplace), or
2. submit it to Docker’s Extensions Marketplace (review/validation flow).

Here is the practical flow.

---

## 1) Package your extension as an image (the real artifact)

### A. Ensure you have `metadata.json` at the image root

Docker Desktop treats `metadata.json` as the entry point for the extension.
([Docker Documentation][1])

### B. Add the required labels in your Dockerfile

At minimum, your image needs labels that tell Docker Desktop:

- which Extensions API version you target
- where the metadata lives in the image filesystem
- what icon to show

Docker documents these labels (including the icon label) as part of extension
packaging. ([Docker Documentation][2])

A typical pattern looks like:

```dockerfile
LABEL com.docker.desktop.extension.api.version=">=0.3.0"
LABEL com.docker.desktop.extension.metadata="/metadata.json"
LABEL com.docker.desktop.extension.icon="https://…/icon.png"
```

Exact values depend on your SDK/API target.

---

## 2) Build and push the image to Docker Hub

Extensions are distributed as images. Use `docker buildx build --push` with
explicit attestations so Docker Scout can validate supply-chain metadata.
([Docker Documentation][4])

Example:

```bash
docker buildx build \
  --provenance=mode=max \
  --sbom=true \
  --tag prizz/deep-dive:0.1.0 \
  --push \
  .
```

Note: plain `docker build` + `docker push` does not attach the SBOM and
max-mode provenance attestations required by Docker Scout supply-chain policy.

Tip: do not mutate an already-published tag. Docker Desktop can complain if the
local image differs from what is published under the same reference. ([Docker
Community Forums][5])

---

## 3) Validate the published image

The Extensions CLI can validate that your Dockerfile has required labels and
your metadata matches the schema. When validating the published image, point the
CLI at the pushed image reference. ([Docker Documentation][3])

Validation expects Docker Hub tags in the form `X.Y.Z` (no `v` prefix).

```bash
docker extension validate -a -s -i prizz/deep-dive:0.1.0
```

To verify Docker Scout supply-chain attestations:

```bash
docker scout policy prizz/deep-dive:0.1.0 --org prizz --exit-code
```

---

## 4) Choose distribution: non-Marketplace vs Marketplace

### Option A — Non-Marketplace install (quickest)

Users can install directly by image reference:

```bash
docker extension install prizz/deep-dive:0.1.0
```

That is the official non-marketplace path. ([Docker Documentation][6])

### Option B — Publish to the Docker Extensions Marketplace (discoverable)

The Marketplace publishing flow is: submit → automated validation → Docker
approval → listed in Marketplace/Docker Hub UI. ([Docker Documentation][7])

Submissions are handled via the `docker/extensions-submissions` GitHub repo:
create a new issue with your extension details and it is automatically
validated. ([GitHub][8])

Use this URL to open the submission issue directly:
https://github.com/docker/extensions-submissions/issues/new?assignees=&labels=&template=1_automatic_review.yaml&title=%5BSubmission%5D%3A+

If validation passes, Docker’s extensions team authorizes publication. ([GitHub][9])

---

## What done looks like

- Your extension image is on Docker Hub (version-tagged).
- `docker extension install prizz/deep-dive:tag` works for anyone you share it with.
  ([Docker Documentation][6])
- If you submitted it, it eventually shows up in the Docker Desktop Extensions
  Marketplace. ([Docker Documentation][7])

---

## Deep Dive publishing note

Publishing for Deep Dive is currently semi-manual. CI will create a new git tag,
then we manually run `scripts/push-latest-tag.sh`, which uses `docker buildx
build --provenance=mode=max --sbom=true --push` to publish version and `latest`
tags in one command.

Before triggering release/publish, run `just check` locally to match CI quality
gates (Biome format/lint, UI tests/build, and Go format/test/vet).

---

[1]: https://docs.docker.com/extensions/extensions-sdk/architecture/metadata/ "Extension metadata"
[2]: https://docs.docker.com/extensions/extensions-sdk/extensions/labels/ "Add labels"
[3]: https://docs.docker.com/extensions/extensions-sdk/extensions/validate/ "Validate"
[4]: https://docs.docker.com/extensions/extensions-sdk/extensions/distribution/ "Package and release your extension"
[5]: https://forums.docker.com/t/failed-to-install-extension-the-local-image-you-are-trying-to-install-has-been-modified-and-is-different-from-the-published-image-drone-drone-ci-docker-extension-0-2-0/132514 "Failed to install extension: the local image you are trying ..."
[6]: https://docs.docker.com/extensions/non-marketplace/ "Non-marketplace extensions"
[7]: https://docs.docker.com/extensions/extensions-sdk/extensions/publish/ "Publish in the Marketplace - Docker Extensions"
[8]: https://github.com/docker/extensions-submissions "docker/extensions-submissions"
[9]: https://github.com/docker/extensions-submissions/issues/74 "[Submission]: MindsDB Docker Extension · Issue #74"
