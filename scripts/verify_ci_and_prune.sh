#!/usr/bin/env bash
set -euo pipefail
umask 077

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CI_FILE="$REPO_ROOT/.github/workflows/ci.yml"
SYNC_DIR="$REPO_ROOT/sources/keystone-sync"
BUNDLE_GUARD="$REPO_ROOT/scripts/check_appeal_bundle.js"
REFRESH_SCRIPT="$REPO_ROOT/scripts/refresh_manifest.sh"

PRUNE_BUILD=1
PRUNE_NODE_MODULES=0
REFRESH_MANIFEST=0
DRY_RUN=0

usage() {
    cat << 'USAGE'
Usage: ./scripts/verify_ci_and_prune.sh [options]

Options:
  --keep-build          Do not prune temporary build/bootstrap/cache artifacts
  --prune-node-modules  Also prune sources/keystone-sync/node_modules (reclaims Termux disk space)
  --refresh-manifest    Run ./scripts/refresh_manifest.sh if manifest-tracked paths change
  --dry-run             Show targets and checks without deleting files or running manifest refresh
  -h, --help            Show this help message
USAGE
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --keep-build) PRUNE_BUILD=0 ;;
        --prune-node-modules) PRUNE_NODE_MODULES=1 ;;
        --refresh-manifest) REFRESH_MANIFEST=1 ;;
        --dry-run) DRY_RUN=1 ;;
        -h|--help) usage; exit 0 ;;
        *) echo "ERROR: Unknown option: $1" >&2; usage; exit 2 ;;
    esac
    shift
done

cd "$REPO_ROOT"

failures=0
warnings=0

pass() { echo "[PASS] $*"; }
warn() { warnings=$((warnings + 1)); echo "[WARN] $*"; }
fail() { failures=$((failures + 1)); echo "[FAIL] $*" >&2; }

echo "=== 1. CI Workflow & keystone-sync Alignment Check ==="

if [[ -f "$CI_FILE" ]]; then
    pass "Found CI workflow: .github/workflows/ci.yml"
else
    fail "Missing CI workflow: .github/workflows/ci.yml"
fi

if [[ -d "$SYNC_DIR" ]]; then
    pass "Found keystone-sync directory: sources/keystone-sync"
else
    fail "Missing keystone-sync directory: sources/keystone-sync"
fi

if [[ -f "$SYNC_DIR/package.json" ]]; then
    pass "Found sources/keystone-sync/package.json"
else
    fail "Missing sources/keystone-sync/package.json"
fi

if [[ -f "$SYNC_DIR/bun.lock" ]]; then
    pass "Found sources/keystone-sync/bun.lock"
else
    warn "No sources/keystone-sync/bun.lock found"
fi

if [[ -f "$BUNDLE_GUARD" ]]; then
    pass "Found appeal bundle guard: scripts/check_appeal_bundle.js"
else
    fail "Missing appeal bundle guard: scripts/check_appeal_bundle.js"
fi

if [[ -f "$CI_FILE" ]]; then
    if grep -Eq 'sources/keystone-sync' "$CI_FILE"; then
        pass "CI workflow references sources/keystone-sync"
    else
        fail "CI workflow does not reference sources/keystone-sync"
    fi

    if grep -Eq 'oven-sh/setup-bun|bun[[:space:]]+(install|ci|run)' "$CI_FILE"; then
        pass "CI workflow configures Bun setup/execution"
    else
        warn "CI workflow does not explicitly show Bun setup/execution steps"
    fi

    if grep -Eq 'check_appeal_bundle\.js' "$CI_FILE"; then
        pass "CI workflow invokes scripts/check_appeal_bundle.js"
    else
        warn "CI workflow does not explicitly invoke scripts/check_appeal_bundle.js"
    fi

    if grep -Eq 'typecheck|tsc[[:space:]]+--noEmit' "$CI_FILE"; then
        pass "CI workflow includes TypeScript typecheck"
    else
        warn "CI workflow does not explicitly mention typecheck or tsc --noEmit"
    fi

    if grep -Eq '(bun[[:space:]]+run[[:space:]]+build|vite[[:space:]]+build)' "$CI_FILE"; then
        pass "CI workflow includes a build step"
    else
        warn "CI workflow does not explicitly mention a build step"
    fi
fi

# Verify package.json scripts and React 19 / @types/react-dom alignment if python3 is available
if [[ -f "$SYNC_DIR/package.json" ]] && command -v python3 >/dev/null 2>&1; then
    python3 - "$SYNC_DIR/package.json" << 'PYEOF'
