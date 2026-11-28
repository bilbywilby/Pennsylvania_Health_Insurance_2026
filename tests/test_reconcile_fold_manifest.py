"""Black-box tests for reconcile_fold_manifest.py, run on a throwaway copy of the repo."""
import hashlib
import os
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parent.parent
LABELS = ["Duplicate manifest keys", "Excluded paths in manifest", "Missing on disk",
          "SHA-256 mismatches", "New untracked disk files", "Content-duplicate groups"]


def run(cmd, cwd, **kw):
    return subprocess.run(cmd, cwd=cwd, text=True, capture_output=True, **kw)


def reconcile(work, *flags):
    return run([sys.executable, "reconcile_fold_manifest.py", "--repo", str(work), *flags], work)


def count(report, label):
    for line in report.splitlines():
        if line.startswith(label + ":"):
            return int(line.split(":", 1)[1].split()[0])
    raise AssertionError("label %r not in report:\n%s" % (label, report))


def paths_in(manifest):
    files = manifest["files"]
    if isinstance(files, dict):
        return set(files)
    out = set()
    for e in files:
        out.add(e if isinstance(e, str) else next(e[k] for k in ("path", "file", "name") if k in e))
    return out


@pytest.fixture(scope="module")
def work(tmp_path_factory):
    import json
    dst = tmp_path_factory.mktemp("repo")
    manifest = json.loads((REPO / "FOLD_MANIFEST.json").read_text(encoding="utf-8"))
    files_obj = manifest["files"]
    wanted = set(files_obj.keys()) if isinstance(files_obj, dict) else {
        (e if isinstance(e, str) else next(e[k] for k in ("path", "file", "name") if k in e))
        for e in files_obj
    }
    wanted.update({
        "FOLD_MANIFEST.json",
        "FOLD_MANIFEST.sha256",
        "reconcile_fold_manifest.py",
        "scripts/check_fold_manifest.sh",
        "CONTRIBUTING.md",
        ".gitignore",
    })
    for rel_str in sorted(wanted):
        src_file = REPO / rel_str
        if src_file.is_file():
            target = dst / rel_str
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src_file, target)
    subprocess.check_call(["git", "init", "-q"], cwd=dst)
    subprocess.check_call(["git", "add", "-A"], cwd=dst)
    subprocess.check_call(["git", "-c", "user.name=t", "-c", "user.email=t@t",
                           "-c", "commit.gpgsign=false", "commit", "-qm", "base"], cwd=dst)
    return dst


def test_baseline_is_clean(work):
    r = reconcile(work)
    assert r.returncode == 0, r.stdout + r.stderr
    for label in LABELS:
        assert count(r.stdout, label) == 0, r.stdout


def test_dotfiles_keep_their_leading_dot(work):
    m = __import__("json").loads((work / "FOLD_MANIFEST.json").read_text(encoding="utf-8"))
    p = paths_in(m)
    assert ".gitignore" in p
    assert any(x.startswith(".github/workflows/") for x in p)
    assert not any(x.startswith(("github/", "gitignore", "gitattributes")) for x in p)


def test_write_is_idempotent(work):
    mp, sp = work / "FOLD_MANIFEST.json", work / "FOLD_MANIFEST.sha256"
    before = (mp.read_bytes(), sp.read_bytes())
    for _ in range(2):
        r = reconcile(work, "--write", "--refresh-sidecar")
        assert r.returncode == 0, r.stdout + r.stderr
        assert (mp.read_bytes(), sp.read_bytes()) == before


def test_real_edit_updates_manifest_and_sidecar(work):
    mp, sp = work / "FOLD_MANIFEST.json", work / "FOLD_MANIFEST.sha256"
    old = mp.read_bytes()
    with open(work / "CONTRIBUTING.md", "a", encoding="utf-8") as fh:
        fh.write("\n# edit\n")
    assert count(reconcile(work).stdout, "SHA-256 mismatches") == 1
    assert reconcile(work, "--write", "--refresh-sidecar").returncode == 0
    assert mp.read_bytes() != old
    assert sp.read_text() == hashlib.sha256(mp.read_bytes()).hexdigest() + "  FOLD_MANIFEST.json\n"
    assert os.stat(sp).st_mode & 0o777 == 0o600
    r = reconcile(work)
    assert all(count(r.stdout, label) == 0 for label in LABELS), r.stdout


def test_gate_passes_clean_and_fails_on_drift(work):
    gate = work / "scripts" / "check_fold_manifest.sh"
    # Re-sync manifest/sidecar to current work state before asserting clean gate
    sync = reconcile(work, "--write", "--refresh-sidecar")
    assert sync.returncode == 0, sync.stdout + sync.stderr
    ok = run(["bash", str(gate)], work, env={**os.environ, "FOLD_REPO": str(work)})
    assert ok.returncode == 0, ok.stdout + ok.stderr

    manifest_path = work / "FOLD_MANIFEST.json"
    sidecar_path = work / "FOLD_MANIFEST.sha256"
    orig_manifest = manifest_path.read_bytes()
    orig_sidecar = sidecar_path.read_bytes()
    try:
        manifest_path.write_bytes(orig_manifest + b" ")
        bad = run(["bash", str(gate)], work, env={**os.environ, "FOLD_REPO": str(work)})
    finally:
        manifest_path.write_bytes(orig_manifest)
        sidecar_path.write_bytes(orig_sidecar)
        reconcile(work, "--write", "--refresh-sidecar")
    assert bad.returncode != 0, f"expected non-zero exit; stdout={bad.stdout!r} stderr={bad.stderr!r}"