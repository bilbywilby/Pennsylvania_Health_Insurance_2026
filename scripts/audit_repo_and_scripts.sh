#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WIKI_DIR="${1:-$HOME/pa_health_repos/Pennsylvania_Health_Insurance_2026.wiki}"

echo "=== Folded Repository & Script Audit ==="
echo "Repo: $REPO_DIR"
echo "Wiki: $WIKI_DIR"

shopt -s nullglob
script_files=("$REPO_DIR"/scripts/*.sh "$REPO_DIR"/*.py)
for f in "${script_files[@]}"; do
    mode=$(stat -c '%a' "$f" 2>/dev/null || echo "unknown")
    first_line=$(head -n 1 "$f" 2>/dev/null || true)
    echo "File: $f | Mode: $mode | Shebang: $first_line"
    if [[ "$f" == *.sh ]]; then
        bash -n "$f"
    elif [[ "$f" == *.py ]]; then
        python3 -m py_compile "$f"
    fi
done

cd "$REPO_DIR"
python3 reconcile_fold_manifest.py --write --refresh-sidecar
bash scripts/check_fold_manifest.sh
sha256sum -c FOLD_MANIFEST.sha256 --quiet
bash scripts/check_wiki_links.sh "$WIKI_DIR"

echo "=== Audit Complete ==="
