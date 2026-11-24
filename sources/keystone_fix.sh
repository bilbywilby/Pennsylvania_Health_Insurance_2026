#!/usr/bin/env bash
set -euo pipefail
cd ~/Keystone_Health
OUT=~/keystone_fix_$(date +%Y%m%d_%H%M%S).txt
exec > >(tee "$OUT") 2>&1

echo "== 1. backup =="
mkdir -p ~/backups
git bundle create ~/backups/keystone_pre_cleanup.bundle --all
git bundle verify ~/backups/keystone_pre_cleanup.bundle

echo "== 2. branch =="
git switch -c chore/repo-hygiene 2>/dev/null || git switch chore/repo-hygiene

echo "== 3. remove byte-identical dupes =="
rm_if_same() {
  cmp -s "$1" "$2" && git rm -q -- "$1" && echo "removed: $1" \
    || echo "KEPT (differs/missing): $1"
}
rm_if_same "CI Workflows.md (1)" "CI Workflows.md"
rm_if_same 0002-atomic-citation-discipline.md docs/ADR/0002-atomic-citation-discipline.md
rm_if_same 0003-evidence-immutability.md docs/ADR/0003-evidence-immutability.md

echo "== 4. inbound refs to removed paths (review) =="
git grep -nF -e '0002-atomic-citation' -e '0003-evidence-immutability' \
  -e 'CI Workflows.md (1)' || echo none

echo "== 5. .gitignore =="
for p in '__pycache__/' '*.pyc' '.env' '*.pem' '*.key' 'keystone_triage_*.txt'; do
  grep -qxF -- "$p" .gitignore || echo "$p" >> .gitignore
done
git add .gitignore
git diff --cached --quiet || git commit -qm "chore: drop byte-identical dupes, harden .gitignore"
git log --oneline -1

echo "== 6. missing artifacts elsewhere on device =="
find ~ -maxdepth 5 \( -name 'quarterly_audit*' -o -iname 'REFERENCES*.csv' \) \
  -not -path "$HOME/Keystone_Health/*" -not -path '*/.cache/*' 2>/dev/null || true

echo "== 7. PDF text -> ~/keystone_pdf_text =="
command -v pdftotext >/dev/null || pkg install -y poppler >/dev/null
mkdir -p ~/keystone_pdf_text
for f in quarterly_audit.schema.pdf "Healthcare Compliance CSV Finalization.pdf"; do
  pdftotext -layout "$f" ~/keystone_pdf_text/"${f%.pdf}.txt" \
    && wc -l ~/keystone_pdf_text/"${f%.pdf}.txt"
done

echo "== 8. eCFR ground truth: retention paragraphs =="
for s in 149.510 149.610; do
  echo "-- $s"
  u="https://www.ecfr.gov/api/renderer/v1/content/enhanced/current/title-45?part=149&section=$s"
  curl -fsSL "$u" -o /tmp/ecfr_$s.html || { echo "fetch failed: $u"; continue; }
  python3 - "$s" <<'PY'
import re, sys, html
s = open(f"/tmp/ecfr_{sys.argv[1]}.html", encoding="utf-8", errors="ignore").read()
t = re.sub(r'<[^>]*?id="(p-[^"]+)"[^>]*>', r'\n[[\1]] ', s)
t = html.unescape(re.sub(r'<[^>]+>', ' ', t))
for line in t.split('\n'):
    if re.search(r'\b(\d+|six)\s+years?\b', line, re.I):
        print(' '.join(line.split())[:260])
PY
done

sleep 1
echo; echo "report: $OUT"
command -v termux-clipboard-set >/dev/null && termux-clipboard-set < "$OUT" \
  && echo "copied to clipboard" || true
