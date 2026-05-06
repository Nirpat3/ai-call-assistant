#!/usr/bin/env bash
set -euo pipefail

CLAIMS_FILE=".claims/claims.json"
DEFAULT_TTL_HOURS="4"

usage() {
  cat <<USAGE
Usage:
  scripts/claim.sh claim <owner> <path> [ttl_hours]
  scripts/claim.sh release <owner> <path>
  scripts/claim.sh status [path]
  scripts/claim.sh prune

Examples:
  scripts/claim.sh claim dev1 src/api 4
  scripts/claim.sh release dev1 src/api
  scripts/claim.sh status src
USAGE
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

now_epoch() {
  date +%s
}

ensure_store() {
  mkdir -p "$(dirname "$CLAIMS_FILE")"
  if [[ ! -f "$CLAIMS_FILE" ]]; then
    cat > "$CLAIMS_FILE" <<JSON
{"claims":[]}
JSON
  fi
}

prune_expired() {
  local now
  now="$(now_epoch)"
  tmp="$(mktemp)"
  jq --argjson now "$now" '.claims |= map(select(.expires_at > $now))' "$CLAIMS_FILE" > "$tmp"
  mv "$tmp" "$CLAIMS_FILE"
}

claim_path() {
  local owner="$1"
  local path="$2"
  local ttl_hours="${3:-$DEFAULT_TTL_HOURS}"
  local now expires

  now="$(now_epoch)"
  expires="$(( now + ttl_hours * 3600 ))"

  prune_expired

  local conflict
  conflict="$(jq -r --arg p "$path" --arg o "$owner" '
    .claims[]
    | select(.owner != $o)
    | select((.path | startswith($p)) or ($p | startswith(.path)))
    | "\(.owner)|\(.path)|\(.expires_at)"
  ' "$CLAIMS_FILE" | head -n1 || true)"

  if [[ -n "$conflict" ]]; then
    IFS='|' read -r c_owner c_path c_exp <<<"$conflict"
    echo "Claim conflict: '$path' overlaps claim by '$c_owner' on '$c_path' (expires_at=$c_exp)" >&2
    exit 2
  fi

  tmp="$(mktemp)"
  jq --arg o "$owner" --arg p "$path" --argjson n "$now" --argjson e "$expires" '
    .claims += [{"owner":$o,"path":$p,"claimed_at":$n,"expires_at":$e}]
  ' "$CLAIMS_FILE" > "$tmp"
  mv "$tmp" "$CLAIMS_FILE"

  echo "Claimed: owner=$owner path=$path ttl_hours=$ttl_hours"
}

release_path() {
  local owner="$1"
  local path="$2"

  tmp="$(mktemp)"
  jq --arg o "$owner" --arg p "$path" '
    .claims |= map(select(.owner != $o or .path != $p))
  ' "$CLAIMS_FILE" > "$tmp"
  mv "$tmp" "$CLAIMS_FILE"

  echo "Released: owner=$owner path=$path"
}

status_claims() {
  local path="${1:-}"
  prune_expired

  if [[ -z "$path" ]]; then
    jq '.claims' "$CLAIMS_FILE"
    return
  fi

  jq --arg p "$path" '.claims | map(select((.path | startswith($p)) or ($p | startswith(.path))))' "$CLAIMS_FILE"
}

main() {
  require_cmd jq
  ensure_store

  cmd="${1:-}"
  case "$cmd" in
    claim)
      [[ $# -ge 3 ]] || { usage; exit 1; }
      claim_path "$2" "$3" "${4:-$DEFAULT_TTL_HOURS}"
      ;;
    release)
      [[ $# -ge 3 ]] || { usage; exit 1; }
      release_path "$2" "$3"
      ;;
    status)
      status_claims "${2:-}"
      ;;
    prune)
      prune_expired
      echo "Pruned expired claims"
      ;;
    *)
      usage
      exit 1
      ;;
  esac
}

main "$@"
