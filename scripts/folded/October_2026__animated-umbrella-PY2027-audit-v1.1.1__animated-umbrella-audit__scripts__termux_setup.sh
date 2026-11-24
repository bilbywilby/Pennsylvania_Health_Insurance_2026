#!/usr/bin/env bash
# One-time setup on Termux. Not yet run on a device by the author: read the output.
# Without the PDF libraries, everything except the nine PDFs still works
# (audits, county lookup page, numbers gate, provenance, tests).
set -u
cd "$(dirname "$0")/.."
pkg update -y
pkg install -y python python-pillow poppler git
if pip install -r requirements.txt; then
  echo "PDF libraries installed"
else
  echo "WARNING: reportlab/pypdf did not install. PDF builds will be skipped; everything else works."
fi
python3 - <<'PY'
import sys
print("python", sys.version.split()[0])
for m in ("reportlab", "pypdf"):
    try:
        __import__(m); print(m, "ok")
    except Exception as e:
        print(m, "MISSING:", e)
PY
echo "Next: bash scripts/release_check.sh"
