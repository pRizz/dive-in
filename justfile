image := "deep-dive:dev"
extension_image := "prizz/deep-dive"
tag := "dev"

install:
  bun install --frozen-lockfile

build: ui-build docker-build

test: ui-test vm-test

check: name-audit ui-format-check ui-lint ui-test ui-build vm-fmt-check vm-vet vm-test

fix: ui-format

name-audit:
  bash scripts/check-project-name-references.sh

ui-dev:
  bun run --cwd ui dev

ui-build:
  bun run --cwd ui build

ui-test:
  bun run --cwd ui test:run

ui-lint:
  bun run --cwd ui lint

ui-format:
  bun run --cwd ui format

ui-format-check:
  bun run --cwd ui format:check

vm-test:
  cd vm && go test ./...

vm-vet:
  cd vm && go vet ./...

vm-fmt-check:
  cd vm && files="$(find . -name '*.go' -type f -exec gofmt -l {} +)" && test -z "$files" || (echo "Run 'gofmt -w' on the files listed below:" && echo "$files" && exit 1)

docker-build:
  docker build -t {{image}} .

extension-validate:
  docker extension validate .

install-extension:
  docker extension install {{extension_image}}:{{tag}}

update-extension:
  docker extension update {{extension_image}}:{{tag}} --force

install-development-extension:
  docker build -t {{image}} . ; docker extension install {{image}} --force

reinstall-development-extension:
  docker build -t {{image}} . ; docker extension update {{image}} --force

reinstall-or-install-development-extension:
  just reinstall-development-extension || just install-development-extension

alias dev := reinstall-or-install-development-extension

reinstall-development-extension-clean:
  docker builder prune -af
  docker image rm -f {{image}}
  just reinstall-or-install-development-extension
