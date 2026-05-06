#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RULEBOOK="$ROOT_DIR/RULEBOOK.md"
AGENTS="$ROOT_DIR/AGENTS.md"
VERSION_FILE="$ROOT_DIR/.managed-rules-version"

fail() {
  echo "[verify-managed-rules][error] $*" >&2
  exit 1
}

[[ -f "$RULEBOOK" ]] || fail "Missing RULEBOOK.md"
[[ -f "$AGENTS" ]] || fail "Missing AGENTS.md"
[[ -f "$VERSION_FILE" ]] || fail "Missing .managed-rules-version"

EXPECTED_VERSION="$(cat "$VERSION_FILE" | tr -d '[:space:]')"
[[ -n "$EXPECTED_VERSION" ]] || fail "Empty .managed-rules-version"

grep -q "Rulebook version: \`$EXPECTED_VERSION\`" "$RULEBOOK" || \
  fail "RULEBOOK.md version mismatch. Expected $EXPECTED_VERSION"

grep -q "Managed by: \`dev-bootstrap\`" "$RULEBOOK" || \
  fail "RULEBOOK.md is not marked as managed by dev-bootstrap"

grep -q "Follow managed \[RULEBOOK.md\]" "$AGENTS" || \
  fail "AGENTS.md missing required managed rulebook reference"

echo "[verify-managed-rules] OK ($EXPECTED_VERSION)"
