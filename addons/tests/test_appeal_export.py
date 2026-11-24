"""Tests for the read-only appeal bundle export."""

import json
from datetime import date

from pa_addons import appeal_export, deadlines

def test_bundle_structure_and_determinism():
    a, b = appeal_export.build_bundle(), appeal_export.build_bundle()
    assert a == b
    assert set(a) >= {"schema_version", "pathways", "deadline_rules", "routes"}
    assert a["schema_version"] == 1
    json.dumps(a)  # must be JSON-serializable

def test_bundle_pathways_complete():
    pw = appeal_export.build_bundle()["pathways"]
    assert {"claim_denial", "surprise_bill", "medical_debt_collection"} <= set(pw)
    for pathway in pw.values():
        steps = pathway["steps"]
        assert isinstance(steps, list) and steps
        assert all("action" in step for step in steps)

def test_bundle_deadline_rules_consistent_with_calculator():
    rules = appeal_export.build_bundle()["deadline_rules"]
    assert set(rules) == set(deadlines.DEADLINE_RULES)
    erisa = rules["erisa_internal_appeal"]
    result = deadlines.compute_deadline(date(2026, 11, 24), "erisa_internal_appeal")
    assert result["authority"] == erisa["authority"]

def test_cli_writes_file(tmp_path):
    out = tmp_path / "bundle.json"
    assert appeal_export.main(["--out", str(out)]) == 0
    loaded = json.loads(out.read_text(encoding="utf-8"))
    assert loaded == appeal_export.build_bundle()
