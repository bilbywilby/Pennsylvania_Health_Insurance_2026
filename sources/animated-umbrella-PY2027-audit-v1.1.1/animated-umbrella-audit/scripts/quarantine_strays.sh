#!/usr/bin/env bash
# Moves stray files out of the repo (keeps a copy) and untracks them. Does not commit.
set -euo pipefail
cd "$(dirname "$0")/.."
Q="$HOME/repo_quarantine_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$Q"
for f in Twi cms_dump.txt pa_aca_briefing_py2027_release.tar.gz FETCH_HEAD main; do
  [ -e "$f" ] || continue
  if git ls-files --error-unmatch "$f" > /dev/null 2>&1; then git rm --cached -q "$f"; fi
  mv "$f" "$Q"/
  echo "quarantined: $f"
done
echo "copies in $Q. Review with: git status"
