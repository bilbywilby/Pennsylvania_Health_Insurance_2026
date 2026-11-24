#!/usr/bin/env python3
"""refresh_check.py: detect drift between the validated dataset and PID's live pages.

PID can revise or re-post rates. Run this on a schedule (see .github/workflows/verify.yml) or by hand.

  python3 src/refresh_check.py                      # fetch PID pages, compare
  python3 src/refresh_check.py --file page.html [--release-file release.html]   # compare saved copies
  python3 src/refresh_check.py --file page.html --dump layout.txt   # write what the parser sees, to debug a layout change
  python3 src/refresh_check.py --json               # machine-readable result
  python3 src/refresh_check.py --selftest           # logic test, no network

Exit codes: 0 no drift, 1 drift found, 2 could not fetch or read the pages (not a verdict).
Fetching: retries only transient failures (timeouts, connection errors, HTTP 408/425/429/5xx) with exponential
backoff plus jitter, honors Retry-After (capped at 60 s), and gives up at once on permanent errors (404, 403).
Comparing: for each filer, the requested and approved percentages from the dataset must both appear within
250 characters after that filer's name. It flags missing filers but cannot detect brand-new ones.
State: data/provenance/pid_page_state.json keeps a hash of the page text, so you are told when the page changed
even if every number still matches.
Written against PID's published layout and not yet run against the live page: run once with a saved copy
(--file, --dump) and read the report before trusting a clean result.
"""
import argparse
import hashlib
import html as htmllib
import json
import random
import re
import socket
import ssl
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "pa_ra_validated_dataset.json"
RATES_URL = "https://www.pa.gov/agencies/insurance/posted-filings-reports-company-orders/posted-product-and-rate-filings/aca-health-rate-filings"
RELEASE_URL = "https://www.pa.gov/agencies/insurance/newsroom/pennsylvania-releases-aca-2027-health-insurance-rates"
PCT = re.compile(r"(\d+(?:\.\d+)?)\s*%")
WINDOW = 250


class FetchError(Exception):
    def __init__(self, msg, permanent=False):
        super().__init__(msg)
        self.permanent = permanent


TRANSIENT_HTTP = {408, 425, 429, 500, 502, 503, 504}


def fetch(url, timeout=25, tries=3, base_delay=1.0, sleep=time.sleep, opener=urllib.request.urlopen):
    """Return page text. Retries transient failures only; raises FetchError otherwise."""
    last = "no attempt made"
    for attempt in range(tries):
        wait = None
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; pa-audit-refresh/1.1)", "Accept": "text/html"})
            with opener(req, timeout=timeout) as r:
                return r.read().decode("utf-8", "replace")
        except urllib.error.HTTPError as e:
            last = f"HTTP {e.code}"
            if e.code not in TRANSIENT_HTTP:
                raise FetchError(f"{url}: {last} (permanent)", permanent=True)
            ra = e.headers.get("Retry-After") if e.headers else None
            if ra and ra.strip().isdigit():
                wait = min(int(ra.strip()), 60)
        except (urllib.error.URLError, socket.timeout, TimeoutError, ConnectionError, ssl.SSLError) as e:
            last = f"{type(e).__name__}: {e}"
        if attempt < tries - 1:   # never sleep after the final attempt
            sleep(wait if wait is not None else base_delay * (2 ** attempt) + random.uniform(0, base_delay))
    raise FetchError(f"{url}: gave up after {tries} attempts ({last})")


def to_text(raw):
    raw = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", raw, flags=re.S | re.I)
    raw = re.sub(r"<[^>]+>", " ", raw)
    return re.sub(r"\s+", " ", htmllib.unescape(raw))


def windows(text, name):
    out = []
    for m in re.finditer(re.escape(name), text):
        out.append([float(x) for x in PCT.findall(text[m.end():m.end() + WINDOW])])
    return out


def has(ws, want, tol=0.005):
    return any(any(abs(p - want) <= tol for p in w) for w in ws)


def check_rates(text, ds):
    found = []
    for kind, rows in (("individual", ds["individual"]), ("small group", ds["small_group"])):
        for e in rows:
            if kind == "individual" and not e["req27"] and not e["app27"]:
                continue   # new plan, 0.00%
            ws = windows(text, e["name"]) or windows(text, e["short"])
            if not ws:
                found.append(f"{kind}: '{e['name']}' not found on page")
            elif not (has(ws, e["req27"]) and has(ws, e["app27"])):
                found.append(f"{kind}: {e['short']} expected requested {e['req27']:.2f}% / approved {e['app27']:.2f}% not found together")
    return found


