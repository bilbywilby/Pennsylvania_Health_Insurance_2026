#!/usr/bin/env python3
"""doctor.py: checks the machine can build and verify this project. Exit 1 if a required piece is missing."""
import importlib
import shutil
import sys

ok = True
print(f"python {sys.version.split()[0]}")
if sys.version_info < (3, 9):
    print("  FAIL: Python 3.9 or newer is required")
    ok = False
for mod, need in (("reportlab", True), ("pypdf", True), ("PIL", False)):
    try:
        m = importlib.import_module(mod)
        print(f"  ok   {mod} {getattr(m, 'Version', getattr(m, '__version__', ''))}")
    except Exception:
        print(f"  {'FAIL' if need else 'warn'} {mod} missing" + ("  -> pip install -r requirements.txt" if need else ""))
        ok = ok and not need
for tool, need in (("git", True), ("sha256sum", True), ("pdfinfo", False), ("node", False)):
    p = shutil.which(tool)
    print(f"  {'ok  ' if p else ('FAIL' if need else 'warn')} {tool}" + ("" if p else " not found"))
    ok = ok and (bool(p) or not need)
print("doctor: " + ("ready" if ok else "NOT READY"))
sys.exit(0 if ok else 1)
