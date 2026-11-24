"""Read-only static JSON export of dispute knowledge for AppealGenerator.

Builds a deterministic bundle from pathways, deadlines, and scenario routes
so a consumer page serves one source of truth instead of duplicating data.
The bundle contains no personal data and no mutable state.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from . import deadlines, pathways, scenario_router

SCHEMA_VERSION = 1


def build_bundle() -> dict[str, object]:
    """Assemble the read-only appeal knowledge bundle. Deterministic ordering."""
    raw_routes = getattr(scenario_router, "ROUTES", None)
    if not isinstance(raw_routes, dict):
        raw_routes = getattr(pathways, "PATHWAYS", {})
    return {
        "schema_version": SCHEMA_VERSION,
        "note": "Static export; verify citations against primary sources before filing.",
        "pathways": {name: pathways.PATHWAYS[name] for name in sorted(pathways.PATHWAYS)},
        "deadline_rules": {
            key: deadlines.DEADLINE_RULES[key] for key in sorted(deadlines.DEADLINE_RULES)
        },
        "routes": {key: raw_routes[key] for key in sorted(raw_routes)},
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Export appeal knowledge bundle (read-only)")
    parser.add_argument("--out", type=Path, help="Write bundle JSON to this path")
    args = parser.parse_args(argv)
    payload = json.dumps(build_bundle(), indent=2, sort_keys=True) + "\n"
    if args.out is not None:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(payload, encoding="utf-8")
        print(f"wrote {args.out} ({len(payload.encode('utf-8'))} bytes)")
    else:
        sys.stdout.write(payload)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
