#!/usr/bin/env python3
"""
validate_audit.py - Strict Pydantic Schema Validation Utility
For Keystone Health Forensic Navigator
"""

import argparse
import json
import sys
from pathlib import Path
from pydantic import BaseModel, Field, ValidationError

class ChecklistItem(BaseModel):
    id: str
    label: str
    checked: bool = False
    sublines: list[str] = Field(default_factory=list)
    category: str | None = None

class ChecklistSchema(BaseModel):
    categories: list[str] = Field(default_factory=list)
    items: list[ChecklistItem]

class AuditResultItem(BaseModel):
    item_id: str
    status: str = Field(..., description="Status must be 'pass', 'fail', or 'pending'")
    notes: str | None = None

class AuditResultsSchema(BaseModel):
    audit_id: str
    timestamp: str
    results: list[AuditResultItem]

def load_json(filepath: Path) -> dict:
    """Load and parse JSON file with robust error handling."""
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        print(f"[ERROR] Invalid JSON formatting in {filepath}: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"[ERROR] Unable to read {filepath}: {e}", file=sys.stderr)
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(
        description="Validate Keystone Health audit checklists and execution results against strict Pydantic schemas."
    )
    parser.add_argument("checklist", type=Path, help="Path to checklist JSON file")
    parser.add_argument("results", type=Path, nargs="?", help="Optional path to audit results JSON file")

    args = parser.parse_args()

    print(f"==> Validating checklist schema: {args.checklist}")
    checklist_data = load_json(args.checklist)

    try:
        validated_checklist = ChecklistSchema(**checklist_data)
        print(f"[OK] Checklist validation passed ({len(validated_checklist.items)} items verified).")
    except ValidationError as e:
        print(f"[ERROR] Checklist schema validation failed:\n{e}", file=sys.stderr)
        sys.exit(1)

    if args.results:
        print(f"==> Validating audit results schema: {args.results}")
        results_data = load_json(args.results)
        try:
            validated_results = AuditResultsSchema(**results_data)
            print(f"[OK] Audit results validation passed ({len(validated_results.results)} result records verified).")
        except ValidationError as e:
            print(f"[ERROR] Audit results schema validation failed:\n{e}", file=sys.stderr)
            sys.exit(1)

    print("==> All verification checks completed successfully.")
    sys.exit(0)

if __name__ == "__main__":
    main()


#!/usr/bin/env python3
"""Validate quarterly_audit.yaml, and optionally a results file against it.
Usage: validate_audit.py CHECKLIST.yaml [RESULTS.yaml] [--today YYYY-MM-DD]
Results file: {results: [{id, status, reviewer, date, note?}]}. Exit 1 on any error."""
import sys, os, json, argparse, datetime
import yaml

BASIS = {"law", "secondary", "internal_design", "best_practice", "case_law"}
STATUS = {"pass", "fail", "na", "unverified"}
REQ_A = ("id", "claim", "field", "expect", "evidence", "basis")
STALE_DAYS = 120

def walk(o, path=""):
    if isinstance(o, dict):
        for k, v in o.items():
            yield path, k, v
            yield from walk(v, f"{path}/{k}")
    elif isinstance(o, list):
        for i, v in enumerate(o):
            yield from walk(v, f"{path}[{i}]")

def check_checklist(d, today):
    E, W = [], []
    for k in ("audit", "retention_classes", "fail_stop", "controls", "artifacts"):
        if k not in d:
            E.append(f"missing top-level key: {k}")
    if E:
        return E, W, set()
    rc = {}
    for r in d["retention_classes"]:
        i = r.get("id")
        if i in rc: E.append(f"duplicate retention class {i}")
        rc[i] = r
        if r.get("basis") not in BASIS: E.append(f"{i}: bad basis {r.get('basis')!r}")
        if not isinstance(r.get("years"), int): E.append(f"{i}: years must be an integer")
        if r.get("basis") == "law" and not r.get("cite"): E.append(f"{i}: basis law needs a cite")
        if r.get("basis") == "secondary": W.append(f"{i}: basis secondary, verify against primary text")
    fs = [f.get("id") for f in d["fail_stop"]]
    if len(fs) != len(set(fs)): E.append("duplicate fail_stop ids")
    aids = set()
    for c in d["controls"]:
        cid = c.get("id")
        if c.get("tier") not in (1, 2): E.append(f"{cid}: tier must be 1 or 2")
        for a in c.get("assertions", []):
            aid = a.get("id", "?")
            miss = [k for k in REQ_A if k not in a]
            if miss: E.append(f"{aid}: missing {miss}")
            if aid in aids: E.append(f"duplicate assertion id {aid}")
            aids.add(aid)
            if not str(aid).startswith(f"{cid}."): E.append(f"{aid}: id should start with {cid}.")
            if a.get("basis") not in BASIS: E.append(f"{aid}: bad basis {a.get('basis')!r}")
            if a.get("basis") == "law" and not a.get("cite"): E.append(f"{aid}: basis law needs a cite")
            if a.get("basis") == "secondary": W.append(f"{aid}: basis secondary, verify against primary text")
            if a.get("field") == "decision_basis.rule_version":
                for need in ("vacatur_status", "enforcement_relief"):
                    if need not in a: E.append(f"{aid}: rule-version control must carry {need}")
    for art in d["artifacts"]:
        if art.get("retention") not in rc:
            E.append(f"artifact {art.get('name')}: unknown retention class {art.get('retention')!r}")
    for path, k, v in walk(d):
        if k == "verified" and isinstance(v, str):
            try:
                age = (today - datetime.date.fromisoformat(v[:10])).days
                if age > STALE_DAYS: W.append(f"{path}: verified {age} days ago, re-check")
            except ValueError:
                E.append(f"{path}: verified must start with YYYY-MM-DD")
        if k == "todo":
            W.append(f"open todo at {path}: {v}")
    return E, W, aids

def check_results(res, aids):
    E, W = [], []
    rows = res.get("results")
    if not isinstance(rows, list):
        return ["results file needs a top-level 'results' list"], W
    seen = set()
    for r in rows:
        i = r.get("id")
        if i not in aids: E.append(f"result for unknown assertion {i!r}")
        if i in seen: E.append(f"duplicate result for {i}")
        seen.add(i)
        if r.get("status") not in STATUS: E.append(f"{i}: status must be one of {sorted(STATUS)}")
        for k in ("reviewer", "date"):
            if not r.get(k): E.append(f"{i}: missing {k}")
        if r.get("status") in ("fail", "na") and not r.get("note"): E.append(f"{i}: {r.get('status')} needs a note")
    for m in sorted(aids - seen): E.append(f"no result recorded for {m}")
    counts = {s: sum(1 for r in rows if r.get("status") == s) for s in STATUS}
    W.append(f"results: {counts}")
    if counts["fail"]: W.append("at least one FAIL: check fail_stop triggers before closing the quarter")
    return E, W

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("checklist"); ap.add_argument("results", nargs="?")
    ap.add_argument("--today", default=str(datetime.date.today()))
    a = ap.parse_args()
    today = datetime.date.fromisoformat(a.today)
    d = yaml.safe_load(open(a.checklist))
    E, W, aids = check_checklist(d, today)
    sp = os.path.join(os.path.dirname(os.path.abspath(a.checklist)), "quarterly_audit.schema.json")
    try:
        import jsonschema
        if os.path.exists(sp):
            for e in jsonschema.Draft202012Validator(json.load(open(sp))).iter_errors(d):
                E.append(f"schema: {'/'.join(map(str, e.absolute_path))}: {e.message}")
    except ImportError:
        W.append("schema check skipped (jsonschema not installed); built-in checks still ran")
    if a.results and not E:
        e2, w2 = check_results(yaml.safe_load(open(a.results)), aids)
        E += e2; W += w2
    for w in W: print("WARN ", w)
    for e in E: print("ERROR", e)
    print(f"{'FAIL' if E else 'OK'}: {len(E)} errors, {len(W)} warnings, {len(aids)} assertions")
    sys.exit(1 if E else 0)

if __name__ == "__main__":
    main()
