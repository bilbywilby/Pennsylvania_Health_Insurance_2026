# Data update playbook

Use when PID revises rates, adds a filer, or the weekly drift check fails.

1. **Read the primary pages yourself.** PID rate-filing page, coverage-area pages, and the press release (URLs in `wiki/Sources-and-Reproducibility.md`). Do not update from news coverage or from another tool's summary.
2. **Run the drift check** to see what differs: `python3 src/refresh_check.py` (or `--file saved_page.html`). Exit 1 = differences, 2 = could not fetch.
3. **Edit only `data/pa_ra_validated_dataset.json`.** Change the figures that differ; for a new filer add an entry with `counties`, `req27`, `app27`, `share26`, `on_pennie`.
4. **Rebuild and validate:** `python3 src/build_one_pagers.py` (aborts if the weights stop reproducing PID's averages or an area list disagrees with PID's stated areas), then `python3 src/build_audits.py` and `python3 src/build_lookup.py`.
5. **Update the numbers that live in prose:** statewide averages in `src/build_lookup.py` and `wiki/` pages; regenerate wiki pages from your generator or edit by hand, then run the gate.
6. **Gate everything:** `bash scripts/release_check.sh`. A FAIL on the numbers gate means a published figure disagrees with the dataset.
7. **Record provenance:** `python3 src/provenance.py record --name "PID rates page" --url <url> --file <saved copy> --tier VERIFIED --notes "read <date>, what changed"`.
8. **Bump the version** in `CHANGELOG.md` and `HANDOVER.json`, then commit and push by hand.

If a figure cannot be traced to a primary page, mark it UNVERIFIED or leave it out. Never publish it as fact.
