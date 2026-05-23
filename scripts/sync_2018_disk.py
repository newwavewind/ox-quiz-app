#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""2018.md / 2018해설.md → data/source 복사 (에디터 저장본)."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "data" / "source"


def sync(name: str, src_name: str, dest_name: str) -> bool:
    src = ROOT / src_name
    if not src.exists() or src.stat().st_size < 500:
        return False
    text = src.read_text(encoding="utf-8")
    for p in (src, SOURCE / dest_name):
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(text, encoding="utf-8")
    print(f"Synced {len(text)} chars: {src_name} -> {dest_name}")
    return True


def main() -> int:
    ok_exam = sync("exam", "2018.md", "2018-exam.md")
    ok_expl = sync("explain", "2018해설.md", "2018-explain.md")
    if not ok_exam:
        print("WARN: 2018.md 비어 있음 — 에디터에서 Ctrl+S 저장 후 다시 실행")
    if not ok_expl:
        # explain_part chunks
        chunks = sorted((SOURCE / "chunks_2018").glob("explain_part*.txt"))
        if chunks:
            text = "\n".join(
                p.read_text(encoding="utf-8").rstrip("\n") for p in chunks
            )
            if not text.endswith("\n"):
                text += "\n"
            for p in (ROOT / "2018해설.md", SOURCE / "2018-explain.md"):
                p.write_text(text, encoding="utf-8")
            print(f"Merged {len(chunks)} explain chunks ({len(text)} chars)")
            ok_expl = True
    return 0 if ok_exam and ok_expl else 1


if __name__ == "__main__":
    raise SystemExit(main())
