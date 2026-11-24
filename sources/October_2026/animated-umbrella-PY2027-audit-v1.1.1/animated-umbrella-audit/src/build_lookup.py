#!/usr/bin/env python3
"""build_lookup.py: builds site/index.html, a single-file, offline county lookup for consumers.

Pick a county; see its rating area, every PID-listed individual-market filer with 2026 approved,
2027 requested and approved rates, whether the filer sells on Pennie, small-group filers, Pennie's
published termination rate (if the county is on its top-20 list), and where to get help.
No external scripts, fonts or network calls. Data is embedded from the validated dataset, so the
page cannot drift from the audits. Usage: python3 src/build_lookup.py
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_one_pagers as b  # noqa: E402

TEMPLATE = r'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pennsylvania 2027 Health Plan Rates by County</title>
<style>
:root{--ink:#1b1f24;--muted:#4b5563;--navy:#1f3a5f;--bg:#fff;--soft:#f2f5f9;--warn:#7a3b00;--warnbg:#fff4e5;--line:#d5dbe2}
*{box-sizing:border-box}
body{margin:0;font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:var(--ink);background:var(--bg)}
header{background:var(--navy);color:#fff;padding:14px 16px}
header h1{margin:0;font-size:1.25rem}
header p{margin:4px 0 0;font-size:.9rem;color:#dbe4f0}
main{max-width:860px;margin:0 auto;padding:16px}
label{display:block;font-weight:600;margin-bottom:6px}
select{font:inherit;padding:10px;min-width:16rem;max-width:100%;border:2px solid var(--navy);border-radius:6px;background:#fff;color:var(--ink)}
.lead{font-size:1.05rem}
.warn{background:var(--warnbg);color:var(--warn);border-left:4px solid var(--warn);padding:8px 12px;border-radius:4px}
.box{background:var(--soft);padding:10px 14px;border-radius:6px;margin:12px 0}
.wrap{overflow-x:auto}
table{border-collapse:collapse;width:100%;margin:8px 0 14px}
caption{text-align:left;font-weight:600;padding:4px 0}
th,td{padding:7px 8px;border-bottom:1px solid var(--line);text-align:right;vertical-align:top}
th:first-child,td:first-child{text-align:left}
thead th{background:var(--navy);color:#fff;font-size:.85rem}
.small{font-size:.85rem;color:var(--muted)}
footer{max-width:860px;margin:0 auto;padding:8px 16px 32px}
a{color:#0b4f9c}
@media print{select,label,.noprint{display:none}header{background:#fff;color:#000;border-bottom:2px solid #000}}
</style>
</head>
<body>
<header>
<h1>Pennsylvania 2027 health plan rates, by county</h1>
<p>Plan year 2027. Version __VERSION__, data as of __ASOF__.</p>
</header>
<main>
<p>Choose your county to see which insurers file ACA individual-market plans there, and what the Pennsylvania Insurance Department (PID) approved for 2027.</p>
<p><label for="county">County</label>
<select id="county" aria-controls="result"><option value="">Select a county</option></select></p>
<noscript><p class="warn">This tool needs JavaScript. County tables without JavaScript are in the <code>audits/</code> folder of the project repository.</p></noscript>
<div id="result" aria-live="polite"><p class="small">Nothing selected yet.</p></div>
</main>
<footer>
<p class="small"><strong>Read this first.</strong> Rates are PID average changes across each insurer's plans, before tax credits. They are not what you will pay: age, income, household size, plan and subsidies change the bill. This page lists facts, not recommendations, and is not legal, medical or financial advice. Statewide, PID approved +__STATEIND__% on average for the individual market and +__STATESG__% for small group (PID press release, Sept. 18, 2026).</p>
<p class="small">Sources: Pennsylvania Insurance Department rate-filing and coverage-area pages and press release (2026); Pennie county terminations file through Feb. 1, 2026; CMS Pennsylvania geographic rating areas (2024). Full references and method: project wiki.</p>
</footer>
<script id="data" type="application/json">__DATA__</script>
<script id="app">
(function () {
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function pct(x) { return (x === null || x === undefined) ? "n/a" : (x > 0 ? "+" : "") + x.toFixed(2) + "%"; }
  function view(D, county) {
    var c = D.counties[county];
    if (!c) { return { html: '<p class="small">Nothing selected yet.</p>', listed: 0, pennie: 0 }; }
    var rows = c.individual.slice().sort(function (a, b) { return a.short < b.short ? -1 : 1; });
    var listed = rows.length;
    var pennie = rows.filter(function (r) { return r.pennie; }).length;
    var h = "<h2>" + esc(county) + " County, Rating Area " + c.area + "</h2>";
    h += '<p class="lead">PID lists <strong>' + listed + "</strong> individual-market filers for this county; <strong>" + pennie + "</strong> sell on Pennie.</p>";
    if (pennie <= 2) {
      h += '<p class="warn" role="note">Only ' + pennie + " carriers sell on Pennie in this county. With few choices, a large increase from one carrier leaves fewer alternatives to compare.</p>";
    }
    h += '<div class="wrap"><table><caption>Individual market, plan year 2027: average rate change by insurer</caption><thead><tr>' +
      '<th scope="col">Insurer</th><th scope="col">Sold on Pennie</th><th scope="col">2026 approved</th><th scope="col">2027 requested</th>' +
      '<th scope="col">2027 approved</th><th scope="col">PID changed request by (points)</th></tr></thead><tbody>';
    rows.forEach(function (r) {
      if (r.isNew) {
        h += "<tr><th scope=\"row\">" + esc(r.short) + "</th><td>" + (r.pennie ? "Yes" : "No") + '</td><td colspan="4">new plan, no rate change reported</td></tr>';
      } else {
        var d = r.app27 - r.req27;
        h += '<tr><th scope="row">' + esc(r.short) + "</th><td>" + (r.pennie ? "Yes" : "No") + "</td><td>" + pct(r.app26) + "</td><td>" + pct(r.req27) +
          "</td><td><strong>" + pct(r.app27) + "</strong></td><td>" + (d > 0 ? "+" : "") + d.toFixed(2) + "</td></tr>";
      }
    });
    h += "</tbody></table></div>";
    var off = rows.filter(function (r) { return !r.pennie; });
    if (off.length) {
      h += '<p class="small">Not sold on Pennie: ' + off.map(function (r) { return esc(r.short); }).join(", ") + ". Premium tax credits apply only to plans bought through Pennie.</p>";
    }
    var a = D.areas[String(c.area)];
    h += '<div class="box"><strong>This rating area:</strong> insurer-weighted average approved increase about ' + pct(a.mix) +
      " (an estimate from statewide market shares), compared with " + pct(D.meta.stateInd) + " statewide.</div>";
    if (c.termination) {
      h += "<p>Pennie reported that <strong>" + c.termination + "%</strong> of this county's enrollees ended coverage during 2026 open enrollment (through Feb. 1, 2026).</p>";
    } else {
      h += '<p class="small">This county is not on Pennie\'s published top-20 list of 2026 termination rates (19% or below).</p>';
    }
    var sg = c.sg.slice().sort(function (x, y) { return x.short < y.short ? -1 : 1; });
    h += '<div class="wrap"><table><caption>Small group (employer plans), plan year 2027</caption><thead><tr><th scope="col">Insurer</th><th scope="col">2027 requested</th><th scope="col">2027 approved</th></tr></thead><tbody>';
    sg.forEach(function (r) { h += '<tr><th scope="row">' + esc(r.short) + "</th><td>" + pct(r.req27) + "</td><td><strong>" + pct(r.app27) + "</strong></td></tr>"; });
    h += "</tbody></table></div>";
    h += '<div class="box"><strong>Next steps</strong><ol><li>Open enrollment for 2027: ' + esc(D.oe.text) + "</li>" +
      "<li>Log in to Pennie, update your income and household information, and compare plans. Do not assume your plan renews unchanged.</li>" +
      "<li>Free help: Pennie " + esc(D.help.pennie) + " (pennie.com). Insurance complaints: PID " + esc(D.help.pid) + ".</li></ol></div>";
    return { html: h, listed: listed, pennie: pennie };
  }
  function init() {
    var D = JSON.parse(document.getElementById("data").textContent);
    var sel = document.getElementById("county");
    var out = document.getElementById("result");
    Object.keys(D.counties).sort().forEach(function (k) {
      var o = document.createElement("option"); o.value = k; o.textContent = k; sel.appendChild(o);
    });
    function show() { out.innerHTML = view(D, sel.value).html; if (sel.value) { try { history.replaceState(null, "", "#" + encodeURIComponent(sel.value)); } catch (e) {} } }
    sel.addEventListener("change", show);
    var want = decodeURIComponent((location.hash || "").slice(1));
    if (want && D.counties[want]) { sel.value = want; show(); }
  }
  if (typeof module !== "undefined" && module.exports) { module.exports = { view: view, esc: esc }; }
  else if (typeof document !== "undefined") { document.addEventListener("DOMContentLoaded", init); }
})();
</script>
</body>
</html>
'''


def main():
    ds = b.load()
    cmap = b.prepare(ds)
    b.validate(ds, cmap)
    derived = b.derive(ds, cmap)
    term = ds["terminations_oe2026"]["top20_pct"]
    counties = {}
    for c, a in sorted(cmap.items()):
        ind = []
        for e in ds["individual"]:
            if c in e["cset"]:
                new = "app26" not in e
                ind.append({"id": e["id"], "short": e["short"], "pennie": e["on_pennie"], "isNew": new,
                            "app26": None if new else e["app26"], "req27": None if new else e["req27"], "app27": None if new else e["app27"]})
        sg = [{"short": e["short"], "req27": e["req27"], "app27": e["app27"]} for e in ds["small_group"] if c in e["cset"]]
        counties[c] = {"area": int(a), "individual": ind, "sg": sg, "termination": term.get(c)}
    st = ds["statewide"]
    data = {
        "meta": {"version": "1.1", "asOf": "2026-10-10", "stateInd": st["pid_individual_2027_avg_approved"], "stateSg": st["pid_small_group_2027_avg_approved"]},
        "oe": {"text": "November 1, 2026 to January 15, 2027. Enroll by December 15, 2026 for coverage starting January 1, 2027. Confirm dates at pennie.com."},
        "help": {"pennie": "1-844-844-8040", "pid": "1-866-722-6675"},
        "areas": {a: {"mix": round(m["mix_approved"], 4)} for a, m in derived.items()},
        "counties": counties,
    }
    blob = json.dumps(data, separators=(",", ":"), ensure_ascii=True).replace("</", "<\\/")
    html = (TEMPLATE.replace("__DATA__", blob).replace("__VERSION__", "1.1").replace("__ASOF__", "2026-10-10")
            .replace("__STATEIND__", f"{st['pid_individual_2027_avg_approved']:.2f}").replace("__STATESG__", f"{st['pid_small_group_2027_avg_approved']:.2f}"))
    out = b.ROOT / "site" / "index.html"
    out.parent.mkdir(exist_ok=True)
    out.write_text(html, encoding="utf-8")
    print(f"[BUILT] site/index.html ({out.stat().st_size} bytes, {len(counties)} counties)")


if __name__ == "__main__":
    main()
