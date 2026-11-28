#!/usr/bin/env bash
# Strict manifest gate (read-only): exits non-zero on ANY drift.
set -euo pipefail
cd "${FOLD_REPO:-$(dirname "$0")/..}"
out="$(python3 reconcile_fold_manifest.py)"
printf '%s\n' "$out"
bad=0
for label in "Duplicate manifest keys" "Excluded paths in manifest" "Missing on disk" \
             "SHA-256 mismatches" "New untracked disk files" "Content-duplicate groups"; do
  n="$(printf '%s\n' "$out" | sed -n "s/^${label}:[[:space:]]*\([0-9][0-9]*\).*/\1/p" | head -n1)"
  if [ -z "$n" ]; then echo "GATE FAIL: cannot parse '$label'" >&2; bad=1
  elif [ "$n" != "0" ]; then echo "GATE FAIL: $label = $n" >&2; bad=1; fi
done
sha256sum -c FOLD_MANIFEST.sha256 --quiet || { echo "GATE FAIL: sidecar mismatch" >&2; bad=1; }
[ "$bad" -eq 0 ] && echo "GATE OK"
exit "$bad"
