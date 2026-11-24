"""Situation-based entry routing.

Maps plain-language problem statements ("I got a $2,300 bill after an ER
visit") to ordered next steps and the add-on modules that handle each part,
so users never need taxonomy navigation.
"""

from __future__ import annotations

from . import pathways

ROUTES: dict[str, dict[str, object]] = {
    "er_surprise_bill": {
        "keywords": ["er ", "emergency room", "emergency visit", "ambulance"],
        "headline": "Unexpected emergency-care bill",
        "first_step": "Classify each charge with provider_network.classify_charge",
        "modules": ["provider_network", "pathways:surprise_bill", "deadlines"],
    },
    "denied_claim": {
        "keywords": ["denied", "rejected", "won't cover", "refused"],
        "headline": "Denied claim",
        "first_step": "Open pathways.route('claim denial') and start step 1",
        "modules": ["pathways:claim_denial", "deadlines", "evidence_vault"],
    },
    "collection_threat": {
        "keywords": ["collection", "debt collector", "lawsuit", "credit report"],
        "headline": "Medical debt collection action",
        "first_step": "Open pathways.route('collections') and send a validation demand",
        "modules": ["pathways:medical_debt_collection", "evidence_vault"],
    },
}


def route(problem_text: str) -> dict[str, object]:
    text = problem_text.lower()
    for key, entry in ROUTES.items():
        if any(kw in text for kw in entry["keywords"]):  # type: ignore[union-attr]
            return {"route": key, **entry}
    raise LookupError("No route matched; extend ROUTES.")
