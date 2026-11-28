#!/usr/bin/env bash
set -euo pipefail

WIKI_DIR="${1:-$HOME/pa_health_repos/Pennsylvania_Health_Insurance_2026.wiki}"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

bash "$REPO_DIR/scripts/check_wiki_links.sh" "$WIKI_DIR"

python3 - "$WIKI_DIR" <<'PY'
from pathlib import Path
import re
import sys

wiki = Path(sys.argv[1])
if not wiki.is_dir():
    raise SystemExit(f"Missing wiki directory: {wiki}")

sidebar_path = wiki / "_Sidebar.md"
sidebar_text = sidebar_path.read_text(encoding="utf-8") if sidebar_path.exists() else ""

md_files = sorted(wiki.glob("*.md"))
all_text = "\n".join(p.read_text(encoding="utf-8") for p in md_files)

# Extract targets from [[Label|Target]] or [[Target]]
linked_targets = set()
for raw in re.findall(r"\[\[([^\]]+)\]\]", all_text):
    target = raw.split("|", 1)[1].strip() if "|" in raw else raw.strip()
    target = target.split("#", 1)[0].strip()
    if target.endswith(".md"):
        target = target[:-3]
    linked_targets.add(target)

sidebar_targets = set()
for raw in re.findall(r"\[\[([^\]]+)\]\]", sidebar_text):
    target = raw.split("|", 1)[1].strip() if "|" in raw else raw.strip()
    target = target.split("#", 1)[0].strip()
    if target.endswith(".md"):
        target = target[:-3]
    sidebar_targets.add(target)

excluded = {"_Sidebar", "_Footer", "Home"}
content_stems = {p.stem for p in md_files if p.stem not in excluded}

missing_from_sidebar = sorted(content_stems - sidebar_targets)
unreferenced_pages = sorted(content_stems - linked_targets)

crlf_files = []
for p in md_files:
    raw_bytes = p.read_bytes()
    if b"\r\n" in raw_bytes:
        crlf_files.append(p.name)

print(f"Content pages audited:    {len(content_stems)}")
print(f"Missing from _Sidebar.md: {len(missing_from_sidebar)}")
for name in missing_from_sidebar:
    print(f"  - {name}")
print(f"Unreferenced anywhere:    {len(unreferenced_pages)}")
for name in unreferenced_pages:
    print(f"  - {name}")
print(f"CRLF line-ending files:   {len(crlf_files)}")
for name in crlf_files:
    print(f"  - {name}")
PY
