#!/usr/bin/env bash
set -euo pipefail
tmp="$(mktemp)"; chmod 0600 "$tmp"
git ls-files -z -- . ':(exclude)MANIFEST.sha256' | xargs -0 sha256sum > "$tmp"
mv -f "$tmp" MANIFEST.sha256
