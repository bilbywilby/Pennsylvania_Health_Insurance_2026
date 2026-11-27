#!/usr/bin/env python3
"""
pytest unit tests for scripts/medical_debt_cms.py dispatch helpers.
"""

import datetime as dt
import hashlib
import os
from unittest.mock import Mock, patch

import pytest
import requests

from medical_debt_cms import (
    _idempotency_key,
    build_payload,
    classify_risk,
    current_date,
    load_debts,
    post_with_retry,
    redact_account_id,
)

SAMPLE_DEBT = {
    "account_id": "ACC-1003",
    "document_id": "SOL-TERM-001",
    "violation_type": "Time-barred SOL under 42 Pa.C.S. § 5525(a)",
    "action_deadline": "2026-11-05T00:00:00Z",
    "status": "PENDING_DISPATCH",
    "risk_tier": "RED",
}


@pytest.fixture
def mock_session():
    session = Mock(spec=requests.Session)
    resp = Mock(status_code=200, text='{"ok":true}')
    resp.raise_for_status.return_value = None
    session.post.return_value = resp
    return session


@pytest.mark.parametrize(
    "violation_type,expected_tier",
    [
        ("Time-barred SOL under 42 Pa.C.S. § 5525(a)", "RED"),
        ("501(r) violation — failed FAP screening", "RED"),
        ("Upcoming FAP deadline", "YELLOW"),
        ("General notice", "GREEN"),
    ],
)
def test_classify_risk(violation_type: str, expected_tier: str):
    assert classify_risk({"account_id": "ACC-1003", "violation_type": violation_type}) == expected_tier


def test_build_payload():
    item = SAMPLE_DEBT.copy()
    redacted_acct = redact_account_id(item["account_id"])
    redacted_doc = redact_account_id(item["document_id"])
    key = _idempotency_key(
        redacted_acct,
        item["violation_type"],
        item["action_deadline"],
    )
    fixed_now = dt.datetime(2026, 11, 5, 12, 0, 0, tzinfo=dt.timezone.utc)
    with patch("medical_debt_cms.current_date", return_value=fixed_now):
        result = build_payload(
            account_id=item["account_id"],
            document_id=item["document_id"],
            violation_type=item["violation_type"],
            deadline_str=item["action_deadline"],
            status=item["status"],
        )
    assert result == {
        "account_id": redacted_acct,
        "document_id": redacted_doc,
        "violation_type": item["violation_type"],
        "action_deadline": item["action_deadline"],
        "status": item["status"],
        "source_timestamp": fixed_now.isoformat(),
        "idempotency_key": key,
    }


def test_post_with_retry(mock_session: Mock, capsys: pytest.CaptureFixture[str]):
    url = "https://test.example.com/dispatch"
    payload = {"foo": "bar"}

    assert post_with_retry(mock_session, url, payload, max_retries=1, backoff=0.0) is True

    import medical_debt_cms
    mock_time = Mock()
    http_err = requests.HTTPError("503 Server Error")
    mock_session.post.return_value.raise_for_status.side_effect = http_err
    with patch.object(medical_debt_cms, "time", mock_time, create=True):
        assert post_with_retry(mock_session, url, payload, max_retries=2, backoff=2.0) is False
        mock_time.sleep.assert_called_once_with(2.0)
    out = capsys.readouterr().out
    assert "[WARN]" in out
    assert "[ERROR]" in out


def test_load_debts_no_file(tmp_path: Path):
    missing = tmp_path / "nonexistent.json"
    with patch.dict(os.environ, {"LEDGER_ENC_KEY": "real-key"}):
        debts = load_debts(str(missing))
        assert debts == []


def test_redaction_distinctness():
    r1 = redact_account_id("ACC-1003")
    r2 = redact_account_id("ACC-1004")
    digest = hashlib.sha256(b"ACC-1003").hexdigest()[:16]
    assert r1 == f"ID-{digest}"
    assert r1 != r2
    assert redact_account_id("") == "REDACTED_ID"
    assert isinstance(current_date(), dt.datetime)
