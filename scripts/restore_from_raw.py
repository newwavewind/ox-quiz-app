#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""raw PDF 추출본에서 statement 복원 (띄어쓰기 추측 없이)"""

import json
import re
from pathlib import Path

from pdf_text import normalize_whitespace

ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "data" / "pipeline" / "raw"
QDIR = ROOT / "src" / "data" / "questions"


def load_raw_by_key():
    by_key = {}
    for path in RAW_DIR.glob("*.json"):
        year = int(path.stem)
        data = json.loads(path.read_text(encoding="utf-8"))
        for q in data.get("questions", []):
            qno = q["question_no"]
            for cno, text in (q.get("choices") or {}).items():
                key = (year, qno, int(cno))
                by_key[key] = normalize_whitespace(str(text))
    return by_key


def main():
    raw = load_raw_by_key()
    n = 0
    for path in sorted(QDIR.glob("*.json")):
        if path.name == "index.json":
            continue
        items = json.loads(path.read_text(encoding="utf-8"))
        for item in items:
            key = (item.get("year"), item.get("question_no"), int(item.get("choice_no", 0)))
            if key in raw:
                item["statement"] = raw[key]
                n += 1
        path.write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")
        print(path.name, len(items))

    legacy = ROOT / "src" / "data" / "questions.json"
    if legacy.exists():
        items = json.loads(legacy.read_text(encoding="utf-8"))
        for item in items:
            key = (item.get("year"), item.get("question_no"), int(item.get("choice_no", 0)))
            if key in raw:
                item["statement"] = raw[key]
        legacy.write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")
        print("questions.json", len(items))
    print("restored statements:", n)


if __name__ == "__main__":
    main()