import json
import sys

pkg_path = sys.argv[1]
with open(pkg_path, "r", encoding="utf-8") as fh:
    data = json.load(fh)

scripts = data.get("scripts") or {}
for name in ("typecheck", "build"):
    if name in scripts:
        print(f"[PASS] package.json defines script '{name}': {scripts[name]}")
    else:
        print(f"[WARN] package.json missing script '{name}'")

deps = {}
for section in ("dependencies", "devDependencies"):
    sec = data.get(section) or {}
    if isinstance(sec, dict):
        deps.update(sec)

types_react_dom = deps.get("@types/react-dom")
if types_react_dom and ("^19.3.1" in types_react_dom or "=19.3.1" in types_react_dom):
    print(f"[WARN] @types/react-dom is pinned to {types_react_dom}; verify npm dist-tag availability (e.g. ^19.0.0)")
elif types_react_dom:
    print(f"[PASS] @types/react-dom constraint: {types_react_dom}")
PYEOF
fi

# Run non-workerd static guards when tools exist
if [[ -f "$BUNDLE_GUARD" ]] && command -v node >/dev/null 2>&1; then
    if node "$BUNDLE_GUARD"; then
        pass "Appeal bundle guard succeeded"
    else
        fail "Appeal bundle guard returned non-zero"
    fi
fi

if [[ -d "$SYNC_DIR" ]] && command -v bun >/dev/null 2>&1; then
    if (cd "$SYNC_DIR" && bun run typecheck); then
        pass "keystone-sync typecheck succeeded"
    else
        fail "keystone-sync typecheck failed"
    fi
fi

echo ""
echo "=== 2. Safe Build & Temporary Artifact Pruning ==="

# Strictly scoped to known temporary/build/bootstrap/cache targets; never touches source or git metadata
candidates=()
if [[ "$PRUNE_BUILD" -eq 1 ]]; then
    for rel in \
        "sources/keystone-sync/dist" \
        "sources/keystone-sync/.vite" \
        "sources/keystone-sync/.wrangler" \
        "sources/keystone-sync/.bootstrap-complete" \
        ".bootstrap-complete"
    do
        if [[ -e "$REPO_ROOT/$rel" ]]; then
            candidates+=("$rel")
        fi
    done
fi

if [[ "$PRUNE_NODE_MODULES" -eq 1 ]]; then
    if [[ -e "$REPO_ROOT/sources/keystone-sync/node_modules" ]]; then
        candidates+=("sources/keystone-sync/node_modules")
    fi
fi

removed_any=0
if [[ ${#candidates[@]} -eq 0 ]]; then
    echo "No temporary build or cache artifacts found to prune."
else
    for rel in "${candidates[@]}"; do
        target="$REPO_ROOT/$rel"
        # Safety check: ensure target resolves strictly inside REPO_ROOT and is not '.' or '.git'
        resolved="$(realpath "$target" 2>/dev/null || true)"
        repo_resolved="$(realpath "$REPO_ROOT")"
        if [[ -z "$resolved" || "$resolved" != "$repo_resolved/"* || "$rel" == ".git"* ]]; then
            warn "Skipped unsafe path guard check for: $rel"
            continue
        fi
        if [[ "$DRY_RUN" -eq 1 ]]; then
            echo "[DRY-RUN] Would remove: $rel"
        else
            rm -rf -- "$target"
            removed_any=1
            echo "[PRUNED] Removed: $rel"
        fi
    done
fi

echo ""
echo "=== 3. Manifest & Workspace Status ==="

if [[ "$REFRESH_MANIFEST" -eq 1 ]]; then
    if [[ -x "$REFRESH_SCRIPT" ]]; then
        if [[ "$DRY_RUN" -eq 1 ]]; then
            echo "[DRY-RUN] Would run: ./scripts/refresh_manifest.sh"
        else
            "$REFRESH_SCRIPT"
            pass "Manifest refreshed via ./scripts/refresh_manifest.sh"
        fi
    else
        warn "Manifest refresh requested, but ./scripts/refresh_manifest.sh is missing or not executable"
    fi
elif [[ "$removed_any" -eq 1 ]]; then
    warn "Artifacts were pruned; run with --refresh-manifest if any removed files were tracked in MANIFEST.sha256"
fi

if [[ "$failures" -gt 0 ]]; then
    echo "Completed with $failures failure(s) and $warnings warning(s)." >&2
    exit 1
fi

echo "Completed cleanly with 0 failure(s) and $warnings warning(s)."
