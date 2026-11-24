#!/usr/bin/env python3
"""numbers_gate.py: check carrier percentages in text/Markdown/HTML against the validated PID dataset.

Why: a citation scanner cannot catch a wrong number. This gate can.

For each carrier name found in a line, the percentages that follow it (up to the next carrier name)
must match the dataset: two or more percentages must include that carrier's requested and approved
rates (individual or small group); a single percentage must be one of its known values.
It also blocks phrases we could not verify, unless the line is tagged UNVERIFIED / NOT FOUND / FAILED.

Usage: python3 src/numbers_gate.py FILE [FILE ...]      exit 1 on any finding
Files named in ALLOW_BANNED (the corrections/registry pages) may quote bad values on purpose.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "pa_ra_validated_dataset.json"
TOL = 0.06
ALLOW_BANNED = {"Corrections-and-Open-Items.md", "Citation-Registry.md", "CORRECTIONS.md"}
BANNED = ["removed its bronze", "bronze tier discontinu", "$600m", "417,158", "203,000", "sept. 19", "september 19",
          "sb 1071", "act 252", "28-725", "29-8719", "bulletin #23-04", "geisinger hmo", "flex blue"]
TAGS = ("UNVERIFIED", "NOT FOUND", "FAILED", "do not cite", "Do not cite")
ALIASES = {  # alias -> dataset id (longest first when matching)
    "Ambetter Health Solutions": "AHS", "Ambetter": "AHP", "Capital Advantage": "CAAC", "Geisinger Health Plan": "GHP", "Geisinger Quality Options": "GQO",
    "Health Partners": "HPP", "Highmark Benefits": "HBG", "Highmark, Inc.": "HIG", "Keystone Health Plan Central": "KHPC",
    "Keystone Central": "KHPC", "Keystone Health Plan East": "KHPE", "Keystone East": "KHPE", "Oscar": "OSC",
    "Partners Insurance": "PIC", "QCC": "QCC", "UPMC Health Network": "UHN", "UPMC Health Plan": "UHP",
}
PCT = re.compile(r"([+-]?\d+(?:\.\d+)?)\s*%")


def known_values(ds):
    pair, single = {}, {}
    for e in ds["individual"]:
        i = e["id"]
        if e["req27"] or e["app27"]:
            pair.setdefault(i, []).append((e["req27"], e["app27"]))
        vals = [e["req27"], e["app27"], e["share26"]]
        if "app26" in e:
            vals += [e["app26"], e["share25"], ((1 + e["app26"] / 100) * (1 + e["app27"] / 100) - 1) * 100]
        single.setdefault(i, []).extend(vals)
    for e in ds["small_group"]:
        i = e["id"]
        pair.setdefault(i, []).append((e["req27"], e["app27"]))
        single.setdefault(i, []).extend([e["req27"], e["app27"], e["share26"]])
    return pair, single


def near(a, b, tol=TOL):
    return abs(a - b) <= tol


def find_hits(text):
    hits = []
    for n in sorted(ALIASES, key=len, reverse=True):
        for m in re.finditer(re.escape(n), text):
            if not any(s <= m.start() < e for s, e, _ in hits):
                hits.append((m.start(), m.end(), n))
    return sorted(hits)


def judge(n, pcts, pair, single):
    cid = ALIASES[n]
    if len(pcts) >= 2:
        if not any(any(near(p, rq) for p in pcts) and any(near(p, ap) for p in pcts) for rq, ap in pair.get(cid, [])):
            return [f"{n}: {pcts} does not include its requested/approved pair {pair.get(cid)}"]
    elif len(pcts) == 1 and not any(near(pcts[0], v) for v in single.get(cid, [])):
        return [f"{n}: {pcts[0]}% is not a known value for this carrier"]
    return []


def check_line(line, pair, single):
    out = []
    if line.lstrip().startswith("|"):
        # table row: a cell naming exactly one carrier is judged on the % values from that cell to the row end;
        # cells listing several carriers are lists and are skipped
        cells = line.split("|")
        for i, cell in enumerate(cells):
            hits = find_hits(cell)
            if len(hits) == 1:
                pcts = [float(x) for x in PCT.findall("|".join(cells[i:]))]
                out += judge(hits[0][2], pcts, pair, single)
        return out
    hits = find_hits(line)
    for k, (s, e, n) in enumerate(hits):
        end = hits[k + 1][0] if k + 1 < len(hits) else len(line)
        out += judge(n, [float(x) for x in PCT.findall(line[e:end])], pair, single)
    return out


def scan(path, ds):
    pair, single = known_values(ds)
    p = Path(path)
    text = p.read_text(encoding="utf-8", errors="ignore")
    if p.suffix.lower() in {".html", ".htm"}:
        text = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", text, flags=re.S)
        text = re.sub(r"<[^>]+>", " ", text)
    findings = []
    allow = p.name in ALLOW_BANNED
    for no, line in enumerate(text.splitlines(), 1):
        low = line.lower()
        if not allow and not any(t in line for t in TAGS):
            for b in BANNED:
                if b in low:
                    findings.append((no, f"unverified/failed phrase: {b!r}"))
        if not allow:
            for msg in check_line(line, pair, single):
                findings.append((no, msg))
    return findings


def main(argv):
    if not argv:
        print(__doc__)
        return 2
    ds = json.loads(DATA.read_text(encoding="utf-8"))
    total = 0
    for f in argv:
        if not Path(f).is_file():
            print(f"[SKIP] {f} (not found)")
            continue
        found = scan(f, ds)
        total += len(found)
        print(f"[{'FAIL' if found else 'PASS'}] {f}: {len(found)} finding(s)")
        for no, msg in found[:25]:
            print(f"   line {no}: {msg}")
    return 1 if total else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
