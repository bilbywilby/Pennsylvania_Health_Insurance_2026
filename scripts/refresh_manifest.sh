#!/usr/bin/env bash
set -euo pipefail
umask 077

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

TMP_MANIFEST="$(mktemp .MANIFEST.sha256.XXXXXX)"
trap 'rm -f "${TMP_MANIFEST:-}"' EXIT

git ls-files -z -- . ':(exclude)MANIFEST.sha256' ':(exclude)FOLD_MANIFEST.sha256' ':(exclude)FOLD_MANIFEST.sha256' | xargs -0 sha256sum > "$TMP_MANIFEST"
mv -f "$TMP_MANIFEST" MANIFEST.sha256
chmod 0600 MANIFEST.sha256

sha256sum -c MANIFEST.sha256 --quiet
echo "MANIFEST_OK"
