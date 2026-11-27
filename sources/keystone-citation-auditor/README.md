# keystone-citation-auditor

Citation audit CLI for Keystone Health and Pennsylvania health insurance repositories (`Keystone_Health_downloadable_files`, `PA_Health_Folded_2026`, `Pennsylvania_Health_Insurance_November_2026`, and `Keystone_Health`).

## Repository Layout

* `keystone-cit.py`: Command-line audit entry point scanning target directories and citation ledgers.
* `tests/conftest.py`: Pytest path configuration exposing `keystone-cit.py` to test modules.
* `tests/test_keystone-cit.py`: Isolated `pytest` suite exercising CLI runs against temporary fixture repositories and `keystone-cit.py` module loading.
* `.gitignore`: Ignores `__pycache__/` and `*.py[cod]` artifacts.

## Usage in Termux

Run the auditor against a target repository directory:

```bash
python3 ~/pa_health_repos/keystone-citation-auditor/keystone-cit.py \
  "$HOME/pa_health_repos/Keystone_Health_downloadable_files"

## Usage
- `python keystone-cit.py audit <path>`: Check for orphans and deadwood.
- `python keystone-cit.py discover <path>`: List all citations found.
- `python keystone-cit.py seed <path>`: Auto-populate CITATIONS.md.
