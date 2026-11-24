"""Cross-validation engine for derived public datasets.

Compares numbers in derived metrics (FMV lookups, rate snapshots) against
upstream source values, flagging drift. This is the mechanism that keeps
"primary source truth" a maintained property rather than a snapshot.
Sibling to audit_manifest.py, which covers file integrity, not semantics.
"""

from __future__ import annotations

CHECK_ITEM_KEYS = {"field", "derived_value", "source_value", "tolerance_pct"}


def check(item: dict[str, object]) -> dict[str, object]:
    """Validate one numeric item against its upstream source within tolerance.

    Example item: {"field": "regional_fmv_cpt_99213", "derived_value": 118.0,
                   "source_value": 121.0, "tolerance_pct": 1.5}
    """
    missing = CHECK_ITEM_KEYS - set(item)
    if missing:
        raise ValueError(f"Item missing keys: {sorted(missing)}")
    derived = float(item["derived_value"])  # type: ignore[arg-type]
    source = float(item["source_value"])  # type: ignore[arg-type]
    tol_pct = float(item["tolerance_pct"])  # type: ignore[arg-type]
    if source == 0:
        drift_pct = 0.0 if derived == 0 else float("inf")
    else:
        drift_pct = abs(derived - source) / abs(source) * 100.0
    return {"field": item["field"], "derived": derived, "source": source,
            "drift_pct": round(drift_pct, 4), "within_tolerance": drift_pct <= tol_pct}


def check_all(items: list[dict[str, object]]) -> dict[str, object]:
    results = [check(i) for i in items]
    failed = [r for r in results if not r["within_tolerance"]]
    return {"checked": len(results), "failed": len(failed),
            "passed": len(results) - len(failed), "results": results}
