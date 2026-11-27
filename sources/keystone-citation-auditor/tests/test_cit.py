import importlib.util
from pathlib import Path
import pytest


def load_cit_module():
    script_path = Path(__file__).resolve().parent.parent / "keystone-cit.py"
    spec = importlib.util.spec_from_file_location("keystone_cit", script_path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_audit_detects_orphans_and_deadwood(tmp_path: Path):
    cit = load_cit_module()
    ledger = tmp_path / "CITATIONS.md"
    ledger.write_text("[CIT-1] OK\n[CIT-2] DEAD\n", encoding="utf-8")

    doc = tmp_path / "doc.md"
    doc.write_text("Check [CIT-1] and orphan [CIT-3]\n", encoding="utf-8")

    all_found, _ = cit.scan_repo_citations(tmp_path)
    ledger_ids = cit.get_ledger_ids(tmp_path)

    assert "CIT-3" in (all_found - ledger_ids)
    assert "CIT-2" in (ledger_ids - all_found)


def test_run_audit_exit_codes(tmp_path: Path, capsys):
    cit = load_cit_module()

    class Args:
        def __init__(self, p: Path, seed: bool = False, style: str = "bracket"):
            self.path = p
            self.seed = seed
            self.style = style

    with pytest.raises(SystemExit) as exc_missing:
        cit.run_audit(Args(tmp_path))
    assert exc_missing.value.code == 1
    assert "not found" in capsys.readouterr().out

    (tmp_path / "CITATIONS.md").write_text("- [CIT-10] Ref\n", encoding="utf-8")
    (tmp_path / "ok.md").write_text("Uses [CIT-10]\n", encoding="utf-8")
    with pytest.raises(SystemExit) as exc_ok:
        cit.run_audit(Args(tmp_path))
    assert exc_ok.value.code == 0
    assert "synchronized" in capsys.readouterr().out

    (tmp_path / "orphan.md").write_text("Uses [CIT-99]\n", encoding="utf-8")
    with pytest.raises(SystemExit) as exc_orphan:
        cit.run_audit(Args(tmp_path))
    assert exc_orphan.value.code == 1
    out = capsys.readouterr().out
    assert "CIT-99" in out
    assert "orphan.md" in out

    with pytest.raises(SystemExit) as exc_seeded:
        cit.run_audit(Args(tmp_path, seed=True))
    assert exc_seeded.value.code == 0
    seeded_out = capsys.readouterr().out
    assert "Seeded 1 citations" in seeded_out
    assert "synchronized" in seeded_out
    assert "CIT-99" in (tmp_path / "CITATIONS.md").read_text(encoding="utf-8")


def test_run_discover_output(tmp_path: Path, capsys):
    cit = load_cit_module()

    class Args:
        def __init__(self, p: Path, style: str = "bracket"):
            self.path = p
            self.style = style

    cit.run_discover(Args(tmp_path))
    assert "No citations found." in capsys.readouterr().out

    (tmp_path / "a.md").write_text("[CIT-20] and [CIT-5]\n", encoding="utf-8")
    cit.run_discover(Args(tmp_path))
    lines = capsys.readouterr().out.strip().splitlines()
    assert lines == ["CIT-20", "CIT-5"]


def test_seed_generates_ledger(tmp_path: Path):
    cit = load_cit_module()
    doc = tmp_path / "doc.md"
    doc.write_text("Use [CIT-100] and [CIT-200]\n", encoding="utf-8")

    class Args:
        path = tmp_path
        style = "bracket"

    cit.run_seed(Args())

    ledger = tmp_path / "CITATIONS.md"
    content = ledger.read_text(encoding="utf-8")
    assert "CIT-100" in content
    assert "CIT-200" in content


def test_placeholders_and_fenced_blocks_ignored(tmp_path: Path):
    cit = load_cit_module()
    ledger = tmp_path / "CITATIONS.md"
    ledger.write_text("", encoding="utf-8")

    doc = tmp_path / "doc.md"
    doc.write_text(
        "[VERIFY] this [Date] and [Amount]\n```\nExample [CIT-777]\n```\n",
        encoding="utf-8",
    )

    all_found, _ = cit.scan_repo_citations(tmp_path)
    assert len(all_found) == 0


def test_citation_styles_paren_bare_and_all(tmp_path: Path):
    cit = load_cit_module()
    doc = tmp_path / "styles.md"
    doc.write_text(
        "Bracket [CIT-1], paren (CIT-2), bare CIT-3, prefixed X-CIT-4.\n",
        encoding="utf-8",
    )

    bracket_found, _ = cit.scan_repo_citations(tmp_path, style="bracket")
    assert bracket_found == {"CIT-1"}

    paren_found, _ = cit.scan_repo_citations(tmp_path, style="paren")
    assert paren_found == {"CIT-2"}

    bare_found, _ = cit.scan_repo_citations(tmp_path, style="bare")
    assert bare_found == {"CIT-3"}

    all_found, _ = cit.scan_repo_citations(tmp_path, style="all")
    assert all_found == {"CIT-1", "CIT-2", "CIT-3"}
