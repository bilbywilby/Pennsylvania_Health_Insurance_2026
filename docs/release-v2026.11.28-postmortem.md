# Postmortem & Release Gate Ledger — v2026.11.28-react-19

- **Repo:** `bilbywilby/Pennsylvania_Health_Insurance_2026`
- **Base Commit:** `99a21c89bc2edb0ee03470e932a60e96ec9ff709` (`22` commits past `v2026.11.27-react-19`)
- **CI:** `ci` · `46143049351` (`success`) · `python-ci` · `46143049418` (`success`)
- **Local suite:** `69` tests passing (`44` `pa_health_audits` @ `0.28s`, `25` root @ `0.10s`)
- **Environment:** Termux on Android (ARM64), manifest-tracked fold, `gh` polling loop

---

## Part 1 — Debugging React 19 Destructuring, Manifests, and ARM64 Quirks

### 1.1 The contrarian take: regex bulk-fixes compound compiler errors

When a codemod broke across dozens of `.tsx` files, the instinctive move is a regex sweep. This session shows why that's a trap: the sweep produced collateral artifacts (`{ status, ...task: expr }` malformed spread-colons in `errorReporter.ts`-adjacent code, orphaned `)` at `sidebar.tsx:155`) that cost more CI cycles than the original errors. The scan for `\.\.\.[ident]:` and lone paren lines surfaced hits, but nearly all were false positives — legitimate rest-argument signatures and JSX closers in `shadcn/ui` components. Pattern matching can't distinguish a defect from a dialect.

