"""Statutory deadline calculator with rule anchors.

Computes deadlines from trigger events. Every rule carries its controlling
authority so the computed date is always traceable to the rule that created it.
Verify current deadlines before relying on them in a filing.
"""

from __future__ import annotations

import calendar
from datetime import date

DEADLINE_RULES: dict[str, dict[str, object]] = {
    "erisa_internal_appeal": {
        "days": 180,
        "trigger": "Adverse benefit determination received",
        "authority": "29 CFR 2560.503-1(a)(1) - participant has 180 days to file appeal",
    },
    "aca_external_review": {
        "months": 4,
        "trigger": "Adverse benefit determination (or internal appeal exhaustion) received",
        "authority": "45 CFR 147.136 - external review request generally within 4 months",
    },
    "nsa_good_faith_estimate_dispute": {
        "days": 90,
        "trigger": "Patient notice that out-of-network charges exceed GFE by $400+ (uninsured/self-pay pathway)",
        "authority": "45 CFR 149.610 - verify current patient-provider dispute resolution window",
    },
}


def _add_months(start: date, months: int) -> date:
    month_index = start.month - 1 + months
    year = start.year + month_index // 12
    month = month_index % 12 + 1
    day = min(start.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def compute_deadline(trigger_date: date, rule_key: str) -> dict[str, object]:
    """Compute the deadline date for a rule from its trigger date."""
    if rule_key not in DEADLINE_RULES:
        raise KeyError(f"Unknown deadline rule: {rule_key!r}")
    rule = DEADLINE_RULES[rule_key]
    if "days" in rule:
        deadline = date.fromordinal(trigger_date.toordinal() + int(rule["days"]))  # type: ignore[arg-type]
    else:
        deadline = _add_months(trigger_date, int(rule["months"]))  # type: ignore[arg-type]
    return {"rule": rule_key, "trigger_date": trigger_date, "deadline": deadline,
            "authority": rule["authority"]}
