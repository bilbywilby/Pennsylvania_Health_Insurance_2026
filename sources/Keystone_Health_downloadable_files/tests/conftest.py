import os
import sys
from pathlib import Path

os.environ.setdefault('DISPATCH_WEBHOOK_URL', 'https://example.invalid/webhook')

ROOT_DIR = str(Path(__file__).resolve().parent.parent)
SCRIPTS_DIR = str(Path(__file__).resolve().parent.parent / 'scripts')
for p in (SCRIPTS_DIR, ROOT_DIR):
    if p not in sys.path:
        sys.path.insert(0, p)
