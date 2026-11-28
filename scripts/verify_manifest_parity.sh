#!/usr/bin/env bash
set -euo pipefail
umask 077

REPO_DIR="$HOME/pa_health_repos/PA_Health_Folded_2026"
cd "$REPO_DIR"

command -v sha256sum >/dev/null 2>&1 || {
  echo "ERROR: sha256sum not found; install package coreutils" >&2
  exit 1
}

[ -f FOLD_MANIFEST.sha256 ] || { echo "ERROR: missing FOLD_MANIFEST.sha256" >&2; exit 1; }
[ -f MANIFEST.sha256 ] || { echo "ERROR: missing MANIFEST.sha256" >&2; exit 1; }

shebang=$(head -n 1 scripts/verify_manifest_parity.sh)
[ "$shebang" = "#!/usr/bin/env bash" ] || {
  echo "ERROR: unexpected shebang: $shebang" >&2
  exit 1
}

stat -c '%a %n' FOLD_MANIFEST.sha256 MANIFEST.sha256

sha256sum -c --quiet FOLD_MANIFEST.sha256
sha256sum -c --quiet MANIFEST.sha256

tracked_count=$(git ls-files -z \
  | grep -zvE '^(FOLD_MANIFEST\.sha256|MANIFEST\.sha256)$' \
  | tr -cd '\0' | wc -c)
fold_count=$(wc -l < FOLD_MANIFEST.sha256)
manifest_count=$(wc -l < MANIFEST.sha256)

echo "Tracked (excluding manifests): $tracked_count"
echo "FOLD_MANIFEST.sha256 lines:    $fold_count"
echo "MANIFEST.sha256 lines:         $manifest_count"

[ "$fold_count" -eq "$tracked_count" ] || {
  echo "ERROR: FOLD_MANIFEST.sha256 count ($fold_count) != tracked ($tracked_count)" >&2
  exit 1
}
[ "$manifest_count" -eq "$fold_count" ] || {
  echo "ERROR: MANIFEST.sha256 count ($manifest_count) != FOLD_MANIFEST.sha256 ($fold_count)" >&2
  exit 1
}

if [ -f scripts/refresh_manifest.sh ]; then
  echo "--- scripts/refresh_manifest.sh exclusion & mode check ---"
  grep -nE 'MANIFEST|ls-files|grep|chmod|mv' scripts/refresh_manifest.sh || true
  grep -q 'FOLD_MANIFEST\.sha256' scripts/refresh_manifest.sh || {
    echo "ERROR: scripts/refresh_manifest.sh does not exclude FOLD_MANIFEST.sha256" >&2
    exit 1
  }
fi

echo "PARITY_CHECK_COMPLETE"
