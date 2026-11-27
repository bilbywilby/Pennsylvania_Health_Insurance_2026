import argparse
import re
import sys
from collections import defaultdict
from pathlib import Path

LEDGER_FILE = "CITATIONS.md"

STYLE_PATTERNS = {
    "bracket": re.compile(r"(?<!\[)\[(CIT-\d+)\](?!\])"),
    "paren": re.compile(r"(?<!\()\((CIT-\d+)\)(?!\))"),
    "bare": re.compile(r"(?<![\[\(\w-])(CIT-\d+)(?![\]\)\w-])"),
    "all": re.compile(r"(?:\[(CIT-\d+)\]|\((CIT-\d+)\)|(?<![\[\(\w-])(CIT-\d+)(?![\]\)\w-]))"),
}


def get_citation_regex(style: str = "bracket") -> re.Pattern:
    if style not in STYLE_PATTERNS:
        raise ValueError(f"Unsupported citation style: {style}")
    return STYLE_PATTERNS[style]


def extract_citations(text: str, style: str = "bracket") -> list[str]:
    pattern = get_citation_regex(style)
    citations: list[str] = []
    for match in pattern.findall(text):
        if isinstance(match, tuple):
            token = next((part for part in match if part), "")
        else:
            token = match
        if token:
            citations.append(token)
    return citations


def get_ledger_ids(target_dir, style: str = "all"):
    ledger_path = Path(target_dir) / LEDGER_FILE
    if not ledger_path.exists():
        return None
    content = ledger_path.read_text(encoding="utf-8")
    return set(extract_citations(content, style="all"))


def scan_repo_citations(target_dir, style: str = "bracket"):
    target_path = Path(target_dir)
    citations_map = defaultdict(list)
    all_found = set()

    for md_file in sorted(target_path.rglob("*.md")):
        if md_file.name == LEDGER_FILE:
            continue
        rel_path = str(md_file.relative_to(target_path))
        lines = md_file.read_text(encoding="utf-8", errors="replace").splitlines()
        in_code_block = False

        for line_no, line in enumerate(lines, start=1):
            if line.strip().startswith("```"):
                in_code_block = not in_code_block
                continue
            if in_code_block:
                continue

            found = extract_citations(line, style=style)
            if not found:
                continue

            snippet = " ".join(line.strip().split())
            if len(snippet) > 120:
                snippet = snippet[:117] + "..."
            for cit in found:
                all_found.add(cit)
                citations_map[cit].append((rel_path, line_no, snippet))

    return all_found, citations_map


def seed_ledger(target: Path, all_found: set, ledger_ids: set) -> int:
    new_ids = sorted(all_found - ledger_ids)
    if not new_ids:
        return 0

    ledger_path = target / LEDGER_FILE
    needs_newline = False
    if ledger_path.exists() and ledger_path.stat().st_size > 0:
        existing = ledger_path.read_text(encoding="utf-8", errors="replace")
        needs_newline = not existing.endswith("\n")

    with open(ledger_path, "a", encoding="utf-8") as f:
        if needs_newline:
            f.write("\n")
        for cit in new_ids:
            f.write(f"- [{cit}] TODO: add source reference\n")

    ledger_ids.update(new_ids)
    return len(new_ids)


def run_audit(args):
    style = getattr(args, "style", "bracket")
    target = Path(args.path)
    all_found, citations_map = scan_repo_citations(target, style=style)
    ledger_ids = get_ledger_ids(target, style="all")

    if getattr(args, "seed", False):
        current_ids = set() if ledger_ids is None else set(ledger_ids)
        seeded_count = seed_ledger(target, all_found, current_ids)
        if seeded_count > 0:
            print(f"Seeded {seeded_count} citations into {LEDGER_FILE}.")
        ledger_ids = current_ids

    if ledger_ids is None:
        print(f"Error: Ledger file '{LEDGER_FILE}' not found in {target}")
        sys.exit(1)

    orphans = all_found - ledger_ids
    deadwood = ledger_ids - all_found

    if not orphans and not deadwood:
        print("All citations are synchronized.")
        sys.exit(0)

    if orphans:
        print("\nOrphaned Citations (used in Markdown, missing from ledger):")
        for cit in sorted(orphans):
            for rel_path, line_no, snippet in sorted(citations_map[cit]):
                print(f"  - {cit} -> {rel_path}:L{line_no}: {snippet}")

    if deadwood:
        print("\nDeadwood Citations (in ledger, unused in Markdown):")
        for cit in sorted(deadwood):
            print(f"  - {cit}")

    sys.exit(1)


def run_discover(args):
    style = getattr(args, "style", "bracket")
    all_found, _ = scan_repo_citations(Path(args.path), style=style)
    if not all_found:
        print("No citations found.")
    else:
        print("\n".join(sorted(all_found)))


def run_seed(args):
    style = getattr(args, "style", "bracket")
    target = Path(args.path)
    all_found, _ = scan_repo_citations(target, style=style)
    ledger_ids = get_ledger_ids(target, style="all") or set()

    seeded_count = seed_ledger(target, all_found, ledger_ids)
    if seeded_count == 0:
        print("No new citations to seed.")
        return

    print(f"Seeded {seeded_count} citations into {LEDGER_FILE}.")


def add_common_args(parser):
    parser.add_argument("path", help="Target repository directory")
    parser.add_argument(
        "--style",
        choices=["bracket", "paren", "bare", "all"],
        default="bracket",
        help="Citation match style: bracket ([CIT-N]), paren ((CIT-N)), bare (CIT-N), or all (default: bracket)",
    )


def main():
    parser = argparse.ArgumentParser(description="Keystone Citation Toolkit")
    subparsers = parser.add_subparsers(dest="command", required=True)

    audit_p = subparsers.add_parser("audit", help="Audit citations against ledger")
    add_common_args(audit_p)
    audit_p.add_argument(
        "--seed",
        action="store_true",
        help="Seed missing citations into CITATIONS.md before auditing",
    )
    audit_p.set_defaults(func=run_audit)

    disc_p = subparsers.add_parser("discover", help="List all citations in repo")
    add_common_args(disc_p)
    disc_p.set_defaults(func=run_discover)

    seed_p = subparsers.add_parser("seed", help="Seed missing citations into ledger")
    add_common_args(seed_p)
    seed_p.set_defaults(func=run_seed)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
