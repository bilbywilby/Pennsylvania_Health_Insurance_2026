# Dependencies & Sync Runbook (`PA_Health_Folded_2026`)

## Core Versions & Runtime Notes

* **React / React-DOM / `@types/react`:** `^19.3.1` (`sources/keystone-sync/package.json`)
* **`@types/react-dom`:** `^19.0.0` (registry constraint; resolves compatible `19.x` lockfile entries)
* **Package Manager / Runtime:** Bun `v1.4.5`
* **Android / Termux (`aarch64`) Note:** `workerd` lacks native `android arm64 LE` binaries. `scripts/smoke_keystone_sync.sh` passes `--ignore-scripts` to `bun install --frozen-lockfile`, runs `tsc --noEmit` and `scripts/check_appeal_bundle.js`, and skips `vite build` / `wrangler` dry-run on Android; full bundle and preview builds run on `ubuntu-latest` CI or `x86_64` Linux.

## Closed-Loop Workflow: Align -> Sync -> Refresh -> Tag

1. **Align dependencies:**
   ```bash
   bash ./scripts/align_dependencies.sh --types-react-dom-version '^19.0.0'
