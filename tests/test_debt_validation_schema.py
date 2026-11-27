"""Cross-consistency tests for the DV-001..014 template/schema pair.

Spec-artifact tests only: they validate the template/schema files against
each other. They do NOT exercise medical_debt_cms.py runtime behavior.
"""
import json
import re
from datetime import date
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
SCHEMA_PATH = REPO / "sources/keystone_health/schema/debt_validation_dv001_014.schema.json"
TEMPLATE_PATH = REPO / "sources/keystone_health/schema/debt_validation_dv001_014.template.md"


def _load():
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    template = TEMPLATE_PATH.read_text(encoding="utf-8")
    return schema, template


def test_field_ids_match_template_tags():
    schema, template = _load()
    tags = set(re.findall(r"DV-\d{3}", template))
    assert tags == {f["field_id"] for f in schema["fields"]}, (
        f"template tags {sorted(tags)} != schema ids "
        f"{sorted(f['field_id'] for f in schema['fields'])}"
    )


def test_every_placeholder_string_present_in_template():
    schema, template = _load()
    for f in schema["fields"]:
        needle = "VIA CERTIFIED MAIL" if f["field_id"] == "DV-002" else f["raw_placeholder"]
        assert needle in template, f"missing placeholder for {f['field_id']}: {needle}"


def test_conditional_fields_have_required_when_variant():
    schema, _ = _load()
    cond = {f["field_id"]: f for f in schema["fields"] if f["field_id"] in
            ("DV-012", "DV-013", "DV-014")}
    assert set(cond) == {"DV-012", "DV-013", "DV-014"}
    for fid, f in cond.items():
        assert "required_when" in f and "variant" in f["required_when"], fid
        assert f["required_when"]["variant"] in schema["variants_supported"], fid


def test_fixture_sol_math_is_actually_time_barred():
    _, template = _load()  # ensure file readable
    fixture = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))["test_fixture"]
    served = date.fromisoformat(fixture["service_or_due_date"])
    letter = date.fromisoformat(fixture["letter_date"])
    elapsed_days = (letter - served).days
    four_years_days = 4 * 365.2425
    assert elapsed_days > four_years_days, elapsed_days
    assert fixture["expected_sol_expired_48m"] is True
    assert fixture["expected_risk_tier"] == "RED"
