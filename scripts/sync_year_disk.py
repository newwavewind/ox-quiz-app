#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""{year}.md / {year}해설.md → data/source 복사."""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "data" / "source"


def sync_year(year: int) -> int:
    exam_src = ROOT / f"{year}.md"
    expl_src = ROOT / f"{year}해설.md"
    ok = True
    if exam_src.exists() and exam_src.stat().st_size > 500:
        text = exam_src.read_text(encoding="utf-8")
        for p in (exam_src, SOURCE / f"{year}-exam.md"):
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(text, encoding="utf-8")
        print(f"Synced exam {len(text)} chars -> {year}-exam.md")
    else:
        print(f"WARN: {year}.md 비어 있음")
        ok = False
    if expl_src.exists() and expl_src.stat().st_size > 500:
        text = expl_src.read_text(encoding="utf-8")
        for p in (expl_src, SOURCE / f"{year}-explain.md"):
            p.write_text(text, encoding="utf-8")
        print(f"Synced explain {len(text)} chars -> {year}-explain.md")
    else:
        chunks = sorted((SOURCE / f"chunks_{year}").glob("explain_part*.txt"))
        if chunks:
            text = "\n".join(
                p.read_text(encoding="utf-8").rstrip("\n") for p in chunks
            )
            if not text.endswith("\n"):
                text += "\n"
            for p in (expl_src, SOURCE / f"{year}-explain.md"):
                p.write_text(text, encoding="utf-8")
            print(f"Merged {len(chunks)} explain chunks ({len(text)} chars)")
        else:
            print(f"WARN: {year}해설.md 비어 있음")
            ok = False
    return 0 if ok else 1


if __name__ == "__main__":
    y = int(sys.argv[1]) if len(sys.argv) > 1 else 2019
    raise SystemExit(sync_year(y))
