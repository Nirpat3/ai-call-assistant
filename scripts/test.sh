#!/usr/bin/env bash
set -euo pipefail

echo "[test] Running unit/integration tests"

if [[ -f package.json ]]; then
  if command -v pnpm >/dev/null 2>&1; then
    pnpm test
  else
    npm test
  fi
  exit 0
fi

if compgen -G "tests/*.py" >/dev/null || compgen -G "test_*.py" >/dev/null; then
  if [[ -d .venv ]]; then
    # shellcheck disable=SC1091
    source .venv/bin/activate
  fi
  python -m pytest
  exit 0
fi

echo "[test] No tests detected"
