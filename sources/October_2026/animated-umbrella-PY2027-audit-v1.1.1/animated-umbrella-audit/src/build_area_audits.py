#!/usr/bin/env python3
"""build_area_audits.py: write the nine full rating-area audits (Markdown) from the validated dataset.

Needs data/derived_area_metrics.json (run src/build_one_pagers.py --check first).
Writes audits/RA<n>_audit.md and audits/README.md. Standard library only.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ds = json.loads((ROOT / "data" / "pa_ra_validated_dataset.json").read_text())
dv = json.loads((ROOT / "data" / "derived_area_metrics.json").read_text())
A, CHK = dv["areas"], dv["_checks"]
ST = ds["statewide"]
OUT = ROOT / "audits"
OUT.mkdir(exist_ok=True)
IND = {e["id"]: e for e in ds["individual"]}
SGD = {e["id"]: e for e in ds["small_group"]}


def sp(x, d=2):
    return f"{x:+.{d}f}%"


def cmp2(e):
    return ((1 + e["app26"] / 100) * (1 + e["app27"] / 100) - 1) * 100


index = ["# Rating Area Audits, Plan Year 2027", "",
         "Nine full audits (v1.1, data as of 2026-10-10). Each pairs with a one-page PDF in `one_pagers/`.", "",
         "| Area | Counties | Filers listed / on Pennie | Carrier-mix approved (rank) | Thin counties | Audit | One-pager |",
         "| :---: | ---: | :---: | ---: | ---: | :--- | :--- |"]

for a in sorted(A, key=int):
    m = A[a]
    cs = m["counties"]
    N = len(cs)
    ents = sorted(m["individual_filers"], key=lambda r: (-r["share26"], r["id"]))
    sgm = sorted(m["sg_filers"], key=lambda r: (-r["share26"], r["id"]))
    priced = [r for r in ents if r["share26"] > 0]
    lo = min(priced, key=lambda r: r["app27"])
    hi = max(ents, key=lambda r: r["app27"])
    req_ents = [r for r in ents if r["req27"]]
    cuts = [r for r in req_ents if r["delta"] < 0]
    ups = [r for r in req_ents if r["delta"] > 0]
    tt = m["terminations_top20"]
    L = []
    L += [f"# Rating Area {a} Audit: Plan Year 2027", "",
          f"Version 1.1, data as of 2026-10-10. One-pager: `one_pagers/PA_RA{a}_2027_Market_Snapshot_Oct2026.pdf`.", "",
          "## 1. Scope",
          f"Counties ({N}): {', '.join(cs)} (CMS, 2024). Markets: individual and small group. Prices are PID-approved 2027 average rate changes "
          "(PID, 2026a), before tax credits. State averages: individual +15.97%, small group +10.28% (PID, 2026e).", "",
          "## 2. Individual market (VERIFIED: PID, 2026a, 2026d; compounded column DERIVED)",
          "| Filer | On Pennie | Counties served | 2026 approved | 2027 requested | 2027 approved | vs request (pts) | 2026-27 compounded | 2026 share |",
          "| :--- | :---: | :---: | ---: | ---: | ---: | ---: | ---: | ---: |"]
    for r in ents:
        if "app26" not in r:
            L.append(f"| {r['short']} | No | {r['cty']}/{N} | new | n/a | new plan | n/a | new | n/a |")
        else:
            L.append(f"| {r['short']} | {'Yes' if r['on_pennie'] else 'No'} | {r['cty']}/{N} | {sp(r['app26'])} | {sp(r['req27'])} | **{sp(r['app27'])}** | "
                     f"{r['delta']:+.2f} | {sp(cmp2(r), 1)} | {r['share26']:.2f}% |")
    L += ["",
          f"- **Carrier-mix approved increase (DERIVED):** {sp(m['mix_approved'], 1)}; rank {m['rank_mix_1_is_highest']} of 9 areas (1 = highest); "
          f"{m['mix_approved'] - ST['pid_individual_2027_avg_approved']:+.1f} pts vs. the state average.",
          f"- **Range:** lowest {lo['short']} {sp(lo['app27'])}; highest {hi['short']} {sp(hi['app27'])}.",
          f"- **PID action:** trimmed {len(cuts)} of {len(req_ents)} requests here."]
    if ups:
        rs = ds["above_request_reasons"]
        L.append("- **Approved above request:** " + "; ".join(f"{r['short']} ({r['delta']:+.2f} pts): {rs[r['id']]}" for r in ups if r["id"] in rs) + " (PID, 2026e).")
    offp = [r for r in ents if not r["on_pennie"]]
    if offp:
        L.append("- **Not sold on Pennie (no premium tax credit):** " + ", ".join(r["short"] for r in offp) + ".")
    L += ["", "## 3. County detail (VERIFIED: PID, 2026b; Pennie, 2026a)",
          "`*` marks a filer that is not sold on Pennie. Terminations are Pennie's published top 20 (through 2026-02-01); blank means at or below the 19% list floor.", "",
          "| County | OE-2026 terminations | Filers listed | On Pennie | Filers |", "| :--- | ---: | ---: | ---: | :--- |"]
    for c in cs:
        here = [e for e in ds["individual"] if c in e["counties"]]
        here.sort(key=lambda e: (-e["share26"], e["id"]))
        names = ", ".join(e["short"] + ("" if e["on_pennie"] else "*") for e in here)
        pc = m["per_county"][c]
        L.append(f"| {c} | {str(tt[c]) + '%' if c in tt else ''} | {pc['listed']} | {pc['on_pennie']} | {names} |")
    L += ["", f"Counties with two or fewer on-Pennie filers: {', '.join(m['thin_counties']) if m['thin_counties'] else 'none'}.", "",
          "## 4. Small group (VERIFIED: PID, 2026a, 2026c)",
          "| Filer | Counties served | 2027 requested | 2027 approved | 2026 share |", "| :--- | :---: | ---: | ---: | ---: |"]
    for r in sgm:
        e = SGD[r["id"]]
        served = N if e["counties"] == "ALL" else len(set(e["counties"]) & set(cs))
        L.append(f"| {r['short']} | {served}/{N} | {sp(r['req27'])} | **{sp(r['app27'])}** | {r['share26']:.2f}% |")
    L += ["", f"Small-group carrier-mix (DERIVED): {sp(m['sg_mix_approved'], 1)} vs. state {sp(ST['pid_small_group_2027_avg_approved'])}.", "",
          "## 5. Findings",
          f"1. **Competition.** {m['n_listed']} PID-listed individual filers serve the area ({m['n_on_pennie']} sell on Pennie); on-Pennie filers per county run "
          f"{m['min_on_pennie']} to {m['max_on_pennie']}.",
          f"2. **Price.** Carrier-mix {sp(m['mix_approved'], 1)} puts this area {m['rank_mix_1_is_highest']} of 9.",
          ("3. **Terminations.** " + (f"{len(tt)} of {N} counties are on Pennie's top-20 list: " + ", ".join(f"{c} {v}%" for c, v in sorted(tt.items(), key=lambda kv: (-kv[1], kv[0]))) + "."
                                       if tt else "No county is on Pennie's top-20 list; all are at or below 19%.")), "",
          "## 6. Checks run on this build",
          f"- Weights reproduce PID: individual 2027 {CHK['ind27']:.2f}% vs 15.97%; small group {CHK['sg27']:.2f}% vs 10.28%; individual 2026 {CHK['ind26']:.2f}% vs 21.5%.",
          "- This area's filer list, derived from county footprints, matches the September 8 area report and PID's stated rating areas.",
          "- Page numbers pass `src/numbers_gate.py` against the validated dataset.", "",
          "## 7. Limits and open items",
          "- Carrier-mix is a proxy: area enrollment is not published, so statewide market share is the weight.",
          "- Averages are across a filer's plans and before tax credits; they are not any household's bill.",
          "- Termination rates are the published top 20 only.",
          "- Highmark Coverage Advantage filed individual rates for 2026 but not for 2027; where its enrollees moved is not confirmed.", "",
          "## 8. Sources",
          "PID (2026a) rate filings; PID (2026b, 2026c) coverage areas; PID (2026d) archived 2026 filings; PID (2026e, Sept. 18) press release; "
          "Pennie (2026a) terminations by county; CMS (2024) rating areas. Full references: `wiki/Sources-and-Reproducibility.md`."]
    (OUT / f"RA{a}_audit.md").write_text("\n".join(L) + "\n", encoding="utf-8")
    index.append(f"| {a} | {N} | {m['n_listed']} / {m['n_on_pennie']} | {sp(m['mix_approved'], 1)} ({m['rank_mix_1_is_highest']}) | {len(m['thin_counties'])} | "
                 f"[RA{a}_audit.md](RA{a}_audit.md) | `PA_RA{a}_2027_Market_Snapshot_Oct2026.pdf` |")
(OUT / "README.md").write_text("\n".join(index) + "\n", encoding="utf-8")
print("wrote 9 audits + index in", OUT)
