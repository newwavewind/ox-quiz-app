#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""2019.md ↔ 2019해설.md 문항 번호·주제 대칭 검증."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

from build_exam_questions import EXPLAIN_HEAD, md_path, parse_explain_blocks  # noqa: E402
from import_md_year import parse_md_questions  # noqa: E402

# 번호별 시험지 stem 키워드 ↔ 해설 블록 키워드 (대칭 확인용)
TOPIC_CHECKS: dict[int, tuple[str, str]] = {
    44: ("해제", "내용증명"),
    45: ("대리권", "한정후견"),
    46: ("복대리", "복대리"),
    47: ("대리권없", "무권대리"),
    48: ("임의대리", "각자대리"),
    49: ("법정추인", "법정추인"),
    50: ("토지거래허가", "토지거래허가"),
    51: ("물권적 청구권", "물권적 청구권"),
    80: ("명의신탁", "명의신탁"),
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
    exam_text = md_path("2019-exam.md").read_text(encoding="utf-8")
    expl_text = md_path("2019-explain.md").read_text(encoding="utf-8")

    if not EXPLAIN_HEAD.search(expl_text):
        print("FAIL: 2019해설.md가 'N. 정답:' 형식이 아닙니다. 저장(Ctrl+S) 후 다시 실행하세요.")
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

    mismatches: list[str] = []
    for qno, (exam_kw, expl_kw) in TOPIC_CHECKS.items():
        q = next(x for x in questions if x["question_no"] == qno)
        stem = norm(q["stem"])
        etxt = norm(explain_text(explains, qno))
        if norm(exam_kw) not in stem:
            mismatches.append(f"Q{qno} 시험지에 '{exam_kw}' 없음")
        if norm(expl_kw) not in etxt:
            mismatches.append(f"Q{qno} 해설에 '{expl_kw}' 없음 (무효·취소 등 다른 문항 해설 가능)")

    if mismatches:
        print("FAIL: 주제 대칭 불일치")
        for m in mismatches:
            print(" ", m)
        ok = False
    else:
        print("OK: 샘플 문항(44~51, 80) 주제 대칭 확인")

    for qno in (44, 45, 80):
        q = next(x for x in questions if x["question_no"] == qno)
        e = explains[qno]
        print(
            f"Q{qno}: 정답 {e.get('correct_choice')} | "
            f"시험지 …{norm(q['stem'])[:28]}…"
        )

    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
