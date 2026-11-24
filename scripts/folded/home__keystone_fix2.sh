#!/usr/bin/env bash
set -uo pipefail
cd ~/Keystone_Health
git switch chore/repo-hygiene >/dev/null 2>&1 || { echo "branch missing"; exit 1; }
OUT=~/keystone_fix2_$(date +%Y%m%d_%H%M%S).txt
exec > >(tee "$OUT") 2>&1
T=${TMPDIR:-$HOME/.tmp}; mkdir -p "$T"

echo "== A. ADR dir case -> docs/adr =="
if [ -d docs/ADR ] && [ ! -d docs/adr ]; then
  git mv docs/ADR docs/adr
  git grep -lzF 'docs/ADR/' | xargs -0 -r sed -i 's#docs/ADR/#docs/adr/#g'
  git add -u
  git diff --cached --quiet || git commit -qm "fix: docs/ADR -> docs/adr to match all links"
else echo "skip (already done or no docs/ADR)"; fi
git log --oneline -2

echo "== B. truncation check =="
wc -c framework.md README.md
tail -c 160 framework.md; echo

echo "== C. REF-ID rows by file =="
git grep -nE '^REF-[0-9]{3}[A-Z]?,' -- '*.md' | cut -c1-110 | head -40

echo "== D. stage file dumps -> ~/keystone_extract (repo untouched) =="
python3 - <<'PY'
import re, pathlib
repo = pathlib.Path.home()/"Keystone_Health"
out = pathlib.Path.home()/"keystone_extract"
srcs = ["All_files.md", "Keystone Health Repository Artifacts.md", "Scaffold Target Files.md"]
hdr = re.compile(r'^#{2,6}\s+(?:File\s+)?(?:\d+[.:]\s*)?`([^`\n]+)`\s*$')
fence = re.compile(r'^(`{3,}|~{3,})')
for src in srcs:
    p = repo/src
    if not p.exists(): continue
    L = p.read_text(encoding="utf-8", errors="ignore").splitlines()
    idx = [(i, m.group(1)) for i, l in enumerate(L) if (m := hdr.match(l))]
    print(f"-- {src}: {len(idx)} headers")
    for n, (i, path) in enumerate(idx):
        end = idx[n+1][0] if n+1 < len(idx) else len(L)
        body = L[i+1:end]
        o = next((k for k, l in enumerate(body) if fence.match(l)), None)
        if o is None: continue
        f = fence.match(body[o]).group(1)
        pat = re.escape(f[0]) + '{%d,}' % len(f)
        close = [k for k, l in enumerate(body) if k > o and re.fullmatch(pat, l.strip())]
        if not close: continue
        text = "\n".join(body[o+1:close[-1]]) + "\n"
        rel = path.strip().replace("docs/ADR/", "docs/adr/")
        if rel.startswith("/") or ".." in rel.split("/"): continue
        if "." not in rel.rsplit("/", 1)[-1]: continue
        dst = out/pathlib.Path(src).stem.replace(" ", "_")/rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        dst.write_text(text)
        cur = repo/rel
        st = "NEW" if not cur.exists() else ("SAME" if cur.read_text(errors="ignore") == text else "DIFF")
        print(f"{st:5} {len(text):7}B  {rel}")
PY

echo "== E. eCFR retention paragraphs =="
for s in 149.510 149.610; do
  echo "-- $s"
  f="$T/ecfr_$s.html"
  curl -fsSL "https://www.ecfr.gov/api/renderer/v1/content/enhanced/current/title-45?part=149&section=$s" -o "$f" \
    || { echo "fetch failed"; continue; }
  wc -c "$f"
  python3 - "$f" <<'PY'
import re, sys, html
s = open(sys.argv[1], encoding="utf-8", errors="ignore").read()
t = re.sub(r'<[^>]*?id="(p-[^"]+)"[^>]*>', r'\n[[\1]] ', s)
t = html.unescape(re.sub(r'<[^>]+>', ' ', t))
if '[[p-' not in t: print("NOTE: no paragraph ids; raw hits only")
for line in t.split('\n'):
    if re.search(r'\b(\d+|six)\s+years?\b', line, re.I):
        print(' '.join(line.split())[:260])
PY
done

echo "== F. schema PDF text (26 lines) =="
cat ~/keystone_pdf_text/quarterly_audit.schema.txt

sleep 1
echo; echo "report: $OUT"
command -v termux-clipboard-set >/dev/null && termux-clipboard-set < "$OUT" \
  && echo "copied to clipboard" || true
