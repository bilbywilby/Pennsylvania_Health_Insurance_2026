#!/usr/bin/env python3
"""Verify HANDOVER.json after a heredoc paste. Prints ok or error: <reason>."""
import hashlib, json, re, sys
from pathlib import Path
p = Path(sys.argv[1] if len(sys.argv) > 1 else Path.home() / "handover_session_20261106" / "HANDOVER.json")
EXPECT_LINES, EXPECT_SHA = 659, "d3fcc4dabebc5635e4df8c13f5d13fb7a7950cc9fdd97521dfbe70465a3d1237"
MUST = ["EXPOSE-001", "STAGE-001", "BACKUP-001", "G1 run_or_dry", "project_context", "os.link", "Never git add -A", "next_actions"]
def bad(msg):
    print("error:", msg); sys.exit(1)
if not p.is_file():
    bad(f"missing {p}")
raw = p.read_bytes()
text = raw.decode("utf-8", "replace")
try:
    d = json.loads(text)
except ValueError as e:
    bad(f"invalid JSON: {e}")
n = text.count("\n")
if n != EXPECT_LINES:
    bad(f"line count {n}, expected {EXPECT_LINES} (paste mangled? use w3m)")
for k in ("handover_version", "known_issues", "guardrails", "next_actions", "gsw_overhaul", "audit_results"):
    if k not in d:
        bad(f"missing key {k}")
for m in MUST:
    if m not in text:
        bad(f"missing text {m!r}")
if re.search(r"gh[pousr]_[A-Za-z0-9]{30,}|-----BEGIN [A-Z ]*PRIVATE KEY-----", text):
    bad("credential-shaped string present")
h = hashlib.sha256(raw).hexdigest()
if h != EXPECT_SHA:
    bad(f"sha256 {h[:12]}... differs from {EXPECT_SHA[:12]}... (same lines, altered content)")
print("ok", n, "lines", h[:12])
