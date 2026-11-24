"""Tests for src/refresh_check.py: retry behavior against a local fake server, and comparison outcomes."""
import json
import subprocess
import sys
import tempfile
import threading
import time
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
import refresh_check as rc  # noqa: E402

DS = json.loads((ROOT / "data" / "pa_ra_validated_dataset.json").read_text())


class Server:
    """Serves a scripted sequence of (status, headers, body, delay) responses, then repeats the last."""

    def __init__(self, script):
        self.script, self.hits = list(script), 0
        outer = self

        class H(BaseHTTPRequestHandler):
            def do_GET(self):
                i = min(outer.hits, len(outer.script) - 1)
                outer.hits += 1
                status, headers, body, delay = outer.script[i]
                time.sleep(delay)
                self.send_response(status)
                for k, v in headers.items():
                    self.send_header(k, v)
                data = body.encode()
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                try:
                    self.wfile.write(data)
                except OSError:
                    pass

            def log_message(self, *a):
                pass

        self.httpd = ThreadingHTTPServer(("127.0.0.1", 0), H)
        self.url = f"http://127.0.0.1:{self.httpd.server_address[1]}/"
        threading.Thread(target=self.httpd.serve_forever, daemon=True).start()

    def close(self):
        self.httpd.shutdown()
        self.httpd.server_close()


def page(mutate=None):
    body = " ".join(f"{e['name']} {e['req27']:.2f}% {e['app27']:.2f}% 1.00% filler text to make the page long enough " * 2
                    for e in DS["individual"] + DS["small_group"])
    return mutate(body) if mutate else body


class TestFetch(unittest.TestCase):
    def run_fetch(self, script, **kw):
        srv, sleeps = Server(script), []
        try:
            try:
                out = rc.fetch(srv.url, timeout=kw.pop("timeout", 5), sleep=sleeps.append, **kw)
                return out, None, srv.hits, sleeps
            except rc.FetchError as e:
                return None, e, srv.hits, sleeps
        finally:
            srv.close()

    def test_recovers_after_transient_503(self):
        out, err, hits, sleeps = self.run_fetch([(503, {}, "", 0), (503, {}, "", 0), (200, {}, "ok", 0)])
        self.assertEqual(out, "ok")
        self.assertEqual((hits, len(sleeps)), (3, 2))

    def test_permanent_404_is_not_retried(self):
        out, err, hits, sleeps = self.run_fetch([(404, {}, "", 0), (200, {}, "ok", 0)])
        self.assertIsNone(out)
        self.assertTrue(err.permanent)
        self.assertEqual((hits, sleeps), (1, []))

    def test_gives_up_without_sleeping_after_last_attempt(self):
        out, err, hits, sleeps = self.run_fetch([(503, {}, "", 0)], tries=3)
        self.assertIsNone(out)
        self.assertFalse(err.permanent)
        self.assertEqual((hits, len(sleeps)), (3, 2))

    def test_retry_after_is_honored_and_capped(self):
        out, err, hits, sleeps = self.run_fetch([(429, {"Retry-After": "7"}, "", 0), (200, {}, "ok", 0)])
        self.assertEqual((out, sleeps), ("ok", [7]))
        out, err, hits, sleeps = self.run_fetch([(503, {"Retry-After": "9999"}, "", 0), (200, {}, "ok", 0)])
        self.assertEqual(sleeps, [60])

    def test_timeout_is_transient(self):
        out, err, hits, sleeps = self.run_fetch([(200, {}, "slow", 1.2), (200, {}, "ok", 0)], timeout=0.4)
        self.assertEqual(out, "ok")
        self.assertGreaterEqual(hits, 2)


class TestCompare(unittest.TestCase):
    def run_cli(self, text, *extra):
        with tempfile.TemporaryDirectory() as d:
            f = Path(d) / "page.html"
            f.write_text(text)
            r = subprocess.run([sys.executable, str(ROOT / "src" / "refresh_check.py"), "--file", str(f), "--json", "--no-state"] + list(extra),
                               capture_output=True, text=True)
            return r.returncode, json.loads(r.stdout)

    def test_clean_page_passes(self):
        code, out = self.run_cli(page())
        self.assertEqual((code, out["status"]), (0, "ok"))

    def test_changed_rate_is_drift(self):
        code, out = self.run_cli(page(lambda t: t.replace("35.13%", "30.00%")))
        self.assertEqual((code, out["status"]), (1, "drift"))
        self.assertTrue(any("Ambetter" in f for f in out["findings"]))

    def test_short_page_is_unreadable_not_drift(self):
        code, out = self.run_cli("tiny page")
        self.assertEqual((code, out["status"]), (2, "unreadable"))

    def test_dump_writes_layout(self):
        with tempfile.TemporaryDirectory() as d:
            dump = Path(d) / "layout.txt"
            self.run_cli(page(), "--dump", str(dump))
            self.assertIn("expected req", dump.read_text())

    def test_state_note_reports_page_change(self):
        with tempfile.TemporaryDirectory() as d:
            st = Path(d) / "state.json"
            self.assertEqual(rc.page_state_note("a" * 10, st), "")      # first run: baseline
            self.assertEqual(rc.page_state_note("a" * 10, st), "")      # unchanged
            self.assertIn("changed", rc.page_state_note("b" * 10, st))  # changed


if __name__ == "__main__":
    unittest.main()
