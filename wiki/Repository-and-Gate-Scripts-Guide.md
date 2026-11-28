# How the Wiki and Compliance Scripts Work Together

This guide explains how the consumer wiki pages and the compliance verification scripts in `PA_Health_Folded_2026` stay aligned so readers and maintainers can verify links and manifests cleanly.

## 1. Repository and Script Roles

- **Consumer Wiki (`Pennsylvania_Health_Insurance_2026.wiki`):** Holds plain-language guides, checklists, and Spanish companions covering billing statements, surprise bills, financial assistance, debt collection, Pennie enrollment (November 1, 2026 through January 15, 2027, with December 15, 2026 for January 1, 2027 coverage), and 2027 Pennsylvania Medicaid/MA updates (such as six-month renewals for some adults ages 19–64 and 80-hour monthly activity or exemption reporting starting January 1, 2027).
- **Folded Repository (`PA_Health_Folded_2026`):** Maintains canonical source/compliance files, `FOLD_MANIFEST.json`, `FOLD_MANIFEST.sha256`, and gate scripts (`scripts/check_fold_manifest.sh`, `scripts/check_wiki_links.sh`, `reconcile_fold_manifest.py`, and `scripts/audit_repo_and_scripts.sh`).

## 2. Running Verification Safely

1. **Check wiki internal links** against the wiki directory before committing (`bash scripts/check_wiki_links.sh "$WIKI_DIR"`).
2. **Reconcile and verify the manifest** in `PA_Health_Folded_2026` (`python3 reconcile_fold_manifest.py --write --refresh-sidecar`, `bash scripts/check_fold_manifest.sh`, and `sha256sum -c FOLD_MANIFEST.sha256 --quiet`).
3. **Audit scripts and syntax** with `bash scripts/audit_repo_and_scripts.sh` so shell and Python scripts stay valid and in sync.

## 3. Related Wiki Pages

- See [[Plain-English-Action-Guide]] and [[Guia-Accion-Paso-a-Paso]] for consumer action steps.
- See [[PY2027-Marketplace-and-Billing-Overview]] and [[Understanding-Medicaid-and-CHIP-Basics-in-PA]] for 2027 dates and coverage updates.
