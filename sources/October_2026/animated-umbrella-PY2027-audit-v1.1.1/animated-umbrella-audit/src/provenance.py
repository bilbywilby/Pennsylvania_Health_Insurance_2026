#!/usr/bin/env python3
"""Provenance log: record artifacts with full SHA-256 and re-verify them later.

Record:  python3 src/provenance.py record --name N --url U --file F --tier T --notes "..."
         (the legacy form without the word `record` also works)
Verify:  python3 src/provenance.py verify      # re-hash every logged file, report drift

Tiers: VERIFIED, DERIVED, UNVERIFIED, NOT_FOUND.
A VERIFIED entry must say what was read (--notes) and must hash an existing file.
The log is data/provenance/audit_log.json (git-ignored; copy it into a release if you
want it published).
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import tempfile
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LOG = ROOT / "data" / "provenance" / "audit_log.json"
TIERS = {"VERIFIED", "DERIVED", "UNVERIFIED", "NOT_FOUND"}


def now_utc() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def atomic_write_json(dest: Path, payload: dict) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix=f".{dest.name}.", suffix=".tmp", dir=dest.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            json.dump(payload, fh, indent=2, sort_keys=True)
            fh.write("\n")
            fh.flush()
            os.fsync(fh.fileno())
        os.replace(tmp, dest)
    except BaseException:
        Path(tmp).unlink(missing_ok=True)
        raise


@dataclass
class Entry:
    name: str
    url: str
    file: str
    tier: str
    notes: str = ""
    sha256: str = ""
    # default_factory: each entry gets its own timestamp, not the import-time one
    recorded_utc: str = field(default_factory=now_utc)


def load(log: Path = LOG) -> list[dict]:
    if not log.exists():
        return []
    try:
        return list(json.loads(log.read_text(encoding="utf-8")).get("entries", []))
    except (json.JSONDecodeError, OSError) as exc:
        raise SystemExit(f"[ERROR] unreadable log {log}: {exc}")


def record(name, url, file, tier, notes="", log: Path = LOG) -> Entry:
    tier = tier.upper()
    if tier not in TIERS:
        raise SystemExit(f"[ERROR] tier must be one of {sorted(TIERS)}")
    path = Path(file)
    if not path.is_file():
        raise SystemExit(f"[ERROR] file not found: {file}")
    if tier == "VERIFIED" and not notes.strip():
        raise SystemExit("[ERROR] VERIFIED needs --notes saying what primary page was read and when")
    try:
        shown = str(path.resolve().relative_to(ROOT))
    except ValueError:
        shown = str(path)
    entry = Entry(name=name, url=url, file=shown, tier=tier, notes=notes, sha256=sha256_file(path))
    entries = load(log)
    entries.append(asdict(entry))
    atomic_write_json(log, {"entries": entries})
    return entry


def verify(log: Path = LOG) -> int:
    entries = load(log)
    bad = 0
    for e in entries:
        p = ROOT / e["file"] if not Path(e["file"]).is_absolute() else Path(e["file"])
        want = e.get("sha256") or e.get("checksum", "")
        if not p.is_file():
            print(f"[MISSING] {e['file']}")
            bad += 1
        elif not want:
            print(f"[NO-HASH] {e['file']}")
            bad += 1
        elif not sha256_file(p).startswith(want):   # startswith: tolerates old 12-char hashes
            print(f"[CHANGED] {e['file']} (logged {e['recorded_utc']})")
            bad += 1
    print(f"{len(entries)} entries checked, {bad} problem(s)")
    return 1 if bad else 0


def main(argv=None) -> int:
    argv = list(sys.argv[1:] if argv is None else argv)
    if not argv or argv[0] not in {"record", "verify"}:
        argv = ["record"] + argv   # legacy form
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("record")
    r.add_argument("--name", required=True)
    r.add_argument("--url", required=True)
    r.add_argument("--file", required=True)
    r.add_argument("--tier", required=True)
    r.add_argument("--notes", default="")
    r.add_argument("--checksum", action="store_true", help="accepted for compatibility; the hash is always stored")
    sub.add_parser("verify")
    a = ap.parse_args(argv)
    if a.cmd == "verify":
        return verify()
    e = record(a.name, a.url, a.file, a.tier, a.notes)
    print(f"recorded {e.file} [{e.tier}] sha256 {e.sha256[:16]}...")
    return 0


if __name__ == "__main__":
    sys.exit(main())
