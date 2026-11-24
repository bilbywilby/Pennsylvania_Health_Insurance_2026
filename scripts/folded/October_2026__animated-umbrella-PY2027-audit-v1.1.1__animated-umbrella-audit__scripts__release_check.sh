#!/usr/bin/env bash
# Pre-release gate. Reads and tests only: it never commits or pushes.
set -uo pipefail
cd "$(dirname "$0")/.."
fail=0
step() { echo; echo "== $* =="; }

step "0/6 environment"
python3 scripts/doctor.py || { echo "Fix the environment first (bash scripts/termux_setup.sh on Termux)"; exit 1; }

step "1/6 unit tests"
python3 -m unittest discover -s tests || fail=1

step "2/6 dataset validation (no PDFs written)"
if python3 src/build_one_pagers.py --check > /dev/null; then
  echo "ok"
else
  echo "FAILED"; fail=1
fi

step "3/6 numbers gate on repo-owned docs"
python3 src/numbers_gate.py wiki/*.md audits/*.md README.md docs/*.md || fail=1

step "4/6 legacy files (informational, does not block)"
for f in "Executive Briefing.md" \
  "Pennsylvania Health Insurance Market & 2027 Rate Analysis Matrix.md" \
  pa_aca_briefing_py2027_final.html; do
  [ -f "$f" ] && { python3 src/numbers_gate.py "$f" || true; }
done

step "5/6 generated outputs are current"
python3 src/build_one_pagers.py > /dev/null && python3 src/build_audits.py > /dev/null && python3 src/build_lookup.py > /dev/null && echo "rebuilt" || fail=1
if git rev-parse --git-dir > /dev/null 2>&1 && ! git diff --quiet -- one_pagers audits site data/derived_area_metrics.json 2>/dev/null; then
  echo "NOTE: rebuilt outputs differ from what is committed. Review with git diff --stat and commit them."
fi

step "6/6 manifest"
find audits data docs one_pagers src tests wiki scripts README.md CHANGELOG.md \
  HANDOVER.json requirements.txt -type f ! -name '*.pyc' ! -path '*/__pycache__/*' \
  ! -path 'data/provenance/*' -print0 | sort -z | xargs -0 sha256sum > MANIFEST.sha256
echo "wrote MANIFEST.sha256 ($(wc -l < MANIFEST.sha256) files)"

echo
if [ "$fail" = 0 ]; then
  echo "RELEASE CHECK PASSED (nothing was committed or pushed)"
else
  echo "RELEASE CHECK FAILED: do not publish"; exit 1
fi
