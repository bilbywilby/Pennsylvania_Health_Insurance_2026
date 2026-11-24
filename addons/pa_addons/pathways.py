"""Dispute pathway state machine.

Routes a user's situation to the ordered procedural steps drawn from the
Keystone dispute corpus (internal appeal, ERISA grievance, external review,
PA Insurance Department complaint, collection defense). Interface layer is
AppealGenerator; this module is the engine.
"""

from __future__ import annotations

PATHWAYS: dict[str, dict[str, object]] = {
    "claim_denial": {
        "matches": ["denied", "denial", "not medically necessary", "adverse benefit"],
        "steps": [
            {"step": 1, "action": "Request written denial rationale and plan documents", "reference": "29 CFR 2560.503-1"},
            {"step": 2, "action": "File internal appeal within 180 days", "deadline_rule": "erisa_internal_appeal"},
            {"step": 3, "action": "If upheld, request external review within 4 months", "deadline_rule": "aca_external_review"},
            {"step": 4, "action": "File PA Insurance Department complaint in parallel", "reference": "PA Insurance Dept consumer complaint process"},
        ],
    },
    "surprise_bill": {
        "matches": ["surprise", "out-of-network", "balance bill", "emergency room"],
        "steps": [
            {"step": 1, "action": "Confirm whether NSA protections apply (emergency or incidental OON at in-network facility)", "reference": "45 CFR Part 149"},
            {"step": 2, "action": "Submit NSA balance-billing dispute to plan and provider", "reference": "45 CFR 149.020 complaint process - verify"},
            {"step": 3, "action": "Escalate to PA Insurance Department if unresolved", "reference": "PA IDF complaint process"},
        ],
    },
    "medical_debt_collection": {
        "matches": ["collections", "collection agency", "sued", "garnish", "credit report"],
        "steps": [
            {"step": 1, "action": "Demand itemization and validation of the debt", "reference": "FDCPA 15 U.S.C. 1692g"},
            {"step": 2, "action": "Check charity-care / 501(r) financial assistance eligibility", "reference": "501(r) FAP policy from Keystone corpus"},
            {"step": 3, "action": "Respond to any suit before the hearing date; assert FAP non-collection violations", "reference": "PA Medical Debt Defense Framework"},
        ],
    },
}


def route(situation_text: str) -> dict[str, object]:
    """Pick the first pathway whose keywords match the situation text."""
    text = situation_text.lower()
    for name, pathway in PATHWAYS.items():
        if any(kw in text for kw in pathway["matches"]):  # type: ignore[union-attr]
            return {"pathway": name, **pathway}
    raise LookupError("No pathway matched; extend PATHWAYS or refine the situation text.")
