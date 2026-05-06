#!/usr/bin/env bash
set -euo pipefail

echo "[start] Starting app"

if [[ -f package.json ]]; then
  if command -v pnpm >/dev/null 2>&1; then
    exec pnpm start
  else
    exec npm start
  fi
fi

if [[ -f app.py ]]; then
  if [[ -d .venv ]]; then
    # shellcheck disable=SC1091
    source .venv/bin/activate
  fi
  export FLASK_APP=app.py
  exec flask run --host 0.0.0.0 --port "${PORT:-5000}"
fi

echo "[start][error] No known app entrypoint found" >&2
exit 1
