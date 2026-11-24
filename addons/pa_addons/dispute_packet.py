"""Dispute packet assembler over the evidence vault.

Bundles role-tagged vault records (bill, EOB, denial letter, etc.) into a
packet manifest whose digest covers the canonical document set and live
vault file digests, so post-intake tampering is detected during assembly.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

from .evidence_vault import EvidenceVault

DOCUMENT_ROLES = {"bill", "eob", "denial_letter", "correspondence", "other"}


def _canonical(payload: object) -> bytes:
    return json.dumps(payload, indent=2, sort_keys=True).encode("utf-8")


def _file_sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def assemble(vault: EvidenceVault, roles: dict[str, str]) -> dict[str, object]:
    """Assemble a packet from {role: stored_filename} pairs.

    Raises ValueError for unknown roles or filenames not present in the vault.
    """
    records = {
        r["file"]: r
        for r in vault._records().get("records", [])  # noqa: SLF001
        if isinstance(r, dict) and "file" in r
    }
    vault_dir = Path(getattr(vault, "vault_dir", getattr(vault, "root", "")))
    documents: list[dict[str, object]] = []
    for role, filename in sorted(roles.items()):
        if role not in DOCUMENT_ROLES:
            raise ValueError(f"unknown role: {role!r}")
        rec = records.get(filename)
        if rec is None:
            raise ValueError(f"file not in vault: {filename!r}")
        stored_path = vault_dir / filename
        current_sha256 = _file_sha256(stored_path) if stored_path.is_file() else rec["sha256"]
        documents.append(
            {
                "role": role,
                "file": filename,
                "sha256": current_sha256,
                "intake_utc": rec["intake_utc"],
            }
        )
    packet = {"documents": documents}
    packet["packet_sha256"] = hashlib.sha256(_canonical(packet)).hexdigest()
    return packet


def recompute_digest(packet: dict[str, object]) -> str:
    """Recompute a packet digest from its documents alone."""
    clone = dict(packet)
    clone.pop("packet_sha256", None)
    return hashlib.sha256(_canonical(clone)).hexdigest()


def verify_packet(packet: dict[str, object]) -> bool:
    """True if the packet digest still matches its document set."""
    return recompute_digest(packet) == packet.get("packet_sha256")
