#!/usr/bin/env python3
"""{year}해설.md (【정답】 + [O]/[X] 형식) → exam/questions JSON 해설·정답 반영."""
from __future__ import annotations

import json
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CHOICE_MARKERS = "①②③④⑤"
JAMO_ORDER = list("ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ")
SEP = re.compile(r"^━+\s*$", re.MULTILINE)
Q_HEAD = re.compile(r"^((?:4[1-9])|(?:5\d)|(?:6\d)|(?:7\d)|(?:80))\.\s+", re.MULTILINE)
ANSWER = re.compile(r"^【정답】\s*(.+)$", re.MULTILINE)
ITEM_CIRCLED = re.compile(r"^([①②③④⑤])\s+\[([^]]+)\]\s*(.*)$")
ITEM_JAMO = re.compile(r"^([ㄱ-ㅎ])\.\s+\[([^]]+)\]\s*(.*)$")
ITEM_JAMO_PLAIN = re.compile(r"^([ㄱ-ㅎ])\.\s+(?!\[)(.+)$")
ITEM_CIRCLED_PLAIN = re.compile(r"^([①②③④⑤])\s+([^:\[\n]+?):\s*(.*)$")
SKIP = re.compile(
    r"^(?:※|【정답】|【정답 일람】|【계산 근거】|\d{2}\.|━|-\s*끝\s*-|\(해설|"
    r"^\d{2}[①②③④⑤]|^정답 및|^202\d년|^제2과목)"
)


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def circled_to_num(ch: str) -> int:
    return CHOICE_MARKERS.index(ch) + 1


def ox_from_tag(tag: str) -> str | None:
    tag = tag.strip()
    if re.match(r"^O", tag):
        return "O"
    if re.match(r"^X", tag):
        return "X"
    return None


def jamos_from_answer_raw(raw: str) -> set[str]:
    if "모두" in raw or "전항" in raw:
        return set(JAMO_ORDER)
    found = set(re.findall(r"[ㄱ-ㅎ]", raw))
    if "ㄴ만" in raw and "ㄴ" not in found:
        return {"ㄴ"}
    if "ㄱ만" in raw and "ㄱ" not in found:
        return {"ㄱ"}
    return found


def all_choices_correct(answer_raw: str) -> bool:
    marks = re.findall(r"[①②③④⑤]", answer_raw)
    return len(marks) >= 5 or "전항" in answer_raw


def ox_for_choice(qtype: str, choice_no: int, correct_choice: int) -> str:
    if choice_no == correct_choice:
        return "X" if qtype == "wrong" else "O"
    return "O" if qtype == "wrong" else "X"


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
        marks = re.findall(r"[①②③④⑤]", answer_raw)
        correct_choice = circled_to_num(marks[0]) if marks else None
        all_correct = all_choices_correct(answer_raw)

        items: dict[str, dict] = {}
        current_key: str | None = None
        parts: list[str] = []
        block_lines: list[str] = []
        after_answer = chunk.split(am.group(0), 1)[-1]

        for raw in after_answer.splitlines():
            line = raw.rstrip()
            stripped = line.strip()
            if not stripped or SKIP.match(stripped):
                if not current_key and stripped and not SKIP.match(stripped):
                    block_lines.append(stripped)
                current_key = None
                parts = []
                continue

            cm = ITEM_CIRCLED.match(stripped)
            jm = ITEM_JAMO.match(stripped)
            jplain = ITEM_JAMO_PLAIN.match(stripped) if not jm else None
            pm = ITEM_CIRCLED_PLAIN.match(stripped) if not cm and not jm and not jplain else None

            if cm:
                key = str(circled_to_num(cm.group(1)))
                body = (cm.group(3) or cm.group(2)).strip()
                ox = ox_from_tag(cm.group(2))
                items[key] = {"explanation": normalize(body), "ox": ox}
                current_key = key
                parts = [body] if body else []
                continue
            if jm:
                key = jm.group(1)
                body = (jm.group(3) or jm.group(2)).strip()
                ox = ox_from_tag(jm.group(2))
                items[key] = {"explanation": normalize(body), "ox": ox}
                current_key = key
                parts = [body] if body else []
                continue
            if jplain:
                key = jplain.group(1)
                body = jplain.group(2).strip()
                items[key] = {"explanation": normalize(body), "ox": None}
                current_key = key
                parts = [body] if body else []
                continue
            if pm:
                key = str(circled_to_num(pm.group(1)))
                body = pm.group(3).strip() or pm.group(2).strip()
                items[key] = {"explanation": normalize(body), "ox": None}
                current_key = key
                parts = [body] if body else []
                continue

            if current_key and stripped:
                parts.append(stripped)
                items[current_key]["explanation"] = normalize(" ".join(parts))
            elif not current_key and stripped:
                block_lines.append(stripped)

        block_explanation = normalize("\n".join(block_lines))
        summary = f"정답은 {answer_raw}입니다."

        out[qno] = {
            "answer_raw": answer_raw,
            "correct_choice": correct_choice,
            "all_correct": all_correct,
            "correct_jamos": jamos_from_answer_raw(answer_raw),
            "summary": summary[:1200],
            "block_explanation": block_explanation[:2000],
            "items": items,
        }
    return out


