"""Tests for the pa_health_audits CLI entry point."""

from __future__ import annotations

import json
import stat
from pathlib import Path

import pytest

from pa_health_audits.cli import main


def test_cli_rate_summary_writes_atomic_0o600_json(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    repo_root = Path(__file__).resolve().parents[3]
    dataset_path = repo_root / "sources/pa_health_audits/data/py2027/pa_rate_review_2027.json"
    out_file = tmp_path / "artifacts/rate_summary.json"

    rc = main(["rate-summary", "--rate-json", str(dataset_path), "--json", "--out", str(out_file)])
    assert rc == 0

    stdout_data = json.loads(capsys.readouterr().out)
    assert stdout_data["plan_year"] == 2027
    assert stdout_data["individual_approved_pct"] == 15.97

    assert out_file.exists()
    assert stat.S_IMODE(out_file.stat().st_mode) == 0o600
    assert json.loads(out_file.read_text(encoding="utf-8")) == stdout_data


def test_cli_audit_line_scrubs_note_and_writes_output(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    out_file = tmp_path / "artifacts/line_audit.json"
    rc = main(
        [
            "audit-line",
            "--record-id",
            "CLM-900",
            "--base-rate",
            "100.0",
            "--billed-amount",
            "150.0",
            "--modifier",
            "1.0",
            "--note",
            "SSN 123-45-6789 contact member@example.com",
            "--pii-salt",
            "cli-test-salt",
            "--out",
            str(out_file),
        ]
    )
    assert rc == 0

    payload = json.loads(capsys.readouterr().out)
    assert payload["finding"]["tier"] == "CRITICAL_OVERCHARGE"
    assert payload["finding"]["variance_pct"] == 50.0
    assert "123-45-6789" not in payload["note"]
    assert "member@example.com" not in payload["note"]
    assert "[SSN:" in payload["note"]
    assert "[EMAIL:" in payload["note"]

    assert out_file.exists()
    assert stat.S_IMODE(out_file.stat().st_mode) == 0o600
