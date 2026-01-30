#!/usr/bin/env bash
set -euo pipefail

tag_pattern="^v[0-9]+\.[0-9]+\.[0-9]+$"

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

echo "Building ${image}..."
docker build -t "${image}" .

echo "Tagging ${image} as ${latest_image}..."
docker tag "${image}" "${latest_image}"

echo "Pushing ${image}..."
docker push "${image}"

echo "Pushing ${latest_image}..."
docker push "${latest_image}"

echo "Returning to main..."
git checkout main

echo "Done. Built and pushed ${image} and ${latest_image} successfully."
