#!/usr/bin/env bash
set -euo pipefail
cd ~/pixel-terminal-master

BACKUP="$HOME/pixel-terminal-master.$(date +%Y%m%d_%H%M%S).tgz"
LOG="$HOME/pixel_diagnostic_$(date +%Y%m%d_%H%M%S).txt"

echo "Creating backup: $BACKUP"
tar -czf "$BACKUP" --exclude=.git . 2>/dev/null || true

{
echo "=========================================="
echo "PIXEL TERMINAL DIAGNOSTICS"
echo "Date: $(date)"
echo "=========================================="
echo; echo "--- [1] shutdown_gracefully references ---"
grep -rn 'shutdown_gracefully' . --include='*.sh' 2>/dev/null || echo "NOT FOUND ANYWHERE"

echo; echo "--- [2] idle_monitor.sh full contents ---"
cat lib/idle_monitor.sh 2>/dev/null || echo "FILE MISSING: lib/idle_monitor.sh"

echo; echo "--- [3] Where idle_monitor is sourced ---"
grep -rn 'source.*idle_monitor\|\. .*idle_monitor' . --include='*.sh' 2>/dev/null || echo "NOT SOURCED ANYWHERE"

echo; echo "--- [4] PID-based idle file ($$) ---"
grep -rn 'pixel_terminal_idle_\$\$\|/tmp/pixel.*idle' . --include='*.sh' 2>/dev/null || echo "NOT FOUND"

echo; echo "--- [5] EXIT traps in sourced files ---"
grep -rn 'trap.*EXIT' lib/ addons/ . --include='*.sh' 2>/dev/null | head -20 || echo "NONE FOUND"

echo; echo "--- [6] Mangled escapes (\\\$ and \\\\_) ---"
grep -rn '\\\$\\|\\\\_' addons/3_resource_gate.sh lib/ --include='*.sh' 2>/dev/null | head -20 || echo "CLEAN"

echo; echo "--- [7] 3_resource_gate.sh lines 40-65 ---"
nl -ba addons/3_resource_gate.sh 2>/dev/null | sed -n '40,65p' || echo "FILE MISSING"

echo; echo "--- [8] timeout_wrapper.sh contents ---"
cat lib/timeout_wrapper.sh 2>/dev/null || echo "FILE MISSING"

echo; echo "--- [9] Battery gate check ---"
nl -ba install_addons.sh 2>/dev/null | sed -n '43,69p' || echo "SECTION MISSING"

} | tee "$LOG"
echo; echo "Full log: $LOG"
