#!/usr/bin/env python3
"""
home_audit.py – Secure staging helper for Termux / Android environments.

Key goals:
* Preserve zero‑copy hardlinks when the filesystem supports them.
* Gracefully fall back to a full copy on platforms that lack `os.link`.
* Keep inode‑safe semantics (never clobber the source).
* Honor the --max‑mb storage cap via `shutil.disk_usage`.
"""

import argparse
import hashlib
import json
import logging
import os
import shutil
import sys
from pathlib import Path
from typing import List

log = logging.getLogger("home_audit")
log.setLevel(logging.INFO)

# ----------------------------------------------------------------------
# Helper: storage‑cap verification (shared with existing script)
# ----------------------------------------------------------------------
def enough_space(dst: Path, max_mb: int) -> bool:
    """Return True if copying another file of size ≤ max_mb keeps us under the quota."""
    usage = shutil.disk_usage(dst.parent)
    free_mb = usage.free // (1024 * 1024)
    return free_mb >= max_mb

# ----------------------------------------------------------------------
# Resilient staging function – the core of the patch
# ----------------------------------------------------------------------
def stage_file(src: Path, dst: Path, max_mb: int) -> bool:
    """
    Stage a single file from ``src`` to ``dst``.

    * Tries a hard‑link first (zero extra space).
    * If ``os.link`` is missing or fails (e.g., cross‑device, sandbox), falls back to ``shutil.copy2``.
    * Returns True on success, False on unrecoverable error.
    """
    # Ensure destination directory hierarchy exists
    dst.parent.mkdir(parents=True, exist_ok=True)

    # Remove any stale file or symlink at the target location
    if dst.exists() or dst.is_symlink():
        dst.unlink()

    # Guard against exceeding the user‑specified storage ceiling
    if not enough_space(dst, max_mb):
        log.error("Insufficient free space to stage %s (max %d MB)", src, max_mb)
        return False

    try:
        # 1️⃣ Feature‑detect hard‑link capability
        if hasattr(os, "link"):
            try:
                os.link(src, dst)          # Zero‑copy path
                log.debug("Hard‑linked %s → %s", src, dst)
                return True
            except OSError as e:
                # Typical on Android/Termux when the underlying FS disallows hardlinks
                log.debug("os.link failed (%s); falling back to copy2", e)

        # 2️⃣ Fallback copy (preserves metadata)
        shutil.copy2(src, dst)
        log.debug("Copied %s → %s", src, dst)
        return True

    except Exception as exc:
        log.error("Failed to stage %s → %s: %s", src, dst, exc)
        return False

# ----------------------------------------------------------------------
# Main orchestration (simplified example)
# ----------------------------------------------------------------------
def main(argv: List[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Stage files with hard‑link fallback.")
    parser.add_argument("--src-dir", required=True, help="Directory containing source files")
    parser.add_argument("--dst-dir", required=True, help="Target staging directory")
    parser.add_argument(
        "--max-mb",
        type=int,
        default=200,
        help="Maximum MB of free space required before staging each file",
    )
    args = parser.parse_args(argv)

    src_root = Path(args.src_dir).expanduser().resolve()
    dst_root = Path(args.dst_dir).expanduser().resolve()

    if not src_root.is_dir():
        log.critical("Source directory does not exist: %s", src_root)
        sys.exit(1)

    staged = 0
    for src_path in src_root.rglob("*"):
        if src_path.is_file():
            rel = src_path.relative_to(src_root)
            dst_path = dst_root / rel
            if stage_file(src_path, dst_path, args.max_mb):
                staged += 1
            else:
                log.warning("Skipping %s due to staging error", src_path)

    log.info("Staging complete: %d files processed", staged)


if __name__ == "__main__":
    logging.basicConfig(
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
        level=logging.INFO,
    )
    try:
        main()
    except KeyboardInterrupt:
        log.info("Interrupted by user")
        sys.exit(130)
    except Exception as e:
        log.exception("Fatal error in home_audit: %s", e)
        sys.exit(1)
