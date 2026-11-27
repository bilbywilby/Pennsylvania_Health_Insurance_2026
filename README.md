# PA_Health_Folded_2026

Consolidated forensic archive, compliance schemas, and verification tooling for **Keystone Health Forensic Navigator** and **Pennsylvania Health Insurance** analysis through **Plan Year 2027 (PY2027)**.

## Repository Scope & Architecture

* **Forensic Pricing & Claim Auditing:** Benchmarks billed charges and EOB lines against MPFS Fair Market Value baselines and variance tiers (`< 15%` pass, `15% - 40%` potential audit, `> 40%` critical overcharge).
* **Federal & Pennsylvania Regulatory Coverage:** Tracks federal **No Surprises Act** balance-billing rules (`45 CFR § 149`), **IRS Section 501(r)** hospital financial assistance obligations, and Pennsylvania statutory frameworks including **Act 252-2023** network disclosure rules, **PA SB 1071** outpatient coinsurance limits, **FCEUA**, **UTPCPL**, and **42 Pa.C.S. § 5525(a)**.
* **PY2027 Rate & Marketplace Context:** Documents PID rate review outcomes (**15.97%** individual weighted average increase; **10.28%** small-group increase; **$94.7 million** in denied requested premium increases), **Pennie** enrollment shifts (~497,000 in 2025 to ~417,000 in September 2026), and 2027 maximum annual cost-sharing limits (**$12,000** self-only / **$24,000** family).
* **Privacy & State Integrity:** Applies local-first PII scrubbing (deterministic HMAC-SHA256 salted hashes), Layered Memory Protocol (LMP) version conflict ordering (`v_in > v_t`), Unicode normalization, and `FOLD_MANIFEST.sha256` integrity verification across tracked manifest entries.

## Repository Layout

* `README.md` — Repository overview, compliance scope, and operational notes.
* `HANDOVER.json` — Structured handover snapshot for ongoing repository audits and sync workflows.
* `FOLD_MANIFEST.sha256` — SHA-256 checksum manifest covering tracked repository files.
* `sources/` — Folded archives, schema definitions (`dispute_template_escalation.schema.json`), debt audit datasets (`debts.json`), audit reports, and reference documents.
* `scripts/folded/` — Flattened copies of key source, schema, data, and audit scripts.

## Integrity & Validation Commands

Run from the repository root in Termux using fail-closed shell execution:
sha256sum -c --quiet FOLD_MANIFEST.sha256 python3 -m json.tool sources/keystone_health/schema/dispute_template_escalation.schema.json >/dev/null python3 -m json.tool sources/keystone_health/data/debts.json >/dev/null git status --short git rev-list --left-right --count HEAD...origin/main
