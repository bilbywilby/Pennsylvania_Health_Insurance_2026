import os
import shutil
from pathlib import Path
import pytest


def _purge_stale_pytest_dirs(base: Path, keep_prefix: str = "pytest_run") -> None:
    if not base.is_dir():
        return
    for entry in base.iterdir():
        if entry.name.startswith("pytest-") and entry.is_dir():
            shutil.rmtree(entry, ignore_errors=True)
        elif entry.name == keep_prefix and entry.is_dir():
            shutil.rmtree(entry, ignore_errors=True)


@pytest.fixture(scope="session", autouse=True)
def _clean_termux_pytest_tmp(tmp_path_factory):
    tmpdir = Path(os.environ.get("TMPDIR") or "/data/data/com.termux/files/usr/tmp")
    _purge_stale_pytest_dirs(tmpdir)
    yield
    _purge_stale_pytest_dirs(tmpdir)
