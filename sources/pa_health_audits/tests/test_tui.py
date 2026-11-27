"""Unit tests for pa_health_audits.tui using monkeypatched curses and _run_cli."""

from __future__ import annotations

from collections import deque
from pathlib import Path
from typing import Any

import pytest

from pa_health_audits import tui


class FakeScreen:
    """Minimal curses window double with scripted getch() keystrokes."""

    def __init__(self, keys: list[int | str], size: tuple[int, int] = (24, 100)) -> None:
        self._keys: deque[int] = deque(
            ord(k) if isinstance(k, str) else k for k in keys
        )
        self._height, self._width = size
        self.drawn: list[tuple[int, int, str]] = []
        self.erased_count = 0
        self.refreshed_count = 0

    def getmaxyx(self) -> tuple[int, int]:
        return self._height, self._width

    def erase(self) -> None:
        self.erased_count += 1

    def clrtoeol(self) -> None:
        return None

    def move(self, y: int, x: int) -> None:
        return None

    def addnstr(self, y: int, x: int, text: str, n: int, attr: int = 0) -> None:
        self.drawn.append((y, x, text[:n]))

    def refresh(self) -> None:
        self.refreshed_count += 1

    def getch(self) -> int:
        if not self._keys:
            raise AssertionError("FakeScreen.getch() ran out of scripted keys")
        return self._keys.popleft()


def _patch_curses_constants(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(tui.curses, "KEY_ENTER", 343, raising=False)
    monkeypatch.setattr(tui.curses, "KEY_BACKSPACE", 263, raising=False)
    monkeypatch.setattr(tui.curses, "KEY_LEFT", 260, raising=False)
    monkeypatch.setattr(tui.curses, "KEY_RIGHT", 261, raising=False)
    monkeypatch.setattr(tui.curses, "KEY_UP", 259, raising=False)
    monkeypatch.setattr(tui.curses, "KEY_DOWN", 258, raising=False)
    monkeypatch.setattr(tui.curses, "KEY_NPAGE", 338, raising=False)
    monkeypatch.setattr(tui.curses, "KEY_PPAGE", 339, raising=False)
    monkeypatch.setattr(tui.curses, "COLOR_RED", 1, raising=False)
    monkeypatch.setattr(tui.curses, "COLOR_YELLOW", 3, raising=False)
    monkeypatch.setattr(tui.curses, "COLOR_GREEN", 2, raising=False)
    monkeypatch.setattr(tui.curses, "curs_set", lambda _v: None, raising=False)
    monkeypatch.setattr(tui.curses, "start_color", lambda: None, raising=False)
    monkeypatch.setattr(tui.curses, "use_default_colors", lambda: None, raising=False)
    monkeypatch.setattr(tui.curses, "init_pair", lambda *_a: None, raising=False)
    monkeypatch.setattr(tui.curses, "color_pair", lambda n: n, raising=False)


def test_prompt_secret_masks_asterisks_and_supports_editing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _patch_curses_constants(monkeypatch)
    # Type "ab", backspace "b", type "c", press Enter.
    screen = FakeScreen(["a", "b", tui.curses.KEY_BACKSPACE, "c", 10])

    got = tui._prompt(screen, "Salt:", secret=True)
    assert got == "ac"
    rendered_strings = [txt for _, _, txt in screen.drawn]
    assert "*" in rendered_strings
    assert "**" in rendered_strings
    assert all("ab" not in txt and "ac" not in txt for txt in rendered_strings)


def test_rate_summary_uses_default_path_and_optional_out(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    _patch_curses_constants(monkeypatch)
    fake_json = tmp_path / "pa_rate_review_2027.json"
    fake_json.write_text("{}", encoding="utf-8")
    out_file = tmp_path / "summary.txt"

    monkeypatch.setattr(tui, "DEFAULT_RATE_JSON", fake_json)
    recorded: list[tuple[str, list[str]]] = []

    def fake_run_cli(_screen: Any, title: str, argv: list[str]) -> None:
        recorded.append((title, argv))

    monkeypatch.setattr(tui, "_run_cli", fake_run_cli)

    # First prompt accepts default rate JSON via Enter; second prompt types out_file + Enter.
    screen = FakeScreen([10, *list(str(out_file)), 10])
    tui._rate_summary(screen)

    assert recorded == [
        ("Rate summary", ["rate-summary", "--rate-json", str(fake_json), "--out", str(out_file)])
    ]


def test_audit_line_rejects_empty_salt_without_calling_run_cli(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _patch_curses_constants(monkeypatch)
    called: list[Any] = []
    monkeypatch.setattr(
        tui,
        "_run_cli",
        lambda *_a, **_kw: called.append((_a, _kw)),
    )

    # record_id="C1", base_rate="100", billed="150", modifier="1.0", note="hi", empty salt -> Enter
    keys: list[int | str] = [
        "C", "1", 10,
        "1", "0", "0", 10,
        "1", "5", "0", 10,
        "1", ".", "0", 10,
        "h", "i", 10,
        10,  # empty secret salt
        10,  # dismiss "Salt required" screen
    ]
    screen = FakeScreen(keys)
    tui._audit_line(screen)

    assert called == []
    assert any("Salt required" in txt for _, _, txt in screen.drawn)


def test_app_dispatches_menu_and_quits_cleanly(monkeypatch: pytest.MonkeyPatch) -> None:
    _patch_curses_constants(monkeypatch)
    invoked: list[str] = []

    monkeypatch.setattr(tui, "_rate_summary", lambda _s: invoked.append("rate"))
    monkeypatch.setattr(tui, "_audit_line", lambda _s: invoked.append("audit"))

    screen = FakeScreen(["1", "2", "x", 10, "q"])
    tui._app(screen)

    assert invoked == ["rate", "audit"]
    assert any("Choose an option" in txt for _, _, txt in screen.drawn)


def test_audit_line_allows_empty_note_and_calls_run_cli(monkeypatch: pytest.MonkeyPatch) -> None:
    _patch_curses_constants(monkeypatch)
    called: list[list[str]] = []
    monkeypatch.setattr(tui, "_run_cli", lambda _s, _title, argv: called.append(argv))

    keys: list[int | str] = [
        "C", "1", 10,       # record ID
        "1", "0", "0", 10,  # base rate
        "1", "5", "0", 10,  # billed amount
        "1", ".", "0", 10,  # modifier
        10,                 # empty note
        "s", "a", "l", "t", 10,  # salt
        10,                 # skip output path
    ]
    tui._audit_line(FakeScreen(keys))

    assert len(called) == 1
    argv = called[0]
    assert argv[argv.index("--note") + 1] == ""
