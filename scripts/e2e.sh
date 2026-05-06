#!/usr/bin/env bash
set -euo pipefail

echo "[e2e] Running end-to-end checks"

if [[ -f package.json ]]; then
  if command -v pnpm >/dev/null 2>&1; then
    pnpm run e2e
  else
    npm run e2e
  fi
  exit 0
fi

echo "[e2e] No e2e runner configured"
