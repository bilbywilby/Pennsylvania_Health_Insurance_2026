cat > ~keystone_sync.py <<'PYEOF'
#!/usr/bin/env python3
from __future__ import annotations

import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path

REPO_PATH = Path(os.environ.get(
    "KEYSTONE_REPO_PATH", Path.home() / "Keystone_Health_downloadable_files"))
STATE_DIR = Path(os.environ.get(
    "KEYSTONE_STATE_DIR", Path.home() / ".local/state/keystone_sync"))
LOG_FILE = STATE_DIR / "failures.log"

def ensure_secure_storage() -> None:
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    try:
        STATE_DIR.chmod(0o700)
    except OSError:
        pass
    if not LOG_FILE.exists():
        LOG_FILE.touch(mode=0o600, exist_ok=True)
    try:
        LOG_FILE.chmod(0o600)
    except OSError:
        pass

def log_failure(exit_code: int, stdout: str, stderr: str) -> None:
    ensure_secure_storage()
    ts = datetime.now().isoformat(timespec="seconds")
    entry = (
        f"[{ts}] SYNC_FAILURE | Exit Code: {exit_code}\n"
        f"STDOUT:\n{stdout.strip()}\n"
        f"STDERR:\n{stderr.strip()}\n"
        f"{'-' * 60}\n"
    )
    with LOG_FILE.open("a", encoding="utf-8") as f:
        f.write(entry)

def main() -> int:
    if not REPO_PATH.is_dir():
        print(f"[ERROR] Repository path not found: {REPO_PATH}", file=sys.stderr)
        return 2
    cmd = ["git", "-C", str(REPO_PATH), "pull", "origin", "main", "--ff-only"]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True,
                                check=False, timeout=300)
    except subprocess.TimeoutExpired:
        log_failure(124, "", "[TIMEOUT] git pull exceeded 300s")
        print("[ERROR] Sync timed out", file=sys.stderr)
        return 124
    except Exception as e:
        log_failure(1, "", f"EXCEPTION | {type(e).__name__}: {e}")
        print(f"[ERROR] {e}", file=sys.stderr)
        return 1
    if result.returncode != 0:
        log_failure(result.returncode, result.stdout, result.stderr)
        print(f"[ERROR] Sync failed (exit {result.returncode}), "
              f"logged to {LOG_FILE}", file=sys.stderr)
        return result.returncode
    print("[INFO] Git sync completed successfully.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
PYEOF
chmod 700 ~/keystone_sync.py
python3 ~/keystone_sync.py
