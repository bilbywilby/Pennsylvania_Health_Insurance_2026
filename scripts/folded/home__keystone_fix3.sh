#!/usr/bin/env bash
set -uo pipefail
cd ~/Keystone_Health
git switch chore/repo-hygiene >/dev/null 2>&1 || { echo "branch missing"; exit 1; }
OUT=~/keystone_fix3_$(date +%Y%m%d_%H%M%S).txt
exec > >(tee "$OUT") 2>&1
T=${TMPDIR:-$HOME/.tmp}; mkdir -p "$T"
V=~/keystone_extract/All_files
[ -d "$V" ] || { echo "run keystone_fix2.sh first"; exit 1; }

echo "== 0. backup =="
B=~/backups/keystone_$(date +%Y%m%d_%H%M%S).bundle
git bundle create "$B" --all >/dev/null 2>&1 && git bundle verify "$B" 2>&1 | head -1

echo "== 1. ADR case reconcile =="
git ls-files | grep -i '^docs/adr/' | sed 's/^/  /'
git ls-files 'docs/ADR/*' | while read -r f; do
  n="docs/adr/${f#docs/ADR/}"
  if [ -e "$n" ]; then
    if cmp -s "$f" "$n"; then git rm -q -- "$f"; echo "dupe removed: $f"
    else echo "CONFLICT kept both: $f vs $n"; fi
  else mkdir -p "$(dirname "$n")"; git mv -- "$f" "$n"; echo "moved: $f"; fi
done
git grep -lIF 'docs/ADR/' | while read -r f; do
  sed -i 's#docs/ADR/#docs/adr/#g' "$f"; git add -- "$f"; echo "relinked: $f"
done
git diff --cached --quiet || git commit -qm "fix: reconcile docs/ADR vs docs/adr, relink"

echo "== 2. validate staged set =="
python3 -c 'import yaml' 2>/dev/null || pip install -q pyyaml 2>&1 | tail -1
python3 -c 'import jsonschema' 2>/dev/null || { echo "installing jsonschema (may be slow or fail; non-fatal)"; pip install -q jsonschema 2>&1 | tail -1; }
cd "$V"
out=$(python3 audit/validate_audit.py --schema schema/quarterly_audit.schema.json --input audit/quarterly_audit.yaml 2>&1); rc=$?
case "$out" in *usage:*) out=$(python3 audit/validate_audit.py audit/quarterly_audit.yaml 2>&1); rc=$?;; esac
echo "$out" | tail -15; echo "validator rc=$rc"
python3 - <<'PY'
import collections, csv, re
try:
    import yaml
    d = yaml.safe_load(open("audit/quarterly_audit.yaml"))
    A = [a for c in d["controls"] for a in c["assertions"]]
    print("yaml version:", d["audit"].get("version"), "| controls:", len(d["controls"]), "| assertions:", len(A))
    print("basis:", dict(collections.Counter(a.get("basis") for a in A)))
    print("README claims: 33 assertions; law 17, internal_design 13, best_practice 1, secondary 2")
    print("149.510/610 cites in yaml:", sorted({m for a in A for m in re.findall(r"149\.(?:510|610)[()\w]*", str(a))}))
except Exception as e:
    print("yaml summary failed:", e)
try:
    rows = list(csv.DictReader(open("references/REFERENCES.csv")))
    print("csv rows:", len(rows), [r.get("Ref_ID") for r in rows])
except Exception as e:
    print("csv summary failed:", e)
PY

cd ~/Keystone_Health
if [ "$rc" -ne 0 ] && [ "${FORCE:-0}" != 1 ]; then
  echo "validator failed; NOT promoting (FORCE=1 to override)"; exit 1
fi
promote() {
  ( cd "$V" && find . -type f | sed 's#^\./##' | sort ) | grep -E "$1" | while read -r rel; do
    if [ ! -e "$rel" ]; then
      mkdir -p "$(dirname "$rel")"; cp "$V/$rel" "$rel"; git add -- "$rel"; echo "NEW   $rel"
    elif ! cmp -s "$V/$rel" "$rel"; then
      echo "DIFF  $rel  (untouched; review: git diff --no-index $rel $V/$rel)"
    fi
  done
}
echo "== 3a. promote NEW (non-CI) =="; promote '^[^.]'
git diff --cached --quiet || git commit -qm "feat: add audit checklist, schema, references, tools, runbook (staged from All_files.md)"
echo "== 3b. promote NEW CI workflows =="; promote '^\.github/'
git diff --cached --quiet || git commit -qm "ci: add audit validation and link-check workflows"

echo "== 4. eCFR paragraph ids =="
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

echo "== 5. state =="
git log --oneline -6; git status -sb | head -5; git diff --stat main..HEAD | tail -1
sleep 1; echo; echo "report: $OUT"
command -v termux-clipboard-set >/dev/null && termux-clipboard-set < "$OUT" \
  && echo "copied to clipboard" || true
