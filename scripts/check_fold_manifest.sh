#!/usr/bin/env bash
# Strict manifest gate (read-only): exits non-zero on ANY drift or sidecar error.
set -euo pipefail
umask 077

REPO_DIR="${FOLD_REPO:-$(cd "$(dirname "$0")/.." && pwd)}"
LOCK_FILE="${TMPDIR:-/data/data/com.termux/files/usr/tmp}/fold_manifest_gate.lock"

mkdir -p "$(dirname "$LOCK_FILE")"
chmod 0700 "$(dirname "$LOCK_FILE")"

run_gate() {
  cd "$REPO_DIR"

  if [ ! -f "FOLD_MANIFEST.json" ]; then
    echo "GATE FAIL: missing FOLD_MANIFEST.json" >&2
    return 1
  fi
  if [ ! -f "FOLD_MANIFEST.sha256" ]; then
    echo "GATE FAIL: missing FOLD_MANIFEST.sha256" >&2
    return 1
  fi
  if ! grep -Eq '[[:space:]]FOLD_MANIFEST\.json$' FOLD_MANIFEST.sha256; then
    echo "GATE FAIL: FOLD_MANIFEST.sha256 does not reference FOLD_MANIFEST.json" >&2
    return 1
  fi

  local out bad n label
  out="$(python3 reconcile_fold_manifest.py)"
  printf '%s\n' "$out"

  bad=0
  for label in \
    "Duplicate manifest keys" \
    "Excluded paths in manifest" \
    "Missing on disk" \
    "SHA-256 mismatches" \
    "New untracked disk files" \
    "Content-duplicate groups"; do
    n="$(printf '%s\n' "$out" | sed -n "s/^${label}:[[:space:]]*\([0-9][0-9]*\).*/\1/p" | head -n1)"
    if [ -z "$n" ]; then
      echo "GATE FAIL: cannot parse '$label'" >&2
      bad=1
    elif [ "$n" != "0" ]; then
      echo "GATE FAIL: $label = $n" >&2
      bad=1
    fi
  done

  if ! sha256sum -c FOLD_MANIFEST.sha256 --quiet; then
    echo "GATE FAIL: sidecar mismatch" >&2
    bad=1
  fi

  if [ "$bad" -eq 0 ]; then
    echo "GATE OK"
  fi
  return "$bad"
}

if command -v flock >/dev/null 2>&1; then
  exec 9>"$LOCK_FILE"
  chmod 0600 "$LOCK_FILE"
  flock -w 30 9
fi

run_gate
