#!/usr/bin/env bash
set -euo pipefail

OWNER="${1:-${USER:-unknown}}"
TARGET="${2:-.}"
TTL_HOURS="${3:-4}"

./scripts/claim.sh claim "$OWNER" "$TARGET" "$TTL_HOURS"
