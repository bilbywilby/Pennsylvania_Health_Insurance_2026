"""Atomic file writes with restricted 0o600 permissions for audit artifacts."""

from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path
from typing import Any


def atomic_write_text(target_path: str | Path, content: str, mode: int = 0o600) -> Path:
    """Write UTF-8 text atomically via temp file + os.replace with restricted mode."""
    target = Path(target_path)
    parent = target.parent
    parent.mkdir(parents=True, exist_ok=True)

    fd, tmp_name = tempfile.mkstemp(prefix=f".{target.name}.", suffix=".tmp", dir=str(parent))
    tmp_path = Path(tmp_name)
    try:
        os.chmod(tmp_path, mode)
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as handle:
            handle.write(content)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(tmp_path, target)
        os.chmod(target, mode)
    except Exception:
        try:
            tmp_path.unlink(missing_ok=True)
        except OSError:
            pass
        raise
    return target


def atomic_write_json(target_path: str | Path, data: Any, mode: int = 0o600) -> Path:
    """Serialize JSON deterministically and write atomically with restricted mode."""
    serialized = json.dumps(data, indent=2, sort_keys=True) + "\n"
    return atomic_write_text(target_path, serialized, mode=mode)
