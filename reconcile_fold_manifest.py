#!/usr/bin/env python3
"""
Pure-Python zero-dependency reconciler and deduplicator for FOLD_MANIFEST.json.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import tempfile

SELF_EXCLUDED = {"FOLD_MANIFEST.json", "FOLD_MANIFEST.sha256"}
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DEFAULT_REPO = Path.home() / "pa_health_repos" / "PA_Health_Folded_2026"
EXCLUDED_DIRS = {".git", "__pycache__", "node_modules", ".pytest_cache", ".venv", "venv"}
EXCLUDED_PREFIXES = (
    "sources/keystone_health/sources/",
    "sources/keystone_health/scripts/folded/",
)
EXCLUDED_FILES = {
    "FOLD_MANIFEST.json",
    "FOLD_MANIFEST.json.bak",
    "reconcile_fold_manifest.py",
}


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def is_excluded(rel_posix: str) -> bool:
    if rel_posix in SELF_EXCLUDED:
        return True
    if rel_posix in EXCLUDED_FILES:
        return True
    if any(rel_posix.startswith(prefix) for prefix in EXCLUDED_PREFIXES):
        return True
    parts = rel_posix.split("/")
    return any(part in EXCLUDED_DIRS for part in parts[:-1])


def walk_repo_files(repo_root: Path) -> dict[str, tuple[str, int]]:
    inventory: dict[str, tuple[str, int]] = {}
    for root, dirs, files in os.walk(repo_root):
        rel_root = Path(root).relative_to(repo_root).as_posix()
        if rel_root == ".":
            rel_root = ""

        pruned_dirs = []
        for d in sorted(dirs):
            candidate = f"{rel_root}/{d}" if rel_root else d
            if d in EXCLUDED_DIRS or any(f"{candidate}/".startswith(p) for p in EXCLUDED_PREFIXES):
                continue
            pruned_dirs.append(d)
        dirs[:] = pruned_dirs

        for fname in sorted(files):
            rel_posix = f"{rel_root}/{fname}" if rel_root else fname
            if is_excluded(rel_posix):
                continue
            full_path = repo_root / rel_posix
            if full_path.is_symlink() or not full_path.is_file():
                continue
            inventory[rel_posix] = (sha256_file(full_path), full_path.stat().st_size)

    return dict(sorted(inventory.items()))


def load_manifest(manifest_path: Path) -> tuple[Any, list[dict[str, Any]], str]:
    if not manifest_path.exists():
        return {"schema_version": "1.0", "files": []}, [], "files"

    raw = json.loads(manifest_path.read_text(encoding="utf-8"))
    if isinstance(raw, list):
        entries = [{"path": item} if isinstance(item, str) else dict(item) for item in raw]
        return raw, entries, "__list__"

    if isinstance(raw, dict):
        for key in ("files", "entries", "manifest", "items"):
            if isinstance(raw.get(key), list):
                entries = [{"path": item} if isinstance(item, str) else dict(item) for item in raw[key]]
                return raw, entries, key
        return raw, [], "files"

    raise ValueError(f"Unsupported FOLD_MANIFEST.json root type: {type(raw).__name__}")


def atomic_write_json(target: Path, payload: Any) -> None:
    os.umask(0o077)
    target.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(prefix=f".{target.name}.", dir=str(target.parent))
    tmp_path = Path(tmp_name)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2, sort_keys=False)
            f.write("\n")
        os.chmod(tmp_path, 0o600)
        os.replace(tmp_path, target)
    except Exception:
        if tmp_path.exists():
            tmp_path.unlink()
        raise


def main() -> int:
    parser = argparse.ArgumentParser(description="Deduplicate paths and reconcile FOLD_MANIFEST.json.")
    parser.add_argument("--repo", type=Path, default=DEFAULT_REPO)
    parser.add_argument("--write", action="store_true", help="Write reconciled FOLD_MANIFEST.json atomically.")
    parser.add_argument("--prune-duplicates", action="store_true", help="Delete redundant duplicate files on disk.")
    parser.add_argument("--refresh-sidecar", action="store_true", help="After --write, regenerate FOLD_MANIFEST.sha256 from the new manifest.")
    args = parser.parse_args()

    repo_root = args.repo.expanduser().resolve()
    manifest_path = repo_root / "FOLD_MANIFEST.json"

    if not repo_root.is_dir():
        print(f"[ERROR] Repository directory not found: {repo_root}", file=sys.stderr)
        return 1

    raw_manifest, existing_entries, container_key = load_manifest(manifest_path)
    disk_inventory = walk_repo_files(repo_root)

    seen_manifest_paths: set[str] = set()
    duplicate_manifest_entries: list[str] = []
    missing_on_disk: list[str] = []
    hash_mismatches: list[tuple[str, str, str]] = []
    excluded_in_manifest: list[str] = []
    existing_by_path: dict[str, dict[str, Any]] = {}

    for entry in existing_entries:
        rel_path = Path(entry.get("path", "")).as_posix().removeprefix("./")
        if not rel_path:
            continue
        if rel_path in seen_manifest_paths:
            duplicate_manifest_entries.append(rel_path)
            continue
        seen_manifest_paths.add(rel_path)
        existing_by_path[rel_path] = entry

        if is_excluded(rel_path):
            excluded_in_manifest.append(rel_path)
            continue

        if rel_path not in disk_inventory:
            missing_on_disk.append(rel_path)
            continue

        actual_hash, _ = disk_inventory[rel_path]
        recorded_hash = entry.get("sha256")
        if recorded_hash and recorded_hash != actual_hash:
            hash_mismatches.append((rel_path, recorded_hash, actual_hash))

    untracked_in_manifest = sorted(set(disk_inventory.keys()) - set(existing_by_path.keys()))

    by_hash: dict[str, list[str]] = defaultdict(list)
    for rel_path, (digest, _) in disk_inventory.items():
        by_hash[digest].append(rel_path)

    content_duplicates: dict[str, list[str]] = {
        digest: sorted(paths, key=lambda p: (p.count("/"), len(p), p))
        for digest, paths in sorted(by_hash.items())
        if len(paths) > 1
    }

    print(f"Repository:                 {repo_root}")
    print(f"On-disk canonical files:    {len(disk_inventory)}")
    print(f"Existing manifest entries:  {len(existing_entries)}")
    print(f"Duplicate manifest keys:    {len(duplicate_manifest_entries)}")
    print(f"Excluded paths in manifest: {len(excluded_in_manifest)}")
    print(f"Missing on disk:            {len(missing_on_disk)}")
    print(f"SHA-256 mismatches:         {len(hash_mismatches)}")
    print(f"New untracked disk files:   {len(untracked_in_manifest)}")
    print(f"Content-duplicate groups:   {len(content_duplicates)}")

    if hash_mismatches:
        print("\n[MISMATCHES]")
        for p, old_h, new_h in hash_mismatches[:20]:
            print(f"  {p}: manifest={old_h[:12]}.. disk={new_h[:12]}..")

    if content_duplicates:
        print("\n[BYTE-IDENTICAL FILE GROUPS (keep first -> duplicates)]")
        for digest, paths in list(content_duplicates.items())[:20]:
            print(f"  {digest[:12]}.. KEEP: {paths[0]}")
            for dup in paths[1:]:
                print(f"               DUP:  {dup}")

    removed_dups = 0
    if args.prune_duplicates and content_duplicates:
        for paths in content_duplicates.values():
            for dup in paths[1:]:
                dup_file = repo_root / dup
                if dup_file.exists():
                    dup_file.unlink()
                    disk_inventory.pop(dup, None)
                    removed_dups += 1
        print(f"\n[PRUNED] Removed {removed_dups} duplicate files from disk.")

    if not args.write:
        print("\nDry-run complete. Re-run with --write to update FOLD_MANIFEST.json atomically.")
        return 0

    reconciled_entries: list[dict[str, Any]] = []
    for rel_path, (digest, size_bytes) in sorted(disk_inventory.items()):
        prev = existing_by_path.get(rel_path, {})
        updated = dict(prev)
        updated["path"] = rel_path
        updated["sha256"] = digest
        updated["size"] = size_bytes
        reconciled_entries.append(updated)

    if container_key == "__list__":
        new_manifest: Any = reconciled_entries
    else:
        new_manifest = dict(raw_manifest) if isinstance(raw_manifest, dict) else {}
        new_manifest[container_key] = reconciled_entries
        new_manifest["file_count"] = len(reconciled_entries)
        new_manifest["reconciled_at"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    if manifest_path.exists():
        atomic_write_json(repo_root / "FOLD_MANIFEST.json.bak", raw_manifest)

    _write_manifest_stable(manifest_path, new_manifest)

    if args.refresh_sidecar:
        sidecar = repo_root / "FOLD_MANIFEST.sha256"
        sidecar.write_text(sha256_file(manifest_path) + "  FOLD_MANIFEST.json\n", encoding="utf-8")
        os.chmod(sidecar, 0o600)
        print(f"[OK] Refreshed {sidecar.name}")
    print(f"\n[OK] Wrote {len(reconciled_entries)} verified entries to {manifest_path}")
    return 0


def _write_manifest_stable(path, new):
    """Skip the write when only timestamp-like fields differ."""
    import json
    volatile = ("time", "date", "generated", "updated", "created", "_at")
    def norm(o):
        if isinstance(o, dict):
            return {k: norm(v) for k, v in o.items()
                    if not any(s in str(k).lower() for s in volatile)}
        if isinstance(o, list):
            return [norm(v) for v in o]
        return o
    try:
        with open(path, encoding="utf-8") as fh:
            old = json.load(fh)
    except Exception:
        old = None
    if old is not None and norm(old) == norm(new):
        print("[OK] Manifest content unchanged; write skipped")
        return
    atomic_write_json(path, new)


if __name__ == "__main__":
    raise SystemExit(main())
