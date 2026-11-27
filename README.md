# Keystone Health & Pennsylvania Health Insurance Audit (`keystone_health`)

Forensic healthcare compliance, medical debt verification, and Pennsylvania health insurance / Plan Year 2027 marketplace audit workspace maintained across `~/projects/keystone_health` and `~/pa_health_repos/PA_Health_Folded_2026`, synchronized with `https://github.com/bilbywilby/Pennsylvania_Health_Insurance_2026.git`.

---

## 1. Project Overview

`keystone_health` provides compliance evaluation, identifier redaction, retry-aware dispatch helpers, and `pytest` verification for medical debt and Pennsylvania regulatory audit workflows (`42 Pa.C.S. § 5525(a)` statute of limitations checks, IRS Section 501(r) Financial Assistance Policy windows, and Plan Year 2027 Pennsylvania ACA rate/audit artifacts).

The workspace unifies local forensic debt and compliance scripts (`scripts/medical_debt_cms.py`), isolated unit tests (`tests/medical_debt_cms.py`, `tests/test_dispatch_work_orders.py`), folded source subtrees under `sources/`, and remote synchronization with `bilbywilby/Pennsylvania_Health_Insurance_2026` on `main`.

---

## 2. Project Status

- **Current Branch & Sync:** `main` (`ade66ec`) tracking `origin/main` on `https://github.com/bilbywilby/Pennsylvania_Health_Insurance_2026.git`.
- **Test Suite Status:** 15 passing `pytest` cases (`tests/test_dispatch_work_orders.py` and `tests/test_medical_debt_cms.py`) on Python `3.14.10` (`pytest 9.1.1`).
- **Environment & Compatibility:**
  - **Runtime:** Python `3.14.10` on Android / Termux (`aarch64`) and Linux/WSL environments.
  - **Date Arithmetic:** Pure Python standard-library date math (`_add_months` helper and `datetime.timedelta`) in test suites; no runtime reliance on `dateutil.relativedelta`.
  - **Known Caveats:** `scripts/medical_debt_cms.py` invokes `time.sleep(wait)` in `post_with_retry`; test harness setup binds `time` onto the dynamically loaded module when testing retry backoff. Remote `origin/main` currently carries 175 Dependabot vulnerability alerts across folded manifests/lockfiles in `sources/` and `addons/`.

---

## 3. Features & Capabilities

- **Medical Debt & Compliance Evaluation (`scripts/medical_debt_cms.py`):**
  - Evaluates Pennsylvania statute of limitations (`42 Pa.C.S. § 5525(a)`) and IRS Section 501(r) FAP 240-day windows.
  - Classifies risk tiers (`classify_risk`) into `RED` (time-barred or `501(r)` violations), `YELLOW` (upcoming deadlines), or `GREEN` (general notices).
- **Redaction, Idempotency & Dispatch:**
  - Redacts account and document IDs (`redact_account_id`) and computes deterministic HMAC-SHA256 digests (`_idempotency_key`) for payload construction (`build_payload`) and retry-aware HTTP dispatch (`post_with_retry`).
  - Handles missing ledger files safely (`load_debts`) and supports deterministic redaction distinctness checks (`test_redaction_hash_distinctness`).
- **Multi-Workspace & Folded Audit Layout:**
  - Coordinates `~/projects/keystone_health` with `~/pa_health_repos/PA_Health_Folded_2026` (`FOLD_MANIFEST.json`, `FOLD_MANIFEST.sha256`), `addons/`, `sources/audit_tools/`, `sources/pa_audit/`, and folded `sources/` archives.

---

## 4. Installation Guide

1. Ensure Python `3.11+` (`3.14.10` tested in Termux) and `pytest` are available.
2. Clone or update the repository:
   
```bash
   git clone [https://github.com/bilbywilby/Pennsylvania_Health_Insurance_2026.git](https://github.com/bilbywilby/Pennsylvania_Health_Insurance_2026.git) "$HOME/projects/keystone_health"
   
