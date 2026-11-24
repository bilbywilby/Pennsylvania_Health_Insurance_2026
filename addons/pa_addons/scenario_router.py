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


def main(argv: list[str] | None = None) -> int:
    import argparse
    import sys

    parser = argparse.ArgumentParser(
        prog="pa-scenario-router",
        description="Route a PA health insurance or billing situation to a guidance pathway.",
    )
    parser.add_argument("situation", nargs="+", help="Description of the situation or billing issue")
    parser.add_argument("--json", action="store_true", help="Output result as JSON")
    args = parser.parse_args(argv)

    query = " ".join(args.situation).strip()
    try:
        result = route(query)
    except LookupError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 2

    if args.json:
        print(json.dumps(result, indent=2))
    else:
        print(f"Pathway: {result.get('pathway') or result.get('name') or 'matched'}")
        for step in result.get("steps", []):
            if isinstance(step, dict):
                ref = f" [{step['reference']}]" if step.get("reference") else ""
                rule = f" (rule: {step['deadline_rule']})" if step.get("deadline_rule") else ""
                print(f"  {step.get('step', '?')}. {step.get('action', '')}{rule}{ref}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
