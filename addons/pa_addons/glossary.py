"""Canonical PA health-insurance terminology decoder.

Single source of truth for definitions. Each entry carries a plain-language
rendering and, where confidently known, a controlling-authority citation.
Entries marked "verify" should be checked against the cited authority before
being relied on in a dispute. Downstream tools (AIDecoder, wikis) should
consume this module rather than embedding their own copies.
"""

from __future__ import annotations

TERMINOLOGY: dict[str, dict[str, str]] = {
    "deductible": {
        "definition": "The amount an enrollee must pay for covered services each plan year before the plan begins paying.",
        "plain": "What you pay out of pocket first, before insurance starts sharing costs.",
        "citation": "Plan documents; ACA uniform glossary requirement (45 CFR 147.200) - verify",
    },
    "coinsurance": {
        "definition": "The percentage of the allowed amount for a covered service that the enrollee owes after meeting the deductible.",
        "plain": "Your percentage share of the bill after the deductible is met.",
        "citation": "Plan documents; ACA uniform glossary requirement (45 CFR 147.200) - verify",
    },
    "copayment": {
        "definition": "A fixed dollar amount owed for a covered service, typically due at time of service.",
        "plain": "A flat fee per visit or prescription.",
        "citation": "Plan documents; ACA uniform glossary requirement (45 CFR 147.200) - verify",
    },
    "allowed amount": {
        "definition": "The maximum amount a plan will recognize for a covered service; provider reimbursement and enrollee cost-sharing are calculated from it.",
        "plain": "The bill amount the insurer actually agrees counts.",
        "citation": "See EOB / payer-provider contract; verify",
    },
    "balance billing": {
        "definition": "Billing an enrollee for the difference between a provider's charge and the allowed amount.",
        "plain": "When a provider bills you for what insurance refused to cover.",
        "citation": "45 CFR Part 149 (No Surprises Act) definitions",
    },
    "surprise billing": {
        "definition": "Balance billing arising from out-of-network care the enrollee did not meaningfully choose, e.g. an out-of-network clinician at an in-network facility.",
        "plain": "Getting an out-of-network bill you could not have prevented.",
        "citation": "45 CFR Part 149",
    },
    "prior authorization": {
        "definition": "Advance approval required from a plan before a service is covered.",
        "plain": "Permission your insurer must give before certain care is paid for.",
        "citation": "Plan documents; 31 Pa. Code managed care requirements - verify",
    },
    "explanation of benefits": {
        "definition": "A payer statement describing how a claim was processed, including allowed amount, payer payment, and patient responsibility. Not a bill.",
        "plain": "The insurer's math sheet for a claim. It is not a bill.",
        "citation": "Claims-processing practice; 29 CFR 2560.503-1 for ERISA plan benefit descriptions",
    },
    "rating area": {
        "definition": "A geographic subdivision within which individual and small-group market premiums may vary under the ACA.",
        "plain": "Pennsylvania is divided into regions that set local premium levels.",
        "citation": "45 CFR 153.90; PA rating areas as filed with the PA Insurance Department",
    },
    "external review": {
        "definition": "Independent review of a plan's adverse benefit determination by an accredited independent review organization.",
        "plain": "An outside referee decides a denied claim dispute.",
        "citation": "45 CFR 147.136 (ACA external review); ERISA claims procedure 29 CFR 2560.503-1",
    },
}


def lookup(term: str) -> dict[str, str]:
    """Return the canonical entry for a term (case-insensitive, hyphen/space agnostic)."""
    key = " ".join(term.lower().replace("-", " ").split())
    aliases = {k.lower(): k for k in TERMINOLOGY}
    if key in aliases:
        return TERMINOLOGY[aliases[key]]
    raise KeyError(f"Unknown term: {term!r}")


def search(keyword: str) -> dict[str, dict[str, str]]:
    """Return all entries whose key or text contains the keyword (case-insensitive)."""
    needle = keyword.lower()
    hits: dict[str, dict[str, str]] = {}
    for name, entry in TERMINOLOGY.items():
        haystack = " ".join([name, *entry.values()]).lower()
        if needle in haystack:
            hits[name] = entry
    return hits
