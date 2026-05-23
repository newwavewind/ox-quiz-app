#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""data/pipeline/raw/{year}.json → {year}.md (교정본 없을 때 임시 시험지)."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SEP = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
MARKERS = "①②③④⑤"
HEADERS = {
    2018: (
        "2018년 제29회 공인중개사 시험 1차 A형",
        "제2과목 : 민법 및 민사특별법 (41번 ~ 80번)",
    ),
}


def wrap_choice(text: str, width: int = 72) -> str:
    text = re.sub(r"\s+", " ", text.strip())
    if len(text) <= width:
        return text
    words = text.split()
    lines: list[str] = []
    cur = ""
    for w in words:
        trial = f"{cur} {w}".strip()
        if len(trial) <= width:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return "\n       ".join(lines) if lines else text


def main() -> None:
    year = int(sys.argv[1]) if len(sys.argv) > 1 else 2018
    raw_path = ROOT / "data" / "pipeline" / "raw" / f"{year}.json"
    data = json.loads(raw_path.read_text(encoding="utf-8"))
    h1, h2 = HEADERS.get(year, (f"{year}년 시험", "제2과목 : 민법 및 민사특별법"))
    out: list[str] = [h1, h2, "", SEP, ""]
    for q in data["questions"]:
        stem = re.sub(r"\s+", " ", q["stem"]).strip()
        out.append(f"{q['question_no']}. {stem}")
        out.append("")
        for i in range(1, 6):
            ch = q["choices"].get(str(i)) or q["choices"].get(i)
            if not ch:
                continue
            body = wrap_choice(ch)
            out.append(f"    {MARKERS[i - 1]} {body}")
        out.append("")
        out.append(SEP)
        out.append("")
    out.append(SEP)
    out.append("                              - 끝 -")
    text = "\n".join(out)
    for p in (ROOT / f"{year}.md", ROOT / "data" / "source" / f"{year}-exam.md"):
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(text, encoding="utf-8")
    print(f"Wrote {len(text)} chars -> {year}.md ({len(data['questions'])} questions)")


if __name__ == "__main__":
    main()
