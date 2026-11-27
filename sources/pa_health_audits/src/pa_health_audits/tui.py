from __future__ import annotations

import curses
import io
import json
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path

from .cli import main as cli_main


DEFAULT_RATE_JSON = (
    Path(__file__).resolve().parents[2]
    / "data"
    / "py2027"
    / "pa_rate_review_2027.json"
)


def _prompt(
    screen: curses.window,
    label: str,
    *,
    default: str = "",
    secret: bool = False,
) -> str:
    """Read one editable line. Secret input is displayed as asterisks."""
    height, width = screen.getmaxyx()
    y = min(height - 3, 3)

    screen.erase()
    screen.addnstr(0, 0, label, max(1, width - 1))
    if default:
        screen.addnstr(1, 0, f"Default: {default}", max(1, width - 1))
    screen.addnstr(y, 0, "> ", max(1, width - 1))
    screen.refresh()

    value = list(default)
    cursor = len(value)

    while True:
        shown = "*" * len(value) if secret else "".join(value)
        screen.move(y, 2)
        screen.clrtoeol()
        screen.addnstr(y, 2, shown, max(1, width - 3))
        screen.move(y, min(width - 1, 2 + cursor))
        screen.refresh()

        key = screen.getch()
        if key in (curses.KEY_ENTER, 10, 13):
            break
        if key == 27:  # Escape cancels this prompt.
            return ""
        if key in (curses.KEY_BACKSPACE, 8, 127):
            if cursor:
                cursor -= 1
                value.pop(cursor)
            continue
        if key == curses.KEY_LEFT:
            cursor = max(0, cursor - 1)
            continue
        if key == curses.KEY_RIGHT:
            cursor = min(len(value), cursor + 1)
            continue
        if 32 <= key <= 126:
            value.insert(cursor, chr(key))
            cursor += 1

    result = "".join(value)
    return result if result else default


def _show_text(screen: curses.window, title: str, text: str) -> None:
    """Display output with basic color-based variance triage."""
    lines = text.splitlines() or ["(No output returned.)"]
    height, width = screen.getmaxyx()
    page_size = max(1, height - 3)
    start = 0

    try:
        curses.start_color()
        curses.use_default_colors()
        curses.init_pair(1, curses.COLOR_RED, -1)
        curses.init_pair(2, curses.COLOR_YELLOW, -1)
        curses.init_pair(3, curses.COLOR_GREEN, -1)
    except curses.error:
        pass

    while True:
        screen.erase()
        screen.addnstr(0, 0, title, max(1, width - 1))
        page = lines[start : start + page_size]

        for row, line in enumerate(page, start=1):
            color = 0
            if "CRITICAL_OVERCHARGE" in line:
                color = 1
            elif "POTENTIAL_AUDIT" in line:
                color = 2
            elif "PASS" in line:
                color = 3
            try:
                screen.addnstr(row, 0, line, max(1, width - 1), curses.color_pair(color))
            except curses.error:
                pass

        footer = "↑/↓ scroll  |  q or Enter: back"
        screen.addnstr(height - 1, 0, footer, max(1, width - 1))
        screen.refresh()

        key = screen.getch()
        if key in (ord("q"), ord("Q"), 10, 13, 27):
            return
        if key == curses.KEY_DOWN:
            start = min(max(0, len(lines) - page_size), start + 1)
        elif key == curses.KEY_UP:
            start = max(0, start - 1)
        elif key == curses.KEY_NPAGE:
            start = min(max(0, len(lines) - page_size), start + page_size)
        elif key == curses.KEY_PPAGE:
            start = max(0, start - page_size)


def _run_cli(screen: curses.window, title: str, argv: list[str]) -> None:
    stdout = io.StringIO()
    stderr = io.StringIO()

    try:
        with redirect_stdout(stdout), redirect_stderr(stderr):
            rc = cli_main(argv)
        output = stdout.getvalue().strip()
        error = stderr.getvalue().strip()
        if not output:
            output = error or f"Command finished with exit code {rc}."
        elif error:
            output += "\n\n" + error

        # Pretty-print JSON output when possible.
        try:
            output = json.dumps(json.loads(output), indent=2, ensure_ascii=False)
        except (json.JSONDecodeError, TypeError):
            pass

        status = "Completed" if rc == 0 else f"Finished with exit code {rc}"
        _show_text(screen, f"{title} — {status}", output)
    except Exception as exc:
        _show_text(screen, f"{title} — Error", f"{type(exc).__name__}: {exc}")


def _ask_number(screen: curses.window, label: str) -> str:
    while True:
        value = _prompt(screen, label)
        if value == "":
            return ""
        try:
            float(value)
            return value
        except ValueError:
            _show_text(screen, "Invalid input", "Enter a number, or press Enter to cancel.")


def _rate_summary(screen: curses.window) -> None:
    default_path = str(DEFAULT_RATE_JSON) if DEFAULT_RATE_JSON.exists() else ""
    rate_path = _prompt(
        screen,
        "Path to PY2027 Pennsylvania rate-review JSON:",
        default=default_path,
    )
    if not rate_path:
        return

    argv = ["rate-summary", "--rate-json", rate_path]
    output_path = _prompt(screen, "Optional output file path (Enter to skip):")
    if output_path:
        argv.extend(["--out", output_path])

    _run_cli(screen, "Rate summary", argv)


def _audit_line(screen: curses.window) -> None:
    record_id = _prompt(screen, "Claim record ID:")
    if not record_id:
        return

    base_rate = _ask_number(screen, "Base rate:")
    if not base_rate:
        return

    billed_amount = _ask_number(screen, "Billed amount:")
    if not billed_amount:
        return

    modifier = _ask_number(screen, "Modifier (for example, 1.0):")
    if not modifier:
        return

    note = _prompt(screen, "Note to scrub (avoid entering unnecessary identifiers):")

    salt = _prompt(screen, "PII HMAC salt (input is hidden):", secret=True)
    if not salt:
        _show_text(screen, "Salt required", "No audit was run because no salt was provided.")
        return

    argv = [
        "audit-line",
        "--record-id", record_id,
        "--base-rate", base_rate,
        "--billed-amount", billed_amount,
        "--modifier", modifier,
        "--note", note,
        "--pii-salt", salt,
    ]

    output_path = _prompt(screen, "Optional output file path (Enter to skip):")
    if output_path:
        argv.extend(["--out", output_path])

    _run_cli(screen, "Claim-line audit", argv)


def _menu(screen: curses.window) -> str:
    height, width = screen.getmaxyx()
    screen.erase()
    rows = [
        "PA Health Audits — Forensic Review",
        "",
        "1. PY2027 rate summary",
        "2. Audit a claim line",
        "q. Quit",
        "",
        "Select an option:",
    ]
    for row, text in enumerate(rows[: height - 1]):
        screen.addnstr(row, 0, text, max(1, width - 1))
    screen.refresh()

    key = screen.getch()
    return chr(key).lower() if 0 <= key <= 255 else ""


def _app(screen: curses.window) -> None:
    curses.curs_set(1)
    while True:
        choice = _menu(screen)
        if choice == "1":
            _rate_summary(screen)
        elif choice == "2":
            _audit_line(screen)
        elif choice == "q":
            return
        else:
            _show_text(screen, "Choose an option", "Press 1, 2, or q.")


def run() -> None:
    """Console-script entry point."""
    curses.wrapper(_app)


if __name__ == "__main__":
    run()
