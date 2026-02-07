#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

legacy_name='dive'"-"'in'

matches="$(git grep -n --no-color "$legacy_name" -- . || true)"
if [[ -z "$matches" ]]; then
  echo "Project naming audit passed."
  exit 0
fi

declare -a disallowed=()

while IFS= read -r match; do
  [[ -z "$match" ]] && continue

  file="${match%%:*}"
  rest="${match#*:}"
  line_number="${rest%%:*}"
  text="${rest#*:}"

  case "$file" in
    README.md|ui/src/App.tsx|Dockerfile)
      if [[ "$text" == *"prakhar1989/"* ]]; then
        continue
      fi
      ;;
  esac

  disallowed+=("${file}:${line_number}:${text}")
done <<< "$matches"

if [[ ${#disallowed[@]} -gt 0 ]]; then
  echo "Found disallowed references to the project's legacy name."
  printf '%s\n' "${disallowed[@]}"
  echo
  echo "Allowed references are only third-party links to the original upstream repository."
  exit 1
fi

echo "Project naming audit passed."
