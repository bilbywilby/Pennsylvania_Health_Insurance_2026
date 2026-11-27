#!/usr/init/env python3
"""Validate all links within project documentation or configuration files."""

import argparse
import logging
from pathlib import Path
from typing import Any, Dict, List

logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def generate_report(results: List[Dict[str, Any]], invalid_count: int) -> str:
    """Generate a formatted text report from validation results."""
    report_lines: List[str] = []
    if invalid_count > 0:
        report_lines.append("FAILED URLS:")
        report_lines.append("-" * 60)
        for r in results:
            if not r["valid"]:
                report_lines.append(f"  {r['url']}")
                if r.get("redirects_to"):
                    report_lines.append(f"    → Redirects to: {r['redirects_to']}")
                if r.get("message"):
                    report_lines.append(f"    → Error: {r['message']}")
                report_lines.append("")

    return "\n".join(report_lines)


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate all CI and documentation URLs.")
    parser.add_argument(
        "--files",
        nargs="+",
        default=["README.md"],
        help="Files to scan for URLs.",
    )
    parser.add_argument(
        "--report-only",
        action="store_true",
        help="Print report without exiting with error code on failure.",
    )
    args = parser.parse_args()

    all_results: List[Dict[str, Any]] = []
    for filepath in args.files:
        path = Path(filepath)
        if not path.exists():
            logger.warning("File not found: %s", filepath)
            continue

        logger.info("Checking %s...", filepath)


if __name__ == "__main__":
    main()
