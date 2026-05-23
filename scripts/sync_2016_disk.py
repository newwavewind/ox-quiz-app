#!/usr/bin/env python3
"""에디터 버퍼(줄 번호 없는 원문)를 new2016.md / data/source/2016-exam.md 로 복사."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "source" / "2016-exam-pristine.md"
# pristine은 일부만 있을 수 있음 → 우선 new2016.md 가 문항번호 없으면 pristine 으로 복구 시도

def main():
    pristine = SRC
    target = ROOT / "new2016.md"
    if pristine.exists() and pristine.stat().st_size > 1000:
        text = pristine.read_text(encoding="utf-8")
        if text.lstrip().startswith("41."):
            for p in [target, ROOT / "data" / "source" / "2016-exam.md"]:
                p.write_text(text, encoding="utf-8")
                print(f"synced {p}")
            return 0
    print("skip sync (no pristine with 41.)")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
