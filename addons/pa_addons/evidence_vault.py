"""Evidence vault with SHA-256 chain-of-custody records.

Hashes and timestamps documents at intake so a dispute packet assembled later
provably references the documents received that day. Mirrors the repository's
FOLD_MANIFEST integrity pattern at user-evidence granularity.
"""

from __future__ import annotations

import hashlib
import json
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path

MANIFEST_NAME = "vault_manifest.json"


def _sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def _atomic_write_json(path: Path, payload: dict[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    data = json.dumps(payload, indent=2, sort_keys=True).encode("utf-8") + b"\n"
    fd, tmp = tempfile.mkstemp(prefix=f".{path.name}.", dir=str(path.parent))
    try:
        with os.fdopen(fd, "wb") as fh:
            fh.write(data)
        os.chmod(tmp, 0o600)
        os.replace(tmp, path)
    except Exception:
        if os.path.exists(tmp):
            os.unlink(tmp)
        raise


class EvidenceVault:
    def __init__(self, vault_dir: Path) -> None:
        self.vault_dir = Path(vault_dir)
        self.manifest_path = self.vault_dir / MANIFEST_NAME

    def _records(self) -> dict[str, object]:
        if self.manifest_path.is_file():
            loaded = json.loads(self.manifest_path.read_text(encoding="utf-8"))
            return dict(loaded) if isinstance(loaded, dict) else {}
        return {"records": []}

    def add(self, file_path: Path, note: str = "") -> dict[str, object]:
        """Copy a document into the vault and record its hash + intake timestamp."""
        src = Path(file_path)
        if not src.is_file():
            raise FileNotFoundError(src)
        digest = _sha256(src)
        stamp = datetime.now(timezone.utc).isoformat()
        record = {"file": src.name, "sha256": digest, "size": src.stat().st_size,
                  "intake_utc": stamp, "note": note}
        stored = self.vault_dir / src.name
        self.vault_dir.mkdir(parents=True, exist_ok=True)
        stored.write_bytes(src.read_bytes())
        state = self._records()
        records = state.setdefault("records", [])  # type: ignore[typeddict-item]
        records.append(record)  # type: ignore[union-attr]
        _atomic_write_json(self.manifest_path, state)
        return record

    def verify(self) -> list[dict[str, object]]:
        """Recompute hashes for all stored records; mark mismatches."""
        state = self._records()
        results: list[dict[str, object]] = []
        for rec in state.get("records", []):  # type: ignore[union-attr]
            stored = self.vault_dir / str(rec["file"])  # type: ignore[index]
            ok = stored.is_file() and _sha256(stored) == rec["sha256"]  # type: ignore[index]
            results.append({"file": rec["file"], "intact": ok})  # type: ignore[index]
        return results
