"""Unit tests for pa_health_audits.auditor."""

import pytest

from pa_health_audits.auditor import (
    audit_claim_line,
    classify_variance,
    compute_fmv,
    is_valid_npi,
    scrub_pii_line,
)

# Valid NPI example from CMS NPI check-digit specification: 1234567893
VALID_NPI = "1234567893"


def test_is_valid_npi_accepts_checksum_and_rejects_bad_values():
    assert is_valid_npi(VALID_NPI) is True
    assert is_valid_npi("1234567890") is False
    assert is_valid_npi("3234567893") is False
    assert is_valid_npi("0123456789") is False
    assert is_valid_npi("123456789") is False


def test_scrub_pii_line_redacts_valid_npi_but_preserves_non_npi_ten_digit():
    line = f"Provider NPI {VALID_NPI}, Ref 9876543210, BadNPI 1234567890"
    scrubbed = scrub_pii_line(line, salt="test-salt")
    assert VALID_NPI not in scrubbed
    assert "[NPI:" in scrubbed
    assert "9876543210" in scrubbed
    assert "1234567890" in scrubbed


def test_scrub_pii_line_redacts_ssn_and_email_deterministically():
    line = "Patient SSN 123-45-6789, Contact user@example.com"
    first = scrub_pii_line(line, salt="salt-a")
    second = scrub_pii_line(line, salt="salt-a")
    other_salt = scrub_pii_line(line, salt="salt-b")
    assert first == second
    assert first != other_salt
    assert "123-45-6789" not in first
    assert "user@example.com" not in first
    assert "[SSN:" in first
    assert "[EMAIL:" in first


def test_scrub_pii_line_requires_salt():
    with pytest.raises(ValueError, match="salt is required"):
        scrub_pii_line("user@example.com", salt="")


def test_compute_fmv_and_classify_variance_tiers():
    assert compute_fmv(100.0, 1.15) == 115.0
    assert classify_variance(110.0, 100.0) == (10.0, "PASS")
    assert classify_variance(125.0, 100.0) == (25.0, "POTENTIAL_AUDIT")
    assert classify_variance(150.0, 100.0) == (50.0, "CRITICAL_OVERCHARGE")

    finding = audit_claim_line("CLM-1", base_rate=200.0, billed_amount=210.0, modifier=1.0)
    assert finding.fmv == 200.0
    assert finding.variance_pct == 5.0
    assert finding.tier == "PASS"

    with pytest.raises(ValueError, match="non-negative"):
        compute_fmv(-1.0, 1.0)
    with pytest.raises(ValueError, match="positive"):
        classify_variance(100.0, 0.0)
