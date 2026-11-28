#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
dest="$(git rev-parse --git-path hooks)"
mkdir -p "$dest"
if [ -e "$dest/pre-commit" ] && ! grep -q 'fold-manifest-hook' "$dest/pre-commit" && [ -z "${FORCE:-}" ]; then
  echo "refusing: $dest/pre-commit exists and is not ours (rerun with FORCE=1 to replace)" >&2
  exit 1
fi
install -m 755 scripts/hooks/pre-commit "$dest/pre-commit"
echo "installed -> $dest/pre-commit"
