"""Put the addons/ directory on sys.path so `pa_addons` is importable
regardless of pytest's rootdir resolution."""
import sys
from pathlib import Path

ADDONS_DIR = str(Path(__file__).resolve().parents[1])
if ADDONS_DIR not in sys.path:
    sys.path.insert(0, ADDONS_DIR)
