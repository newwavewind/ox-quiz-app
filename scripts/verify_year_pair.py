#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""{year}.md ↔ {year}해설.md 문항 번호·주제 대칭 검증."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

from build_exam_questions import (  # noqa: E402
    EXPLAIN_HEAD,
    EXPLAIN_MD_HEAD,
    md_path,
    parse_explain_blocks,
)
from import_md_year import parse_md_questions  # noqa: E402

# 연도별 샘플 키워드 (없으면 번호 일치만 검사)
TOPIC_CHECKS: dict[int, dict[int, tuple[str, str]]] = {
    2020: {
        44: ("매매계약", "변제"),
        45: ("임의대리", "표현대리"),
        46: ("무권대리", "무권대리"),
        80: ("명의신탁", "명의신탁"),
    },
    2021: {
        43: ("무권대리", "무권대리"),
        44: ("불일치", "통정허위"),
        48: ("표현대리", "표현대리"),
        55: ("공유", "지분"),
        79: ("명의신탁", "명의신탁"),
    },
}


def norm(s: str) -> str:
    return re.sub(r"\s+", "", s)


def explain_text(explains: dict, qno: int) -> str:
    block = explains.get(qno, {})
    parts = [block.get("summary", "")]
    for item in (block.get("items") or {}).values():
        parts.append(item.get("explanation", ""))
    return " ".join(parts)


def main() -> int:
    year = int(sys.argv[1]) if len(sys.argv) > 1 else 2020
    exam_text = md_path(f"{year}-exam.md").read_text(encoding="utf-8")
    expl_text = md_path(f"{year}-explain.md").read_text(encoding="utf-8")

    if not EXPLAIN_HEAD.search(expl_text) and not EXPLAIN_MD_HEAD.search(expl_text):
        print(f"FAIL: {year}해설.md 해설 형식을 인식하지 못했습니다.")
        return 1

    questions = parse_md_questions(exam_text, 41, 80)
    explains = parse_explain_blocks(expl_text)

    exam_nos = {q["question_no"] for q in questions}
    expl_nos = set(explains.keys())

    ok = True
    if exam_nos != expl_nos:
        print("FAIL: 문항 번호 집합 불일치")
        print("  exam only:", sorted(exam_nos - expl_nos))
        print("  explain only:", sorted(expl_nos - exam_nos))
        ok = False
    elif len(exam_nos) != 40:
        print(f"FAIL: 문항 수 {len(exam_nos)} (기대 40)")
        ok = False
    else:
        print(f"OK: 41~80번 {len(exam_nos)}문항 번호 일치")

    checks = TOPIC_CHECKS.get(year, {})
    mismatches: list[str] = []
    for qno, (exam_kw, expl_kw) in checks.items():
        q = next(x for x in questions if x["question_no"] == qno)
        exam_blob = norm(
            q["stem"] + "".join(q.get("choices", {}).values())
            + "".join(q.get("sub_items", {}).values())
        )
        etxt = norm(explain_text(explains, qno))
        if norm(exam_kw) not in exam_blob:
            mismatches.append(f"Q{qno} 시험지에 '{exam_kw}' 없음")
        if norm(expl_kw) not in etxt:
            mismatches.append(f"Q{qno} 해설에 '{expl_kw}' 없음")

    if mismatches:
        print("FAIL: 주제 대칭 불일치")
        for m in mismatches:
            print(" ", m)
        ok = False
    elif checks:
        print("OK: 샘플 문항 주제 대칭 확인")

    for qno in sorted(checks.keys()):
        e = explains[qno]
        print(f"Q{qno}: 정답 {e.get('correct_choice')}")

    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
