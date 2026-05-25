#!/usr/bin/env python3
"""공식 최종정답(제36회 1차 민법 41~80)을 exam/questions JSON에 반영."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EXAM_PATH = ROOT / "src" / "data" / "exam" / "2025.json"
QUESTIONS_PATH = ROOT / "src" / "data" / "questions" / "2025.json"
ANSWER_KEYS_PATH = ROOT / "data" / "pipeline" / "answer_keys" / "2025.json"
EXPLAIN_MD = ROOT / "data" / "source" / "2025-explain.md"
EXPLAIN_MD_ROOT = ROOT / "2025해설.md"

# 2025년 제36회 공인중개사 최종정답 PDF — 1차 1교시 민법및민사특별법 41~80
OFFICIAL: dict[int, int] = {
    41: 2,
    42: 3,
    43: 1,
    44: 5,
    45: 3,
    46: 1,
    47: 2,
    48: 3,
    49: 4,
    50: 3,
    51: 4,
    52: 2,
    53: 1,
    54: 5,
    55: 4,
    56: 4,
    57: 3,
    58: 1,
    59: 2,
    60: 5,
    61: 4,
    62: 4,
    63: 2,
    64: 5,
    65: 1,
    66: 3,
    67: 5,
    68: 4,
    69: 1,
    70: 4,
    71: 5,
    72: 3,
    73: 2,
    74: 2,
    75: 5,
    76: 2,
    77: 3,
    78: 5,
    79: 1,
    80: 2,
}

MARKERS = ["①", "②", "③", "④", "⑤"]


def ox_for_choice(qtype: str, choice_no: int, correct_choice: int) -> str:
    if choice_no == correct_choice:
        return "X" if qtype == "wrong" else "O"
    return "O" if qtype == "wrong" else "X"


def jamos_from_combo_text(text: str) -> set[str]:
    return set(re.findall(r"[ㄱ-ㅎ]", text))


def patch_exam(ex: dict, correct: int) -> list[str]:
    changes: list[str] = []
    qno = ex["question_no"]
    old = ex.get("correct_choice")
    if old != correct:
        changes.append(f"Q{qno} correct_choice {old}->{correct}")

    ex["correct_choice"] = correct
    ex["explanation_summary"] = f"정답은 {MARKERS[correct - 1]}입니다."

    qtype = ex["question_type"]

    if qtype == "composite" and ex.get("combo_choices"):
        for cc in ex["combo_choices"]:
            cc["is_correct"] = cc["no"] == correct
        combo_text = next(
            (c["text"] for c in ex["combo_choices"] if c["no"] == correct),
            "",
        )
        correct_jamos = jamos_from_combo_text(combo_text)
        for item in ex["items"]:
            key = item["key"]
            if re.match(r"^[ㄱ-ㅎ]$", key):
                new_ox = "O" if key in correct_jamos else "X"
                if item.get("answer") != new_ox:
                    changes.append(f"Q{qno} {key} {item.get('answer')}->{new_ox}")
                item["answer"] = new_ox
    else:
        for item in ex["items"]:
            key = item["key"]
            if not key.isdigit():
                continue
            no = int(key)
            new_ox = ox_for_choice(qtype, no, correct)
            if item.get("answer") != new_ox:
                changes.append(f"Q{qno} item{no} {item.get('answer')}->{new_ox}")
            item["answer"] = new_ox

    return changes


def patch_questions(questions: list, exams_by_q: dict[int, dict]) -> list[str]:
    changes: list[str] = []
    for q in questions:
        qno = q["question_no"]
        ex = exams_by_q.get(qno)
        if not ex:
            continue
        correct = ex["correct_choice"]
        choice_no = int(q["choice_no"]) if str(q.get("choice_no", "")).isdigit() else None
        marker = f"정답은 {MARKERS[correct - 1]}입니다."

        if q.get("explanation", "").startswith("정답은 "):
            if not q["explanation"].startswith(marker):
                q["explanation"] = re.sub(
                    r"^정답은 [①②③④⑤]입니다\.\s*",
                    f"{marker} ",
                    q["explanation"],
                )

        if choice_no is not None:
            item = next(
                (it for it in ex["items"] if it["key"] == str(choice_no)),
                None,
            )
            if item and q.get("answer") != item["answer"]:
                changes.append(
                    f"Q{qno}-{choice_no} {q.get('answer')}->{item['answer']}"
                )
                q["answer"] = item["answer"]
    return changes


def patch_explain_md(text: str) -> tuple[str, int]:
    n = 0

    def repl(m: re.Match) -> str:
        nonlocal n
        qno = int(m.group(1))
        correct = OFFICIAL.get(qno)
        if correct is None:
            return m.group(0)
        n += 1
        return f"{qno}. 정답: {MARKERS[correct - 1]}"

    new_text = re.sub(
        r"^(\d{2})\. 정답: [①②③④⑤\d]+",
        repl,
        text,
        flags=re.MULTILINE,
    )
    return new_text, n


def main() -> None:
    exams = json.loads(EXAM_PATH.read_text(encoding="utf-8"))
    all_changes: list[str] = []

    for ex in exams:
        qno = ex["question_no"]
        if qno not in OFFICIAL:
            continue
        all_changes.extend(patch_exam(ex, OFFICIAL[qno]))

    EXAM_PATH.write_text(
        json.dumps(exams, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    exams_by_q = {ex["question_no"]: ex for ex in exams}
    questions = json.loads(QUESTIONS_PATH.read_text(encoding="utf-8"))
    all_changes.extend(patch_questions(questions, exams_by_q))
    QUESTIONS_PATH.write_text(
        json.dumps(questions, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    ANSWER_KEYS_PATH.parent.mkdir(parents=True, exist_ok=True)
    key_obj = {
        str(q): {"correct_choice": c, "source": "제36회 최종정답 PDF"}
        for q, c in OFFICIAL.items()
    }
    ANSWER_KEYS_PATH.write_text(
        json.dumps(key_obj, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    if EXPLAIN_MD.exists():
        md, n = patch_explain_md(EXPLAIN_MD.read_text(encoding="utf-8"))
        EXPLAIN_MD.write_text(md, encoding="utf-8")
        EXPLAIN_MD_ROOT.write_text(md, encoding="utf-8")
        print(f"Updated {n} answer lines in 2025-explain.md and 2025해설.md")

    print(f"Applied official answers to {len(OFFICIAL)} questions")
    print(f"Field updates: {len(all_changes)}")
    for line in all_changes[:30]:
        print(f"  {line}")
    if len(all_changes) > 30:
        print(f"  ... and {len(all_changes) - 30} more")


if __name__ == "__main__":
    main()
