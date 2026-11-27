"""Loader and schema/range validator for PY2027 Pennsylvania rate review data."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class PY2027RateBaseline:
    plan_year: int
    jurisdiction: str
    individual_requested_pct: float
    individual_approved_pct: float
    small_group_requested_pct: float
    small_group_approved_pct: float
    denied_increases_usd: float
    pennie_peak_2025: int
    pennie_september_2026: int
    oop_self_only_usd: float
    oop_family_usd: float
    carrier_adjustments_pct: dict[str, dict[str, float]]


def _require_mapping(obj: Any, label: str) -> dict[str, Any]:
    if not isinstance(obj, dict):
        raise ValueError(f"{label} must be a JSON object")
    return obj


def _require_non_negative_number(obj: Any, label: str) -> float:
    if isinstance(obj, bool) or not isinstance(obj, (int, float)):
        raise ValueError(f"{label} must be numeric")
    val = float(obj)
    if val < 0.0:
        raise ValueError(f"{label} must be non-negative")
    return val


def _require_positive_number(obj: Any, label: str) -> float:
    val = _require_non_negative_number(obj, label)
    if val <= 0.0:
        raise ValueError(f"{label} must be positive")
    return val


def _require_non_negative_int(obj: Any, label: str) -> int:
    if isinstance(obj, bool) or not isinstance(obj, int) or obj < 0:
        raise ValueError(f"{label} must be a non-negative integer")
    return obj


def validate_rate_review_data(payload: Any) -> PY2027RateBaseline:
    """Validate raw PY2027 rate review dict and return typed baseline."""
    root = _require_mapping(payload, "rate_review_root")

    plan_year = _require_non_negative_int(root.get("plan_year"), "plan_year")
    if plan_year < 2000:
        raise ValueError("plan_year must be >= 2000")

    jurisdiction = root.get("jurisdiction")
    if not isinstance(jurisdiction, str) or not jurisdiction.strip():
        raise ValueError("jurisdiction must be a non-empty string")

    indiv = _require_mapping(root.get("individual_market"), "individual_market")
    indiv_req = _require_non_negative_number(indiv.get("requested_pct"), "individual_market.requested_pct")
    indiv_app = _require_non_negative_number(indiv.get("approved_pct"), "individual_market.approved_pct")

    small = _require_mapping(root.get("small_group_market"), "small_group_market")
    small_req = _require_non_negative_number(small.get("requested_pct"), "small_group_market.requested_pct")
    small_app = _require_non_negative_number(small.get("approved_pct"), "small_group_market.approved_pct")

    denied_usd = _require_non_negative_number(root.get("denied_increases_usd"), "denied_increases_usd")

    pennie = _require_mapping(root.get("pennie_enrollment"), "pennie_enrollment")
    peak_2025 = _require_non_negative_int(pennie.get("peak_2025"), "pennie_enrollment.peak_2025")
    sept_2026 = _require_non_negative_int(pennie.get("september_2026"), "pennie_enrollment.september_2026")

    oop = _require_mapping(root.get("oop_maximum_2027_usd"), "oop_maximum_2027_usd")
    oop_self = _require_positive_number(oop.get("self_only"), "oop_maximum_2027_usd.self_only")
    oop_family = _require_positive_number(oop.get("family"), "oop_maximum_2027_usd.family")
    if oop_family < oop_self:
        raise ValueError("oop_maximum_2027_usd.family must be >= self_only")

    carriers_raw = _require_mapping(root.get("carrier_adjustments_pct"), "carrier_adjustments_pct")
    carriers: dict[str, dict[str, float]] = {}
    for carrier_name, metrics in carriers_raw.items():
        if not isinstance(carrier_name, str) or not carrier_name.strip():
            raise ValueError("carrier name must be a non-empty string")
        m_dict = _require_mapping(metrics, f"carrier_adjustments_pct.{carrier_name}")
        if not m_dict:
            raise ValueError(f"carrier_adjustments_pct.{carrier_name} must not be empty")
        parsed_metrics: dict[str, float] = {}
        for metric_key, metric_val in m_dict.items():
            parsed_metrics[metric_key] = _require_non_negative_number(
                metric_val,
                f"carrier_adjustments_pct.{carrier_name}.{metric_key}",
            )
        carriers[carrier_name] = parsed_metrics

    return PY2027RateBaseline(
        plan_year=plan_year,
        jurisdiction=jurisdiction.strip(),
        individual_requested_pct=indiv_req,
        individual_approved_pct=indiv_app,
        small_group_requested_pct=small_req,
        small_group_approved_pct=small_app,
        denied_increases_usd=denied_usd,
        pennie_peak_2025=peak_2025,
        pennie_september_2026=sept_2026,
        oop_self_only_usd=oop_self,
        oop_family_usd=oop_family,
        carrier_adjustments_pct=carriers,
    )


def load_rate_review_baseline(json_path: str | Path) -> PY2027RateBaseline:
    """Load and validate PY2027 rate review JSON from disk."""
    path = Path(json_path)
    raw_text = path.read_text(encoding="utf-8")
    payload = json.loads(raw_text)
    return validate_rate_review_data(payload)
