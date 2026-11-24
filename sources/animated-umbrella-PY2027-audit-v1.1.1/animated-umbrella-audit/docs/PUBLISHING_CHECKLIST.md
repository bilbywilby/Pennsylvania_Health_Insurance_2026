# Publishing checklist

Run in order. Stop at the first failure.

1. `bash scripts/release_check.sh` passes (tests, dataset validation, numbers gate, manifest).
2. `python3 src/numbers_gate.py` on every file you are about to publish, including any HTML briefing and the Executive Briefing. A FAIL means a number does not match PID's table or an unverified phrase is present.
3. Every UNVERIFIED item in `docs/CORRECTIONS.md` is either sourced to a primary page or absent from the published text.
4. `git status` shows only files you expect. No stray files (`bash scripts/quarantine_strays.sh` moves the known ones aside).
5. `git diff --cached --stat` reviewed. No placeholder commit messages.
6. Wiki: `bash scripts/install_wiki.sh`, review the diff, then push the wiki repo yourself.
7. Re-read the open enrollment dates against pennie.com on the day you publish.

The scripts in this repository never commit or push. Publishing is always a manual step.
