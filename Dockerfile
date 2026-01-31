FROM golang:1.19-alpine AS builder
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

FROM --platform=$BUILDPLATFORM node:20.19-alpine AS client-builder
WORKDIR /ui
# cache packages in layer
COPY ui/package.json /ui/package.json
COPY ui/package-lock.json /ui/package-lock.json
RUN --mount=type=cache,target=/usr/src/app/.npm \
    npm set cache /usr/src/app/.npm && \
    npm ci
# install
COPY ui /ui
RUN npm run build

FROM alpine
ARG DIVE_VERSION=0.13.1
RUN apk add --no-cache ca-certificates curl tar \
    && ALPINE_ARCH="$(apk --print-arch)" \
    && echo "Detected Alpine arch: ${ALPINE_ARCH}" \
    && case "${ALPINE_ARCH}" in \
      x86_64) DIVE_ARCH="amd64" ;; \
      aarch64) DIVE_ARCH="arm64" ;; \
      *) echo "Unsupported arch: ${ALPINE_ARCH}"; exit 1 ;; \
    esac \
    && echo "Using Dive arch: ${DIVE_ARCH}" \
    && echo "Kernel: $(uname -a)" \
    && curl -fsSL "https://github.com/wagoodman/dive/releases/download/v${DIVE_VERSION}/dive_${DIVE_VERSION}_linux_${DIVE_ARCH}.tar.gz" \
      | tar -xz -C /usr/local/bin dive \
    && chmod +x /usr/local/bin/dive
LABEL org.opencontainers.image.title="Deep Dive" \
    org.opencontainers.image.description="Explore docker images, layer contents, and discover ways to shrink the size of your Docker/OCI image." \
    org.opencontainers.image.vendor="Peter Ryszkiewicz" \
    com.docker.desktop.extension.api.version=">=0.4.2" \
    com.docker.extension.screenshots='[{"alt":"Main page", "url":"https://github.com/pRizz/deep-dive/blob/main/screenshots/1.png?raw=true"}, {"alt":"Analysis results", "url":"https://github.com/pRizz/deep-dive/blob/main/screenshots/2.png?raw=true"}, {"alt":"History", "url":"https://github.com/pRizz/deep-dive/blob/main/screenshots/3.png?raw=true"}]' \
    com.docker.extension.detailed-description="<h1>Deep Dive</h1><p>A Docker extension that helps you explore a docker image, layer contents, and discover ways to shrink the size of your Docker/OCI image.</p><p>Built on the top of excellent CLI tool: <a href=\"https://github.com/wagoodman/dive\">https://github.com/wagoodman/dive</a></p><p>Based on the original extension by Prakhar Srivastav: <a href=\"https://github.com/prakhar1989/dive-in\">https://github.com/prakhar1989/dive-in</a></p><p>Deep Dive is free and open source: <a href=\"https://github.com/pRizz/deep-dive\">https://github.com/pRizz/deep-dive</a></p><p>Docker Hub repository: <a href=\"https://hub.docker.com/r/prizz/deep-dive\">https://hub.docker.com/r/prizz/deep-dive</a></p><p>Install in your Docker Desktop with</p><pre><code>docker extension install prizz/deep-dive</code></pre>" \
    com.docker.desktop.extension.icon="https://raw.githubusercontent.com/pRizz/deep-dive/main/ui/public/scuba.svg" \
    com.docker.extension.publisher-url="https://github.com/pRizz" \
    com.docker.extension.categories="utility-tools" \
    com.docker.extension.additional-urls='[{"title":"Documentation","url":"https://github.com/pRizz/deep-dive"}]' \
    com.docker.extension.changelog="First version"

COPY --from=builder /backend/bin/service /
COPY docker-compose.yaml .
COPY metadata.json .
COPY docker.svg .
COPY ui/public/scuba.svg scuba.svg
COPY --from=client-builder /ui/dist ui
CMD ["/service", "-socket", "/run/guest-services/extension-deep-dive.sock"]
