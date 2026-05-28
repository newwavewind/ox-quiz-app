#!/usr/bin/env python3
"""2025해설.md (【정답】 + [O]/[X] 형식) → exam/questions JSON 반영."""
from __future__ import annotations

import json
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EXPLAIN_MD = ROOT / "2025해설.md"
EXPLAIN_SOURCE = ROOT / "data" / "source" / "2025-explain.md"
EXAM_PATH = ROOT / "src" / "data" / "exam" / "2025.json"
QUESTIONS_PATH = ROOT / "src" / "data" / "questions" / "2025.json"

CHOICE_MARKERS = "①②③④⑤"
JAMO_ORDER = list("ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ")
SEP = re.compile(r"^━+\s*$", re.MULTILINE)
Q_HEAD = re.compile(r"^((?:4[1-9])|(?:5\d)|(?:6\d)|(?:7\d)|(?:80))\.\s+", re.MULTILINE)
ANSWER = re.compile(r"^【정답】\s*(.+)$", re.MULTILINE)
ITEM_CIRCLED = re.compile(r"^([①②③④⑤])\s+\[([^]]+)\]\s*(.*)$")
ITEM_JAMO = re.compile(r"^([ㄱ-ㅎ])\.\s+\[([^]]+)\]\s*(.*)$")
ITEM_CIRCLED_PLAIN = re.compile(r"^([①②③④⑤])\s+([^:\[\n]+?):\s*(.*)$")
SKIP = re.compile(r"^(?:※|【정답】|\d{2}\.|━|-\s*끝\s*-|\(해설)")


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def parse_blocks(text: str) -> dict[int, dict]:
    text = re.sub(r"\(해설 재작성 대기 중\)\s*$", "", text.strip())
    out: dict[int, dict] = {}

    for chunk in SEP.split(text):
        chunk = chunk.strip()
        if not chunk:
            continue
        m = Q_HEAD.search(chunk)
        if not m:
            continue
        qno = int(m.group(1))
        am = ANSWER.search(chunk)
        if not am:
            print(f"WARN Q{qno}: 【정답】 없음", file=sys.stderr)
            continue

        answer_raw = am.group(1).strip()
        mark_m = re.search(r"[①②③④⑤]", answer_raw)
        if not mark_m:
            print(f"WARN Q{qno}: 정답 기호 없음: {answer_raw}", file=sys.stderr)
            continue
        correct_mark = mark_m.group()

        items: dict[str, dict] = {}
        current_key: str | None = None
        parts: list[str] = []

        for raw in chunk.splitlines():
            line = raw.rstrip()
            stripped = line.strip()
            if not stripped or SKIP.match(stripped):
                current_key = None
                parts = []
                continue

            cm = ITEM_CIRCLED.match(stripped)
            jm = ITEM_JAMO.match(stripped)
            pm = ITEM_CIRCLED_PLAIN.match(stripped) if not cm and not jm else None
            if cm:
                key = str(CHOICE_MARKERS.index(cm.group(1)) + 1)
                body = (cm.group(3) or cm.group(2)).strip()
                items[key] = {"explanation": normalize(body)}
                current_key = key
                parts = [body] if body else []
                continue
            if jm:
                key = jm.group(1)
                body = (jm.group(3) or jm.group(2)).strip()
                items[key] = {"explanation": normalize(body)}
                current_key = key
                parts = [body] if body else []
                continue
            if pm:
                key = str(CHOICE_MARKERS.index(pm.group(1)) + 1)
                body = pm.group(3).strip() or pm.group(2).strip()
                items[key] = {"explanation": normalize(body)}
                current_key = key
                parts = [body] if body else []
                continue

            if current_key and stripped:
                parts.append(stripped)
                items[current_key]["explanation"] = normalize(" ".join(parts))

        summary = f"정답은 {answer_raw}입니다." if not answer_raw.endswith("입니다") else answer_raw
        if not summary.startswith("정답"):
            summary = f"정답은 {answer_raw}입니다."

        out[qno] = {
            "correct_mark": correct_mark,
            "summary": summary[:1200],
            "items": items,
        }
    return out


def item_key_to_choice_no(key: str) -> str:
    if key in JAMO_ORDER:
        return str(JAMO_ORDER.index(key) + 1)
    return key


def patch_exam(exams: list, parsed: dict[int, dict]) -> tuple[int, list[str]]:
    n = 0
    warnings: list[str] = []
    for ex in exams:
        qno = ex["question_no"]
        block = parsed.get(qno)
        if not block:
            warnings.append(f"Q{qno}: 해설 블록 없음")
            continue
        ex["explanation_summary"] = block["summary"]
        for item in ex.get("items", []):
            key = item["key"]
            src = block["items"].get(key)
            if not src:
                warnings.append(f"Q{qno} item {key}: 해설 없음")
                continue
            item["explanation"] = src["explanation"]
            n += 1
    return n, warnings


def patch_questions(questions: list, exams_by_q: dict[int, dict]) -> int:
    n = 0
    for q in questions:
        qno = q["question_no"]
        ex = exams_by_q.get(qno)
        if not ex:
            continue
        correct = ex.get("correct_choice")
        mark = CHOICE_MARKERS[correct - 1] if correct else ""
        prefix = f"정답은 {mark}입니다. " if mark else ""

        choice_no = q.get("choice_no", "")
        item = None
        if ex.get("question_type") == "composite":
            jamo = JAMO_ORDER[int(choice_no) - 1] if str(choice_no).isdigit() else None
            if jamo:
                item = next((it for it in ex["items"] if it["key"] == jamo), None)
        elif str(choice_no).isdigit():
            item = next((it for it in ex["items"] if it["key"] == str(choice_no)), None)

        if item and item.get("explanation"):
            body = item["explanation"]
            q["explanation"] = body if body.startswith("정답") else f"{prefix}{body}"
            n += 1
    return n


def main() -> None:
    if not EXPLAIN_MD.exists():
        raise SystemExit(f"Missing {EXPLAIN_MD}")

    text = EXPLAIN_MD.read_text(encoding="utf-8")
    parsed = parse_blocks(text)
    print(f"Parsed {len(parsed)} question blocks from {EXPLAIN_MD.name}")
    if len(parsed) != 40:
        print(f"WARN: expected 40 blocks, got {len(parsed)}", file=sys.stderr)

    exams = json.loads(EXAM_PATH.read_text(encoding="utf-8"))
    item_n, warnings = patch_exam(exams, parsed)
    EXAM_PATH.write_text(json.dumps(exams, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Patched {item_n} item explanations in {EXAM_PATH.relative_to(ROOT)}")

    exams_by_q = {ex["question_no"]: ex for ex in exams}
    questions = json.loads(QUESTIONS_PATH.read_text(encoding="utf-8"))
    q_n = patch_questions(questions, exams_by_q)
    QUESTIONS_PATH.write_text(json.dumps(questions, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Patched {q_n} explanations in {QUESTIONS_PATH.relative_to(ROOT)}")

    EXPLAIN_SOURCE.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(EXPLAIN_MD, EXPLAIN_SOURCE)
    print(f"Synced → {EXPLAIN_SOURCE.relative_to(ROOT)}")

    expl_count = sum(
        1 for ex in exams for it in ex.get("items", []) if (it.get("explanation") or "").strip()
    )
    empty = [w for w in warnings if "해설 없음" in w]
    print(f"Verify: {expl_count}/174 item explanations filled, {len(empty)} missing items")
    if empty[:10]:
        for w in empty[:10]:
            print(f"  {w}")
        if len(empty) > 10:
            print(f"  ... and {len(empty) - 10} more")


if __name__ == "__main__":
    main()
