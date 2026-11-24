"""Accessibility-first plain-language export.

Renders structured markdown into plain text suitable for screen readers,
fixed reading level, and print packets for people without smartphones -
generated from the same underlying source so no content forks.
"""

from __future__ import annotations

import re

_LINK_RE = re.compile(r"\[([^\]]+)\]\([^)]*\)")
_EMPH_RE = re.compile(r"\*{1,3}([^*]+?)\*{1,3}")
_CODE_RE = re.compile(r"`{1,3}([^`]+?)`{1,3}")
_HEADING_RE = re.compile(r"^#{1,6}\s+", re.MULTILINE)
_WS_RE = re.compile(r"[ \t]+")


def simplify(markdown_text: str) -> str:
    """Strip markdown formatting, keep wording, normalize whitespace."""
    text = _LINK_RE.sub(r"\1", markdown_text)
    text = _CODE_RE.sub(r"\1", text)
    text = _EMPH_RE.sub(r"\1", text)
    text = _HEADING_RE.sub("", text)
    text = "\n".join(line.strip() for line in text.splitlines())
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def render_plain_pdf_placeholder(markdown_text: str, footer_note: str = "") -> str:
    """Produce the fixed-layout plain-text body used by downstream PDF/print exporters."""
    body = simplify(markdown_text)
    lines = ["=" * 64, body, "=" * 64]
    if footer_note:
        lines.append(footer_note)
    return "\n".join(lines)
