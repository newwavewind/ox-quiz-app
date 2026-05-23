#!/usr/bin/env python3
"""2016해설.md(에디터/Read) 내용을 data/source/2016-explain.md 로 저장."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "source" / "2016-explain.md"

# import_md_year 와 동일한 경로 우선순위
def main():
    import glob

    candidates = [
        ROOT / "2016해설.md",
        ROOT / "data" / "source" / "2016-explain.md",
    ]
    for p in ROOT.glob("2016*.md"):
        if p.name != "new2016.md":
            candidates.append(p)

    for p in candidates:
        if p.exists() and p.stat().st_size > 100:
            text = p.read_text(encoding="utf-8")
            OUT.parent.mkdir(parents=True, exist_ok=True)
            OUT.write_text(text, encoding="utf-8")
            (ROOT / "2016해설.md").write_text(text, encoding="utf-8")
            print(f"Saved {len(text)} chars from {p} -> {OUT}")
            return
    print("ERROR: 2016해설.md 가 비어 있습니다. 에디터에서 저장(Ctrl+S) 후 다시 실행하세요.")


if __name__ == "__main__":
    main()
