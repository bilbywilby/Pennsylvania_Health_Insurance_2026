# DV2 Field Map — Formal Debt Validation & Statutory Dispute Notice (v2.0.0)

Canonical source: `Formal Debt Validation & Statutory Dispute Notice.txt` (repo root). Every bracketed token in that letter is declared below; the pytest suite enforces multiset equality between letter and schema.

| Field | Token | Occ/Ren | Section | Type | PII class | Dispatch | Hooks / status |
|---|---|---|---|---|---|---|---|
| DV2-001 | `[Your Full Name]` | 1/2 | Header + Re block | string | consumer_identity | omit | 15 U.S.C. § 1692g |
| DV2-002 | `[Street Address]` | 1/1 | Sender block | string | consumer_identity | omit | — |
| DV2-003 | `[City, PA ZIP Code]` | 1/1 | Sender block | string | consumer_identity | omit | — |
| DV2-004 | `[Phone]` | 1/1 | Sender block | string | contact_detail | omit | — |
| DV2-005 | `[Email]` | 1/1 | Sender block | string | contact_detail | omit | — |
| DV2-006 | `[Date]` | 1/1 | Header | date | date | omit | 15 U.S.C. § 1692g |
| DV2-007 | `[Insert Tracking Number]` | 1/1 | Delivery block | string | delivery_proof | include | — |
| DV2-008 | `[Provider/Collector Name]` | 1/1 | Recipient block | string | provider_identifier | hash_or_omit | 15 U.S.C. § 1692g; 73 P.S. § 2270.4 |
| DV2-009 | `[Street Address]` | 2/1 | Recipient block | string | provider_identifier | omit | — |
| DV2-010 | `[City, State ZIP Code]` | 1/1 | Recipient block | string | provider_identifier | omit | — |
| DV2-011 | `[Account Number]` | 1/1 | Re block | string | account_reference | redact_account_id | 15 U.S.C. § 1692g |
| DV2-012 | `[Dates]` | 1/1 | Re block | date_range | date | include | 42 Pa.C.S. § 5525(a) |
| DV2-013 | `[Amount]` | 1/1 | Re block | currency | financial_amount | include | 15 U.S.C. § 1692e; 73 P.S. § 201-9.2 |
| DV2-014 | `[Date of First Statement]` | 1/1 | Re block | date | date | include | 42 Pa.C.S. § 5525(a); 26 U.S.C. § 501(r) |
| DV2-015 | `[Insurer Name]` | 1/1 | Section 2 | string | provider_identifier | include | 45 C.F.R. Part 149 |
| DV2-016 | `[Date of Service]` | 1/1 | Section 2 | date | date | include | 45 C.F.R. Part 149 |
| DV2-017 | `[Signature — sign in ink]` | 1/1 | Signature block | ink_signature | other | omit | — |
| DV2-018 | `[Date]` | 2/1 | Signature block | date | date | omit | — |
| DV2-019 | `[Printed Name]` | 1/1 | Signature block | string | consumer_identity | omit | — |
| DV2-020 | `[Insurance Carrier Name, if applicable]` | 1/1 | CC block | string | provider_identifier | include | — |
| DV2-021 | `[Third-Party Collector Name, if known]` | 1/1 | CC block | string | provider_identifier | include | 15 U.S.C. § 1692g |
| DV2-022 | `[VERIFY AT cms.gov/nosurprises]` | 1/1 | Section 4 | verify_flag | other | omit | — |

Underscore blanks (signature line, date line, attachment `Other:`) are physical form lines, not bracket tokens — see DV2-017/DV2-018 and the attachment checklist note in the letter.

## Shared-token collisions (positional occurrence indexing)

`[Street Address]` → DV2-002 (occ 1, sender) / DV2-009 (occ 2, recipient).
`[Date]` → DV2-006 (occ 1, letter date) / DV2-018 (occ 2, signature date).

## Citation triage carried from the letter's own flags table

- **45 C.F.R. Part 149; PHS Act §§ 2799A-1–2799A-3** — verified
- **45 C.F.R. § 149.420 (consent-waiver elements)** — pending_primary_source — Plausible; verify elements against eCFR
- **26 U.S.C. § 501(r); 26 C.F.R. § 1.501(r)-6** — verified — Reg. pin cite 1.501(r)-6 pending primary-source confirm
- **73 P.S. § 2270.1 et seq. (FCEUA)** — verified
- **73 P.S. § 2270.4 (pin cite)** — pending_pin_cite — Pull exact subsection from PA statutes
- **73 P.S. § 201-9.2 (UTPCPL treble damages)** — pending_pin_cite — Confirm treble-damages provision
- **42 Pa.C.S. § 5525(a)(8)** — pending_pin_cite — Confirm subsection numbering
- **42 Pa.C.S. § 5533** — contested — Letter invokes for clock-reset; conflicting internal research says § 5533(b) concerns minors (tolling for disability). RECOMMENDATION: drop the § 5533 pin cite from Section 1.3 — the no-acknowledgment sentence functions without it. RESOLVED: Pin cite removed from letter body and wiki Template-Debt-Validation page (repo commit 9650949 + wiki fix, 2026-11-27). Statute scope confirmed via Keystone Forensic Navigator.pdf:6342-6364: 42 Pa.C.S. § 5533 concerns tolling for infancy, insanity, or imprisonment; subsection (b) was deleted by the 2004 amendment; the micro-payment/SOL-reset doctrine is withdrawn. 'contested' now marks the retired historical claim, not any live ambiguity.
- **42 Pa.C.S. §§ 8123, 8127 (post-judgment exemptions)** — pending_primary_source
- **PID Consumer Services Bureau 1-877-881-6388** — conflict_pending — Letter marks ✅; handover separately records unverified consumer line 1-800-722-3998. Reconcile which desk/number before publishing.
- **CMS No Surprises Help Desk 1-800-985-3059** — contested — Letter's own flag: conflicting sources; resolve at cms.gov
- **PA AG Bureau of Consumer Protection 1-877-888-4877** — pending_primary_source
