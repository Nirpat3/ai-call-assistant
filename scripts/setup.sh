#!/usr/bin/env bash
set -euo pipefail

echo "[setup] Starting project setup"

if [[ -f package.json ]]; then
  if command -v pnpm >/dev/null 2>&1; then
    pnpm install
  elif command -v npm >/dev/null 2>&1; then
    npm install
  else
    echo "[setup][error] node package manager not found" >&2
    exit 1
  fi
fi

if [[ -f requirements.txt ]]; then
  if [[ ! -d .venv ]]; then
    python3 -m venv .venv
  fi
  # shellcheck disable=SC1091
  source .venv/bin/activate
  pip install --upgrade pip
  pip install -r requirements.txt
fi

./scripts/check-env.sh || true

echo "[setup] Done"
