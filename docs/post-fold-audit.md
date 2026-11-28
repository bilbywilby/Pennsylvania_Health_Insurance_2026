# Post-Fold Repository Audit Note

**Repository:** `bilbywilby/Pennsylvania_Health_Insurance_2026` (`PA_Health_Folded_2026`)  
**Baseline:** `v2026.11.27-react-19` through fold/CI remediation on `main`

## 1. What Diverged During Folding
- Pre-fold duplicate/legacy trees (`sources/pennsylvania-health-insurance-audit-2026/`, `sources/projects/keystone_health/`, old `templates/`, and legacy `github/workflows/python-ci.yml`) were pruned or consolidated into the canonical repository layout (`addons/exports/appeal_bundle.json`, `sources/keystone-sync/`, `HANDOVER.json`, `HANDOVER.md`).
- Stray/working artifacts (`FOLD_MANIFEST.json.bak`, `split_chunks/`, `'calculation for CPT code 99214 (Office'`, `flattened_scripts_folded`, `nested_sources_snapshot`) were moved to read-only quarantine (`~/pa_health_quarantine_20261128/`) rather than restored; `.coverage` and `t.py` were untracked and ignored.
- Historical references to `HANDOVER.json` under `scripts/folded/` belong to frozen archive snapshots; `.wrangler`, `.bootstrap-complete`, and `dist` references in scripts are conditional/cleanup checks.

## 2. Reconciler Bug & Manifest Fixes
- **Dotfile path handling:** `reconcile_fold_manifest.py` previously used `str.lstrip("./")`, which stripped characters from dot-prefixed paths (such as `.github/workflows/*`, `.gitignore`, and `.gitattributes`). Switching to `str.removeprefix("./")` aligned manifest keys with `walk_repo_files()`.
- **Self-exclusion & atomic writes:** Excluded self-referential manifest files (`FOLD_MANIFEST.sha256`) and ephemeral artifacts (`.coverage`) from manifest tracking, writing `FOLD_MANIFEST.json` atomically (`umask 0o077`, `0o600` mode).
- **Retired stale `MANIFEST.sha256`:** Removed the superseded `884 KB` pre-fold `MANIFEST.sha256` (~3,654 stale entries) and its workflow check so `FOLD_MANIFEST.json` + `FOLD_MANIFEST.sha256` serve as the single canonical attestation.

## 3. Appeal Bundle & CI Alignment
- `scripts/check_appeal_bundle.js` now defaults `APPEAL_BUNDLE_PATH` to `addons/exports/appeal_bundle.json` (validating top-level schema keys and `schema_version === 1`) and skips the `AppealWizard.tsx` cross-check with a warning when `APPEAL_WIZARD_PATH` is absent.
- Both `ci` (`verify`) and `python-ci` pass on `main`.
- **Non-blocking note:** `actions/checkout@v4` emits a Node.js 20 deprecation warning; bump to `actions/checkout@v5` alongside a future workflow change.

## 4. Current Verification Invariant
1. Every canonical tracked file (excluding excluded manifest/ephemeral files) is indexed once in `FOLD_MANIFEST.json` with `0` duplicates, `0` missing files, `0` SHA-256 mismatches, and `0` untracked strays (`python3 reconcile_fold_manifest.py`).
2. `sha256sum -c FOLD_MANIFEST.sha256 --quiet` exits `0`.
3. Local test suite (`pytest -q tests`), `node scripts/check_appeal_bundle.js`, and GitHub Actions (`ci` and `python-ci` on `main`) pass without drift.
