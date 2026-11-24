#!/usr/bin/env python3
"""build_audits.py: writes the nine full rating-area audits to audits/RA<n>_audit.md.

Same validated dataset and derivations as the one-pagers (imported from build_one_pagers),
plus county-level tables the one page has no room for. Usage: python3 src/build_audits.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_one_pagers as b  # noqa: E402

OUT = b.ROOT / "audits"


def sp(x, d=2):
    return f"{x:+.{d}f}%"


def main():
    ds = b.load()
    cmap = b.prepare(ds)
    b.validate(ds, cmap)
    derived = b.derive(ds, cmap)
    STATE_I = ds["statewide"]["pid_individual_2027_avg_approved"]
    STATE_S = ds["statewide"]["pid_small_group_2027_avg_approved"]
    rs = ds["above_request_reasons"]
    OUT.mkdir(exist_ok=True)
    for a in sorted(derived, key=int):
        m = derived[a]
        cs = m["counties"]
        ents = sorted(m["individual_filers"], key=lambda r: (-r["share26"], r["id"]))
        full = {e["id"]: e for e in ds["individual"]}
        sgf = {e["id"]: e for e in ds["small_group"]}
        L = []
        L.append(f"# Rating Area {a}: PY2027 Audit\n")
        L.append("Version 1.1, October 10, 2026. Descriptive audit; evidence tiers per `wiki/Methodology-and-Verification.md`. "
                 "Rates are PID average changes across a filer's plans, before tax credits (PID, 2026a). Not legal, medical or financial advice.\n")
        L.append(f"**Counties ({m['n_counties']}):** {', '.join(cs)}.\n")
        lo = min((r for r in ents if r["share26"] > 0), key=lambda r: r["app27"])
        hi = max(ents, key=lambda r: r["app27"])
        L.append("## 1. Headline metrics (DERIVED from VERIFIED inputs)\n")
        L.append("| Metric | Value |\n| :--- | :--- |")
        L.append(f"| PID-listed individual filers / sold on Pennie | {m['n_listed']} / {m['n_on_pennie']} |")
        L.append(f"| Carrier-mix approved 2027 increase | {sp(m['mix_approved'],1)} (state {sp(STATE_I)}; rank {m['rank_mix_1_is_highest']} of 9, 1 = highest) |")
        L.append(f"| Approved range | {lo['short']} {sp(lo['app27'])} to {hi['short']} {sp(hi['app27'])} |")
        L.append(f"| On-Pennie filers per county | {m['min_on_pennie']} to {m['max_on_pennie']}; {len(m['thin_counties'])} of {m['n_counties']} counties have two or fewer |")
        L.append(f"| Counties on Pennie's top-20 OE-2026 termination list | {len(m['terminations_top20'])} of {m['n_counties']} |")
        L.append(f"| Small-group filers / carrier-mix approved | {len(m['sg_filers'])} / {sp(m['sg_mix_approved'],1)} (state {sp(STATE_S)}) |\n")

        L.append("## 2. Individual market: every PID-listed filer (VERIFIED: PID, 2026a, 2026b, 2026d)\n")
        L.append("| Filer | Pennie | Counties served | 2026 approved | 2027 requested | 2027 approved | vs request (pts) | 2026-27 compounded | 2026 share |")
        L.append("| :--- | :---: | :---: | ---: | ---: | ---: | ---: | ---: | ---: |")
        for r in ents:
            if "app26" not in r:
                L.append(f"| {r['short']} | No | {r['cty']}/{m['n_counties']} | new | n/a | new plan, 0.00% | n/a | new | n/a |")
            else:
                L.append(f"| {r['short']} | {'Yes' if r['on_pennie'] else 'No'} | {r['cty']}/{m['n_counties']} | {sp(r['app26'])} | {sp(r['req27'])} | "
                         f"**{sp(r['app27'])}** | {r['delta']:+.2f} | {sp(r['cmp2'],1)} | {r['share26']:.2f}% |")
        L.append("")

        L.append("## 3. County-level competition (VERIFIED: PID, 2026b; terminations: Pennie, 2026a)\n")
        L.append("| County | Listed | On Pennie | Filers | OE-2026 terminations |")
        L.append("| :--- | :---: | :---: | :--- | :---: |")
        for c in cs:
            here = [e for e in ds["individual"] if c in e["cset"]]
            here.sort(key=lambda e: (-e["share26"], e["id"]))
            t = m["terminations_top20"].get(c)
            L.append(f"| {c} | {len(here)} | {sum(1 for e in here if e['on_pennie'])} | {', '.join(e['short'] for e in here)} | {str(t)+'%' if t else '19% or below'} |")
        L.append("")

        L.append("## 4. Small group (VERIFIED: PID, 2026a, 2026c)\n")
        L.append("| Filer | Counties served | 2027 requested | 2027 approved | 2026 share |")
        L.append("| :--- | :---: | ---: | ---: | ---: |")
        for r in sorted(m["sg_filers"], key=lambda r: -r["share26"]):
            n = len(set(cs)) if sgf[r["id"]]["cset"] >= set(cs) else len(sgf[r["id"]]["cset"] & set(cs))
            L.append(f"| {r['short']} | {n}/{m['n_counties']} | {sp(r['req27'])} | **{sp(r['app27'])}** | {r['share26']:.2f}% |")
        L.append("")

        L.append("## 5. Findings\n")
        thin = m["thin_counties"]
        L.append(f"- **Competition.** {m['n_listed']} filers are listed ({m['n_on_pennie']} sell on Pennie). "
                 + (f"Two or fewer on-Pennie filers in {len(thin)} of {m['n_counties']} counties: {', '.join(thin)}. These households have little choice if a carrier raises prices."
                    if thin else "No county has two or fewer on-Pennie filers."))
        L.append(f"- **Price.** Carrier-mix approved increase {sp(m['mix_approved'],1)}, {m['mix_approved']-STATE_I:+.1f} pts vs. the state average; rank {m['rank_mix_1_is_highest']} of 9. "
                 f"The spread between filers is {hi['app27']-lo['app27']:.2f} pts, so the filer you hold matters more than the area average.")
        req = [r for r in ents if r["req27"]]
        ups = [r for r in req if r["delta"] > 0]
        cuts = [r for r in req if r["delta"] < 0]
        L.append(f"- **PID action.** PID trimmed {len(cuts)} of {len(req)} requests here."
                 + ("" if not ups else " It approved above the request for "
                    + "; ".join(f"{r['short']} ({r['delta']:+.2f} pts; PID's stated reason: {rs[r['id']]})" for r in ups if r["id"] in rs) + " (PID, 2026e)."))
        offp = [r for r in ents if not r["on_pennie"]]
        if offp:
            L.append("- **Off-Pennie.** " + "; ".join(r["short"] for r in offp) + " are not sold on Pennie, so premium tax credits cannot be applied to them.")
        two = [r for r in ents if "cmp2" in r]
        top = max(two, key=lambda r: r["cmp2"])
        L.append(f"- **Two-year view.** Largest compounded 2026-27 increase in the area: {top['short']} {sp(top['cmp2'],1)}; lowest: "
                 f"{min(two, key=lambda r: r['cmp2'])['short']} {sp(min(two, key=lambda r: r['cmp2'])['cmp2'],1)}. Gross premium, before tax credits.")
        tt = m["terminations_top20"]
        L.append("- **Terminations.** " + (", ".join(f"{c} {v}%" for c, v in sorted(tt.items(), key=lambda kv: (-kv[1], kv[0]))) + " are on Pennie's top-20 list (through 2/1/2026)." if tt
                 else "No county is on Pennie's top-20 list; all are at or below the 19% floor."))
        L.append("")

        L.append("## 6. Data quality and open items\n")
        L.append("- Carrier-mix is a proxy: statewide market shares weight each area because area enrollment is not published. The weights reproduce PID's statewide averages.")
        L.append("- Terminations are the published top 20 only; other counties are at or below 19%.")
        L.append("- Highmark Coverage Advantage filed individual rates for 2026 but not for 2027; where its enrollees moved is not confirmed. [UNVERIFIED]")
        if a == "6":
            L.append("- A newspaper report that two of three carriers left Schuylkill for 2026 was not verified. PID's 2027 footprint lists 9 filers in Schuylkill (7 on Pennie).")
        if a in {"1", "4"}:
            L.append("- This is one of the two thin-competition areas; see the county table.")
        L.append("")
        L.append("## 7. Sources\n")
        L.append("PID (2026a-2026f); Pennie (2026a); CMS (2024). Full references: `wiki/Sources-and-Reproducibility.md`.\n")
        (OUT / f"RA{a}_audit.md").write_text("\n".join(L), encoding="utf-8")
        print(f"[BUILT] audits/RA{a}_audit.md")

    rows = ["# Rating Area Audits, Plan Year 2027", "",
            "Nine full audits (v1.1, data as of 2026-10-10). Each pairs with a one-page PDF in `one_pagers/`.", "",
            "| Area | Counties | Filers listed / on Pennie | Carrier-mix approved (rank) | Thin counties | Audit | One-pager |",
            "| :---: | ---: | :---: | ---: | ---: | :--- | :--- |"]
    for a in sorted(derived, key=int):
        m = derived[a]
        rows.append(f"| {a} | {m['n_counties']} | {m['n_listed']} / {m['n_on_pennie']} | {sp(m['mix_approved'],1)} ({m['rank_mix_1_is_highest']}) | "
                    f"{len(m['thin_counties'])} | [RA{a}_audit.md](RA{a}_audit.md) | `PA_RA{a}_2027_Market_Snapshot_Oct2026.pdf` |")
    (OUT / "README.md").write_text("\n".join(rows) + "\n", encoding="utf-8")
    print("[BUILT] audits/README.md")


if __name__ == "__main__":
    main()