Rule of thumb adopted here: never treat a failed build with a bulk edit before reproducing the transformation rule that caused it. One root-cause fix (correcting the codemod's binding-pattern output) beats twenty per-file patches.

### 1.2 The story: green checks from a phone, while workerd refuses the hardware

The full loop ran from a Termux shell: audit, manifest refresh, commit, `gh run` polling with `--json` templates, all under `umask 077` and strict-mode heredocs. The friction climax was instructive — `bun run typecheck` passed while `bun run build` failed locally with `Unsupported platform: android arm64 LE` inside `workerd`, a Cloudflare runtime that simply doesn't ship for this device.

The lesson encoded here: separate platform blockers from transform errors. A local ARM64 `workerd` absence is an environment fact, not a regression signal. CI (`x86_64` runners) turning green while the local build can't run confirms the distinction. Verification on-device therefore re-scoped to what IS deterministically runnable locally: `tsc --noEmit`, `pytest`, `sha256sum -c`, and the appeal-bundle reconciler.

### 1.3 What the logs actually prove

Evidence ledger, pairing each gate with its output:

| Gate | Result | Evidence |
| --- | --- | --- |
| `bun run typecheck` | Clean | `$ tsc --noEmit`, silent exit `0` |
| `pa_health_audits` pytest | `44` passed, `0.28s` | `python3 -m pytest -q tests` |
| Root pytest | `25` passed, `0.10s` | `python3 -m pytest -q tests` |
| `FOLD_MANIFEST.sha256` | `2,695` entries OK | `sha256sum -c --quiet` |
| `MANIFEST.sha256` | `2,696` entries OK | `sha256sum -c --quiet` |
| Appeal bundle | `5` reconciled, `1` known warning | `INTEREST_RATE` / PA SB 371, `deadlineKey` intentionally omitted |
| `ci` workflow | `success` | run `46143049351` |
| `python-ci` workflow | `success` | run `46143049418` |

The three `esbuild` failures recorded during the cycle — `Invalid binding pattern` at `alert.tsx:22:45`, `Expected "}" but found ":"` at `VaultPage.tsx:47:38`, `Unexpected ")"` at `sidebar.tsx:155:0` — were all transform-layer defects invisible to the type checker. Benchmark slots for future entries: CI minutes saved per avoided push and ratio of regex-induced edits to original errors. Backfill these when the next codemod cycle happens.

### 1.4 Playbook: guarding manifest-tracked monorepos during codemods

Run the edit–verify–commit loop locked down so broken syntax never reaches `git push`:

```bash
set -euo pipefail
cd "$HOME/pa_health_repos/PA_Health_Folded_2026"

# 1. Dry-run the codemod: print every match + file before writing
# codemod --dry-run src/ # inspect output FIRST

# 2. Typecheck AND transform-check before touching manifests
(cd sources/keystone-sync && bun run typecheck)
# Note: bun run build may fail on android arm64 (workerd). That is
# environment, not regression — do not block on it; rely on CI.

# 3. Regenerate manifests only after syntax verification (per fold process)
# git ls-files -z -- . ':(exclude)MANIFEST.sha256' | xargs -0 sha256sum > MANIFEST.sha256

# 4. Re-verify everything before commit/push
sha256sum -c FOLD_MANIFEST.sha256 --quiet
sha256sum -c MANIFEST.sha256 --quiet
python3 -m pytest -q tests

1.5 What was missed: typecheck != parse
tsc --noEmit and esbuild enforce different rules at different stages. TypeScript's checker validates types against an AST it accepts; esbuild's transformer parses and lowers syntax itself and rejects constructs the checker tolerated that trip syntax or binding validation during bundling. In multi-target builds — Worker/SSR bundle plus client bundle, or workerd/Durable Object runtimes — one broken component can pass the full gate suite and still halt production bundling, because syntax transforms can run ahead of strict AST validation in a pipeline the type checker never covers.
Mitigation: CI must include at least one job that runs the bundler, not just the checker. This repo's ci workflow satisfies that on supported runners; local machines can substitute esbuild --bundle on an isolated file if a full build is platform-blocked.
Part 2 — Shipping v2026.11.28-react-19 with Provenance Tags
2.1 The contrarian take: tagging despite a local ARM64 build failure is fine
Conventional release checklists demand identical green builds everywhere. That's unattainable when the target runtime doesn't exist for your platform. What replaces it is explicit gate scoping: record exactly which gates ran, where, and record the environmental limitation alongside them. The annotated tag below carries the proof; it makes no false claim about local workerd support.
2.2 Baking receipts into the tag object
The release tag v2026.11.28-react-19 was cut after clearing the three esbuild defects, verifying both manifests with sha256sum -c, confirming HEAD matched origin/main with a clean working tree, reconciling the 5 AppealIssue entries (1 documented INTEREST_RATE warning per PA SB 371), and confirming tsc + pytest green. All of it — HEAD, run IDs, test counts, manifest counts, known exceptions — lives inside the annotated tag object.
git tag -a v2026.11.28-react-19 \
-m "Release v2026.11.28-react-19" \
-m "Base verified commit: 99a21c89bc2edb0ee03470e932a60e96ec9ff709" \
-m "Gates: ci 46143049351 success; python-ci 46143049418 success; 69 pytest tests passed (44 audits + 25 root); FOLD_MANIFEST + MANIFEST verified; appeal bundle reconciled (5 entries, 1 known INTEREST_RATE warning); keystone-sync tsc --noEmit clean." \
-m "Known limitation: bun run build blocked on android arm64 (workerd platform)."

2.3 Release gate ledger
| Item | Value |
|---|---|
| Tag | v2026.11.28-react-19 |
| Base Commit | 99a21c8 (22 past v2026.11.27-react-19) |
| FOLD_MANIFEST.sha256 | 2,695 pre-doc entries — verified OK |
| MANIFEST.sha256 | 2,696 pre-doc entries — verified OK |
| pa_health_audits tests | 44 passed (0.28s) |
| Root tests | 25 passed (0.10s) |
| AppealIssue entries | 5 reconciled, 1 warning (INTEREST_RATE, intentional) |
| tsc --noEmit | Clean |
| Workflows | ci 46143049351 (success), python-ci 46143049418 (success) |
Benchmark slots for longitudinal tracking: release-to-incident regression count and mean time to diagnose CI vs. local build failure.
2.4 Pre-tag gate checklist (reusable)
set -euo pipefail
cd "$HOME/pa_health_repos/PA_Health_Folded_2026"
repo_slug="$(git remote get-url origin | sed -E 's#^git@github\.com:|https://github\.com/##; s#\.git$##')"
new_tag="v2026.11.28-react-19"

git fetch origin --quiet
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || { echo "diverged"; exit 1; }
[ -z "$(git status --porcelain)" ] || { echo "dirty tree"; exit 1; }

sha256sum -c FOLD_MANIFEST.sha256 --quiet
sha256sum -c MANIFEST.sha256 --quiet

(cd sources/keystone-sync && bun run typecheck)
if [ -f "scripts/check_appeal_bundle.js" ]; then
node scripts/check_appeal_bundle.js
fi
python3 -m pytest -q tests

git tag -a "$new_tag" -m "See ledger: docs/release-v2026.11.28-postmortem.md"
git push origin "$new_tag"
git ls-remote --tags origin "$new_tag"
echo "[https://github.com/$repo_slug/releases/tag/$new_tag](https://github.com/$repo_slug/releases/tag/$new_tag)"

2.5 The one-entry manifest delta
FOLD_MANIFEST.sha256 tracks 2,695 entries and MANIFEST.sha256 tracks 2,696 pre-addition (incrementing in lockstep to 2,696 and 2,697 once this postmortem is added). The single-entry difference is a coverage asymmetry: each manifest excludes itself from its own tracked set (:(exclude)FOLD_MANIFEST.sha256 vs. :(exclude)MANIFEST.sha256), so the union of tracked files is identical without self-checksum circularity.
* Any tooling that compares entry counts across the two manifests and expects equality will always flag a false off-by-one. Note it in the audit scripts.
* Adding a new file increments both counts in lockstep; a count drift of 2 or more signals a file added to one fold but not the other — treat that as an incident.
Open follow-ups (non-blocking)
* actions/checkout@v4 Node 20 deprecation annotation — bump when a checkout major targeting Node 24 ships.
* Backfill benchmark slots in §1.3 and §2.3 at the next codemod/release cycle.
* Add a codemod lint rule rejecting { x, ...rest: expr } output patterns at generation time, closing the defect class at the source.
