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


def _extract_numeric_map(payload: object, prefix: str = "") -> dict[str, float]:
    """Flatten nested dicts/lists into dotted numeric key -> float pairs."""
    out: dict[str, float] = {}
    if isinstance(payload, dict):
        for key, val in payload.items():
            path = f"{prefix}.{key}" if prefix else str(key)
            if isinstance(val, (int, float)) and not isinstance(val, bool):
                out[path] = float(val)
            elif isinstance(val, (dict, list)):
                out.update(_extract_numeric_map(val, path))
    elif isinstance(payload, list):
        for idx, val in enumerate(payload):
            path = f"{prefix}[{idx}]"
            if isinstance(val, (int, float)) and not isinstance(val, bool):
                out[path] = float(val)
            elif isinstance(val, (dict, list)):
                out.update(_extract_numeric_map(val, path))
    return out


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
        left_nums = _extract_numeric_map(left_data)
        right_nums = _extract_numeric_map(right_data)

        shared_keys = sorted(set(left_nums) & set(right_nums))
        mismatches: list[dict[str, object]] = []
        for key in shared_keys:
            if abs(left_nums[key] - right_nums[key]) > 1e-6:
                mismatches.append(
                    {
                        "key": key,
                        "left": left_nums[key],
                        "right": right_nums[key],
                    }
                )

        checks.append(
            {
                "name": name,
                "status": "ok" if not mismatches else "mismatch",
                "shared_numeric_keys": len(shared_keys),
                "mismatches": mismatches,
            }
        )
    return checks
