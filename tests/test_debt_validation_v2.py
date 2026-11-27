"""DV2 schema <-> canonical letter consistency tests.

Hard gate: the bracket-token multiset of the published letter must equal
the multiset declared in the v2 schema. Soft items (underscore blanks) are
not enforced here.
"""
import json
import re
from collections import Counter
from datetime import date
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
SCHEMA = REPO / "sources/keystone_health/schema/debt_validation_notice_v2.schema.json"
LETTER = REPO / "templates/Formal Debt Validation & Statutory Dispute Notice.txt"

def _load():
    return json.loads(SCHEMA.read_text(encoding="utf-8")), LETTER.read_text(encoding="utf-8")

TOKEN_RE = re.compile(r"\[[^\]]+\]", re.DOTALL)
BODY_MARKER = "END OF FORMAL NOTICE"

def _tokens(text):
    return Counter(re.sub(r"\s+", " ", t).strip() for t in TOKEN_RE.findall(text))

def test_letter_tokens_match_schema_multiset():
    schema, letter = _load()
    in_letter = _tokens(letter.split(BODY_MARKER, 1)[0])
    declared = Counter()
    for fld in schema["fields"]:
        if fld["syntax"] == "bracket_allcaps":
            declared[fld["raw_placeholder"]] += fld["renders"]
    assert in_letter == declared, (
        f"letter-only: {sorted((in_letter - declared).elements())} | "
        f"schema-only: {sorted((declared - in_letter).elements())}"
    )

def test_shared_tokens_declared_positionally():
    schema, _ = _load()
    for coll in schema["shared_token_collisions"]:
        flds = {f["field_id"]: f for f in schema["fields"]}
        occs = sorted(flds[fid]["occurrence"] for fid in coll["fields"])
        assert occs == [1, 2], (coll["token"], occs)
        total = len(coll["fields"])
        n = sum(1 for _ in re.finditer(re.escape(coll["token"]),
                                       LETTER.read_text(encoding="utf-8")))
        assert total == n, (coll["token"], total, n)

def test_accrual_anchor_present_with_sol_hook():
    schema, _ = _load()
    flds = {f["field_id"]: f for f in schema["fields"]}
    anchor = flds["DV2-014"]
    assert anchor["raw_placeholder"] == "[Date of First Statement]"
    assert "42 Pa.C.S. § 5525(a)" in anchor["statutory_hooks"]

def test_contested_citation_flagged_not_verified():
    schema, letter = _load()
    s5533 = [c for c in schema["citations_ledger"] if "5533" in c["cite"]]
    assert s5533 and s5533[0]["status"] == "contested"
    # and nowhere in the schema is it asserted as verified
    assert all(c["status"] != "verified" for c in s5533)

def test_fixture_sol_math_is_actually_time_barred():
    schema, _ = _load()
    fx = schema["test_fixture"]
    first = date.fromisoformat(fx["date_of_first_statement"])
    letter = date.fromisoformat(fx["letter_date"])
    assert (letter - first).days > 4 * 365.2425
    assert fx["expected_sol_expired_48m_from_first_statement"] is True
    assert fx["expected_risk_tier"] == "RED"

def test_verify_flag_field_is_omitted_from_dispatch():
    schema, _ = _load()
    vf = [f for f in schema["fields"] if f["data_type"] == "verify_flag"]
    assert len(vf) == 1 and vf[0]["dispatch_payload"] == "omit"
