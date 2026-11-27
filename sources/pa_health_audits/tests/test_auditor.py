"""Expanded unit tests for pa_health_audits.auditor."""

from __future__ import annotations

import hashlib
import hmac
import re

import pytest

from pa_health_audits.auditor import (
    AuditFinding,
    audit_claim_line,
    classify_variance,
    compute_fmv,
    is_valid_npi,
    scrub_pii_line,
)

# Valid NPI example from CMS NPI check-digit specification: 1234567893
VALID_NPI_1 = "1234567893"
# Valid Luhn-checked 10-digit NPI starting with '2'
VALID_NPI_2 = "2084012345"


def test_compute_fmv_default_and_custom_modifiers():
    assert compute_fmv(100.0) == 100.0
    assert compute_fmv(100.0, 1.15) == 115.0
    assert compute_fmv(0.0, 1.5) == 0.0
    assert compute_fmv(125.0, 0.0) == 0.0
    assert compute_fmv(33.333, 1.05) == round(33.333 * 1.05, 2)


@pytest.mark.parametrize(
    ("base_rate", "modifier"),
    [
        (-0.01, 1.0),
        (100.0, -0.01),
        (-10.0, -2.0),
    ],
)
def test_compute_fmv_rejects_negative_inputs(base_rate: float, modifier: float):
    with pytest.raises(ValueError, match="non-negative"):
        compute_fmv(base_rate, modifier)


@pytest.mark.parametrize(
    ("billed", "fmv", "expected_pct", "expected_tier"),
    [
        # PASS (< 15.0% absolute variance)
        (100.0, 100.0, 0.0, "PASS"),
        (110.0, 100.0, 10.0, "PASS"),
        (114.99, 100.0, 14.99, "PASS"),
        (85.01, 100.0, -14.99, "PASS"),
        # POTENTIAL_AUDIT (15.0% to 40.0% absolute variance inclusive)
        (115.0, 100.0, 15.0, "POTENTIAL_AUDIT"),
        (125.0, 100.0, 25.0, "POTENTIAL_AUDIT"),
        (140.0, 100.0, 40.0, "POTENTIAL_AUDIT"),
        (85.0, 100.0, -15.0, "POTENTIAL_AUDIT"),
        (60.0, 100.0, -40.0, "POTENTIAL_AUDIT"),
        # CRITICAL_OVERCHARGE (> 40.0% absolute variance)
        (140.01, 100.0, 40.01, "CRITICAL_OVERCHARGE"),
        (150.0, 100.0, 50.0, "CRITICAL_OVERCHARGE"),
        (59.99, 100.0, -40.01, "CRITICAL_OVERCHARGE"),
        (0.0, 100.0, -100.0, "CRITICAL_OVERCHARGE"),
    ],
)
def test_classify_variance_all_tiers_and_boundaries(
    billed: float,
    fmv: float,
    expected_pct: float,
    expected_tier: str,
):
    pct, tier = classify_variance(billed, fmv)
    assert pct == expected_pct
    assert tier == expected_tier


@pytest.mark.parametrize("bad_fmv", [0.0, -1.0, -100.0])
def test_classify_variance_requires_positive_fmv(bad_fmv: float):
    with pytest.raises(ValueError, match="positive"):
        classify_variance(100.0, bad_fmv)


def test_audit_claim_line_returns_frozen_finding_and_applies_modifier():
    finding = audit_claim_line(
        record_id="CLM-401",
        base_rate=200.0,
        billed_amount=300.0,
        modifier=1.0,
    )
    assert isinstance(finding, AuditFinding)
    assert finding.record_id == "CLM-401"
    assert finding.fmv == 200.0
    assert finding.billed == 300.0
    assert finding.variance_pct == 50.0
    assert finding.tier == "CRITICAL_OVERCHARGE"

    modified = audit_claim_line(
        record_id="CLM-402",
        base_rate=150.0,
        billed_amount=216.0,
        modifier=1.2,
    )
    assert modified.fmv == 180.0
    assert modified.variance_pct == 20.0
    assert modified.tier == "POTENTIAL_AUDIT"

    with pytest.raises(AttributeError):
        finding.tier = "PASS"  # type: ignore[misc]


def test_is_valid_npi_accepts_checksum_and_rejects_bad_values():
    assert is_valid_npi(VALID_NPI_1) is True
    assert is_valid_npi(VALID_NPI_2) is True
    assert is_valid_npi("1234567890") is False
    assert is_valid_npi("3234567893") is False
    assert is_valid_npi("0123456789") is False
    assert is_valid_npi("123456789") is False
    assert is_valid_npi("12345678930") is False
    assert is_valid_npi("123456789a") is False


def test_scrub_pii_line_redacts_valid_npi_and_preserves_non_npi_ten_digit():
    line = f"NPI1 {VALID_NPI_1}, NPI2 {VALID_NPI_2}, Ref 9876543210, BadNPI 1234567890"
    scrubbed = scrub_pii_line(line, salt="test-salt")
    assert VALID_NPI_1 not in scrubbed
    assert VALID_NPI_2 not in scrubbed
    assert "9876543210" in scrubbed
    assert "1234567890" in scrubbed
    tokens = re.findall(r"\[NPI:[0-9a-f]{16}\]", scrubbed)
    assert len(tokens) == 2
    assert tokens[0] != tokens[1]


def test_hmac_token_stability_and_salt_isolation():
    ssn = "123-45-6789"
    email = "auditor@example.org"
    line = f"SSN {ssn} and Email {email} and Repeat SSN {ssn}"

    salt_a = "pa-audit-salt-alpha"
    salt_b = "pa-audit-salt-beta"

    out_a1 = scrub_pii_line(line, salt=salt_a)
    out_a2 = scrub_pii_line(line, salt=salt_a)
    out_b = scrub_pii_line(line, salt=salt_b)

    assert out_a1 == out_a2
    assert out_a1 != out_b
    assert ssn not in out_a1
    assert email not in out_a1

    expected_ssn_digest = hmac.new(
        salt_a.encode("utf-8"),
        f"SSN:{ssn}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()[:16]
    expected_email_digest = hmac.new(
        salt_a.encode("utf-8"),
        f"EMAIL:{email}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()[:16]

    assert f"[SSN:{expected_ssn_digest}]" in out_a1
    assert f"[EMAIL:{expected_email_digest}]" in out_a1
    assert out_a1.count(f"[SSN:{expected_ssn_digest}]") == 2


def test_scrub_pii_line_requires_salt_and_handles_clean_text():
    with pytest.raises(ValueError, match="salt is required"):
        scrub_pii_line("user@example.com", salt="")
    assert scrub_pii_line("Plain line with no PII", salt="any-salt") == "Plain line with no PII"
