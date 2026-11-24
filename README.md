# PA_Health_Folded_2026

Consolidated repository archive and forensic healthcare claim audit suite for Pennsylvania health insurance and medical billing analysis.

## Project Overview

`PA_Health_Folded_2026` packages folded source repositories, split chunks, manifest integrity files, and automated audit tooling under a single repository root. Its primary active test and audit target is `sources/pa_audit`, which evaluates claims against fee-schedule fair market value (FMV) variance thresholds, Medicare NCCI Procedure-to-Procedure (PTP) bundling edits with service-date windows, and federal No Surprises Act (`45 CFR Part 149`) emergency out-of-network balance-billing rules while pseudonymizing patient identifiers via HMAC-SHA256.

## Project Status

* **State:** Active local development and test expansion in Termux (`aarch64`, Python `3.14.10`, `pytest` `9.1.1`).
* **Repository Layout:**
  * `sources/pa_audit/src/pa_audit/`: Fee-schedule loading (`pfs.load`), NCCI PTP parsing (`ncci.parse`), and claim auditing (`eob.audit`).
  * `sources/pa_audit/tests/`: Unit and expanded regression suites (`test_audit.py`, `test_audit_expanded.py`).
  * `scripts/`: Repository and manifest tooling scripts.
  * `split_chunks/`: Split archive chunk artifacts.
  * `FOLD_MANIFEST.json` & `FOLD_MANIFEST.sha256`: Folded repository inventory and SHA-256 verification digest.
* **Known Limitations:** `ForensicClaimAuditor.audit_claim` evaluates single-claim dictionaries (`billed_amount`, `cpt_code`, `is_facility`, `gpci`, `is_emergency`, `is_out_of_network`, and optional `service_date` / `dos` / `date_of_service` / `claim_date`); multi-line claim bundling across separate CPT line items is not modeled inside `audit_claim` alone.

## Features & Capabilities

* **FMV Variance Risk Classification:** Computes percentage variance between `billed_amount` and fee-schedule FMV (`FeeScheduleLoader.calculate_fmv` when `cpt_code` is in `pfs_data`, otherwise `billed * 0.5`):
  * Variance less than `15.0%`: `PASS`
  * Variance from `15.0%` through `40.0%` inclusive: `POTENTIAL_AUDIT`
  * Variance greater than `40.0%`: `CRITICAL_OVERCHARGE`
* **Date-Aware NCCI PTP Edit Filtering:** Normalizes claim service dates (`service_date`, `dos`, `date_of_service`, `claim_date`) and edit `effective_date` / `deletion_date` values to 8-digit `YYYYMMDD` strings via `_normalize_yyyymmdd` and `_is_ncci_edit_active`:
  * Skips edits when a valid service date precedes `effective_date` (`dos < eff`).
  * Skips edits on or after `deletion_date` (`dos >= deleted`).
  * Flags `modifier_indicator == "0"` edits matching `cpt_code` in active windows.
* **No Surprises Act Emergency OON Flag:** Marks `nsa_violation = True` and records a `45 CFR 149` violation when `is_emergency` and `is_out_of_network` are both true and `billed > fmv`.
* **Deterministic PII Pseudonymization:** `PIIScrubber` hashes identifiers with HMAC-SHA256 and formats outputs as `ANON-<12-CHAR-HEX>`.

## Installation Guide

### Prerequisites

* Python `3.11+` (tested on Python `3.14.10` in Termux on Android).
* `pytest` installed in the active Python environment.

### Setup from Repository Root

```bash
cd ~/pa_health_repos/PA_Health_Folded_2026
ls -la
