"""Charge-level network classification and NSA contestability heuristics.

Distinguishes facility fee, professional component, and ancillary provider
network status so the Emergency/Dispute interfaces can show WHICH charge is
contestable under the No Surprises Act versus ordinary balance billing.
Heuristic only - confirm against the actual EOB and plan documents.
"""

from __future__ import annotations

CONTESTABLE_TYPES = {"facility", "professional", "ancillary"}


def classify_charge(charge: dict[str, object]) -> dict[str, object]:
    """Classify one charge line for NSA protection.

    Expected keys: charge_type (facility|professional|ancillary),
    is_emergency (bool), facility_in_network (bool),
    provider_in_network (bool), consent_notice_given (bool, optional).
    """
    ctype = str(charge.get("charge_type", "")).lower()
    if ctype not in CONTESTABLE_TYPES:
        raise ValueError(f"charge_type must be one of {sorted(CONTESTABLE_TYPES)}")
    is_emergency = bool(charge.get("is_emergency", False))
    facility_oon = not charge.get("facility_in_network", True)
    provider_oon = not charge.get("provider_in_network", True)
    consent = bool(charge.get("consent_notice_given", False))

    nsa_protected = False
    reason = ""
    if is_emergency and provider_oon:
        nsa_protected, reason = True, "Emergency services: OON provider billing restricted under 45 CFR 149"
    elif facility_oon and is_emergency:
        nsa_protected, reason = True, "Emergency care at OON facility: NSA applies"
    elif facility_oon and provider_oon and ctype in ("ancillary",) and not consent:
        nsa_protected, reason = True, "Ancillary OON provider at in-network facility without notice: likely NSA-protected - verify"
    elif provider_oon and not consent:
        reason = "Provider OON without documented consent: balance billing may be contestable - verify plan terms"
    else:
        reason = "No NSA protection indicated; check plan cost-sharing only"
    return {"charge_type": ctype, "nsa_protected": nsa_protected, "reason": reason}
