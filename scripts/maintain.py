#!/usr/bin/env python3
"""Repository maintenance runner for PA_Health_Folded_2026."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
import unicodedata
from pathlib import Path

MANIFEST_NAME = "FOLD_MANIFEST.sha256"
TEXT_EXTS = {
    ".txt", ".md", ".json", ".jsonl", ".yaml", ".yml",
    ".py", ".sh", ".js", ".ts", ".html", ".css", ".csv",
}
STRIP_CHARS = "\u200b\u200c\u200d\u2060\ufeff\u00ad\u200e\u200f"
SPACE_CHARS = "\u00a0\u202f"

COMMENT_RE = re.compile(r'("(?:\\.|[^"\\])*")|(//[^\r\n]*|/\*[\s\S]*?\*/)')
TRAILING_COMMA_RE = re.compile(r'("(?:\\.|[^"\\])*")|(,\s*([}\]]))')
UNQUOTED_KEY_RE = re.compile(r'([{,]\s*)([A-Za-z_][A-Za-z0-9_-]*)(\s*:)')


def atomic_write_bytes(target: Path, data: bytes, mode: int = 0o600) -> None:
    """Atomically write bytes to target using a same-directory temp file."""
    target.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(dir=str(target.parent), prefix=f".{target.name}.tmp.")
    tmp_path = Path(tmp_name)
    try:
        with os.fdopen(fd, "wb") as handle:
            handle.write(data)
            handle.flush()
            os.fsync(handle.fileno())
        os.chmod(tmp_path, mode)
        os.replace(tmp_path, target)
    except Exception:
        try:
            tmp_path.unlink(missing_ok=True)
        except OSError:
            pass
        raise


def atomic_write_text(target: Path, text: str, mode: int = 0o600) -> None:
    """Atomically write UTF-8 text with LF line endings."""
    atomic_write_bytes(target, text.encode("utf-8"), mode=mode)


def should_scan_text(path: Path) -> bool:
    if not path.is_file() or ".git" in path.parts:
        return False
    return path.suffix.lower() in TEXT_EXTS


def clean_unicode_text(raw: str) -> tuple[str, int]:
    """Strip invisible/format characters and normalize special spaces to ASCII space."""
    hits = 0
    out: list[str] = []
    for ch in raw:
        if ch in STRIP_CHARS or unicodedata.category(ch) == "Cf":
            hits += 1
            continue
        if ch in SPACE_CHARS:
            out.append(" ")
            hits += 1
            continue
        out.append(ch)
    return "".join(out), hits


def run_unicode_cleanup(repo: Path, dry_run: bool) -> int:
    updated_files = 0
    total_hits = 0
    for path in sorted(repo.rglob("*")):
        if not should_scan_text(path):
            continue
        raw = path.read_text(encoding="utf-8", errors="replace")
        cleaned, hits = clean_unicode_text(raw)
        if hits > 0 and cleaned != raw:
            total_hits += hits
            updated_files += 1
            rel = path.relative_to(repo)
            if dry_run:
                print(f"DRY_RUN_UNICODE: {rel} (hits={hits})")
            else:
                atomic_write_text(path, cleaned, mode=0o600)
                print(f"CLEANED_UNICODE: {rel} (hits={hits})")
    print(f"unicode_summary: files_updated={updated_files} total_replacements={total_hits}")
    return updated_files


def is_jsonc_allowlisted(path: Path) -> bool:
    name = path.name
    return name.startswith("tsconfig.") or name == "Pond_Funding.json"


def is_repair_target(path: Path) -> bool:
    if is_jsonc_allowlisted(path):
        return False
    name = path.name
    return (
        name == "HANDOVER.json"
        or name.endswith("HANDOVER.json")
        or name.endswith("debts.json")
        or name.endswith("dispute_template_escalation.schema.json")
    )


def strip_invisible_outside_strings(text: str) -> str:
    out: list[str] = []
    in_str = False
    esc = False
    for ch in text:
        if in_str:
            out.append(ch)
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
        else:
            if ch == '"':
                in_str = True
                out.append(ch)
            elif ch in ("\n", "\r", "\t", " "):
                out.append(ch)
            elif unicodedata.category(ch) == "Cf":
                continue
            elif ch.isprintable():
                out.append(ch)
    return "".join(out)


def escape_unescaped_inner_quotes(text: str) -> str:
    out: list[str] = []
    in_str = False
    esc = False
    length = len(text)
    for i, ch in enumerate(text):
        if not in_str:
            out.append(ch)
            if ch == '"':
                in_str = True
                esc = False
        else:
            if esc:
                out.append(ch)
                esc = False
            elif ch == "\\":
                out.append(ch)
                esc = True
            elif ch == '"':
                j = i + 1
                while j < length and text[j] in (" ", "\t", "\r", "\n"):
                    j += 1
                nxt = text[j] if j < length else ""
                if nxt in ("", ":", ",", "}", "]"):
                    out.append(ch)
                    in_str = False
                else:
                    out.append('\\"')
            else:
                out.append(ch)
    return "".join(out)


def attempt_json_repair(raw: str) -> str | None:
    s = strip_invisible_outside_strings(raw)
    s = COMMENT_RE.sub(lambda m: m.group(1) or "", s)
    s = UNQUOTED_KEY_RE.sub(lambda m: f'{m.group(1)}"{m.group(2)}"{m.group(3)}', s)
    s = escape_unescaped_inner_quotes(s)
    s = TRAILING_COMMA_RE.sub(lambda m: m.group(1) or m.group(3), s)
    try:
        parsed = json.loads(s)
    except json.JSONDecodeError:
        return None
    formatted = json.dumps(parsed, indent=2, ensure_ascii=False) + "\n"
    json.loads(formatted)
    return formatted


def run_json_audit_and_repair(repo: Path, dry_run: bool, strict_json: bool) -> int:
    repaired_count = 0
    jsonc_count = 0
    invalid_other: list[str] = []

    for jf in sorted(repo.rglob("*.json")):
        if not jf.is_file() or ".git" in jf.parts:
            continue
        rel = str(jf.relative_to(repo))
        raw = jf.read_text(encoding="utf-8", errors="replace")
        try:
            json.loads(raw)
            continue
        except json.JSONDecodeError as exc:
            if is_jsonc_allowlisted(jf):
                jsonc_count += 1
                print(f"JSONC_ALLOWLISTED: {rel} ({exc.msg})")
                continue

            if should_repair := is_repair_target(jf):
                fixed = attempt_json_repair(raw)
                if fixed is not None and fixed != raw:
                    repaired_count += 1
                    if dry_run:
                        print(f"DRY_RUN_REPAIR_JSON: {rel}")
                    else:
                        atomic_write_text(jf, fixed, mode=0o600)
                        print(f"REPAIRED_JSON: {rel}")
                    continue

            invalid_other.append(f"{rel} -> {exc}")

    for item in invalid_other:
        print(f"INVALID_JSON: {item}")

    print(
        f"json_summary: repaired={repaired_count} "
        f"jsonc_allowlisted={jsonc_count} invalid_other={len(invalid_other)}"
    )

    if invalid_other or (strict_json and jsonc_count > 0):
        return 1
    return 0


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def run_manifest_refresh(repo: Path, dry_run: bool) -> int:
    proc = subprocess.run(
        ["git", "ls-files", "-z"],
        cwd=repo,
        capture_output=True,
        check=True,
    )
    tracked = [
        entry.decode("utf-8")
        for entry in proc.stdout.split(b"\x00")
        if entry and entry.decode("utf-8") != MANIFEST_NAME
    ]

    lines: list[str] = []
    for rel in tracked:
        file_path = repo / rel
        if not file_path.is_file():
            print(f"MISSING_TRACKED_FILE: {rel}", file=sys.stderr)
            return 1
        lines.append(f"{sha256_file(file_path)}  {rel}")

    manifest_bytes = ("\n".join(lines) + "\n").encode("utf-8")
    manifest_path = repo / MANIFEST_NAME

    if dry_run:
        print(f"DRY_RUN_MANIFEST: {len(lines)} tracked entries")
        return 0

    atomic_write_bytes(manifest_path, manifest_bytes, mode=0o600)

    # Verify freshly written manifest against current file contents on disk.
    mismatches = 0
    for ln in manifest_path.read_text(encoding="utf-8").splitlines():
        if not ln.strip():
            continue
        expected_hash, rel = ln.split("  ", 1)
        actual_hash = sha256_file(repo / rel)
        if actual_hash != expected_hash:
            print(f"MANIFEST_MISMATCH: {rel}", file=sys.stderr)
            mismatches += 1

    if mismatches:
        return 1

    print(f"FOLD_MANIFEST.sha256 verified ({len(lines)} entries)")
    return 0


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Normalize Unicode, validate/repair JSON, and refresh FOLD_MANIFEST.sha256."
    )
    parser.add_argument(
        "--repo",
        default=os.path.expanduser("~/pa_health_repos/PA_Health_Folded_2026"),
        help="Path to PA_Health_Folded_2026 repository root.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Report actions without modifying files on disk.",
    )
    parser.add_argument(
        "--strict-json",
        action="store_true",
        help="Exit non-zero if JSONC-allowlisted files (tsconfig.* / Pond_Funding.json) fail strict JSON.",
    )
    parser.add_argument(
        "--skip-unicode",
        action="store_true",
        help="Skip Unicode normalization pass.",
    )
    parser.add_argument(
        "--skip-json",
        action="store_true",
        help="Skip JSON validation and repair pass.",
    )
    parser.add_argument(
        "--skip-manifest",
        action="store_true",
        help="Skip FOLD_MANIFEST.sha256 generation and verification.",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(sys.argv[1:] if argv is None else argv)
    repo = Path(args.repo).resolve()
    if not (repo / ".git").exists():
        print(f"ERROR: Not a git repository: {repo}", file=sys.stderr)
        return 2

    rc = 0
    if not args.skip_unicode:
        run_unicode_cleanup(repo, dry_run=args.dry_run)

    if not args.skip_json:
        json_rc = run_json_audit_and_repair(
            repo,
            dry_run=args.dry_run,
            strict_json=args.strict_json,
        )
        if json_rc != 0:
            rc = json_rc

    if not args.skip_manifest:
        manifest_rc = run_manifest_refresh(repo, dry_run=args.dry_run)
        if manifest_rc != 0 and rc == 0:
            rc = manifest_rc

    return rc


if __name__ == "__main__":
    raise SystemExit(main())
