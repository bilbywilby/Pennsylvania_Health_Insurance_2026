#!/usr/bin/env bash
set -u
cd ~/Keystone_Health || exit 1
OUT=~/keystone_triage_$(date +%Y%m%d_%H%M%S).txt
{
echo "== git =="; git status -sb; git log --oneline -5
echo; echo "== .gitignore =="; cat .gitignore
echo; echo "== odd names (no ext / spaces / (1)) =="
git ls-files | awk -F/ '$NF !~ /\./ {print "noext: " $0}'
git ls-files | grep -E ' |\(1\)' | sed 's/^/odd: /'
echo; echo "== exact duplicates =="
git ls-files -z | xargs -0 sha256sum | sort | uniq -w64 -D
echo; echo "== pdfs =="; git ls-files | grep -iE '\.pdf$'
echo; echo "== quarterly_audit files =="; git ls-files | grep -i quarterly
echo; echo "== validator inputs =="
python3 -c "import ast;ast.parse(open('validate_audit.py').read());print('parses ok')"
grep -nE 'argparse|argv|add_argument|open\(|yaml|json|schema' validate_audit.py | head -25
echo; echo "== secret scan =="
git ls-files -z | xargs -0 grep -IEn \
  -e 'BEGIN [A-Z ]*PRIVATE KEY' -e 'ghp_[A-Za-z0-9]{20,}' \
  -e 'AKIA[0-9A-Z]{16}' -e 'xox[baprs]-[A-Za-z0-9-]+' || echo "none found"
echo; echo "== 149.510 / 149.610 cite variants =="
git ls-files -z | xargs -0 grep -IoH -E '149\.(510|610)(\([A-Za-z0-9]+\))*' \
  | sort | uniq -c | sort -rn
echo; echo "== REF-ID cross-check =="
python3 - <<'PY'
import re, subprocess
fs = [f for f in subprocess.run(['git','ls-files','-z'],capture_output=True,
      text=True).stdout.split('\0') if f and not f.lower().endswith('.pdf')]
ids = {}
for f in fs:
    t = open(f, encoding='utf-8', errors='ignore').read()
    for m in set(re.findall(r'REF-\d{3}[A-Z]?', t)):
        ids.setdefault(m, set()).add(f)
defined = {k for k, v in ids.items() if 'References.md' in v}
used = {k for k, v in ids.items() if v - {'References.md'}}
print('defined, never used elsewhere:', sorted(defined - used))
print('used elsewhere, not in References.md:', sorted(used - defined))
PY
} 2>&1 | tee "$OUT"
echo; echo "report: $OUT"
command -v termux-clipboard-set >/dev/null && termux-clipboard-set < "$OUT" && echo "copied to clipboard"