def patch_exam(exams: list, parsed: dict[int, dict]) -> tuple[int, list[str]]:
    expl_n = 0
    ans_changes: list[str] = []

    for ex in exams:
        qno = ex["question_no"]
        block = parsed.get(qno)
        if not block:
            ans_changes.append(f"Q{qno}: 해설 블록 없음")
            continue

        ex["explanation_summary"] = block["summary"]
        qtype = ex.get("question_type", "correct")
        new_correct = block["correct_choice"]
        all_correct = block["all_correct"]

        if new_correct is not None and not all_correct:
            old = ex.get("correct_choice")
            if old != new_correct:
                ans_changes.append(f"Q{qno} correct_choice {old}->{new_correct}")
            ex["correct_choice"] = new_correct

        if qtype == "composite" and ex.get("combo_choices"):
            if all_correct:
                for cc in ex["combo_choices"]:
                    if not cc.get("is_correct"):
                        ans_changes.append(f"Q{qno} combo{cc['no']} is_correct False->True (전항)")
                    cc["is_correct"] = True
                ex["correct_choice"] = ex["combo_choices"][-1]["no"]
            elif new_correct is not None:
                for cc in ex["combo_choices"]:
                    cc["is_correct"] = cc["no"] == new_correct

            jamos = block["correct_jamos"]
            if all_correct:
                jamos = {it["key"] for it in ex["items"] if re.match(r"^[ㄱ-ㅎ]$", it["key"])}

            for item in ex["items"]:
                key = item["key"]
                src = block["items"].get(key, {})
                if re.match(r"^[ㄱ-ㅎ]$", key):
                    new_ox = src.get("ox")
                    if new_ox not in ("O", "X"):
                        new_ox = "O" if key in jamos else "X"
                    if item.get("answer") != new_ox:
                        ans_changes.append(f"Q{qno} {key} {item.get('answer')}->{new_ox}")
                    item["answer"] = new_ox
                if src.get("explanation"):
                    item["explanation"] = src["explanation"]
                    expl_n += 1
                elif block["block_explanation"] and re.match(r"^[ㄱ-ㅎ]$", key):
                    item["explanation"] = block["block_explanation"]
                    expl_n += 1
        else:
            for item in ex["items"]:
                key = item["key"]
                if not key.isdigit():
                    continue
                no = int(key)
                src = block["items"].get(key, {})
                new_ox = src.get("ox")
                if new_ox not in ("O", "X") and new_correct is not None:
                    new_ox = ox_for_choice(qtype, no, new_correct)
                if new_ox in ("O", "X") and item.get("answer") != new_ox:
                    ans_changes.append(f"Q{qno} item{no} {item.get('answer')}->{new_ox}")
                    item["answer"] = new_ox
                if src.get("explanation"):
                    item["explanation"] = src["explanation"]
                    expl_n += 1
                elif block["block_explanation"]:
                    if new_correct is not None and no == new_correct:
                        item["explanation"] = block["block_explanation"]
                        expl_n += 1
                    elif not block["items"]:
                        item["explanation"] = block["block_explanation"]
                        expl_n += 1

    return expl_n, ans_changes


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

        if item:
            if item.get("answer"):
                q["answer"] = item["answer"]
            if item.get("explanation"):
                body = item["explanation"]
                q["explanation"] = body if body.startswith("정답") else f"{prefix}{body}"
                n += 1
    return n


def main() -> None:
    year = int(sys.argv[1]) if len(sys.argv) > 1 else 2025
    explain_md = ROOT / f"{year}해설.md"
    explain_source = ROOT / "data" / "source" / f"{year}-explain.md"
    exam_path = ROOT / "src" / "data" / "exam" / f"{year}.json"
    questions_path = ROOT / "src" / "data" / "questions" / f"{year}.json"

    if not explain_md.exists():
        raise SystemExit(f"Missing {explain_md}")

    text = explain_md.read_text(encoding="utf-8")
    parsed = parse_blocks(text)
    print(f"Parsed {len(parsed)} question blocks from {explain_md.name}")

    exams = json.loads(exam_path.read_text(encoding="utf-8"))
    expl_n, changes = patch_exam(exams, parsed)
    exam_path.write_text(json.dumps(exams, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Patched {expl_n} explanations in {exam_path.relative_to(ROOT)}")
    print(f"Answer changes: {len(changes)}")
    for line in changes[:25]:
        print(f"  {line}")
    if len(changes) > 25:
        print(f"  ... and {len(changes) - 25} more")

    exams_by_q = {ex["question_no"]: ex for ex in exams}
    questions = json.loads(questions_path.read_text(encoding="utf-8"))
    q_n = patch_questions(questions, exams_by_q)
    questions_path.write_text(json.dumps(questions, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Patched {q_n} explanations in {questions_path.relative_to(ROOT)}")

    explain_source.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(explain_md, explain_source)
    print(f"Synced → {explain_source.relative_to(ROOT)}")

    total_items = sum(len(ex.get("items", [])) for ex in exams)
    expl_count = sum(
        1 for ex in exams for it in ex.get("items", []) if (it.get("explanation") or "").strip()
    )
    print(f"Verify: {expl_count}/{total_items} item explanations filled")


if __name__ == "__main__":
    main()
