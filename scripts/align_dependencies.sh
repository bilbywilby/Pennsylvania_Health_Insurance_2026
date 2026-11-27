#!/usr/bin/env bash
set -euo pipefail
umask 077

REPO_ROOT="${REPO_ROOT:-${HOME}/pa_health_repos/PA_Health_Folded_2026}"
PKG_PATH="${REPO_ROOT}/sources/keystone-sync/package.json"
APP_DIR="${REPO_ROOT}/sources/keystone-sync"
MANIFEST_PATH="${REPO_ROOT}/MANIFEST.sha256"

TARGET_VER="19.3.1"
TYPES_REACT_DOM_SPEC="^19.0.0"
APPLY=0
SYNC_LOCK=0

usage() {
  cat << 'USAGE'
Usage: align_dependencies.sh [--target-version <ver>] [--types-react-dom-version <spec>] [--apply] [--sync-lock]

  --target-version <ver>            Semver version (default: 19.3.1) for react, react-dom, and @types/react (written with '^').
  --types-react-dom-version <spec>  Version spec for @types/react-dom (default: ^19.0.0).
  --apply                           Write changes to package.json and refresh MANIFEST.sha256. Default is dry-run only.
  --sync-lock                       Run 'bun install --lockfile-only --ignore-scripts' in sources/keystone-sync when --apply is set (skipped on Android/Termux).
USAGE
}

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --target-version)
      [[ "$#" -ge 2 ]] || { echo "ERROR: --target-version requires an argument" >&2; exit 2; }
      TARGET_VER="$2"
      shift 2
      ;;
    --types-react-dom-version)
      [[ "$#" -ge 2 ]] || { echo "ERROR: --types-react-dom-version requires an argument" >&2; exit 2; }
      TYPES_REACT_DOM_SPEC="$2"
      shift 2
      ;;
    --apply)
      APPLY=1
      shift
      ;;
    --sync-lock)
      SYNC_LOCK=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "ERROR: Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

[[ -f "${PKG_PATH}" ]] || { echo "ERROR: Missing ${PKG_PATH}" >&2; exit 1; }
[[ -d "${REPO_ROOT}/.git" ]] || { echo "ERROR: ${REPO_ROOT} is not a git repository" >&2; exit 1; }

python3 - "${PKG_PATH}" "${TARGET_VER}" "${TYPES_REACT_DOM_SPEC}" "${APPLY}" << 'PYEOF'
import json
import sys
from pathlib import Path

pkg_path = Path(sys.argv[1])
target_ver = sys.argv[2].lstrip("^")
types_react_dom_spec = sys.argv[3]
apply_changes = sys.argv[4] == "1"
default_spec = f"^{target_ver}"

data = json.loads(pkg_path.read_text(encoding="utf-8"))
sections = ("dependencies", "devDependencies", "peerDependencies", "optionalDependencies")
targets = ("react", "react-dom", "@types/react", "@types/react-dom")

def desired_for(pkg_name: str) -> str:
    return types_react_dom_spec if pkg_name == "@types/react-dom" else default_spec

found = {}
for sec in sections:
    block = data.get(sec)
    if isinstance(block, dict):
        for pkg in targets:
            if pkg in block:
                found[(sec, pkg)] = block[pkg]

print("Current React dependency entries:")
if not found:
    print("  (none found)")
else:
    for (sec, pkg), ver in sorted(found.items()):
        want = desired_for(pkg)
        marker = "OK" if ver == want else f"MISMATCH -> {want}"
        print(f"  [{sec}] {pkg}: {ver}  ({marker})")

mismatches = [(sec, pkg, ver, desired_for(pkg)) for (sec, pkg), ver in found.items() if ver != desired_for(pkg)]
if not mismatches:
    print("All present React/type entries already match target specs.")
    sys.exit(0)

if not apply_changes:
    print(f"Dry-run only: {len(mismatches)} entry/entries would be updated. Pass --apply to write.")
    sys.exit(0)

for sec, pkg, _, want in mismatches:
    data[sec][pkg] = want

pkg_path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
print(f"Updated {len(mismatches)} entry/entries in {pkg_path}.")
PYEOF

if [[ "${APPLY}" -eq 1 ]]; then
  IS_ANDROID=0
  if [[ "$(uname -o 2>/dev/null || true)" == "Android" ]] || [[ -n "${TERMUX_VERSION:-}" ]]; then
    IS_ANDROID=1
  fi

  if [[ "${SYNC_LOCK}" -eq 1 ]]; then
    if [[ "${IS_ANDROID}" -eq 1 ]]; then
      echo "WARN: Skipping --sync-lock on Android/Termux to avoid native workerd/platform lockfile churn; run on Linux/x86_64 or CI."
    elif command -v bun >/dev/null 2>&1; then
      (cd "${APP_DIR}" && bun install --lockfile-only --ignore-scripts)
      rm -f "${APP_DIR}/.bootstrap-complete"
    else
      echo "WARN: 'bun' not found in PATH; skipping lockfile sync."
    fi
  fi

  tmp_manifest="$(mktemp "${REPO_ROOT}/.MANIFEST.sha256.XXXXXX")"
  trap 'rm -f "${tmp_manifest:-}"' EXIT

  (
    cd "${REPO_ROOT}"
    git ls-files -z -- . ':(exclude)MANIFEST.sha256' | xargs -0 sha256sum > "${tmp_manifest}"
    mv -f "${tmp_manifest}" "${MANIFEST_PATH}"
    chmod 0600 "${MANIFEST_PATH}"
    sha256sum -c "${MANIFEST_PATH}" --quiet && echo "MANIFEST_OK"
  )
fi
# Refresh repository manifest after dependency alignment
bash ./scripts/refresh_manifest.sh
