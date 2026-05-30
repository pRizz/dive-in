FROM golang:1.26.3-alpine3.23 AS builder
ENV CGO_ENABLED=0
WORKDIR /backend
COPY vm/go.* .
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    go mod download
COPY vm/. .
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    go build -trimpath -ldflags="-s -w" -o bin/service

FROM --platform=$BUILDPLATFORM oven/bun:1.3.14-alpine AS client-builder
ARG APP_VERSION=dev
ARG GIT_COMMIT=
ENV APP_VERSION="${APP_VERSION}" \
    GIT_COMMIT="${GIT_COMMIT}"
WORKDIR /workspace
COPY package.json bun.lock ./
COPY ui/package.json ui/package.json
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile
COPY ui ui
RUN bun run --cwd ui build

FROM alpine:3.23.4 AS dive-downloader
ARG DIVE_VERSION=14.8
ARG DIVE_TAG=v14.8
# Pin the pRizz/dive release so extension builds are reproducible. Verify the
# selected release artifact before installing it to avoid shipping a stale or
# partially downloaded Dive binary.
RUN apk add --no-cache ca-certificates curl tar \
    && ALPINE_ARCH="$(apk --print-arch)" \
    && echo "Detected Alpine arch: ${ALPINE_ARCH}" \
    && case "${ALPINE_ARCH}" in \
      x86_64) DIVE_ARCH="amd64" ;; \
      aarch64) DIVE_ARCH="arm64" ;; \
      *) echo "Unsupported arch: ${ALPINE_ARCH}"; exit 1 ;; \
    esac \
    && echo "Using Dive arch: ${DIVE_ARCH}" \
    && DIVE_TARBALL="dive_${DIVE_VERSION}_linux_${DIVE_ARCH}.tar.gz" \
    && DIVE_TARBALL_URL="https://github.com/pRizz/dive/releases/download/${DIVE_TAG}/${DIVE_TARBALL}" \
    && DIVE_CHECKSUMS_URL="https://github.com/pRizz/dive/releases/download/${DIVE_TAG}/dive_${DIVE_VERSION}_checksums.txt" \
    && echo "Using pRizz/dive release: ${DIVE_TAG}" \
    && echo "Using pRizz/dive asset: ${DIVE_TARBALL_URL}" \
    && curl -fsSL -o "/tmp/${DIVE_TARBALL}" "${DIVE_TARBALL_URL}" \
    && curl -fsSL -o /tmp/dive-checksums.txt "${DIVE_CHECKSUMS_URL}" \
    && DIVE_CHECKSUM="$(awk -v filename="${DIVE_TARBALL}" '$2 == filename { print $1; exit }' /tmp/dive-checksums.txt)" \
    && if [ -z "${DIVE_CHECKSUM}" ]; then echo "Failed to resolve checksum for ${DIVE_TARBALL}." >&2; exit 1; fi \
    && printf '%s  %s\n' "${DIVE_CHECKSUM}" "/tmp/${DIVE_TARBALL}" | sha256sum -c - \
    && tar -xzf "/tmp/${DIVE_TARBALL}" -C /tmp dive \
    && install -m 0755 /tmp/dive /usr/local/bin/dive

FROM alpine:3.23.4
ARG APP_VERSION=dev
ARG GIT_COMMIT=
RUN apk add --no-cache ca-certificates-bundle su-exec \
    && addgroup -S -g 10001 deepdiver \
    && adduser -S -D -u 10001 -G deepdiver -h /home/deepdiver deepdiver \
    && install -d -o deepdiver -g deepdiver -m 0755 /data/history /run/guest-services /home/deepdiver
