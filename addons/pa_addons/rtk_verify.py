"""Verify-marker scanner and RTKL/FOIA draft generator.

Scans the add-on data modules for citations carrying explicit "verify"
markers and produces ready-to-send Right-to-Know Law (65 P.S. 67.101 et
seq.) or FOIA request drafts against the controlling agency. The queue is
derived from the source data itself, so any future "verify" marker
automatically enters the pipeline.
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

from . import deadlines, glossary, rtk_requests

VERIFY_TOKEN = "verify"

# Federal regulatory citations route to CMS FOIA; Pennsylvania statutory and
# agency citations route to the PA Insurance Department RTKL process.
_FEDERAL_HINTS = ("45 cfr", "149.620", "147.136", "147.200")


def _is_federal(citation: str) -> bool:
    lowered = citation.lower()
    return any(hint in lowered for hint in _FEDERAL_HINTS)


def scan_verify_queue() -> list[dict[str, str]]:
    """Return every glossary/deadline entry whose citation contains a verify marker."""
    queue: list[dict[str, str]] = []
    for term, entry in glossary.TERMINOLOGY.items():
        citation = str(entry.get("citation", ""))
        if VERIFY_TOKEN in citation.lower():
            queue.append(
                {
                    "source_module": "glossary.py",
                    "item_id": term,
                    "context": str(entry.get("definition", "")),
                    "citation": citation,
                }
            )
    for rule_key, rule in deadlines.DEADLINE_RULES.items():
        authority = str(rule.get("authority", ""))
        if VERIFY_TOKEN in authority.lower():
            queue.append(
                {
                    "source_module": "deadlines.py",
                    "item_id": rule_key,
                    "context": str(rule.get("trigger", "")),
                    "citation": authority,
                }
            )
    return queue


def route_item(item: dict[str, str]) -> str:
    """Map one queue item to its agency key."""
    return "cms" if _is_federal(item["citation"]) else "pa_insurance_department"


def draft_record_text(item: dict[str, str]) -> list[str]:
    """Build the records list for one queue item."""
    return [
        f"Citation verification: {item['citation']} as it applies to {item['context']}",
        "Any current agency guidance, filings, or rulemaking affecting this provision",
    ]


def build_drafts(requester: str, contact: str, request_date: str) -> list[dict[str, str]]:
    """Render a full RTKL/FOIA letter for each item in the verify queue."""
    drafts: list[dict[str, str]] = []
    for item in scan_verify_queue():
        agency_key = route_item(item)
        letter = rtk_requests.build_request(
            agency_key, draft_record_text(item), requester, contact, request_date,
        )
        drafts.append(
            {
                "agency": agency_key,
                "item_id": f"{item['source_module']}:{item['item_id']}",
                "letter": letter,
            }
        )
    return drafts


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Verify-marker RTKL/FOIA draft CLI")
    parser.add_argument("--list", action="store_true", help="List the verify queue")
    parser.add_argument("--draft", action="store_true", help="Print full request letters")
    parser.add_argument("--out", type=Path, default=None, help="Write letters to this directory")
    parser.add_argument("--requester", default=os.getenv("RTK_REQUESTER", ""), help="Requester name")
    parser.add_argument("--contact", default=os.getenv("RTK_CONTACT", ""), help="Requester contact")
    args = parser.parse_args(argv)

    if args.list or not (args.draft or args.out):
        for item in scan_verify_queue():
            print(f"[{item['source_module']}] {item['item_id']} -> {route_item(item)}")
            print(f"  citation: {item['citation']}")
        return 0

    if not args.requester or not args.contact:
        print("error: --requester/--contact or RTK_REQUESTER/RTK_CONTACT required for drafts", file=sys.stderr)
        return 2

    drafts = build_drafts(args.requester, args.contact, "")
    if args.out is not None:
        args.out.mkdir(parents=True, exist_ok=True)
        for d in drafts:
            safe = d["item_id"].replace("/", "_").replace(":", "__")
            target = args.out / f"{safe}.txt"
            target.write_text(d["letter"], encoding="utf-8")
            print(f"wrote {target}")
    else:
        for d in drafts:
            print(d["letter"])
            print("=" * 64)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
