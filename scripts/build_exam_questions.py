#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""new2016.md + 2016해설.md → 문항 단위 exam JSON (40문항)."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

from import_md_year import (  # noqa: E402
    CHOICE_MARKERS,
    classify_stem_type,
    classify_topic,
    load_json,
    parse_combo,
    parse_md_questions,
    save_json,
)
from polish_text import polish_exam_text  # noqa: E402

DATA = ROOT / "data"
SOURCE = DATA / "source"
OUT = ROOT / "src" / "data" / "exam"

EXPLAIN_HEAD = re.compile(
    r"^((?:4[1-9])|(?:5\d)|(?:6\d)|(?:7\d)|(?:80))\.\s*정답:\s*([①②③④⑤1-5]+)",
    re.MULTILINE,
)
MULTI_MARK = re.compile(r"^\*?\s*([①②③④⑤,\s]+)\s*\(([OX])\)\s*(.*)$")
SINGLE_MARK = re.compile(r"^\*?\s*([①②③④⑤])\s*\(([OX])\)\s*(.*)$")
JAMO_MARK = re.compile(r"^\*?\s*([ㄱ-ㅎ])\.\s*\(([OX])\)\s*(.*)$")
JAMO_ALT = re.compile(r"^\*?\s*([ㄱ-ㅎ])\.\s*(.+?)\s*\(([OX])\)\s*-?\s*(.*)$")


def circled_to_num(ch: str) -> int:
    m = {"①": 1, "②": 2, "③": 3, "④": 4, "⑤": 5}
    if ch in m:
        return m[ch]
    if ch.isdigit():
        return int(ch)
    raise ValueError(f"unknown choice mark: {ch!r}")


def md_path(name: str) -> Path:
    """{year}-exam.md / {year}-explain.md → 프로젝트 루트 MD 우선."""
    candidates: list[Path] = []
    m = re.match(r"(\d{4})-(exam|explain)\.md$", name)
    if m:
        year, kind = m.group(1), m.group(2)
        if year == "2016" and kind == "exam":
            candidates = [ROOT / "new2016.md", SOURCE / name]
        elif kind == "exam":
            candidates = [ROOT / f"{year}.md", SOURCE / name]
        else:
            candidates = [ROOT / f"{year}해설.md", SOURCE / name]
    else:
        candidates = [SOURCE / name]
    for p in candidates:
        if p.exists() and p.stat().st_size > 100:
            return p
    return candidates[0]


def _assign_item(items: dict[str, dict], key: str, ox: str, body: str) -> None:
    items[key] = {"ox": ox, "explanation": body.strip()}


EXPLAIN_Q_HEAD = re.compile(
    r"^((?:4[1-9])|(?:5\d)|(?:6\d)|(?:7\d)|(?:80))\.\s",
    re.MULTILINE,
)
ANSWER_LINE = re.compile(r"^정답:\s*(.+)$", re.MULTILINE)


def _parse_explain_blocks_standard(text: str) -> dict[int, dict]:
    """question_no -> { correct_choice, items: {key: {ox, text}}, summary }"""
    out: dict[int, dict] = {}
    matches = list(EXPLAIN_HEAD.finditer(text))
    for i, m in enumerate(matches):
        qno = int(m.group(1))
        correct_raw = m.group(2).strip()
        first_mark = re.search(r"[①②③④⑤1-5]", correct_raw)
        if not first_mark:
            continue
        correct_choice = circled_to_num(first_mark.group())

        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        block = text[m.end() : end].strip()

        items: dict[str, dict] = {}
        summary_parts = []

        for raw in block.splitlines():
            line = raw.strip()
            if not line or line == "[해설]":
                continue
            if not line.startswith("*") and not re.match(r"^\*?\s*[ㄱ-ㅎ①②③④⑤]", line):
                if line and not line.startswith("해설") and "따라서" not in line[:4]:
                    summary_parts.append(line)
                continue

            mm = MULTI_MARK.match(line)
            if mm:
                ox, body = mm.group(2), mm.group(3).strip()
                for mark in re.findall(r"[①②③④⑤]", mm.group(1)):
                    key = str(CHOICE_MARKERS.index(mark) + 1)
                    _assign_item(items, key, ox, body)
                continue

            sm = SINGLE_MARK.match(line)
            if sm:
                key = str(CHOICE_MARKERS.index(sm.group(1)) + 1)
                _assign_item(items, key, sm.group(2), sm.group(3))
                continue

            jm = JAMO_MARK.match(line)
            if jm:
                _assign_item(items, jm.group(1), jm.group(2), jm.group(3))
                continue

            ja = JAMO_ALT.match(line)
            if ja:
                _assign_item(items, ja.group(1), ja.group(3), ja.group(4) or ja.group(2))

        summary = " ".join(summary_parts).strip()
        if not summary:
            summary = f"정답은 {correct_raw}입니다."

        out[qno] = {
            "correct_choice": correct_choice,
            "items": items,
            "summary": summary[:1200],
        }
    return out


