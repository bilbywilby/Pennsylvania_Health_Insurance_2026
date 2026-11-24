import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from pa_audit.eob.audit import ForensicClaimAuditor, PIIScrubber
from pa_audit.ncci.parse import NCCIEdit, NCCIParser
from pa_audit.pfs.load import FeeScheduleItem


def _make_auditor(ncci_edits=None):
    pfs = {"99213": FeeScheduleItem("99213", "Office visit", 100.0, 80.0)}
    return ForensicClaimAuditor(pfs, list(ncci_edits or []))


def test_variance_thresholds_15_and_40():
    auditor = _make_auditor()

    # Less than 15.0% -> PASS (billed 114.99 vs fmv 100.0 -> +14.99%)
    r_pass = auditor.audit_claim({
        "claim_id": "V1", "patient_id": "P1", "cpt_code": "99213",
        "billed_amount": 114.99, "is_facility": False, "gpci": 1.0,
    })
    assert r_pass.risk_category == "PASS"

    # Equal to 15.0% -> POTENTIAL_AUDIT in eob/audit.py (variance < 15.0 is PASS, <= 40.0 is POTENTIAL_AUDIT)
    r_15 = auditor.audit_claim({
        "claim_id": "V2", "patient_id": "P2", "cpt_code": "99213",
        "billed_amount": 115.00, "is_facility": False, "gpci": 1.0,
    })
    assert r_15.risk_category == "POTENTIAL_AUDIT"

    # Equal to 40.0% -> POTENTIAL_AUDIT
    r_40 = auditor.audit_claim({
        "claim_id": "V3", "patient_id": "P3", "cpt_code": "99213",
        "billed_amount": 140.00, "is_facility": False, "gpci": 1.0,
    })
    assert r_40.risk_category == "POTENTIAL_AUDIT"

    # Greater than 40.0% -> CRITICAL_OVERCHARGE
    r_crit = auditor.audit_claim({
        "claim_id": "V4", "patient_id": "P4", "cpt_code": "99213",
        "billed_amount": 140.01, "is_facility": False, "gpci": 1.0,
    })
    assert r_crit.risk_category == "CRITICAL_OVERCHARGE"


def test_ncci_modifiers_and_deletion_date(tmp_path: Path):
    ptp_file = tmp_path / "ptp_test.tsv"
    ptp_file.write_text(
        "# col1\tcol2\teff\tdel\tind\n"
        "99213\t11102\t20250101\t\t0\n"
        "99213\t11104\t20250101\t20260101\t1\n"
        "99213\t11106\t20250101\t\t9\n",
        encoding="utf-8",
    )
    edits = NCCIParser.load_ncci_ptp(ptp_file)
    assert len(edits) == 3
    assert edits[0].modifier_indicator == "0" and edits[0].deletion_date is None
    assert edits[1].modifier_indicator == "1" and edits[1].deletion_date == "20260101"
    assert edits[2].modifier_indicator == "9" and edits[2].deletion_date is None

    auditor = _make_auditor(edits)
    r_mod0 = auditor.audit_claim({
        "claim_id": "N1", "patient_id": "P1", "cpt_code": "99213",
        "billed_amount": 100.0, "is_facility": False, "gpci": 1.0,
    })
    assert any("NCCI:" in v and "11102" in v for v in r_mod0.violations)

    auditor_mod1_only = _make_auditor([edits[1]])
    r_mod1 = auditor_mod1_only.audit_claim({
        "claim_id": "N2", "patient_id": "P2", "cpt_code": "99213",
        "billed_amount": 100.0, "is_facility": False, "gpci": 1.0,
    })
    assert not any("NCCI:" in v for v in r_mod1.violations)


def test_nsa_emergency_and_in_facility_oon_context():
    auditor = _make_auditor()
    r_emerg_oon = auditor.audit_claim({
        "claim_id": "NSA1", "patient_id": "P1", "cpt_code": "99213",
        "billed_amount": 250.0, "is_facility": True, "gpci": 1.0,
        "is_emergency": True, "is_out_of_network": True,
    })
    assert r_emerg_oon.nsa_violation is True
    assert any("45 CFR 149" in v for v in r_emerg_oon.violations)

    r_non_emerg = auditor.audit_claim({
        "claim_id": "NSA2", "patient_id": "P2", "cpt_code": "99213",
        "billed_amount": 100.0, "is_facility": True, "gpci": 1.0,
        "is_emergency": False, "is_out_of_network": True,
    })
    assert r_non_emerg.nsa_violation is False

    scrubber = PIIScrubber(b"test-key")
    assert scrubber.scrub_id("P2").startswith("ANON-")


def test_ncci_service_date_effective_and_deletion_window():
    edit = NCCIEdit(
        column1_code="99213",
        column2_code="11102",
        effective_date="20250601",
        deletion_date="20260101",
        modifier_indicator="0",
    )
    auditor = _make_auditor([edit])

    # Before effective_date (20250601): edit not yet active
    r_before = auditor.audit_claim({
        "claim_id": "D1", "patient_id": "P1", "cpt_code": "99213",
        "billed_amount": 100.0, "is_facility": False, "gpci": 1.0,
        "service_date": "2025-05-31",
    })
    assert not any("NCCI:" in v for v in r_before.violations)

    # Inside active window [20250601, 20260101): edit active
    r_active = auditor.audit_claim({
        "claim_id": "D2", "patient_id": "P2", "cpt_code": "99213",
        "billed_amount": 100.0, "is_facility": False, "gpci": 1.0,
        "dos": "20251231",
    })
    assert any("NCCI:" in v and "11102" in v for v in r_active.violations)

    # On deletion_date (20260101): edit no longer active
    r_on_del = auditor.audit_claim({
        "claim_id": "D3", "patient_id": "P3", "cpt_code": "99213",
        "billed_amount": 100.0, "is_facility": False, "gpci": 1.0,
        "date_of_service": "2026-01-01",
    })
    assert not any("NCCI:" in v for v in r_on_del.violations)

    # After deletion_date: edit deleted
    r_after_del = auditor.audit_claim({
        "claim_id": "D4", "patient_id": "P4", "cpt_code": "99213",
        "billed_amount": 100.0, "is_facility": False, "gpci": 1.0,
        "claim_date": "20260315",
    })
    assert not any("NCCI:" in v for v in r_after_del.violations)
