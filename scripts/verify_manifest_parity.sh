#!/usr/bin/env bash
set -euo pipefail
umask 077

[ -f FOLD_MANIFEST.sha256 ] || { echo "ERROR: missing FOLD_MANIFEST.sha256" >&2; exit 1; }
[ -f MANIFEST.sha256 ] || { echo "ERROR: missing MANIFEST.sha256" >&2; exit 1; }

stat -c '%a %n' FOLD_MANIFEST.sha256 MANIFEST.sha256

sha256sum -c --quiet FOLD_MANIFEST.sha256
sha256sum -c --quiet MANIFEST.sha256

tracked_count=$(git ls-files -z -- . ':(exclude)MANIFEST.sha256' | tr -cd '\0' | wc -c)
fold_count=$(wc -l < FOLD_MANIFEST.sha256)
manifest_count=$(wc -l < MANIFEST.sha256)

echo "Tracked (excluding MANIFEST.sha256): $tracked_count"
echo "FOLD_MANIFEST.sha256 lines:           $fold_count"
echo "MANIFEST.sha256 lines:                $manifest_count"

if [ "$fold_count" -ne 1 ]; then
  echo "ERROR: expected FOLD_MANIFEST.sha256 line count 1, got $fold_count" >&2
  exit 1
fi

if [ "$manifest_count" -ne "$tracked_count" ]; then
  echo "ERROR: MANIFEST.sha256 count ($manifest_count) != tracked ($tracked_count)" >&2
  exit 1
fi

if ! grep -q "':(exclude)MANIFEST.sha256'" scripts/refresh_manifest.sh; then
  echo "ERROR: scripts/refresh_manifest.sh does not exclude MANIFEST.sha256" >&2
  exit 1
fi

echo "PARITY_CHECK_COMPLETE"
