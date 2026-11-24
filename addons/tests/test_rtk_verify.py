"""Tests for the verify-marker scanner and draft CLI."""

import pytest

from pa_addons import rtk_verify


def test_scan_queue_finds_known_markers():
    queue = rtk_verify.scan_verify_queue()
    ids = {item["item_id"] for item in queue}
    assert "deductible" in ids
    assert "nsa_good_faith_estimate_dispute" in ids
    assert all("verify" in item["citation"].lower() for item in queue)


def test_routing_federal_vs_state():
    federal = rtk_verify.route_item({"citation": "45 CFR 149.620 - verify"})
    state = rtk_verify.route_item({"citation": "31 Pa. Code - verify"})
    assert federal == "cms"
    assert state == "pa_insurance_department"


def test_build_drafts_contains_agency_and_record():
    drafts = rtk_verify.build_drafts("Test Requester", "test@example.com", "2026-11-24")
    assert drafts, "expected non-empty draft list"
    for d in drafts:
        assert d["agency"] in rtk_verify.rtk_requests.AGENCIES
        assert "REQUEST FOR PUBLIC RECORDS" in d["letter"]
        assert "Test Requester" in d["letter"]


def test_cli_list_mode(capsys):
    assert rtk_verify.main(["--list"]) == 0
    out = capsys.readouterr().out
    assert "glossary.py" in out and "deadlines.py" in out


def test_cli_draft_requires_identity(capsys):
    assert rtk_verify.main(["--draft"]) == 2
    assert "required" in capsys.readouterr().err


def test_cli_out_writes_files(tmp_path, capsys):
    rc = rtk_verify.main(
        ["--draft", "--out", str(tmp_path), "--requester", "A", "--contact", "b@c.d"]
    )
    assert rc == 0
    files = list(tmp_path.glob("*.txt"))
    assert len(files) == len(rtk_verify.scan_verify_queue())
    assert "wrote" in capsys.readouterr().out
