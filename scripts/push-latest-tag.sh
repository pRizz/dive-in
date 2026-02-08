#!/usr/bin/env bash
set -euo pipefail

tag_pattern="^[0-9]+\.[0-9]+\.[0-9]+$"

echo "Finding latest tag..."

latest_tag="$(
  git tag --list |
    grep -E "${tag_pattern}" |
    sort -V |
    tail -n 1
)"

if [[ -z "${latest_tag}" ]]; then
  echo "No version tags found matching ${tag_pattern}."
  exit 1
fi

read -r -p "Use latest tag ${latest_tag}? [y/N] " confirmation
case "${confirmation}" in
  y|Y|yes|YES)
    ;;
  *)
    echo "Aborted."
    exit 1
    ;;
esac

image="prizz/deep-dive:${latest_tag}"
latest_image="prizz/deep-dive:latest"

echo "Checking out ${latest_tag}..."
git checkout "${latest_tag}"

echo "Building and pushing ${image} and ${latest_image} with attestations..."
docker buildx build \
  --provenance=mode=max \
  --sbom=true \
  --tag "${image}" \
  --tag "${latest_image}" \
  --push \
  .

echo "Returning to main..."
git checkout main

echo "Done. Built and pushed ${image} and ${latest_image} successfully."
