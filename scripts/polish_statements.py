#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""앱 JSON 보기 문장·해설 띄어쓰기 보정 (PDF 추출 + 민법 용어 사전)"""

import json
from pathlib import Path

from pdf_text import polish_explanation, polish_statement

ROOT = Path(__file__).resolve().parent.parent
QDIR = ROOT / "src" / "data" / "questions"


def _needs_repolish(s: str) -> bool:
    if not s:
        return False
    if "의 사" in s or "이 행" in s or "이 유" in s:
        return True
    return s.count(" ") < max(3, len(s) / 20)


def polish_file(path: Path) -> int:
    data = json.loads(path.read_text(encoding="utf-8"))
    n = 0
    for item in data:
        if isinstance(item.get("statement"), str):
            s = item["statement"]
            if _needs_repolish(s):
                item["statement"] = polish_statement(s)
            n += 1
        if isinstance(item.get("explanation"), str):
            item["explanation"] = polish_explanation(item["explanation"])
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return n


def main():
    total = 0
    for path in sorted(QDIR.glob("*.json")):
        if path.name == "index.json":
            continue
        n = polish_file(path)
        total += n
        print(path.name, n)

    legacy = ROOT / "src" / "data" / "questions.json"
    if legacy.exists():
        n = polish_file(legacy)
        total += n
        print("questions.json", n)
    print("polished:", total)


if __name__ == "__main__":
    main()
