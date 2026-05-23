#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Paste buffer(줄번호 형식) → 2018.md / 2018해설.md 및 data/source 복사."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CHUNKS = ROOT / "data" / "source" / "chunks_2018"


def denumber(text: str) -> str:
    lines: list[str] = []
    for raw in text.splitlines():
        m = re.match(r"^\s*\d+\|(.*)$", raw)
        lines.append(m.group(1) if m else raw.rstrip("\r"))
    body = "\n".join(lines)
    if body and not body.endswith("\n"):
        body += "\n"
    return body


def write_pair(name: str, text: str) -> None:
    if len(text) < 500:
        raise SystemExit(f"ERROR: {name} too short ({len(text)} chars)")
    paths = {
        "exam": [ROOT / "2018.md", ROOT / "data" / "source" / "2018-exam.md"],
        "explain": [ROOT / "2018해설.md", ROOT / "data" / "source" / "2018-explain.md"],
    }
    for p in paths[name]:
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(text, encoding="utf-8")
        print(f"Wrote {len(text)} chars -> {p}")


def main() -> None:
    exam_parts: list[str] = []
    for p in sorted(CHUNKS.glob("exam_*.txt")):
        exam_parts.append(denumber(p.read_text(encoding="utf-8")))
    explain_parts = sorted(CHUNKS.glob("explain_part*.txt"))
    if not exam_parts and (ROOT / "2018.md").stat().st_size > 500:
        exam = (ROOT / "2018.md").read_text(encoding="utf-8")
        write_pair("exam", exam)
    elif exam_parts:
        write_pair("exam", "".join(exam_parts))
    else:
        raise SystemExit("ERROR: need 2018.md on disk or exam_*.txt chunks")

    if explain_parts:
        explain = "\n".join(
            p.read_text(encoding="utf-8").rstrip("\n") for p in explain_parts
        )
        if not explain.endswith("\n"):
            explain += "\n"
        write_pair("explain", explain)
    elif (ROOT / "2018해설.md").stat().st_size > 500:
        write_pair("explain", (ROOT / "2018해설.md").read_text(encoding="utf-8"))
    else:
        raise SystemExit("ERROR: need explain_part*.txt or 2018해설.md")


if __name__ == "__main__":
    main()
