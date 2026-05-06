#!/usr/bin/env bash
set -euo pipefail

# Environment-aware semantic versioning helper.
# Stages:
# - dev  => X.Y.Z-dev.N
# - qa   => X.Y.Z-qa.N
# - beta => X.Y.Z-beta.N
# - prod => X.Y.Z

STAGE="${1:-}"
BUMP="${2:-patch}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION_FILE="$ROOT_DIR/.version"
PACKAGE_JSON="$ROOT_DIR/package.json"

usage() {
  cat <<USAGE
Usage: scripts/version.sh <dev|qa|beta|prod> [patch|minor|major]
USAGE
}

if [[ -z "$STAGE" ]]; then
  usage
  exit 1
fi

if [[ "$STAGE" != "dev" && "$STAGE" != "qa" && "$STAGE" != "beta" && "$STAGE" != "prod" ]]; then
  echo "Invalid stage: $STAGE" >&2
  usage
  exit 1
fi

if [[ "$BUMP" != "patch" && "$BUMP" != "minor" && "$BUMP" != "major" ]]; then
  echo "Invalid bump: $BUMP" >&2
  usage
  exit 1
fi

read_version() {
  if [[ -f "$VERSION_FILE" ]]; then
    cat "$VERSION_FILE"
    return
  fi
  if [[ -f "$PACKAGE_JSON" ]]; then
    node -e "console.log(require('$PACKAGE_JSON').version || '0.1.0-dev.1')"
    return
  fi
  echo "0.1.0-dev.1"
}

CURRENT="$(read_version)"
BASE="$(echo "$CURRENT" | sed -E 's/-.*$//')"
MAJOR="$(echo "$BASE" | cut -d. -f1)"
MINOR="$(echo "$BASE" | cut -d. -f2)"
PATCH="$(echo "$BASE" | cut -d. -f3)"

case "$BUMP" in
  major)
    MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
  minor)
    MINOR=$((MINOR + 1)); PATCH=0 ;;
  patch)
    PATCH=$((PATCH + 1)) ;;
esac

NEXT_BASE="${MAJOR}.${MINOR}.${PATCH}"
NEXT_VERSION="$NEXT_BASE"

if [[ "$STAGE" != "prod" ]]; then
  PREV_STAGE=""
  PREV_N=0
  if echo "$CURRENT" | grep -Eq -- '-(dev|qa|beta)\.[0-9]+$'; then
    PREV_STAGE="$(echo "$CURRENT" | sed -E 's/^.*-(dev|qa|beta)\.[0-9]+$/\1/')"
    PREV_N="$(echo "$CURRENT" | sed -E 's/^.*-(dev|qa|beta)\.([0-9]+)$/\2/')"
  fi
  if [[ "$PREV_STAGE" == "$STAGE" ]]; then
    NEXT_VERSION="${NEXT_BASE}-${STAGE}.$((PREV_N + 1))"
  else
    NEXT_VERSION="${NEXT_BASE}-${STAGE}.1"
  fi
fi

echo "$NEXT_VERSION" > "$VERSION_FILE"

if [[ -f "$PACKAGE_JSON" ]]; then
  node -e "const fs=require('fs');const p='$PACKAGE_JSON';const j=JSON.parse(fs.readFileSync(p,'utf8'));j.version='$NEXT_VERSION';fs.writeFileSync(p, JSON.stringify(j,null,2)+'\n');"
fi

echo "Updated version: $CURRENT -> $NEXT_VERSION"
