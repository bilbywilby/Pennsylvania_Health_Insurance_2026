"""Test suite for the ten add-ons."""

from datetime import date
from pathlib import Path
import json

import pytest

from pa_addons import addon_validator, cross_validator, deadlines, evidence_vault
from pa_addons import export_bundle, glossary, pathways, provider_network
from pa_addons import rtk_requests, scenario_router


def test_glossary_lookup_and_search():
    entry = glossary.lookup("Balance-Billing")
    assert "45 CFR" in entry["citation"]
    assert glossary.search("insurance")


def test_glossary_unknown_term_raises():
    with pytest.raises(KeyError):
        glossary.lookup("nonexistent_term")


def test_deadline_days_rule():
    result = deadlines.compute_deadline(date(2026, 11, 24), "erisa_internal_appeal")
    assert result["deadline"] == date(2027, 5, 23)


def test_deadline_months_rule():
    result = deadlines.compute_deadline(date(2026, 11, 30), "aca_external_review")
    assert (result["deadline"].year, result["deadline"].month) == (2027, 3)
    assert result["deadline"].day == 30  # March has 31 days, so no clamp needed here


def test_pathway_route_claim_denial():
    routed = pathways.route("my claim was denied as not medically necessary")
    assert routed["pathway"] == "claim_denial"
    assert routed["steps"][1]["deadline_rule"] == "erisa_internal_appeal"


def test_pathway_route_collections():
    routed = pathways.route("collection agency keeps calling me")
    assert routed["pathway"] == "medical_debt_collection"


def test_rtk_request_contains_agency_and_statute():
    letter = rtk_requests.build_request(
        "pa_insurance_department",
        ["All commercial rate filings for rating area 5, plan year 2027"],
        "Test Requester", "test@example.com", "2026-11-24",
    )
    assert "Pennsylvania Insurance Department" in letter
    assert "67.1106" in letter


def test_provider_emergency_oon_flagged():
    result = provider_network.classify_charge({
        "charge_type": "professional", "is_emergency": True,
        "facility_in_network": True, "provider_in_network": False,
    })
    assert result["nsa_protected"] is True
    assert "149" in result["reason"]


def test_provider_in_network_not_flagged():
    result = provider_network.classify_charge({
        "charge_type": "facility", "is_emergency": False,
        "facility_in_network": True, "provider_in_network": True,
    })
    assert result["nsa_protected"] is False


def test_vault_add_and_verify(tmp_path: Path):
    src = tmp_path / "bill.txt"
    src.write_text("itemized bill content")
    vault = evidence_vault.EvidenceVault(tmp_path / "vault")
    record = vault.add(src, note="ER bill Nov 2026")
    assert len(record["sha256"]) == 64  # type: ignore[index]
    assert all(r["intact"] for r in vault.verify())
    # tamper detection
    (tmp_path / "vault" / "bill.txt").write_text("tampered")
    assert all(r["intact"] is False for r in vault.verify())


def test_scenario_router_er():
    routed = scenario_router.route("I got a huge bill after an emergency room visit")
    assert routed["route"] == "er_surprise_bill"


def test_cross_validator_detects_drift():
    report = cross_validator.check_all([
        {"field": "fmv_99213", "derived_value": 125.0, "source_value": 100.0, "tolerance_pct": 2.0},
        {"field": "ra5_premium", "derived_value": 505.0, "source_value": 500.0, "tolerance_pct": 2.0},
    ])
    assert report["failed"] == 1
    assert report["passed"] == 1


def test_export_bundle_strips_markdown():
    md = "# Heading\nThis is **bold** and a [link](http://example.com) and `code`."
    plain = export_bundle.simplify(md)
    assert "#" not in plain and "**" not in plain and "]" not in plain
    assert "link" in plain


def test_addon_validator_smoke(tmp_path: Path):
    # Stand up a tiny fake repo with manifest + digest + one addon file
    addon = tmp_path / "addons" / "demo.py"
    addon.parent.mkdir(parents=True)
    addon.write_text("print('demo')\n")
    import hashlib
    digest = hashlib.sha256(addon.read_bytes()).hexdigest()
    manifest = {"files": {"addons/demo.py": {"sha256": digest, "size": addon.stat().st_size}}}
    data = json.dumps(manifest).encode("utf-8")
    (tmp_path / "FOLD_MANIFEST.json").write_bytes(data)
    (tmp_path / "FOLD_MANIFEST.sha256").write_text(hashlib.sha256(data).hexdigest() + "  FOLD_MANIFEST.json\n")
    result = addon_validator.verify(tmp_path)
    assert result["manifest_digest_ok"] is True
    assert result["mismatched"] == []
    assert result["addon_files_checked"] == 1


def test_cross_validator_build_default_checks_empty_root(tmp_path: Path):
    checks = cross_validator.build_default_checks(tmp_path)
    assert len(checks) == 2
    assert all(item["status"] == "skipped" for item in checks)


def test_cross_validator_semantic_area_counts(tmp_path: Path):
    one_dir = tmp_path / "sources" / "pa_ra_onepagers" / "data"
    umb_dir = tmp_path / "sources" / "animated-umbrella" / "data"
    one_dir.mkdir(parents=True)
    umb_dir.mkdir(parents=True)

    (one_dir / "pa_ra_dataset.json").write_text(
        json.dumps({"areas": {"1": ["A", "B"], "2": ["C"]}}),
        encoding="utf-8",
    )
    (one_dir / "derived_area_metrics.json").write_text(
        json.dumps({"areas": {"1": {"n_counties": 2}, "2": {"n_counties": 1}}}),
        encoding="utf-8",
    )
    (umb_dir / "pa_ra_dataset.json").write_text(
        json.dumps({"areas": {"1": ["A"], "2": ["C"]}}),
        encoding="utf-8",
    )

    checks = cross_validator.build_default_checks(tmp_path)
    by_name = {item["name"]: item for item in checks}
    assert by_name["onepagers_ra_dataset_vs_area_metrics"]["status"] == "ok"
    assert by_name["onepagers_ra_dataset_vs_area_metrics"]["shared_numeric_keys"] == 2
    assert by_name["umbrella_ra_dataset_vs_onepagers_metrics"]["status"] == "mismatch"
    assert len(by_name["umbrella_ra_dataset_vs_onepagers_metrics"]["mismatches"]) == 1
