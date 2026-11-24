#!/usr/bin/env python3
"""
pytest unit tests for medical_debt_cms.dispatch_work_orders
Note: These mock external calls; real integration requires a live webhook URL.
"""

import pytest
import json
from unittest.mock import Mock, patch
import datetime as dt
import os
import hmac
import hashlib
import requests
import importlib.util
from pathlib import Path as _Path
import os as _os

_os.environ.setdefault("DISPATCH_WEBHOOK_URL", "https://example.invalid/webhook")
_SCRIPT_PATH = _Path(__file__).resolve().parent.parent / "scripts" / "medical_debt_cms.py"
_SPEC = importlib.util.spec_from_file_location("_keystone_medical_debt_cms", _SCRIPT_PATH)
assert _SPEC is not None and _SPEC.loader is not None
_mod = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(_mod)
import time as _time
_mod.time = _time

current_date = getattr(_mod, 'current_date')
redact_account_id = getattr(_mod, 'redact_account_id')
idempotency_key = getattr(_mod, 'idempotency_key', getattr(_mod, '_idempotency_key'))
build_payload = getattr(_mod, 'build_payload')
post_with_retry = getattr(_mod, 'post_with_retry')
classify_risk = getattr(_mod, 'classify_risk')
load_debts = getattr(_mod, 'load_debts')

# Sample valid debt record
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
    session.post.return_value = Mock(status_code=200, text='{"ok":true}')
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


def test_build_payload(mock_session: Mock, monkeypatch: pytest.MonkeyPatch):
    fixed_now = dt.datetime(2026, 11, 5, 4, 39, 50, tzinfo=dt.timezone.utc)
    monkeypatch.setattr(_mod, "current_date", lambda: fixed_now)
    item = SAMPLE_DEBT.copy()
    redacted_acc = redact_account_id(item["account_id"])
    redacted_doc = redact_account_id(item["document_id"])
    expected_key = getattr(_mod, "_idempotency_key")(
        redacted_acc,
        item["violation_type"],
        item["action_deadline"],
    )
    expected = {
        "account_id": redacted_acc,
        "document_id": redacted_doc,
        "violation_type": item["violation_type"],
        "action_deadline": item["action_deadline"],
        "status": item["status"],
        "source_timestamp": fixed_now.isoformat(),
        "idempotency_key": expected_key,
    }
    result = build_payload(
        item["account_id"],
        item["document_id"],
        item["violation_type"],
        item["action_deadline"],
        item["status"],
    )
    assert result == expected


@patch("requests.Session")
def test_post_with_retry(mock_session: Mock, caplog: pytest.LogCaptureFixture, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(_time, "sleep", lambda _s: None)
    url = "https://test.example.com/dispatch"
    payload = {"foo": "bar"}
    mock_response = Mock(status_code=200)
    mock_response.raise_for_status.return_value = None
    mock_session.post.return_value = mock_response

    res = post_with_retry(mock_session, url, payload, max_retries=1)
    assert res is True

    mock_session.post.side_effect = requests.RequestException("503 Service Unavailable")
    res_fail = post_with_retry(mock_session, url, payload, max_retries=2, backoff=0.0)
    assert res_fail is False


def test_load_debts_no_file():
    with patch.dict(os.environ, {"LEDGER_ENC_KEY": "real-key"}):
        debts = load_debts("nonexistent.json")
        assert debts == []

def test_redaction_hash_distinctness():
    h1 = redact_account_id("ACC-1003")
    h2 = redact_account_id("ACC-1011")
    assert h1 != h2
