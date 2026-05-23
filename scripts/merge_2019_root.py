#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""data/source/chunks_2019/* → 루트 2019.md / 2019해설.md"""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CH = ROOT / "data" / "source" / "chunks_2019"


def merge(prefix: str, dest: Path) -> int:
    parts = sorted(CH.glob(f"{prefix}_part*.txt"))
    if not parts:
        raise SystemExit(f"no chunks for {prefix}")
    text = "\n".join(p.read_text(encoding="utf-8").rstrip("\n") for p in parts)
    if not text.endswith("\n"):
        text += "\n"
    dest.write_text(text, encoding="utf-8")
    return len(text)


def main() -> None:
    n1 = merge("exam", ROOT / "2019.md")
    n2 = merge("explain", ROOT / "2019해설.md")
    print(f"Wrote 2019.md ({n1} chars)")
    print(f"Wrote 2019해설.md ({n2} chars)")


if __name__ == "__main__":
    main()
