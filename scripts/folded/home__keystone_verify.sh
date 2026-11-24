#!/usr/bin/env bash
set -uo pipefail
cd ~/Keystone_Health
OUT=~/keystone_verify_$(date +%Y%m%d_%H%M%S).txt
exec > >(tee "$OUT") 2>&1
T=${TMPDIR:-$HOME/.tmp}; mkdir -p "$T"
git fetch -q origin

echo "== 1. branch / PR =="
git status -sb | head -3
git log --oneline -8
gh pr view 7 --json state,mergeable,changedFiles,additions,deletions \
  --jq '"state=\(.state) mergeable=\(.mergeable) files=\(.changedFiles) +\(.additions) -\(.deletions)"'
gh pr checks 7 2>&1 | head -12
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/chore/repo-hygiene)" ] \
  && echo "local == remote" || echo "LOCAL != REMOTE"

echo "== 2. validator, real run =="
out=$(python3 audit/validate_audit.py --schema schema/quarterly_audit.schema.json --input audit/quarterly_audit.yaml 2>&1); rc=$?
case "$out" in *usage:*) out=$(python3 audit/validate_audit.py audit/quarterly_audit.yaml 2>&1); rc=$?;; esac
echo "$out" | tail -12; echo "rc=$rc"
python3 - <<'PY'
import collections
try:
    import yaml
    d = yaml.safe_load(open("audit/quarterly_audit.yaml"))
    A = [a for c in d["controls"] for a in c["assertions"]]
    print("version:", d["audit"].get("version"), "| assertions:", len(A))
    print("basis:", dict(collections.Counter(a.get("basis") for a in A)))
except Exception as e:
    print("yaml summary failed:", e)
PY

echo "== 3. README tree vs reality =="
while read -r p; do
  [ -e "$p" ] && echo "ok $p" || echo "MISSING $p"
done > "$T/tree.txt" <<'LIST'
LICENSE
CHANGELOG.md
CODEOWNERS
.linkcheckignore
.github/workflows/validate-audit.yml
.github/workflows/link-check.yml
.github/workflows/hash-chain-verify.yml
.github/workflows/retention-expiry-report.yml
schema/quarterly_audit.schema.json
schema/evidence_record.schema.json
schema/retention_class.schema.json
audit/quarterly_audit.yaml
audit/validate_audit.py
audit/fixtures/production_shaped.yaml
audit/fixtures/expected_output.txt
references/REFERENCES.csv
references/references.yaml
references/retention_classes.yaml
compliance/matrix/control_matrix.csv
compliance/evidence/README.md
compliance/mappings/tma_vacatur_provisions.yaml
compliance/mappings/fceua_fdcpa_utpcpl.yaml
runbook/DEPLOYMENT_RUNBOOK.md
runbook/ROLLBACK_MATRIX.md
runbook/COMMUNICATION_PLAN.md
docs/verification-log.md
docs/open-items.md
docs/glossary.md
docs/case-law/tma-litigation-tracker.md
docs/adr/0001-split-ref-008.md
docs/adr/0002-atomic-citation-rows.md
docs/adr/0003-evidence-immutability.md
tools/hash_chain_verify.py
tools/retention_migrate.py
tools/expiry_diff.py
tools/tsa_verify.py
LIST
grep -c '^ok' "$T/tree.txt" | sed 's/^/present: /'
grep '^MISSING' "$T/tree.txt"

echo "== 4. stray cites (should NOT be in the core refs) =="
git grep -nE '164\.(502|514|530)' -- references audit schema || echo "none in references/audit/schema"
echo "-- 33871PA locations:"; git grep -lE '33871PA' || echo none

echo "== 5. secret scan =="
git ls-files -z | xargs -0 grep -IEn -e 'BEGIN [A-Z ]*PRIVATE KEY' -e 'ghp_[A-Za-z0-9]{20,}' \
  -e 'AKIA[0-9A-Z]{16}' || echo "none found"

sleep 1; echo; echo "report: $OUT"
command -v termux-clipboard-set >/dev/null && termux-clipboard-set < "$OUT" && echo "copied to clipboard"