def _parse_explain_blocks_answer_line(text: str) -> dict[int, dict]:
    """2018해설.md 형식: '41. 지문' 다음 줄 '정답: ④', 해설 본문."""
    out: dict[int, dict] = {}
    matches = list(EXPLAIN_Q_HEAD.finditer(text))
    for i, m in enumerate(matches):
        qno = int(m.group(1))
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        block = text[m.start() : end]
        am = ANSWER_LINE.search(block)
        if not am:
            continue
        correct_raw = am.group(1).strip()
        first_mark = re.search(r"[①②③④⑤]", correct_raw)
        if not first_mark:
            digit = re.search(r"\d", correct_raw)
            if not digit:
                continue
            correct_choice = int(digit.group())
        else:
            correct_choice = circled_to_num(first_mark.group())

        body = block[am.end() :].strip()
        body = re.sub(r"^해설:\s*", "", body, count=1).strip()

        items: dict[str, dict] = {}
        summary_parts: list[str] = []
        for raw in body.splitlines():
            line = raw.strip()
            if not line or line in ("[해설]", "해설", "해설:"):
                continue
            cm = re.match(r"^([①②③④⑤])\s+", line)
            jm = re.match(r"^([ㄱ-ㅎ])\.\s+", line)
            if cm:
                key = str(CHOICE_MARKERS.index(cm.group(1)) + 1)
                items[key] = {"ox": "", "explanation": line[cm.end() :].strip()}
            elif jm:
                items[jm.group(1)] = {"ox": "", "explanation": line[jm.end() :].strip()}
            elif not line.startswith("해설"):
                summary_parts.append(line)

        summary = " ".join(summary_parts).strip() or f"정답은 {correct_raw}입니다."
        out[qno] = {
            "correct_choice": correct_choice,
            "items": items,
            "summary": summary[:1200],
        }
    return out


def parse_explain_blocks(text: str) -> dict[int, dict]:
    if EXPLAIN_HEAD.search(text):
        return _parse_explain_blocks_standard(text)
    if ANSWER_LINE.search(text) and EXPLAIN_Q_HEAD.search(text):
        return _parse_explain_blocks_answer_line(text)
    return _parse_explain_blocks_standard(text)


def ox_for_choice(qtype: str, choice_no: int, correct_choice: int) -> str:
    is_correct = choice_no == correct_choice
    if qtype == "wrong":
        return "X" if is_correct else "O"
    return "O" if is_correct else "X"


def build_exam(year: int, exam_meta: dict, questions: list, explains: dict[int, dict]) -> list:
    taxonomy = load_json(DATA / "taxonomy.json")["units"]
    source = exam_meta["source_label"]
    round_ = exam_meta["round"]
    result = []

    for q in questions:
        qno = q["question_no"]
        expl = explains.get(qno, {})
        correct_choice = expl.get("correct_choice")
        if correct_choice is None:
            keys = load_json(DATA / "pipeline" / "answer_keys" / f"{year}.json")
            if str(qno) in keys:
                correct_choice = keys[str(qno)].get("correct_choice")

        topic = classify_topic(
            q["stem"],
            taxonomy,
            " ".join(q.get("sub_items", {}).values()) + " " + " ".join(q["choices"].values()),
        )

        expl_items = expl.get("items") or {}
        items = []
        combo_choices = []

        if q["question_type"] == "composite" and q["sub_items"]:
            if correct_choice is not None:
                correct_set = parse_combo(q["choices"].get(correct_choice, ""))
            else:
                correct_set = set()

            jamo_order = list("ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ")
            for jamo, text in q["sub_items"].items():
                expl_body = expl_items.get(jamo, {}).get("explanation", "")
                ox = expl_items.get(jamo, {}).get("ox")
                if ox is None:
                    ox = "O" if jamo in correct_set else "X"
                items.append(
                    {
                        "key": jamo,
                        "label": f"{jamo}.",
                        "text": polish_exam_text(text, expl_body),
                        "answer": ox,
                        "explanation": expl_body,
                    }
                )
            for no in sorted(q["choices"].keys()):
                mark = CHOICE_MARKERS[no - 1]
                combo_choices.append(
                    {
                        "no": no,
                        "label": mark,
                        "text": q["choices"][no],
                        "is_correct": no == correct_choice,
                    }
                )
        else:
            for no in sorted(q["choices"].keys()):
                mark = CHOICE_MARKERS[no - 1]
                key = str(no)
                ox = expl_items.get(key, {}).get("ox")
                if ox is None and correct_choice is not None:
                    ox = ox_for_choice(q["question_type"], no, correct_choice)
                elif ox is None:
                    ox = "X"
                expl_body = expl_items.get(key, {}).get("explanation", "")
                items.append(
                    {
                        "key": key,
                        "label": mark,
                        "text": polish_exam_text(q["choices"][no], expl_body),
                        "answer": ox,
                        "explanation": expl_body,
                    }
                )

        stem_expl = expl.get("summary", "")
        result.append(
            {
                "id": f"민법-{year}-Q{qno}",
                "year": year,
                "round": round_,
                "question_no": qno,
                "stem": polish_exam_text(q["stem"], stem_expl),
                "question_type": q["question_type"],
                "correct_choice": correct_choice,
                "category": topic["category"],
                "subcategory": topic["subcategory"],
                "items": items,
                "combo_choices": combo_choices,
                "explanation_summary": expl.get("summary", ""),
                "source": source,
            }
        )

    return result


def main():
    year = int(sys.argv[1]) if len(sys.argv) > 1 else 2016
    exam = next(e for e in load_json(DATA / "exam_ranges.json")["exams"] if e["year"] == year)

    q_md = md_path(f"{year}-exam.md").read_text(encoding="utf-8")
    e_md = md_path(f"{year}-explain.md").read_text(encoding="utf-8")

    questions = parse_md_questions(q_md, exam["min_no"], exam["max_no"])
    explains = parse_explain_blocks(e_md)
    exam_list = build_exam(year, exam, questions, explains)

    out_path = OUT / f"{year}.json"
    save_json(out_path, exam_list)
    print(f"Wrote {len(exam_list)} exam questions -> {out_path}")


if __name__ == "__main__":
    main()
