#!/usr/bin/env bash
# ==============================================================================
# Script Name: pixel_opsec_audit.sh
# Description: Hardened, privacy-focused local OPSEC and diagnostic audit utility
#              for Android/Pixel native and Termux environments.
# Privacy Guarantee: 100% local execution. No network transmission, no root escalation.
# ==============================================================================

set -euo pipefail
umask 077

# Configuration & Safe Environment Defaults
SCRIPT_VERSION="2.0.0-hardened"
SAFE_HOME="${HOME:-/tmp}"
SAFE_TMPDIR="${TMPDIR:-/tmp}"
REPORT_DIR="${1:-${SAFE_HOME}/pixel_audit_reports}"
RUN_ID="audit_$(date -u +%Y%m%d_%H%M%S)_${RANDOM}"
STAGING_DIR=""
REPORT_FILE=""

# Cleanup trap for staging directory
cleanup() {
    if [ -n "${STAGING_DIR}" ] && [ -d "${STAGING_DIR}" ]; then
        rm -rf "${STAGING_DIR}"
    fi
}
trap cleanup EXIT

# Initialize secure staging directory
STAGING_DIR="$(mktemp -d "${SAFE_TMPDIR}/pixel_opsec_XXXXXX")"
chmod 0700 "${STAGING_DIR}"
REPORT_FILE="${STAGING_DIR}/opsec_report.md"

# Helper function for logging check status
log_status() {
    local status="$1"
    local check_name="$2"
    local details="$3"
    echo "- **[${status}]** \`${check_name}\`: ${details}" >> "${REPORT_FILE}"
}

# Helper function to check command existence safely
check_command() {
    local cmd="$1"
    if command -v "${cmd}" &>/dev/null; then
        return 0
    else
        return 1
    fi
}

# Initialize Report Header
cat << EOF > "${REPORT_FILE}"
# Android/Pixel Local OPSEC Audit Report
- **Version:** ${SCRIPT_VERSION}
- **Generated At (UTC):** $(date -u +"%Y-%m-%d %H:%M:%S")
- **Execution Mode:** Local-only read-only inspection (No root, no network transmission)
- **Run Identifier:** ${RUN_ID}

## 1. Environment & Platform Indicators
EOF

# --- Section 1: Shell & Environment Basics ---
log_status "COLLECTED" "shell_type" "${BASH_VERSION:-unknown bash}"
log_status "COLLECTED" "uname_info" "$(uname -a 2>/dev/null || echo 'unavailable')"

if check_command "getprop"; then
    android_sdk="$(getprop ro.build.version.sdk 2>/dev/null || echo 'unknown')"
    android_rel="$(getprop ro.build.version.release 2>/dev/null || echo 'unknown')"
    log_status "COLLECTED" "android_sdk" "SDK ${android_sdk}, Release ${android_rel}"
else
    log_status "UNAVAILABLE" "getprop" "Android system properties tool not accessible in this shell context."
fi

# --- Section 2: Tool Inventory Check ---
echo -e "\n## 2. Diagnostic Tool Inventory" >> "${REPORT_FILE}"
tools_to_check=("termux-info" "pkg" "apt" "dpkg" "git" "tmux" "dmesg" "journalctl" "w3m" "curl" "nc")
for tool in "${tools_to_check[@]}"; do
    if check_command "${tool}"; then
        version_info="$("${tool}" --version 2>/dev/null | head -n 1 || echo 'available')"
        log_status "AVAILABLE" "${tool}" "${version_info}"
    else
        log_status "UNAVAILABLE" "${tool}" "Tool not found in PATH."
    fi
done

# --- Section 3: Optional Git Repository Summary ---
echo -e "\n## 3. Local Git Status Summary" >> "${REPORT_FILE}"
target_repo="${SAFE_HOME}/pixel-terminal-master"
if [ -d "${target_repo}" ] && check_command "git"; then
    if git -C "${target_repo}" rev-parse --is-inside-work-tree &>/dev/null; then
        git_branch="$(git -C "${target_repo}" branch --show-current 2>/dev/null || echo 'detached')"
        git_status_summary="$(git -C "${target_repo}" status --porcelain 2>/dev/null | wc -l | tr -d ' ')"
        log_status "COLLECTED" "git_repo" "Path: ${target_repo} | Branch: ${git_branch} | Modified/Untracked files: ${git_status_summary}"
    else
        log_status "SKIPPED" "git_repo" "Path exists but is not a valid git work tree."
    fi
else
    log_status "SKIPPED" "git_repo" "Target repository path not found or git unavailable."
fi

# Footer / Integrity Guidance
cat << EOF >> "${REPORT_FILE}"

---
## Integrity Notice
This report was generated locally without privilege escalation or network transmission.
To verify report integrity locally:
\`sha256sum opsec_report.md\`
EOF

# Finalize: Create target output directory securely and move report atomically
mkdir -p "${REPORT_DIR}"
chmod 0700 "${REPORT_DIR}"
FINAL_REPORT_PATH="${REPORT_DIR}/pixel_opsec_audit_$(date -u +%Y%m%d_%H%M%S).md"

mv "${REPORT_FILE}" "${FINAL_REPORT_PATH}"
chmod 0600 "${FINAL_REPORT_PATH}"

echo "Audit completed successfully."
echo "Report safely written to: ${FINAL_REPORT_PATH}"
echo "Report SHA-256 Checksum: $(sha256sum "${FINAL_REPORT_PATH}" | awk '{print $1}')"
