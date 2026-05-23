#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""chunks → 루트 MD 병합."""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def flush(year: int, kind: str) -> None:
    ch = ROOT / "data" / "source" / f"chunks_{year}"
    parts = sorted(ch.glob(f"{kind}_part*.txt"))
    if not parts:
        raise SystemExit(f"no chunks: {ch}/{kind}_part*.txt")
    text = "\n".join(p.read_text(encoding="utf-8").rstrip("\n") for p in parts)
    if not text.endswith("\n"):
        text += "\n"
    name = f"{year}.md" if kind == "exam" else f"{year}해설.md"
    dest = ROOT / name
    dest.write_text(text, encoding="utf-8")
    print(f"Wrote {name} ({len(text)} chars)")


if __name__ == "__main__":
    y = int(sys.argv[1]) if len(sys.argv) > 1 else 2020
    k = sys.argv[2] if len(sys.argv) > 2 else "explain"
    flush(y, k)
