"""End-to-end chain-of-custody: intake -> vault -> dispute packet -> tamper check."""

from pathlib import Path

import pytest

from pa_addons import dispute_packet
from pa_addons.evidence_vault import EvidenceVault


def _intake(tmp_path: Path) -> tuple[EvidenceVault, dict[str, str]]:
    inbox = tmp_path / "inbox"
    inbox.mkdir()
    docs = {
        "bill.txt": "itemized hospital bill, 2026-11-02",
        "eob.txt": "EOB: allowed 480.00, paid 384.00",
        "denial.txt": "Adverse benefit determination: not medically necessary",
    }
    for name, content in docs.items():
        (inbox / name).write_text(content, encoding="utf-8")
    vault = EvidenceVault(tmp_path / "vault")
    roles = {"bill": "bill.txt", "eob": "eob.txt", "denial_letter": "denial.txt"}
    for fname in roles.values():
        vault.add(inbox / fname)
    return vault, roles


def test_full_chain_of_custody_flow(tmp_path):
    vault, roles = _intake(tmp_path)
    packet = dispute_packet.assemble(vault, roles)
    assert isinstance(packet["packet_sha256"], str) and len(packet["packet_sha256"]) == 64
    assert len(packet["documents"]) == 3
    assert {d["role"] for d in packet["documents"]} == {"bill", "eob", "denial_letter"}
    vault_hashes = {r["sha256"] for r in vault._records()["records"]}  # noqa: SLF001
    assert {d["sha256"] for d in packet["documents"]} <= vault_hashes
    assert dispute_packet.verify_packet(packet) is True


def test_packet_digest_is_order_and_content_sensitive(tmp_path):
    vault, roles = _intake(tmp_path)
    p1 = dispute_packet.assemble(vault, roles)
    roles_swapped = dict(roles)
    roles_swapped["eob"] = "bill.txt"
    roles_swapped["bill"] = "eob.txt"
    p2 = dispute_packet.assemble(vault, roles_swapped)
    assert p1["packet_sha256"] != p2["packet_sha256"]


def test_tampered_document_invalidates_chain(tmp_path):
    vault, roles = _intake(tmp_path)
    packet = dispute_packet.assemble(vault, roles)
    (tmp_path / "vault" / "bill.txt").write_text("altered bill, higher amount", encoding="utf-8")
    assert all(not r["intact"] for r in vault.verify() if r["file"] == "bill.txt")
    fresh = dispute_packet.assemble(vault, roles)
    assert fresh["packet_sha256"] != packet["packet_sha256"]


def test_assemble_rejects_bad_input(tmp_path):
    vault, roles = _intake(tmp_path)
    with pytest.raises(ValueError):
        dispute_packet.assemble(vault, {"invoice": "bill.txt"})
    with pytest.raises(ValueError):
        dispute_packet.assemble(vault, {"bill": "missing.txt"})
