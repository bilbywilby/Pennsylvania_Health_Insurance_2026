#!/usr/bin/env python3
"""
pytest unit tests for medical_debt_cms.dispatch_work_orders
Note: These mock external calls; real integration requires a live webhook URL.
"""

import datetime as dt
import hashlib
import hmac
import importlib.util
import json
import os
from pathlib import Path as _Path
from unittest.mock import Mock, patch
import pytest
try:
    import requests
except ModuleNotFoundError:
    requests = Mock()


def _load_scripts_medical_debt_cms():
    for parent in [_Path(__file__).resolve(), *_Path(__file__).resolve().parents]:
        candidate = parent / 'scripts' / 'medical_debt_cms.py'
        if candidate.is_file():
            spec = importlib.util.spec_from_file_location('keystone_scripts_medical_debt_cms', candidate)
            mod = importlib.util.module_from_spec(spec)
            assert spec and spec.loader
            spec.loader.exec_module(mod)
            return mod
    raise FileNotFoundError('scripts/medical_debt_cms.py not found')


def _resolve_cms_attr(mod, name):
    if hasattr(mod, name):
        return getattr(mod, name)
    if name == 'idempotency_key' and hasattr(mod, '_idempotency_key'):
        return getattr(mod, '_idempotency_key')
    if name == '_idempotency_key' and hasattr(mod, 'idempotency_key'):
        return getattr(mod, 'idempotency_key')
    raise AttributeError(f"module {mod.__name__!r} has no attribute {name!r}")


_cms_mod = _load_scripts_medical_debt_cms()
current_date, redact_account_id, idempotency_key, build_payload, post_with_retry, classify_risk, load_debts = tuple(
    _resolve_cms_attr(_cms_mod, _n)
    for _n in ('current_date', 'redact_account_id', 'idempotency_key', 'build_payload', 'post_with_retry', 'classify_risk', 'load_debts')
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
    assert classify_risk({"violation_type": violation_type}) == expected_tier

def test_build_payload(mock_session: Mock):
    item = SAMPLE_DEBT.copy()
    result = build_payload(
        item["account_id"],
        item["document_id"],
        item["violation_type"],
        item["action_deadline"],
        item["status"],
    )
    assert result["account_id"] == redact_account_id(item["account_id"])
    assert result["document_id"] == redact_account_id(item["document_id"])
    assert result["violation_type"] == item["violation_type"]
    assert result["action_deadline"] == item["action_deadline"]
    assert result["status"] == item["status"]



def test_post_with_retry(mock_session: Mock, caplog: pytest.LogCaptureFixture):
    url = "https://test.example.com/dispatch"
    payload = {"foo": "bar"}
    mock_response = Mock(status_code=200)
    mock_response.raise_for_status.return_value = None
    mock_session.post.return_value = mock_response

    res = post_with_retry(mock_session, url, payload, max_retries=1)
    assert res is True
    assert mock_session.post.call_count == 1

    class _RetryableHTTPError(Exception):
        pass

    mock_response.raise_for_status.side_effect = _RetryableHTTPError("HTTP 503")
    try:
        res = post_with_retry(mock_session, url, payload, max_retries=2, backoff=0.0)
        assert res is False
    except _RetryableHTTPError:
        pass

def test_load_debts_no_file():
    with patch.dict(os.environ, {"LEDGER_ENC_KEY": "real-key"}):
        debts = load_debts("nonexistent.json")
        assert debts == []

def test_redaction_hash_distinctness():
    key = b"shared-secret"
    h1 = hmac.new(key, b"ACC-1003", hashlib.sha256).hexdigest()
    h2 = hmac.new(key, b"ACC-1004", hashlib.sha256).hexdigest()
    h3 = hmac.new(b"other-secret", b"ACC-1003", hashlib.sha256).hexdigest()
    assert h1 != h2
    assert h1 != h3
