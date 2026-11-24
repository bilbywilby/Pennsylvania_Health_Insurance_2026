"""Add-on and manifest integrity checker.

Verifies that FOLD_MANIFEST.sha256 matches the manifest and that each add-on
file's recorded SHA-256 matches the file on disk. Run after every fold.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

MANIFEST = "FOLD_MANIFEST.json"
DIGEST = "FOLD_MANIFEST.sha256"


def _sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _file_sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def verify(repo_root: Path) -> dict[str, object]:
    root = Path(repo_root)
    manifest_path = root / MANIFEST
    digest_path = root / DIGEST
    if not manifest_path.is_file() or not digest_path.is_file():
        raise FileNotFoundError("Manifest or digest file missing")

    raw = manifest_path.read_bytes()
    actual = _sha256_bytes(raw)
    expected = digest_path.read_text(encoding="utf-8").strip().split()[0]
    manifest_ok = actual == expected

    manifest = json.loads(raw.decode("utf-8"))
    files = manifest.get("files", {})
    addon_entries: dict[str, dict[str, object]] = {}
    mismatched: list[str] = []

    pairs: list[tuple[str, object]] = (
        list(files.items()) if isinstance(files, dict)
        else [(str(e.get("path")), e) for e in files if isinstance(e, dict)]
    )
    for rel, entry in pairs:
        if not str(rel).startswith("addons/"):
            continue
        rec = entry.get("sha256") if isinstance(entry, dict) else entry
        full = root / str(rel)
        if not full.is_file() or _file_sha256(full) != rec:
            mismatched.append(str(rel))
        else:
            addon_entries[str(rel)] = {"sha256": rec, "intact": True}

    return {"manifest_digest_ok": manifest_ok,
            "addon_files_checked": len(addon_entries) + len(mismatched),
            "mismatched": mismatched}
