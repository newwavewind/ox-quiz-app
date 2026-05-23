#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""data/source/buffers_2019/*.txt → 2019.md, 2019해설.md 병합."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BUF = ROOT / "data" / "source" / "buffers_2019"


def merge(name: str, dest: Path) -> int:
    parts = sorted(BUF.glob(f"{name}_part*.txt"))
    if not parts:
        return 0
    text = "".join(p.read_text(encoding="utf-8") for p in parts)
    if not text.endswith("\n"):
        text += "\n"
    dest.write_text(text, encoding="utf-8")
    (ROOT / "data" / "source" / f"2019-{name}.md").write_text(text, encoding="utf-8")
    print(f"Wrote {len(text)} chars -> {dest.name}")
    return len(text)


def main() -> None:
    BUF.mkdir(parents=True, exist_ok=True)
    n1 = merge("exam", ROOT / "2019.md")
    n2 = merge("explain", ROOT / "2019해설.md")
    if n1 < 500 or n2 < 500:
        raise SystemExit("ERROR: buffer parts missing — run chunk writes first")
    print("OK")


if __name__ == "__main__":
    main()
