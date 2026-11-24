#!/usr/bin/env bash
set -uo pipefail
cd ~/Keystone_Health || exit 1
git switch chore/repo-hygiene >/dev/null 2>&1 \
  || { echo "branch missing"; exit 1; }
OUT=~/keystone_fix4_$(date +%Y%m%d_%H%M%S).txt
exec > >(tee "$OUT") 2>&1
T=${TMPDIR:-$HOME/.tmp}; mkdir -p "$T" ~/backups
V=~/keystone_extract/All_files
[ -d "$V" ] || { echo "missing $V"; exit 1; }

echo "== 0. backup =="
B=~/backups/keystone_$(date +%Y%m%d_%H%M%S).bundle
git bundle create "$B" --all >/dev/null 2>&1 \
  && git bundle verify "$B" 2>&1 | head -1

echo "== 1. ADR leftovers (report only) =="
git ls-files 'docs/ADR/*' | while read -r f; do
  n="docs/adr/${f#docs/ADR/}"
  echo "-- $f vs $n"
  [ -e "$n" ] && diff -u "$n" "$f" | head -30
done
git ls-files | grep -E '^docs/adr/(docs|references)/'
cmp -s docs/adr/0002-atomic-citation-discipline.md \
  docs/adr/docs/adr/0002-atomic-citation-discipline.md \
  && echo "stray 0002: identical" || echo "stray 0002: differs/absent"

echo "== 2. validate staged set =="
cd "$V"
out=$(python3 audit/validate_audit.py \
  --schema schema/quarterly_audit.schema.json \
  --data audit/quarterly_audit.yaml 2>&1); rc=$?
echo "$out" | tail -15; echo "validator rc=$rc"
python3 - <<'PY'
import collections, csv, re
try:
    import yaml
    d = yaml.safe_load(open("audit/quarterly_audit.yaml"))
    print("yaml root:", type(d).__name__)
    if isinstance(d, dict):
        for k, v in d.items():
            print(" ", k, type(v).__name__,
                  len(v) if hasattr(v, "__len__") else v)
        C = d.get("controls") or []
        A = [a for c in C if isinstance(c, dict)
             for a in c.get("assertions", [])]
        print("controls:", len(C), "assertions:", len(A))
        print("basis:", dict(collections.Counter(
            a.get("basis") for a in A if isinstance(a, dict))))
        print("149.510/610:", sorted({m for a in A for m in
            re.findall(r"149\.(?:510|610)[()\w]*", str(a))}))
except Exception as e:
    print("yaml summary failed:", repr(e))
try:
    rows = list(csv.DictReader(
        open("references/REFERENCES.csv", encoding="utf-8")))
    print("csv rows:", len(rows),
          "cols:", list(rows[0]) if rows else None)
except Exception as e:
    print("csv summary failed:", repr(e))
PY

cd ~/Keystone_Health
if [ "$rc" -ne 0 ] && [ "${FORCE:-0}" != 1 ]; then
  echo "validator failed; NOT promoting (FORCE=1 to override)"
  sleep 1; exit 1
fi
git diff --cached --quiet || {
  echo "index not clean; abort"; git status -sb; sleep 1; exit 1; }

{ git ls-files; git ls-files -o --exclude-standard; } \
  | tr 'A-Z' 'a-z' | sort -u > "$T/lc_index"
promote() {
  ( cd "$V" && find . -type f | sed 's#^\./##' | sort ) \
  | grep -E "$1" | while read -r rel; do
    lc=$(printf '%s' "$rel" | tr 'A-Z' 'a-z')
    if [ -e "$rel" ]; then
      cmp -s "$V/$rel" "$rel" || echo "DIFF  $rel (untouched)"
    elif grep -qxF -- "$lc" "$T/lc_index"; then
      echo "SKIP  $rel (case-variant exists)"
    else
      mkdir -p "$(dirname "$rel")"
      cp "$V/$rel" "$rel"; git add -- "$rel"; echo "NEW   $rel"
    fi
  done
}
echo "== 3a. promote NEW (non-CI) =="; promote '^[^.]'
git diff --cached --quiet || git commit -qm \
  "feat: add audit checklist, schema, references, tools, runbook"
echo "== 3b. promote NEW CI =="; promote '^\.github/'
git diff --cached --quiet || git commit -qm \
  "ci: add audit validation and link-check workflows"

echo "== 4. validate in repo =="
[ -f audit/validate_audit.py ] && python3 audit/validate_audit.py \
  --schema schema/quarterly_audit.schema.json \
  --data audit/quarterly_audit.yaml 2>&1 | tail -8

if [ "${ECFR:-0}" = 1 ]; then
echo "== 5. eCFR paragraph ids =="
for s in 149.510 149.610; do
  f="$T/ecfr_$s.html"
  [ -s "$f" ] || curl -fsSL "https://www.ecfr.gov/api/renderer/v1/content/enhanced/current/title-45?part=149&section=$s" -o "$f" || { echo "fetch failed $s"; continue; }
  echo "-- $s"
  python3 - "$f" <<'PY'
import re, sys, html
s = open(sys.argv[1], encoding="utf-8", errors="ignore").read()
t = re.sub(r'<[^>]*?id="(p-[^"]+)"[^>]*>', r'\n[[\1]]\n', s)
t = html.unescape(re.sub(r'<[^>]+>', ' ', t))
last = '?'
for line in t.split('\n'):
    m = re.match(r'\s*\[\[(p-[^\]]+)\]\]', line)
    if m: last = m.group(1); continue
    h = re.search(r'\b(\d+|six)\s+years?\b', line, re.I)
    if h:
        a = max(0, h.start() - 150)
        print(last, '|', ' '.join(line[a:h.end() + 80].split()))
PY
done
fi

echo "== 6. state =="
git log --oneline -6; git status -sb | head -8
sleep 1; echo "report: $OUT"
command -v termux-clipboard-set >/dev/null \
  && termux-clipboard-set < "$OUT" && echo "copied to clipboard"
