#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""수동 기출 MD(new2016.md 등) → OX JSON. PDF 추출문 대신 신뢰 가능한 텍스트 사용."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
SOURCE = DATA / "source"
OUT_DIR = ROOT / "src" / "data" / "questions"
ANSWER_DIR = DATA / "pipeline" / "answer_keys"

CHOICE_MARKERS = "①②③④⑤"
CHOICE_RE = re.compile(r"[①②③④⑤]")
# 문항 번호 41~80만 (줄 시작). 날짜·소문항 번호(1. 15. 등) 제외
NUM_START = re.compile(r"^((?:4[1-9])|(?:5\d)|(?:6\d)|(?:7\d)|(?:80))\.\s+", re.MULTILINE)
SUB_ITEM_RE = re.compile(r"([ㄱ-ㅎ])\.\s*")
PAGE_MARK = re.compile(r"A-\d+-\d+\s*\([^)]+\)")
_SEP_ONLY = re.compile(r"^━+$")
_EXAM_DECOR_TAIL = re.compile(r"\s*━+(?:\s*-\s*끝\s*-)?\s*$")


def load_json(path: Path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def save_json(path: Path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)


def clean_explanation(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r"728x90|반응형|공유하기|티스토리|저작자표시.*", "", text)
    text = re.sub(r"\[\d+회.*?\]", "", text)
    text = re.sub(r"관련글.*", "", text, flags=re.DOTALL)
    text = re.sub(r"게시글\s*관리.*", "", text)
    text = re.sub(r"세모기\s*-\s*세상의\s*모든\s*기출.*", "", text)
    text = re.sub(r"태그\s*공인중개사.*", "", text)
    text = re.sub(r"^\.\s*", "", text.strip())
    text = re.sub(r"\s+", " ", text).strip()
    return text[:600]


def classify_stem_type(stem: str) -> str:
    if re.search(r"틀린\s*것|해당하지\s*않|아닌\s*것|옳지\s*않", stem):
        return "wrong"
    if re.search(r"모두\s*고른|모두\s*선택", stem):
        return "composite"
    return "correct"


def classify_topic(stem: str, taxonomy: list, extra: str = "") -> dict:
    blob = stem + " " + extra
    best = taxonomy[0]
    best_score = 0
    for unit in taxonomy:
        score = sum(len(kw) for kw in unit.get("keywords", []) if kw in blob)
        if score > best_score:
            best_score = score
            best = unit
    return {
        "category": best["category"],
        "subcategory": best["subcategory"],
        "textbook_order": best["order"],
    }


_CONTINUATION = re.compile(
    r"^(?:에도|에서|에게|으로|이나|으며|거나|하고|이고|부터|까지|"
    r"되지|되었|하여|하는|한다|이다|인\s|로\s|을\s|를\s|"
    r"이\s|가\s|은\s|는\s|도\s|에\s|와\s|과\s)"
)


def _should_wrap_join(prev: str, nxt: str) -> bool:
    """PDF 줄끝 줄바꿈(단어 중간 끊김)은 공백 없이 이어 붙임."""
    if not prev or not nxt:
        return False
    if re.search(r"[.!?…]\s*$", prev) or nxt[0] in CHOICE_MARKERS:
        return False
    if _CONTINUATION.match(nxt):
        return True
    nxt_s = nxt.strip()
    if re.search(r"[가-힣]$", prev) and len(nxt_s) <= 2 and re.fullmatch(r"[가-힣]{1,2}", nxt_s):
        return True
    return False


def strip_exam_decorations(text: str) -> str:
    """MD 문항 구분선(━━━), '- 끝 -' 등 표시용 장식 제거."""
    if not text:
        return text
    return _EXAM_DECOR_TAIL.sub("", text).strip()


def join_lines(text: str) -> str:
    lines = []
    for ln in text.splitlines():
        s = ln.strip()
        if not s or _SEP_ONLY.match(s) or s == "- 끝 -":
            continue
        lines.append(s)
    if not lines:
        return ""
    merged = lines[0]
    for line in lines[1:]:
        merged += line if _should_wrap_join(merged, line) else " " + line
    return strip_exam_decorations(re.sub(r"\s+", " ", merged).strip())


def parse_combo(text: str) -> set[str]:
    return set(re.findall(r"[ㄱ-ㅎ]", text))


def parse_sub_items(body: str, first_choice_pos: int) -> dict[str, str]:
    prefix = body[:first_choice_pos]
    items = {}
    matches = list(SUB_ITEM_RE.finditer(prefix))
    if not matches:
        return items
    for i, m in enumerate(matches):
        jamo = m.group(1)
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else first_choice_pos
        items[jamo] = join_lines(prefix[start:end])
    return items


def extract_question_stem(body: str, first_choice_pos: int, sub_items: dict[str, str]) -> str:
    """복합형: ㄱ. 이전 줄만 지문(질문)으로."""
    prefix = body[:first_choice_pos]
    if sub_items:
        first_jamo = SUB_ITEM_RE.search(prefix)
        if first_jamo:
            prefix = prefix[: first_jamo.start()]
    return join_lines(prefix)


def parse_choices(body: str) -> tuple[str, dict[int, str]]:
    choices = {}
    first_pos = None
    for m in CHOICE_RE.finditer(body):
        idx = CHOICE_MARKERS.index(m.group())
        if first_pos is None:
            first_pos = m.start()
        start = m.end()
        nxt = CHOICE_RE.search(body, start)
        end = nxt.start() if nxt else len(body)
        raw = body[start:end].strip()
        raw = PAGE_MARK.sub("", raw).strip()
        choices[idx + 1] = join_lines(raw)
    stem = join_lines(body[: first_pos].strip()) if first_pos is not None else join_lines(body)
    stem = PAGE_MARK.sub("", stem).strip()
    return stem, choices


def parse_md_questions(md_text: str, min_no: int, max_no: int) -> list[dict]:
    text = PAGE_MARK.sub("\n", md_text)
    by_no: dict[int, dict] = {}
    matches = list(NUM_START.finditer(text))

    for i, m in enumerate(matches):
        qno = int(m.group(1))
        if qno < min_no or qno > max_no:
            continue
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        body = text[m.end() : end].strip()

        first_choice = CHOICE_RE.search(body)
        if not first_choice:
            continue

        stem_full, choices = parse_choices(body)
        sub_items = parse_sub_items(body, first_choice.start())
        stem = (
            extract_question_stem(body, first_choice.start(), sub_items)
            if sub_items
            else stem_full
        )
        qtype = classify_stem_type(stem)

        by_no[qno] = {
            "question_no": qno,
            "stem": stem,
            "choices": choices,
            "sub_items": sub_items,
            "question_type": qtype,
        }

    return [by_no[k] for k in sorted(by_no.keys())]


def build_explanation(meta: dict | None, correct_choice: int | None, qtype: str) -> str:
    if not meta:
        return "정답·해설 검수가 필요합니다."
    expl = clean_explanation(meta.get("explanation", ""))
    if correct_choice and expl and not expl.startswith("정답"):
        mark = CHOICE_MARKERS[correct_choice - 1]
        return f"정답은 {mark}입니다. {expl}"
    if expl:
        return expl
    if correct_choice:
        return f"정답은 {CHOICE_MARKERS[correct_choice - 1]}입니다."
    return "관련 조문·판례를 확인하세요."


def ox_for_regular(qtype: str, choice_no: int, correct_choice: int | None) -> str:
    if correct_choice is None:
        return "X"
    is_correct = choice_no == correct_choice
    if qtype == "wrong":
        return "X" if is_correct else "O"
    return "O" if is_correct else "X"


def build_items(
    questions: list[dict],
    answers: dict[str, dict],
    taxonomy: list,
    year: int,
    round_: int,
    source: str,
) -> list[dict]:
    items = []
    jamo_order = list("ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ")

    for q in questions:
        qno = q["question_no"]
        meta = answers.get(str(qno))
        correct_choice = meta.get("correct_choice") if meta else None
        topic = classify_topic(
            q["stem"],
            taxonomy,
            " ".join(q.get("sub_items", {}).values()) + " " + " ".join(q["choices"].values()),
        )
        expl_base = build_explanation(meta, correct_choice, q["question_type"])

        if q["question_type"] == "composite" and q["sub_items"]:
            if correct_choice is None:
                correct_set: set[str] = set()
            else:
                correct_set = parse_combo(q["choices"].get(correct_choice, ""))

            for jamo, stmt in q["sub_items"].items():
                idx = jamo_order.index(jamo) + 1 if jamo in jamo_order else len(items) + 1
                in_answer = jamo in correct_set
                ox = "O" if in_answer else "X"
                items.append(
                    {
                        "id": f"민법-{year}-{qno}-{idx}",
                        "year": year,
                        "round": round_,
                        "question_no": qno,
                        "choice_no": str(idx),
                        "category": topic["category"],
                        "subcategory": topic["subcategory"],
                        "textbook_order": topic["textbook_order"],
                        "statement": f"{jamo}. {stmt}",
                        "answer": ox,
                        "explanation": expl_base,
                        "source": source,
                    }
                )
        else:
            for choice_no, stmt in sorted(q["choices"].items()):
                ox = ox_for_regular(q["question_type"], choice_no, correct_choice)
                items.append(
                    {
                        "id": f"민법-{year}-{qno}-{choice_no}",
                        "year": year,
                        "round": round_,
                        "question_no": qno,
                        "choice_no": str(choice_no),
                        "category": topic["category"],
                        "subcategory": topic["subcategory"],
                        "textbook_order": topic["textbook_order"],
                        "statement": stmt,
                        "answer": ox,
                        "explanation": expl_base,
                        "source": source,
                    }
                )

    return items


def resolve_exam_md(year: int) -> Path:
    if year == 2016:
        for p in (ROOT / "new2016.md", SOURCE / "2016-exam.md"):
            if p.exists() and p.stat().st_size > 100:
                return p
        return ROOT / "new2016.md"
    for p in (ROOT / f"{year}.md", SOURCE / f"{year}-exam.md"):
        if p.exists() and p.stat().st_size > 100:
            return p
    return ROOT / f"{year}.md"


def resolve_answers(year: int) -> dict:
    """해설 MD의 정답·요약을 우선 사용 (2017 등 수동 해설본)."""
    for p in (ROOT / f"{year}해설.md", SOURCE / f"{year}-explain.md"):
        if p.exists() and p.stat().st_size > 100:
            from build_exam_questions import parse_explain_blocks

            blocks = parse_explain_blocks(p.read_text(encoding="utf-8"))
            if blocks:
                return {
                    str(qno): {
                        "correct_choice": b["correct_choice"],
                        "explanation": b.get("summary", ""),
                    }
                    for qno, b in blocks.items()
                }
    return load_json(ANSWER_DIR / f"{year}.json")


def main():
    if len(sys.argv) > 1 and sys.argv[1].isdigit():
        year = int(sys.argv[1])
        md_file = resolve_exam_md(year)
    elif len(sys.argv) > 1:
        md_file = ROOT / sys.argv[1]
        year = int(sys.argv[2]) if len(sys.argv) > 2 else 2016
    else:
        year = 2016
        md_file = resolve_exam_md(year)

    exams = load_json(DATA / "exam_ranges.json")["exams"]
    exam = next(e for e in exams if e["year"] == year)

    md_text = md_file.read_text(encoding="utf-8")
    questions = parse_md_questions(md_text, exam["min_no"], exam["max_no"])
    answers = resolve_answers(year)
    taxonomy = load_json(DATA / "taxonomy.json")["units"]

    items = build_items(
        questions,
        answers,
        taxonomy,
        year,
        exam["round"],
        exam["source_label"],
    )

    out_path = OUT_DIR / f"{year}.json"
    save_json(out_path, items)
    print(f"Wrote {len(items)} OX items ({len(questions)} questions) → {out_path}")


if __name__ == "__main__":
    main()