def check_release(text, ds):
    st = ds["statewide"]
    need = {f"{st['pid_individual_2027_avg_approved']:.2f}%": "individual average", f"{st['pid_small_group_2027_avg_approved']:.2f}%": "small group average",
            f"{st['pid_denied_increases_usd_millions']}": "denied amount"}
    return [f"press release: {what} ({k}) not found" for k, what in need.items() if k not in text]


STATE = ROOT / "data" / "provenance" / "pid_page_state.json"


def page_state_note(text, path=STATE):
    """Compare a hash of the page text with the last run. Returns a note, or '' on first run or no change."""
    h = hashlib.sha256(text.encode("utf-8")).hexdigest()
    prev = {}
    try:
        prev = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        pass
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps({"sha256": h, "checked_utc": datetime.now(timezone.utc).isoformat(timespec="seconds")}) + "\n", encoding="utf-8")
    except OSError:
        pass
    if prev.get("sha256") and prev["sha256"] != h:
        return f"page text changed since {prev.get('checked_utc', 'last run')} (numbers may still match)"
    return ""


def dump_layout(text, ds, dest):
    lines = [f"page text length: {len(text)}", ""]
    for kind, rows in (("individual", ds["individual"]), ("small group", ds["small_group"])):
        for e in rows:
            ws = windows(text, e["name"]) or windows(text, e["short"])
            lines.append(f"[{kind}] {e['short']}: expected req {e['req27']:.2f} / app {e['app27']:.2f}; occurrences {len(ws)}; percentages after each: {ws}")
    lines += ["", "first 1500 characters of page text:", text[:1500]]
    Path(dest).write_text("\n".join(lines) + "\n", encoding="utf-8")


def selftest(ds):
    good = " ".join(f"{e['name']} {e['req27']:.2f}% {e['app27']:.2f}% 1.00%" for e in ds["individual"] + ds["small_group"])
    assert check_rates(good, ds) == [], "clean text should pass"
    bad = good.replace("35.13%", "30.00%")
    assert any("Ambetter" in f for f in check_rates(bad, ds)), "changed Ambetter rate should be caught"
    assert any("not found on page" in f for f in check_rates(good.replace("QCC Insurance Company", "X"), ds)), "missing filer should be caught"
    rel = "15.97% 10.28% $94.7 million"
    assert check_release(rel, ds) == [] and check_release("nothing", ds)
    print("selftest ok")
    return 0


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--file")
    ap.add_argument("--release-file")
    ap.add_argument("--dump")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--selftest", action="store_true")
    ap.add_argument("--timeout", type=int, default=25)
    ap.add_argument("--no-state", action="store_true", help="do not read or write the page-hash state file")
    a = ap.parse_args(argv)
    ds = json.loads(DATA.read_text(encoding="utf-8"))
    if a.selftest:
        return selftest(ds)

    def done(code, status, findings=(), note=""):
        if a.json:
            print(json.dumps({"status": status, "exit": code, "findings": list(findings), "note": note}))
        return code

    try:
        rates = Path(a.file).read_text(encoding="utf-8", errors="replace") if a.file else fetch(RATES_URL, a.timeout)
        rel = Path(a.release_file).read_text(encoding="utf-8", errors="replace") if a.release_file else (fetch(RELEASE_URL, a.timeout) if not a.file else "")
    except (FetchError, OSError) as e:
        if not a.json:
            print(f"[COULD NOT FETCH] {e}")
        return done(2, "fetch_failed", note=str(e))
    rt = to_text(rates)
    if a.dump:
        dump_layout(rt, ds, a.dump)
        if not a.json:
            print(f"[DUMP] wrote {a.dump}")
    if len(rt) < 2000:
        if not a.json:
            print("[COULD NOT READ] page text is suspiciously short; the layout may have changed or the page is script-rendered")
        return done(2, "unreadable", note="page text too short")
    note = "" if (a.no_state or a.file) else page_state_note(rt)
    findings = check_rates(rt, ds)
    if rel:
        findings += check_release(to_text(rel), ds)
    if findings:
        if not a.json:
            print(f"[DRIFT] {len(findings)} difference(s) from the validated dataset:")
            for f in findings:
                print("  -", f)
            if note:
                print("  note:", note)
            print("Do not edit published pages until you have re-read the PID page and updated data/pa_ra_validated_dataset.json (see docs/DATA_UPDATE_PLAYBOOK.md).")
        return done(1, "drift", findings, note)
    if not a.json:
        print("[OK] PID pages match the validated dataset")
        if note:
            print("  note:", note)
    return done(0, "ok", note=note)


if __name__ == "__main__":
    sys.exit(main())
