#!/usr/bin/env python3
"""data/source/_explain_chunks/*.txt → 2016-explain.md, 2016해설.md"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CHUNK_DIR = ROOT / "data" / "source" / "_explain_chunks"
OUT = ROOT / "data" / "source" / "2016-explain.md"


def main():
    parts = sorted(CHUNK_DIR.glob("part*.txt"))
    if not parts:
        print("No chunks in", CHUNK_DIR)
        return 1
    text = "\n".join(p.read_text(encoding="utf-8").rstrip("\n") for p in parts) + "\n"
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(text, encoding="utf-8")
    (ROOT / "2016해설.md").write_text(text, encoding="utf-8")
    print(f"Merged {len(parts)} chunks -> {OUT} ({len(text)} chars)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
