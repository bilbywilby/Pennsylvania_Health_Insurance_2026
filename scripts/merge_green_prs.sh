#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
umask 077

REPO="bilbywilby/Pennsylvania_Health_Insurance_2026"
REPO_DIR="${HOME}/pa_health_repos/PA_Health_Folded_2026"
PR_NUMBERS=(6 8 9 10 11)
MERGED_ANY=0

cd "${REPO_DIR}"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "ERROR: Working tree is not clean. Commit or stash changes first." >&2
  exit 1
fi

git pull --rebase origin main

for pr in "${PR_NUMBERS[@]}"; do
  pr_json="$(gh pr view "${pr}" --repo "${REPO}" --json number,state,headRefName,statusCheckRollup)"
  state="$(printf '%s' "${pr_json}" | python3 -c 'import json, sys; d = json.load(sys.stdin); print(d.get("state", ""))')"
  branch="$(printf '%s' "${pr_json}" | python3 -c 'import json, sys; d = json.load(sys.stdin); print(d.get("headRefName", ""))')"

  if [[ "${state}" != "OPEN" ]]; then
    echo "PR #${pr} (${branch}): state=${state} — skipping."
    continue
  fi

  check_summary="$(printf '%s' "${pr_json}" | python3 -c '
import json, sys
d = json.load(sys.stdin)
checks = d.get("statusCheckRollup") or []
if not checks:
    print("NO_CHECKS")
    sys.exit(0)
statuses = []
for c in checks:
    st = (c.get("status") or "").upper()
    conc = (c.get("conclusion") or "").upper()
    if st != "COMPLETED":
        statuses.append(f"IN_PROGRESS:{c.get(\"name\", \"check\")}:{st}")
    elif conc not in ("SUCCESS", "NEUTRAL", "SKIPPED"):
        statuses.append(f"FAILED:{c.get(\"name\", \"check\")}:{conc}")
if statuses:
    print("BLOCKED|" + ";".join(statuses))
else:
    print("GREEN")
')"

  if [[ "${check_summary}" == "GREEN" ]]; then
    echo "PR #${pr} (${branch}): all checks green — merging via squash..."
    gh pr merge "${pr}" --repo "${REPO}" --squash --delete-branch
    MERGED_ANY=1
  else
    echo "PR #${pr} (${branch}): ${check_summary} — skipping."
  fi
done

git pull --rebase origin main

git ls-files -z -- . ':(exclude)MANIFEST.sha256' | xargs -0 sha256sum > MANIFEST.sha256
chmod 0600 MANIFEST.sha256
sha256sum -c MANIFEST.sha256 --quiet && echo "MANIFEST_OK"

if [[ "${MERGED_ANY}" -eq 1 ]] || ! git diff --quiet MANIFEST.sha256; then
  git add MANIFEST.sha256
  git diff --cached --check
  if ! git diff --cached --quiet; then
    git commit -m "Refresh MANIFEST.sha256 after merging passing PRs"
    git push origin main
  else
    echo "No staged changes in MANIFEST.sha256 to commit."
  fi
else
  echo "No PRs merged and MANIFEST.sha256 unchanged."
fi

git status --short
