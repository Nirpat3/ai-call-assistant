#!/usr/bin/env bash
set -euo pipefail

required=(APP_ENV)

if [[ -f .env ]]; then
  # shellcheck disable=SC1091
  source .env
fi

missing=()
for key in "${required[@]}"; do
  if [[ -z "${!key:-}" ]]; then
    missing+=("$key")
  fi
done

if (( ${#missing[@]} > 0 )); then
  echo "Missing required env vars: ${missing[*]}" >&2
  exit 1
fi

echo "Environment looks good"
