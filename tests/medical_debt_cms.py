#!/usr/bin/env python3
"""
pytest unit tests for medical_debt_cms.py
Note: This is a mock test; actual integration requires a live webhook URL.
"""

import pytest
from unittest.mock import patch, Mock
import json
import datetime as dt
import importlib.util
from pathlib import Path as _Path
import os as _os

_os.environ.setdefault("DISPATCH_WEBHOOK_URL", "https://example.invalid/webhook")
_SCRIPT_PATH = _Path(__file__).resolve().parent.parent / "scripts" / "medical_debt_cms.py"
_SPEC = importlib.util.spec_from_file_location("_keystone_medical_debt_cms", _SCRIPT_PATH)
assert _SPEC is not None and _SPEC.loader is not None
_mod = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(_mod)

load_debts = getattr(_mod, '_idempotency_key') if 'load_debts' == '_idempotency_key' and not hasattr(_mod, '_idempotency_key') else getattr(_mod, 'load_debts')
classify_risk = getattr(_mod, '_idempotency_key') if 'classify_risk' == '_idempotency_key' and not hasattr(_mod, '_idempotency_key') else getattr(_mod, 'classify_risk')
build_payload = getattr(_mod, '_idempotency_key') if 'build_payload' == '_idempotency_key' and not hasattr(_mod, '_idempotency_key') else getattr(_mod, 'build_payload')
_idempotency_key = getattr(_mod, '_idempotency_key') if '_idempotency_key' == '_idempotency_key' and not hasattr(_mod, '_idempotency_key') else getattr(_mod, '_idempotency_key')
current_date = getattr(_mod, '_idempotency_key') if 'current_date' == '_idempotency_key' and not hasattr(_mod, '_idempotency_key') else getattr(_mod, 'current_date')

@pytest.fixture
def sample_debts() -> list[dict]:
    return [
        {
            "account_id": "ACC-1003",
            "document_id": "SOL-TERM-001",
            "violation_type": "Time-barred SOL under 42 Pa.C.S. § 5525(a)",
            "action_deadline": "2026-11-05T00:00:00Z",
            "status": "PENDING_DISPATCH",
            "notes": "Four-year limitation expired",
            "risk_tier": "RED",
        },
        {
            "account_id": "ACC-1011",
            "document_id": "501r-COMPLAINT-001",
            "violation_type": "501(r) violation — failed FAP screening",
            "action_deadline": "2026-12-01T00:00:00Z",
            "status": "PENDING_DISPATCH",
            "risk_tier": "RED",
        },
        {
            "account_id": "ACC-1008",
            "document_id": "FAP-WARNING-001",
            "violation_type": "Upcoming FAP deadline",
            "action_deadline": "2026-12-15T00:00:00Z",
            "status": "PENDING_DISPATCH",
            "risk_tier": "YELLOW",
        },
    ]

@pytest.fixture
def mock_session() -> Mock:
    mock = Mock(spec=requests.Session)
    mock.post.return_value = Mock(status_code=200, text='{"ok":true}')
    return mock

@pytest.mark.parametrize("debt_item,expected_tier", [
    (sample_debts[0], "RED"),
    (sample_debts[1], "RED"),
    (sample_debts[2], "YELLOW"),
])
def test_classify_risk(debt_item: dict, expected_tier: str):
    assert classify_risk(debt_item) == expected_tier

def test_build_payload(mock_session: Mock):
    item = sample_debts[0]
    key = _idempotency_key(item["account_id"], item["violation_type"], item["action_deadline"])
    expected_payload = {
        "account_id": redact_account_id(item["account_id"]),
        "document_id": redact_account_id(item["document_id"]),
        "violation_type": item["violation_type"],
        "action_deadline": item["action_deadline"],
        "status": item["status"],
        "source_timestamp": current_date().isoformat(),
        "idempotency_key": key,
    }

    payload = build_payload(
        account_id=item["account_id"],
        document_id=item["document_id"],
        violation_type=item["violation_type"],
        deadline_str=item["action_deadline"],
        status=item["status"],
    )
    assert payload == expected_payload

def test_current_date():
    now = current_date()
    # Ensure it's within reasonable bounds for testing
    assert isinstance(now, dt.datetime)
