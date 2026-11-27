"""Core FMV pricing, variance classification, and deterministic PII scrubbing."""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass

SSN_RE = re.compile(r"\b\d{3}-\d{2}-\d{4}\b")
EMAIL_RE = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
NPI_RE = re.compile(r"\b\d{10}\b")


@dataclass(frozen=True)
class AuditFinding:
    record_id: str
    fmv: float
    billed: float
    variance_pct: float
    tier: str


def compute_fmv(base_rate: float, modifier: float = 1.0) -> float:
    """Compute Fair Market Value: FMV = Base * Modifier."""
    if base_rate < 0 or modifier < 0:
        raise ValueError("base_rate and modifier must be non-negative")
    return round(float(base_rate) * float(modifier), 2)


def classify_variance(billed: float, fmv: float) -> tuple[float, str]:
    """Classify billing variance against statutory thresholds (<15%, 15-40%, >40%)."""
    if fmv <= 0:
        raise ValueError("fmv must be positive")
    variance_pct = round(((float(billed) - float(fmv)) / float(fmv)) * 100.0, 2)
    abs_var = abs(variance_pct)
    if abs_var < 15.0:
        tier = "PASS"
    elif abs_var <= 40.0:
        tier = "POTENTIAL_AUDIT"
    else:
        tier = "CRITICAL_OVERCHARGE"
    return variance_pct, tier


def audit_claim_line(
    record_id: str,
    base_rate: float,
    billed_amount: float,
    modifier: float = 1.0,
) -> AuditFinding:
    """Audit a single claim or rate line item against computed FMV."""
    fmv = compute_fmv(base_rate, modifier)
    variance_pct, tier = classify_variance(billed_amount, fmv)
    return AuditFinding(
        record_id=record_id,
        fmv=fmv,
        billed=round(float(billed_amount), 2),
        variance_pct=variance_pct,
        tier=tier,
    )


def _token(prefix: str, value: str, salt: str) -> str:
    digest = hashlib.sha256(f"{salt}:{prefix}:{value}".encode("utf-8")).hexdigest()[:12]
    return f"[{prefix}:{digest}]"


def scrub_pii_line(text: str, salt: str) -> str:
    """Replace SSNs, emails, and 10-digit NPIs with deterministic salted tokens."""
    if not salt:
        raise ValueError("salt is required for deterministic PII scrubbing")
    out = SSN_RE.sub(lambda m: _token("SSN", m.group(0), salt), text)
    out = EMAIL_RE.sub(lambda m: _token("EMAIL", m.group(0), salt), out)
    out = NPI_RE.sub(lambda m: _token("NPI", m.group(0), salt), out)
    return out
