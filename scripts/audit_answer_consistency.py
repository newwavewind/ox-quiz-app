#!/usr/bin/env python3
"""시험지 JSON correct_choice ↔ 해설 md 정답 일치 여부 점검."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

from build_exam_questions import md_path, parse_explain_blocks  # noqa: E402

EXAM_DIR = ROOT / "src" / "data" / "exam"
YEARS = list(range(2016, 2026))


def load_exam_json(year: int) -> list[dict]:
    path = EXAM_DIR / f"{year}.json"
    if not path.exists():
        return []
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    print("=== 연도별 exam JSON vs 해설 md 정답 번호 대조 ===\n")
    any_fail = False

    for year in YEARS:
        exams = load_exam_json(year)
        expl_path = md_path(f"{year}-explain.md")
        if not exams:
            print(f"[{year}] exam JSON 없음 - 스킵")
            continue
        if not expl_path.exists():
            print(f"[{year}] 해설 md 없음 - 스킵")
            any_fail = True
            continue

        try:
            explains = parse_explain_blocks(expl_path.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"[{year}] 해설 파싱 실패: {e}")
            any_fail = True
            continue

        mismatches = []
        missing_expl = []
        for ex in exams:
            qno = ex["question_no"]
            json_cc = ex.get("correct_choice")
            expl_cc = explains.get(qno, {}).get("correct_choice")
            if expl_cc is None:
                missing_expl.append(qno)
                continue
            if json_cc != expl_cc:
                mismatches.append((qno, json_cc, expl_cc))

        status = "OK" if not mismatches and not missing_expl else "주의"
        if mismatches or missing_expl:
            any_fail = True
        print(f"[{year}] {status} - 문항 {len(exams)}개")
        if mismatches:
            for qno, j, e in mismatches[:8]:
                print(f"    Q{qno}: JSON={j} vs 해설md={e}")
            if len(mismatches) > 8:
                print(f"    ... 외 {len(mismatches) - 8}건")
        if missing_expl:
            print(f"    해설md 정답 없음: {missing_expl[:10]}{'...' if len(missing_expl) > 10 else ''}")

    print("\n=== 2025 전용: generate 스크립트 ANSWER_KEY vs exam JSON ===")
    try:
        from generate_2025_explain import ANSWER_KEY  # noqa: E402
        from _2025_explain_data_part1 import EXPLANATIONS as P1  # noqa: E402
        from _2025_explain_data_part2 import EXPLANATIONS_PART2 as P2  # noqa: E402
        from _2025_explain_data_part3 import EXPLANATIONS_PART3 as P3  # noqa: E402

        embedded = {no: ans for no, ans, _ in [*P1, *P2, *P3]}
        exams_2025 = load_exam_json(2025)
        by_q = {e["question_no"]: e.get("correct_choice") for e in exams_2025}

        for no in range(41, 81):
            key = ANSWER_KEY.get(no)
            emb = embedded.get(no)
            js = by_q.get(no)
            circ = {"①": 1, "②": 2, "③": 3, "④": 4, "⑤": 5}.get(key or emb or "", None)
            issues = []
            if emb and key and emb != key:
                issues.append(f"embedded({emb})!=ANSWER_KEY({key})")
            if js is not None and circ is not None and js != circ:
                issues.append(f"examJSON({js})!=key({circ})")
            if issues:
                print(f"  Q{no}: {'; '.join(issues)}")
                any_fail = True
        if not any_fail:
            print("  (2025 ANSWER_KEY / embedded / JSON 일치)")
    except Exception as e:
        print(f"  2025 스크립트 점검 실패: {e}")

    return 1 if any_fail else 0


if __name__ == "__main__":
    raise SystemExit(main())
