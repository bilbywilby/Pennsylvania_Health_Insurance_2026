#!/usr/bin/env bash
set -euo pipefail
umask 077

WIKI_DIR="${1:-$HOME/pa_health_repos/Pennsylvania_Health_Insurance_2026.wiki}"
if [ ! -d "$WIKI_DIR" ]; then
  echo "WIKI FAIL: directory not found: $WIKI_DIR" >&2
  exit 1
fi

python3 - "$WIKI_DIR" <<'PYEOF'
import re
import sys
from pathlib import Path

wiki_dir = Path(sys.argv[1])
md_files = sorted(
    p for p in wiki_dir.glob("*.md")
    if not p.name.startswith(".") and p.name not in {"_Footer.md", "_Sidebar.md"}
)
all_md = sorted(p for p in wiki_dir.glob("*.md") if not p.name.startswith("."))
stems = {p.stem for p in all_md}
lower_map = {s.lower(): s for s in stems}

broken = []
for p in all_md:
    text = p.read_text(encoding="utf-8")
    for m in re.finditer(r"\[\[([^\]]+)\]\]", text):
        raw = m.group(1).split("|")[-1].split("#")[0].strip().replace(" ", "-")
        if raw and raw not in stems and raw.lower() not in lower_map:
            broken.append((p.name, f"[[{m.group(1)}]]"))
    for m in re.finditer(r"\[[^\]]+\]\(([^)#]+)(?:#[^)]*)?\)", text):
        rel = m.group(1).strip()
        if rel.startswith(("http://", "https://", "mailto:")):
            continue
        stem = Path(rel).stem
        if stem and stem not in stems and stem.lower() not in lower_map:
            broken.append((p.name, f"]({rel})"))

print(f"Wiki directory:      {wiki_dir}")
print(f"Content pages:       {len(md_files)} (total .md: {len(all_md)})")
print(f"Broken internal links: {len(broken)}")
for name, ref in broken:
    print(f"  {name}: {ref}", file=sys.stderr)

sys.exit(1 if broken else 0)
PYEOF
