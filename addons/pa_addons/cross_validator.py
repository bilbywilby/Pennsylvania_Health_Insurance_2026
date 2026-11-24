"""Cross-validation engine for derived public datasets.

Compares numbers in derived metrics (FMV lookups, rate snapshots) against
upstream source values, flagging drift. This is the mechanism that keeps
"primary source truth" a maintained property rather than a snapshot.
Sibling to audit_manifest.py, which covers file integrity, not semantics.
"""

from __future__ import annotations
import json

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


def _area_county_count_pairs(
    ds_payload: object, metrics_payload: object
) -> list[tuple[str, float, float]]:
    """Pair rating-area county list lengths in dataset with n_counties in metrics."""
    if not isinstance(ds_payload, dict) or not isinstance(metrics_payload, dict):
        return []
    ds_areas = ds_payload.get("areas")
    m_areas = metrics_payload.get("areas")
    if not isinstance(ds_areas, dict) or not isinstance(m_areas, dict):
        return []

    pairs: list[tuple[str, float, float]] = []
    for area_id in sorted(set(ds_areas) & set(m_areas)):
        ds_entry = ds_areas[area_id]
        m_entry = m_areas[area_id]
        if not isinstance(ds_entry, list) or not isinstance(m_entry, dict):
            continue
        n_counties = m_entry.get("n_counties")
        if isinstance(n_counties, (int, float)) and not isinstance(n_counties, bool):
            pairs.append((f"area[{area_id}].n_counties", float(len(ds_entry)), float(n_counties)))
    return pairs


def build_default_checks(repo_root: str | os.PathLike[str]) -> list[dict[str, object]]:
    """Build cross-validation checks pairing derived PA datasets with source JSONs."""
    from pathlib import Path

    root = Path(repo_root)
    candidate_pairs = [
        (
            "onepagers_ra_dataset_vs_area_metrics",
            root / "sources" / "pa_ra_onepagers" / "data" / "pa_ra_dataset.json",
            root / "sources" / "pa_ra_onepagers" / "data" / "derived_area_metrics.json",
        ),
        (
            "umbrella_ra_dataset_vs_onepagers_metrics",
            root / "sources" / "animated-umbrella" / "data" / "pa_ra_dataset.json",
            root / "sources" / "pa_ra_onepagers" / "data" / "derived_area_metrics.json",
        ),
    ]

    checks: list[dict[str, object]] = []
    for name, left_path, right_path in candidate_pairs:
        if not left_path.is_file() or not right_path.is_file():
            checks.append(
                {
                    "name": name,
                    "status": "skipped",
                    "reason": "source_file_not_present",
                    "left": str(left_path),
                    "right": str(right_path),
                }
            )
            continue

        left_data = json.loads(left_path.read_text(encoding="utf-8"))
        right_data = json.loads(right_path.read_text(encoding="utf-8"))
        pairs = _area_county_count_pairs(left_data, right_data)

        mismatches: list[dict[str, object]] = []
        for metric_key, left_val, right_val in pairs:
            if abs(left_val - right_val) > 1e-6:
                mismatches.append(
                    {
                        "key": metric_key,
                        "left": left_val,
                        "right": right_val,
                    }
                )

        status = (
            "no_overlap"
            if not pairs
            else ("ok" if not mismatches else "mismatch")
        )
        checks.append(
            {
                "name": name,
                "status": status,
                "shared_numeric_keys": len(pairs),
                "mismatches": mismatches,
            }
        )
    return checks