ENV HOME=/home/deepdiver
LABEL org.opencontainers.image.title="Deep Dive" \
    org.opencontainers.image.description="Explore docker images, layer contents, and discover ways to shrink the size of your Docker/OCI image." \
    org.opencontainers.image.vendor="Peter Ryszkiewicz" \
    org.opencontainers.image.version="${APP_VERSION}" \
    org.opencontainers.image.revision="${GIT_COMMIT}" \
    com.docker.desktop.extension.api.version=">=0.4.2" \
    com.docker.extension.screenshots='[{"alt":"Main page", "url":"https://github.com/pRizz/deep-dive/blob/main/screenshots/1.png?raw=true"}, {"alt":"Analysis results", "url":"https://github.com/pRizz/deep-dive/blob/main/screenshots/2.png?raw=true"}, {"alt":"History", "url":"https://github.com/pRizz/deep-dive/blob/main/screenshots/3.png?raw=true"}]' \
    com.docker.extension.detailed-description="<h1>Deep Dive</h1><p><a href=\"https://github.com/pRizz/deep-dive\"><img src=\"https://img.shields.io/github/stars/pRizz/deep-dive\" alt=\"GitHub Stars\" /></a> <a href=\"https://github.com/pRizz/deep-dive/actions/workflows/ci.yml\"><img src=\"https://github.com/pRizz/deep-dive/actions/workflows/ci.yml/badge.svg\" alt=\"CI\" /></a> <a href=\"https://github.com/pRizz/deep-dive/releases\"><img src=\"https://img.shields.io/github/v/release/pRizz/deep-dive?display_name=tag\" alt=\"Release\" /></a> <a href=\"https://hub.docker.com/r/prizz/deep-dive\"><img src=\"https://img.shields.io/docker/v/prizz/deep-dive?sort=semver&label=prizz%2Fdeep-dive\" alt=\"Docker Image\" /></a> <a href=\"https://hub.docker.com/r/prizz/deep-dive\"><img src=\"https://img.shields.io/docker/pulls/prizz/deep-dive\" alt=\"Docker Pulls\" /></a> <a href=\"https://hub.docker.com/r/prizz/deep-dive\"><img src=\"https://img.shields.io/docker/image-size/prizz/deep-dive/latest\" alt=\"Docker Image Size\" /></a> <a href=\"https://github.com/pRizz/deep-dive/blob/main/LICENSE\"><img src=\"https://img.shields.io/github/license/pRizz/deep-dive\" alt=\"License\" /></a></p><p>A Docker extension that helps you explore a docker image, layer contents, and discover ways to shrink the size of your Docker/OCI image.</p><p>Built on top of the Dive CLI: <a href=\"https://github.com/pRizz/dive\">pRizz/dive</a>, a fork of the excellent <a href=\"https://github.com/wagoodman/dive\">wagoodman/dive</a> CLI tool.</p><p>Based on the original extension by Prakhar Srivastav: <a href=\"https://github.com/prakhar1989/dive-in\">https://github.com/prakhar1989/dive-in</a></p><p>Deep Dive is free and open source: <a href=\"https://github.com/pRizz/deep-dive\">https://github.com/pRizz/deep-dive</a></p><p>Docker Hub repository: <a href=\"https://hub.docker.com/r/prizz/deep-dive\">https://hub.docker.com/r/prizz/deep-dive</a></p><p>Install in your Docker Desktop or Docker Desktop CLI with</p><pre><code>docker extension install prizz/deep-dive</code></pre>" \
    com.docker.desktop.extension.icon="https://raw.githubusercontent.com/pRizz/deep-dive/main/ui/public/scuba.svg" \
    com.docker.extension.publisher-url="https://github.com/pRizz" \
    com.docker.extension.categories="utility-tools" \
    com.docker.extension.additional-urls='[{"title":"Documentation","url":"https://github.com/pRizz/deep-dive"},{"title":"Issues","url":"https://github.com/pRizz/deep-dive/issues"}]' \
    com.docker.extension.changelog="Various fixes and improvements. See <a href=\"https://github.com/pRizz/deep-dive/releases\">https://github.com/pRizz/deep-dive/releases</a> for details."

COPY --from=dive-downloader /usr/local/bin/dive /usr/local/bin/dive
COPY --from=builder /backend/bin/service /service
COPY docker-compose.yaml .
COPY metadata.json .
COPY docker.svg .
COPY ui/public/scuba.svg scuba.svg
COPY --from=client-builder /workspace/ui/dist ui
COPY --chmod=0755 scripts/runtime-entrypoint.sh /usr/local/bin/runtime-entrypoint.sh

ENTRYPOINT ["/usr/local/bin/runtime-entrypoint.sh"]
CMD ["-socket", "/run/guest-services/extension-deep-dive.sock"]
