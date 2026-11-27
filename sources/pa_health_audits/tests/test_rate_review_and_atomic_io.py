"""Tests for PY2027 rate review dataset validation and atomic 0o600 artifact writes."""

from __future__ import annotations

import json
import stat
from pathlib import Path

import pytest

from pa_health_audits import (
    PY2027RateBaseline,
    atomic_write_json,
    atomic_write_text,
    load_rate_review_baseline,
    validate_rate_review_data,
)


def test_load_actual_py2027_rate_review_json() -> None:
    repo_root = Path(__file__).resolve().parents[3]
    dataset_path = repo_root / "sources/pa_health_audits/data/py2027/pa_rate_review_2027.json"
    baseline = load_rate_review_baseline(dataset_path)

    assert isinstance(baseline, PY2027RateBaseline)
    assert baseline.plan_year == 2027
    assert baseline.jurisdiction == "PA"
    assert baseline.individual_approved_pct == 15.97
    assert baseline.small_group_approved_pct == 10.28
    assert baseline.denied_increases_usd == 94700000.0
    assert baseline.oop_self_only_usd == 12000.0
    assert baseline.oop_family_usd == 24000.0
    assert baseline.carrier_adjustments_pct["oscar_health"]["approved"] == 1.4


@pytest.mark.parametrize(
    ("mutate", "match"),
    [
        (lambda d: d.pop("oop_maximum_2027_usd"), "oop_maximum_2027_usd"),
        (lambda d: d["oop_maximum_2027_usd"].update({"family": 5000, "self_only": 12000}), "family"),
        (lambda d: d.update({"denied_increases_usd": -1}), "non-negative"),
        (lambda d: d["pennie_enrollment"].update({"september_2026": -5}), "non-negative integer"),
        (lambda d: d.update({"jurisdiction": "  "}), "jurisdiction"),
    ],
)
def test_validate_rate_review_data_rejects_invalid_payloads(mutate, match: str) -> None:
    sample = {
        "plan_year": 2027,
        "jurisdiction": "PA",
        "individual_market": {"requested_pct": 17.14, "approved_pct": 15.97},
        "small_group_market": {"requested_pct": 11.49, "approved_pct": 10.28},
        "denied_increases_usd": 94700000,
        "pennie_enrollment": {"peak_2025": 497000, "september_2026": 417000},
        "oop_maximum_2027_usd": {"self_only": 12000, "family": 24000},
        "carrier_adjustments_pct": {"ambetter": {"requested": 40.9, "approved": 35.1}},
    }
    mutate(sample)
    with pytest.raises(ValueError, match=match):
        validate_rate_review_data(sample)


def test_atomic_write_text_and_json_permissions(tmp_path: Path) -> None:
    txt_out = atomic_write_text(tmp_path / "nested/report.txt", "redacted line\n")
    assert txt_out.exists()
    assert txt_out.read_text(encoding="utf-8") == "redacted line\n"
    assert stat.S_IMODE(txt_out.stat().st_mode) == 0o600

    json_out = atomic_write_json(tmp_path / "nested/finding.json", {"tier": "PASS", "variance_pct": 4.2})
    loaded = json.loads(json_out.read_text(encoding="utf-8"))
    assert loaded == {"tier": "PASS", "variance_pct": 4.2}
    assert stat.S_IMODE(json_out.stat().st_mode) == 0o600
    assert list(tmp_path.joinpath("nested").glob(".*.tmp")) == []
