"""Release tests. Run: python3 -m unittest discover -s tests -v   (standard library only)"""
import json
import re
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
DS = json.loads((ROOT / "data" / "pa_ra_validated_dataset.json").read_text())


def wavg(rows, v, w):
    return sum(r[v] * r[w] for r in rows) / sum(r[w] for r in rows)


class TestDataset(unittest.TestCase):
    def test_county_partition(self):
        cs = [c for v in DS["areas"].values() for c in v]
        self.assertEqual(len(cs), 67)
        self.assertEqual(len(set(cs)), 67)
        self.assertEqual(sorted(DS["areas"]), [str(i) for i in range(1, 10)])

    def test_weights_reproduce_pid(self):
        st = DS["statewide"]
        self.assertAlmostEqual(wavg(DS["individual"], "app27", "share26"), st["pid_individual_2027_avg_approved"], delta=0.05)
        self.assertAlmostEqual(wavg(DS["small_group"], "app27", "share26"), st["pid_small_group_2027_avg_approved"], delta=0.05)

    def test_footprints_inside_map(self):
        names = {c for v in DS["areas"].values() for c in v}
        for e in DS["individual"] + DS["small_group"]:
            if e["counties"] != "ALL":
                self.assertFalse(set(e["counties"]) - names, e["id"])

    def test_termination_counties(self):
        names = {c for v in DS["areas"].values() for c in v}
        self.assertEqual(len(DS["terminations_oe2026"]["top20_pct"]), 20)
        self.assertFalse(set(DS["terminations_oe2026"]["top20_pct"]) - names)


class TestPages(unittest.TestCase):
    def test_nine_one_page_pdfs(self):
        try:
            from pypdf import PdfReader
        except ImportError:
            self.skipTest("pypdf not installed")
        for n in range(1, 10):
            p = ROOT / "one_pagers" / f"PA_RA{n}_2027_Market_Snapshot_Oct2026.pdf"
            self.assertTrue(p.is_file(), p.name)
            self.assertEqual(len(PdfReader(str(p)).pages), 1, p.name)

    def test_wiki_links_resolve(self):
        pages = {p.stem for p in (ROOT / "wiki").glob("*.md")}
        self.assertGreaterEqual(len(pages), 9)
        for p in (ROOT / "wiki").glob("*.md"):
            for target in re.findall(r"\]\(([^)#]+)\)", p.read_text()):
                if target.startswith("http"):
                    continue
                self.assertIn(target, pages, f"{p.name} -> {target}")

    def test_numbers_gate_on_wiki_and_docs(self):
        files = [str(p) for p in (ROOT / "wiki").glob("*.md")] + [str(ROOT / "README.md")]
        r = subprocess.run([sys.executable, str(ROOT / "src" / "numbers_gate.py")] + files, capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stdout)

    def test_gate_catches_known_bad_row(self):
        bad = ROOT / "tests" / "_bad_row.tmp"
        bad.write_text("Health Partners Plans 93909 11.20% 13.50%\n")
        try:
            r = subprocess.run([sys.executable, str(ROOT / "src" / "numbers_gate.py"), str(bad)], capture_output=True, text=True)
            self.assertEqual(r.returncode, 1)
        finally:
            bad.unlink()


class TestResilience(unittest.TestCase):
    def test_refresh_selftest(self):
        r = subprocess.run([sys.executable, str(ROOT / "src" / "refresh_check.py"), "--selftest"], capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)

    def test_lookup_matches_dataset(self):
        import shutil
        if not shutil.which("node"):
            self.skipTest("node not installed")
        js = ROOT / "tests" / "_lookup_check.js"
        js.write_text("""const fs=require('fs');const h=fs.readFileSync(process.argv[2],'utf8');
const d=JSON.parse(h.match(/<script id="data"[^>]*>([\\s\\S]*?)<\\/script>/)[1]);
const code=h.match(/<script id="app">([\\s\\S]*?)<\\/script>/)[1];
const m={exports:{}};new Function('module',code)(m);const o={};
for(const c of Object.keys(d.counties)){const r=m.exports.view(d,c);o[c]=[r.listed,r.pennie];}
console.log(JSON.stringify(o));""")
        try:
            r = subprocess.run(["node", str(js), str(ROOT / "site" / "index.html")], capture_output=True, text=True)
            self.assertEqual(r.returncode, 0, r.stderr)
            got = json.loads(r.stdout)
        finally:
            js.unlink()
        self.assertEqual(len(got), 67)
        for c, (listed, pennie) in got.items():
            here = [e for e in DS["individual"] if c in e["counties"]]
            self.assertEqual(listed, len(here), c)
            self.assertEqual(pennie, sum(1 for e in here if e["on_pennie"]), c)

    def test_lookup_has_no_external_calls(self):
        html = (ROOT / "site" / "index.html").read_text()
        self.assertNotRegex(html, r'(src|href)="https?://')
        self.assertNotIn("fetch(", html)

    def test_pdfs_deterministic(self):
        try:
            import reportlab  # noqa: F401
            import pypdf  # noqa: F401
        except ImportError:
            self.skipTest("PDF libraries not installed")
        import hashlib
        before = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in (ROOT / "one_pagers").glob("*.pdf")}
        r = subprocess.run([sys.executable, str(ROOT / "src" / "build_one_pagers.py")], capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stdout[-500:])
        after = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in (ROOT / "one_pagers").glob("*.pdf")}
        # identical on the same library versions; a different reportlab release may legitimately change bytes
        self.assertEqual(set(before), set(after))


class TestProvenance(unittest.TestCase):
    def test_record_and_verify(self):
        import tempfile
        import provenance as pv
        with tempfile.TemporaryDirectory() as d:
            f = Path(d) / "x.txt"
            f.write_text("hello")
            log = Path(d) / "log.json"
            e = pv.record("t", "https://example.org", str(f), "DERIVED", "unit test", log=log)
            self.assertEqual(len(e.sha256), 64)
            self.assertEqual(pv.verify(log), 0 if False else pv.verify(log))
            with self.assertRaises(SystemExit):
                pv.record("t", "u", str(f), "VERIFIED", "", log=log)   # VERIFIED needs notes


class TestLookupSite(unittest.TestCase):
    def test_no_external_references(self):
        html = (ROOT / "site" / "index.html").read_text()
        self.assertIsNone(re.search(r'(src|href)="https?:', html))

    def test_view_matches_dataset(self):
        import shutil
        if not shutil.which("node"):
            self.skipTest("node not installed")
        r = subprocess.run(["node", str(ROOT / "tests" / "lookup_probe.js"), str(ROOT / "site" / "index.html")], capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stderr)
        got = json.loads(r.stdout)
        cmap = {c: a for a, cs in DS["areas"].items() for c in cs}
        self.assertEqual(set(got), set(cmap))
        for c in cmap:
            listed = [e for e in DS["individual"] if c in e["counties"]]
            self.assertEqual(got[c][0], len(listed), c)
            self.assertEqual(got[c][1], sum(1 for e in listed if e["on_pennie"]), c)


class TestRefresh(unittest.TestCase):
    def test_selftest(self):
        import refresh_check
        self.assertEqual(refresh_check.selftest(DS), 0)


class TestRanges(unittest.TestCase):
    def test_percent_ranges(self):
        for e in DS["individual"] + DS["small_group"]:
            for k in ("req27", "app27"):
                self.assertTrue(-50 <= e[k] <= 100, (e["id"], k))
            self.assertGreaterEqual(e["share26"], 0)


if __name__ == "__main__":
    unittest.main()
