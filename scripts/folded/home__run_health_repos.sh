#!/bin/sh
set -u
umask 077

echo "=== 1. Keystone_Health ==="
cd ~/Keystone_Health || exit 1
git status -sb
git log --oneline origin/main..main 2>/dev/null || echo "(no unpushed commits)"

if git diff --cached --quiet 2>/dev/null && git diff --quiet 2>/dev/null; then
  echo "Clean. Nothing to commit."
else
  git add -A
  git commit -m "chore: synchronize working tree"
  git push origin main
fi

echo ""
echo "=== 2. Forensic tool repo ==="
cd ~/keystone-health-advocate-pa-medical-rights-wiki-forensic-tool || exit 1

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Corrupt. Reinitializing..."
  rm -rf .git
  git init
  printf "node_modules/\n.venv/\n*.zip\n*.tar.gz\n*.bundle\nd3273a84*\n" > .gitignore
  git add -A
  git commit -m "restore: forensic tool repository"
  echo "Created. Push manually after creating repo on GitHub (private)."
  echo "  git remote add origin git@github.com:bilbywilby/keystone-health-advocate-pa-medical-rights-wiki-forensic-tool.git"
  echo "  git push -u origin main"
else
  echo "Repo intact."
  git add -A
  git commit -m "chore: update" 2>/dev/null || echo "(nothing to commit)"
fi

echo ""
echo "=== 3. pa_audit init ==="
cd ~/pa_audit || exit 1
if [ ! -d .git ]; then
  git init
  git add -A
  git commit -m "pa_audit: project skeleton"
  echo "Initialized."
else
  echo "Already versioned."
fi

echo ""
echo "=== 4. Quarantine check (manual review) ==="
for pair in "pa_nov2026_review:Pennsylvania_Health_Insurance_November_2026" \
            "pa_ra_onepagers:Keystone_Health" \
            "pa_audit_bundle:Keystone_Health"; do
  target="${pair%%:*}"
  ref="${pair##*:}"
  if [ -d ~/"$target" ] && [ -d ~/"$ref" ]; then
    t_count=$(find ~/"$target" -type f | wc -l)
    r_count=$(find ~/"$ref" -type f | wc -l)
    echo "$target: $t_count files | $ref: $r_count files"
    echo "  → Review manually before moving."
  fi
done

echo ""
echo "Done."   
