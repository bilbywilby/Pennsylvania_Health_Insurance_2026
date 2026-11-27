"""CLI entry point wiring PY2027 rate review validation, FMV auditing, and atomic 0o600 I/O."""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import asdict
from pathlib import Path
from typing import Sequence

from .atomic_io import atomic_write_json, atomic_write_text
from .auditor import audit_claim_line, scrub_pii_line
from .rate_review import load_rate_review_baseline

DEFAULT_RATE_JSON = (
    Path(__file__).resolve().parents[2] / "data/py2027/pa_rate_review_2027.json"
)


def _cmd_rate_summary(args: argparse.Namespace) -> int:
    baseline = load_rate_review_baseline(args.rate_json)
    payload = asdict(baseline)

    if args.json:
        rendered = json.dumps(payload, indent=2, sort_keys=True) + "\n"
    else:
        rendered = (
            f"Plan Year: {baseline.plan_year} ({baseline.jurisdiction})\n"
            f"Individual Market: requested={baseline.individual_requested_pct}% "
            f"approved={baseline.individual_approved_pct}%\n"
            f"Small Group Market: requested={baseline.small_group_requested_pct}% "
            f"approved={baseline.small_group_approved_pct}%\n"
            f"Denied Increases (USD): {baseline.denied_increases_usd:.2f}\n"
            f"Pennie Enrollment: 2025_peak={baseline.pennie_peak_2025} "
            f"2026_09={baseline.pennie_september_2026}\n"
            f"2027 OOP Max (USD): self={baseline.oop_self_only_usd:.2f} "
            f"family={baseline.oop_family_usd:.2f}\n"
        )

    if args.out:
        if args.json:
            atomic_write_json(args.out, payload)
        else:
            atomic_write_text(args.out, rendered)

    sys.stdout.write(rendered)
    return 0


def _obtain_salt(env_var: str = "PA_HEALTH_SALT", file_arg: str | None = None) -> str:
    """Return a non-empty HMAC salt from env var or salt file, or exit non-zero."""
    env_salt = os.getenv(env_var, "").strip()
    if env_salt:
        return env_salt

    if file_arg:
        try:
            file_salt = Path(file_arg).read_text(encoding="utf-8").strip()
        except OSError as exc:
            print(f"Unable to read salt file '{file_arg}': {exc}", file=sys.stderr)
            sys.exit(1)
        if file_salt:
            return file_salt
        print(f"Salt file '{file_arg}' is empty.", file=sys.stderr)
        sys.exit(1)

    print(
        f"Salt not provided. Set ${env_var} or pass --salt-file <path>.",
        file=sys.stderr,
    )
    sys.exit(1)


def _cmd_audit_line(args: argparse.Namespace) -> int:
    finding = audit_claim_line(
        record_id=args.record_id,
        base_rate=args.base_rate,
        billed_amount=args.billed_amount,
        modifier=args.modifier,
    )
    scrubbed_note = (
        scrub_pii_line(args.note, salt=args.pii_salt)
        if args.note is not None
        else None
    )

    result = {
        "finding": asdict(finding),
        "note": scrubbed_note,
    }
    rendered = json.dumps(result, indent=2, sort_keys=True) + "\n"

    if args.out:
        atomic_write_json(args.out, result)

    sys.stdout.write(rendered)
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="pa-health-audit",
        description="Forensic pricing and PY2027 rate audit CLI.",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    rate_parser = subparsers.add_parser(
        "rate-summary",
        help="Validate and display PY2027 rate review baseline.",
    )
    rate_parser.add_argument(
        "--rate-json",
        default=str(DEFAULT_RATE_JSON),
        help="Path to PY2027 rate review JSON dataset.",
    )
    rate_parser.add_argument(
        "--json",
        action="store_true",
        help="Emit JSON payload instead of human-readable summary.",
    )
    rate_parser.add_argument(
        "--out",
        default=None,
        help="Optional output path written atomically with mode 0o600.",
    )
    rate_parser.set_defaults(func=_cmd_rate_summary)

    line_parser = subparsers.add_parser(
        "audit-line",
        help="Audit a single claim line item against FMV and optionally scrub PII.",
    )
    line_parser.add_argument("--record-id", required=True, help="Claim/line identifier.")
    line_parser.add_argument("--base-rate", type=float, required=True, help="Base rate.")
    line_parser.add_argument("--billed-amount", type=float, required=True, help="Billed amount.")
    line_parser.add_argument("--modifier", type=float, default=1.0, help="Rate modifier.")
    line_parser.add_argument("--note", default=None, help="Optional free-text note to scrub.")
    line_parser.add_argument(
        "--pii-salt",
        default="",
        help="Salt required when --note is provided.",
    )
    line_parser.add_argument(
        "--out",
        default=None,
        help="Optional JSON output path written atomically with mode 0o600.",
    )
    line_parser.set_defaults(func=_cmd_audit_line)

    return parser


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(list(argv) if argv is not None else None)
    return int(args.func(args))


if __name__ == "__main__":
    raise SystemExit(main())
