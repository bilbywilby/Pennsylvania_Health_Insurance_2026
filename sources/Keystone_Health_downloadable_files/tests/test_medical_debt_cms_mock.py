#!/usr/bin/env python3
"""
pytest unit tests for scripts/medical_debt_cms.py payload and risk helpers.
"""

import datetime as dt
from unittest.mock import Mock, patch

import pytest
import requests

from medical_debt_cms import (
    _idempotency_key,
    build_payload,
    classify_risk,
    current_date,
    redact_account_id,
)

SAMPLE_DEBTS = [
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


@pytest.mark.parametrize(
    "debt_item,expected_tier",
    [
        (SAMPLE_DEBTS[0], "RED"),
        (SAMPLE_DEBTS[1], "RED"),
        (SAMPLE_DEBTS[2], "YELLOW"),
    ],
)
def test_classify_risk(debt_item: dict, expected_tier: str):
    assert classify_risk(debt_item) == expected_tier


def test_build_payload(mock_session: Mock):
    item = SAMPLE_DEBTS[0]
    redacted_acct = redact_account_id(item["account_id"])
    redacted_doc = redact_account_id(item["document_id"])
    key = _idempotency_key(redacted_acct, item["violation_type"], item["action_deadline"])
    fixed_now = dt.datetime(2026, 11, 5, 12, 0, 0, tzinfo=dt.timezone.utc)
    with patch("medical_debt_cms.current_date", return_value=fixed_now):
        payload = build_payload(
            account_id=item["account_id"],
            document_id=item["document_id"],
            violation_type=item["violation_type"],
            deadline_str=item["action_deadline"],
            status=item["status"],
        )
    assert payload == {
        "account_id": redacted_acct,
        "document_id": redacted_doc,
        "violation_type": item["violation_type"],
        "action_deadline": item["action_deadline"],
        "status": item["status"],
        "source_timestamp": fixed_now.isoformat(),
        "idempotency_key": key,
    }


def test_current_date():
    now = current_date()
    assert isinstance(now, dt.datetime)
