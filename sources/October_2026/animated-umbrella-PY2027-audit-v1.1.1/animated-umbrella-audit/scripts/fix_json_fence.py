#!/usr/bin/env python3
"""Strip markdown fences and chatter around a JSON document, validate it, write FILE.fixed.
Usage: python3 scripts/fix_json_fence.py HANDOVER.json   (original is never modified)"""
import json
import sys
from pathlib import Path

src = Path(sys.argv[1])
text = src.read_text(encoding="utf-8", errors="replace")
text = "\n".join(l for l in text.splitlines() if not l.strip().startswith("```"))
a, b = text.find("{"), text.rfind("}")
if a < 0 or b < 0:
    sys.exit("no JSON object found")
try:
    obj = json.loads(text[a:b + 1])
except json.JSONDecodeError as e:
    sys.exit(f"still invalid after stripping fences: {e}")
out = src.with_suffix(src.suffix + ".fixed")
out.write_text(json.dumps(obj, indent=2) + "\n", encoding="utf-8")
print(f"valid JSON written to {out}")
