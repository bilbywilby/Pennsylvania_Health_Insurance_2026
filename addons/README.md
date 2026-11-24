# addons/

Ten public-information add-ons making PA health insurance data usable as a
single primary-source truth. Pure Python standard library; no external deps.

- `pa_addons/glossary.py` - canonical terminology decoder with citations
- `pa_addons/deadlines.py` - statutory deadline calculator with rule anchors
- `pa_addons/pathways.py` - dispute pathway state machine (appeals, NSA, debt)
- `pa_addons/rtk_requests.py` - PA Right-to-Know Law / FOIA request generator
- `pa_addons/provider_network.py` - charge-level NSA contestability heuristics
- `pa_addons/evidence_vault.py` - SHA-256 chain-of-custody evidence vault
- `pa_addons/scenario_router.py` - situation-based entry routing
- `pa_addons/cross_validator.py` - derived-vs-upstream numeric drift checks
- `pa_addons/export_bundle.py` - accessibility-first plain-language export
- `pa_addons/addon_validator.py` - fold manifest integrity verification

Run tests: `pytest addons/tests`
