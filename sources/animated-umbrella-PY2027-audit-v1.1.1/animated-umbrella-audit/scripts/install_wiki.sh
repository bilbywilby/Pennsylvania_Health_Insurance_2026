#!/usr/bin/env bash
# Puts wiki/*.md into your local clone of the GitHub wiki, after tests. Backs up first. NEVER pushes.
set -euo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
WIKI_URL="${WIKI_URL:-https://github.com/bilbywilby/animated-umbrella.wiki.git}"
W="${1:-$REPO/animated-umbrella.wiki}"
if [ ! -d "$W/.git" ]; then
  echo "cloning $WIKI_URL"
  git clone "$WIKI_URL" "$W"
fi
# bring in any edits made on github.com first, so nothing is overwritten blindly
git -C "$W" pull --ff-only || { echo "pull failed: resolve the wiki clone by hand first"; exit 1; }
python3 "$REPO/src/numbers_gate.py" "$REPO"/wiki/*.md
BK="$HOME/wiki_backup_$(date +%Y%m%d_%H%M%S).tgz"
tar -czf "$BK" -C "$W" --exclude=.git .
echo "backup: $BK"
cp "$REPO"/wiki/*.md "$W"/
git -C "$W" status --short
echo
echo "Review:  git -C \"$W\" diff"
BR="$(git -C "$W" rev-parse --abbrev-ref HEAD)"
echo "Branch: $BR (GitHub wikis normally use master)"
echo "Publish: git -C \"$W\" add -A && git -C \"$W\" commit -m 'docs: PY2027 audit wiki v1.1' && git -C \"$W\" push origin $BR"
