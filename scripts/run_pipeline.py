#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""민법 10개년 PDF → OX JSON 파이프라인"""

from __future__ import annotations

import json
import re
import sys
import time
import unicodedata
from pathlib import Path

from pdf_text import (
    extract_pdf_layout,
    extract_pdf_plain,
    normalize_whitespace,
    polish_explanation,
    polish_statement,
)

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
PIPE = DATA / "pipeline"
PDF_DIR = Path(r"c:\Users\상토시\OneDrive\Desktop\민법기출")
RAW_DIR = PIPE / "raw"
MERGED_DIR = PIPE / "merged"
ANSWER_DIR = PIPE / "answer_keys"
OUT_DIR = ROOT / "src" / "data" / "questions"

CHOICE_MARKERS = "①②③④⑤"
CHOICE_RE = re.compile(r"[①②③④⑤]")
NUM_START = re.compile(r"(?<![0-9])(\d{1,2})\.\s*")
SUBJECT2 = re.compile(r"제2과목\s*:\s*민법")
ANSWER_RE = re.compile(r"정답\.?\s*([①②③④⑤1-5])")
ANSWER_ALT = re.compile(r"답\.?\s*([①②③④⑤1-5])")


def load_json(path: Path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def save_json(path: Path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)


def circled_to_num(ch: str) -> int:
    m = {"①": 1, "②": 2, "③": 3, "④": 4, "⑤": 5}
    if ch in m:
        return m[ch]
    return int(ch)


def extract_pdf_text(pdf_path: Path) -> str:
    try:
        return extract_pdf_layout(pdf_path)
    except Exception as e:
        print(f"  [warn] layout extract failed, using plain: {e}")
        return extract_pdf_plain(pdf_path)


def slice_minbeop_section(text: str) -> str:
    """Keep only 민법(제2과목) section text."""
    m = SUBJECT2.search(text)
    if m:
        return text[m.start() :]
    # fallback: second occurrence of 제2과목
    hits = list(re.finditer(r"제2과목", text))
    if len(hits) >= 1:
        return text[hits[-1].start() :]
    return text


def detect_min_max(text: str, default_min: int, default_max: int) -> tuple[int, int]:
    segment = slice_minbeop_section(text)
    nums = [int(x) for x in re.findall(r"(?<![0-9])(\d{1,2})\.", segment)]
    qnums = sorted(set(n for n in nums if default_min - 5 <= n <= default_max + 5))
    if len(qnums) >= 30:
        mn = min(n for n in qnums if n >= default_min - 2)
        mx = max(n for n in qnums if n <= default_max + 2)
        if mx - mn + 1 >= 25:
            return max(default_min, mn), min(default_max, mx)
    return default_min, default_max


def parse_questions(text: str, min_no: int, max_no: int) -> list[dict]:
    """Parse exam text into question dicts."""
    parts = NUM_START.split(text)
    if len(parts) < 2:
        return []

    questions = []
    i = 1
    while i < len(parts):
        head = parts[i].strip()
        if not head:
            i += 2
            continue
        num_match = re.match(r"^(\d{1,2})", head)
        if not num_match:
            i += 2
            continue
        qno = int(num_match.group(1))
        body = (head[num_match.end() :] + (parts[i + 1] if i + 1 < len(parts) else "")).strip()
        i += 2

        if qno < min_no or qno > max_no:
            continue

        choices = {}
        stem = body
        for m in CHOICE_RE.finditer(body):
            idx = CHOICE_MARKERS.index(m.group())
            start = m.end()
            nxt = CHOICE_RE.search(body, start)
            end = nxt.start() if nxt else len(body)
            choices[idx + 1] = body[start:end].strip()

        if choices:
            first_pos = CHOICE_RE.search(body)
            if first_pos:
                stem = body[: first_pos.start()].strip()

        stem = polish_statement(stem)
        for k, ch in list(choices.items()):
            choices[k] = polish_statement(ch)

        qtype = classify_stem_type(stem)
        questions.append(
            {
                "question_no": qno,
                "stem": stem,
                "choices": choices,
                "question_type": qtype,
            }
        )

    # dedupe by question_no
    by_no = {}
    for q in questions:
        by_no[q["question_no"]] = q
    return [by_no[k] for k in sorted(by_no.keys())]


def classify_stem_type(stem: str) -> str:
    if re.search(r"틀린\s*것|해당하지\s*않|아닌\s*것|옳지\s*않", stem):
        return "wrong"
    if re.search(r"모두\s*고른|모두\s*선택", stem):
        return "composite"
    return "correct"


def fetch_hypers84_index(index_id: int) -> dict[int, str]:
    """Return question_no -> post URL from index page."""
    import requests
    from bs4 import BeautifulSoup

    url = f"https://hypers84.tistory.com/{index_id}"
    try:
        r = requests.get(url, timeout=30, headers={"User-Agent": "Mozilla/5.0"})
        r.raise_for_status()
    except Exception as e:
        print(f"  [warn] index fetch failed {url}: {e}")
        return {}

    soup = BeautifulSoup(r.text, "html.parser")
    links = {}
    for a in soup.find_all("a", href=True):
        href = a["href"]
        m = re.search(r"hypers84\.tistory\.com/(\d+)", href)
        if not m:
            continue
        text = a.get_text(" ", strip=True)
        qm = re.search(r"민법\s*(\d{1,2})\.", text) or re.search(r"(\d{1,2})\.", text)
        if qm:
            qno = int(qm.group(1))
            if 41 <= qno <= 80:
                post_id = m.group(1)
                links[qno] = href if href.startswith("http") else f"https://hypers84.tistory.com/{post_id}"
    return links


def clean_scraped_text(text: str) -> str:
    text = re.sub(r"728x90|반응형|공유하기|티스토리|저작자표시.*", "", text)
    text = re.sub(r"\[\d+회.*?\]", "", text)
    text = re.sub(r"관련글.*", "", text, flags=re.DOTALL)
    text = re.sub(r"게시글\s*관리.*", "", text)
    text = re.sub(r"세모기\s*-\s*세상의\s*모든\s*기출.*", "", text)
    text = re.sub(r"^\.\s*", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    text = normalize_whitespace(text)
    return text[:500]


def parse_choice_explanations(text: str) -> dict[int, str]:
    """Parse per-choice lines from 해설 block (① ... ② ...)."""
    out = {}
    if "해설" not in text:
        return out
    block = text.split("해설", 1)[-1]
    for i, mark in enumerate(CHOICE_MARKERS, start=1):
        pattern = rf"{mark}\s*([^①②③④⑤]+)"
        m = re.search(pattern, block)
        if m:
            out[i] = clean_scraped_text(m.group(1))
    return out


def fetch_hypers84_post(url: str) -> dict | None:
    import requests
    from bs4 import BeautifulSoup

    try:
        r = requests.get(url, timeout=30, headers={"User-Agent": "Mozilla/5.0"})
        r.raise_for_status()
    except Exception:
        return None

    soup = BeautifulSoup(r.text, "html.parser")
    article = soup.select_one(".article, .entry-content, article") or soup.body
    text = article.get_text("\n", strip=True) if article else ""

    ans_m = ANSWER_RE.search(text) or ANSWER_ALT.search(text)
    if not ans_m:
        return None
    correct = circled_to_num(ans_m.group(1))

    choice_expl = parse_choice_explanations(text)
    general = ""
    if "해설" in text:
        general = clean_scraped_text(text.split("해설", 1)[-1])

    return {
        "correct_choice": correct,
        "explanation": general,
        "choice_explanations": choice_expl,
    }


def load_manual_answers(year: int) -> dict[int, dict]:
    path = DATA / "answer_keys" / f"{year}.csv"
    if not path.exists():
        return {}
    out = {}
    lines = path.read_text(encoding="utf-8").strip().splitlines()
    for line in lines[1:]:
        parts = line.split(",", 3)
        if len(parts) < 3:
            continue
        y, qno, cc = int(parts[0]), int(parts[1]), parts[2].strip()
        if y != year:
            continue
        expl = parts[3].strip() if len(parts) > 3 else ""
        out[qno] = {
            "correct_choice": circled_to_num(cc[0]) if cc else 0,
            "explanation": expl,
        }
    return out


def fetch_answers_for_year(exam: dict) -> dict[int, dict]:
    year = exam["year"]
    manual = load_manual_answers(year)
    if manual:
        return manual

    index_id = exam.get("hypers84_index")
    if not index_id:
        return {}

    print(f"  Fetching hypers84 answers for {year}...")
    links = fetch_hypers84_index(index_id)
    answers = {}
    for qno, url in sorted(links.items()):
        if qno < exam["min_no"] or qno > exam["max_no"]:
            continue
        data = fetch_hypers84_post(url)
        if data:
            answers[qno] = data
        time.sleep(0.35)
    save_json(ANSWER_DIR / f"{year}.json", {str(k): v for k, v in answers.items()})
    return answers


def classify_topic(stem: str, taxonomy: list, choices: dict | None = None) -> dict:
    blob = stem
    if choices:
        blob += " " + " ".join(choices.values())
    best = taxonomy[0]
    best_score = 0
    for unit in taxonomy:
        score = 0
        for kw in unit.get("keywords", []):
            if kw in blob:
                score += len(kw)
        if score > best_score:
            best_score = score
            best = unit
    return {
        "category": best["category"],
        "subcategory": best["subcategory"],
        "textbook_order": best["order"],
    }


def choice_to_ox(
    q: dict,
    choice_no: int,
    choice_text: str,
    answer_meta: dict | None,
) -> dict | None:
    qtype = q["question_type"]
    correct_choice = answer_meta.get("correct_choice") if answer_meta else None
    needs_review = correct_choice is None

    if correct_choice is not None:
        is_correct_option = choice_no == correct_choice
        if qtype == "wrong":
            ox_answer = "X" if is_correct_option else "O"
        else:
            ox_answer = "O" if is_correct_option else "X"
    else:
        ox_answer = "X"
        needs_review = True

    statement = polish_statement(choice_text.strip())
    if len(statement) < 8:
        needs_review = True

    expl = ""
    if answer_meta:
        per = (answer_meta.get("choice_explanations") or {}).get(choice_no)
        if per:
            expl = per
        elif answer_meta.get("explanation"):
            expl = answer_meta["explanation"]
        if correct_choice and not needs_review and expl:
            is_correct_option = choice_no == correct_choice
            if not is_correct_option and qtype != "wrong" and not per:
                expl = f"정답은 {CHOICE_MARKERS[correct_choice - 1]}입니다. {expl}"
    if not expl:
        if needs_review:
            expl = "정답·해설 검수가 필요합니다. 윌비스 기본서 및 기출 해설을 참고하세요."
        elif correct_choice:
            expl = f"정답은 {CHOICE_MARKERS[correct_choice - 1]}입니다. 관련 조문·판례를 확인하세요."
        else:
            expl = "관련 조문·판례를 확인하세요."

    return {
        "statement": statement,
        "answer": ox_answer,
        "explanation": expl,
        "needs_review": needs_review,
    }


def build_ox_items(
    exam: dict,
    questions: list[dict],
    answers: dict[int, dict],
    taxonomy: list,
) -> list[dict]:
    items = []
    year, round_ = exam["year"], exam["round"]
    source = exam["source_label"]

    for q in questions:
        qno = q["question_no"]
        meta = answers.get(qno)
        topic = classify_topic(q["stem"], taxonomy, q["choices"])

        for choice_no in sorted(q["choices"].keys()):
            ox = choice_to_ox(q, choice_no, q["choices"][choice_no], meta)
            if not ox:
                continue
            stmt = polish_statement(ox["statement"])
            expl = polish_explanation(ox.get("explanation") or "")
            item = {
                "id": f"민법-{year}-{qno}-{choice_no}",
                "year": year,
                "round": round_,
                "question_no": qno,
                "choice_no": choice_no,
                "category": topic["category"],
                "subcategory": topic["subcategory"],
                "textbook_order": topic["textbook_order"],
                "statement": stmt,
                "answer": ox["answer"],
                "explanation": expl,
                "source": source,
                "needs_review": ox["needs_review"],
            }
            items.append(item)
    return items


def step_extract():
    exams = load_json(DATA / "exam_ranges.json")["exams"]
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    for exam in exams:
        pdf_path = PDF_DIR / exam["pdf"]
        year = exam["year"]
        if not pdf_path.exists():
            print(f"[skip] PDF not found: {pdf_path}")
            continue
        print(f"Extracting PDF {year}...")
        text = extract_pdf_text(pdf_path)
        section = slice_minbeop_section(text)
        min_no, max_no = detect_min_max(text, exam["min_no"], exam["max_no"])
        exam["min_no"], exam["max_no"] = min_no, max_no
        questions = parse_questions(section, min_no, max_no)
        save_json(
            RAW_DIR / f"{year}.json",
            {
                "year": year,
                "round": exam["round"],
                "min_no": min_no,
                "max_no": max_no,
                "question_count": len(questions),
                "questions": questions,
            },
        )
        print(f"  -> {len(questions)} questions ({min_no}-{max_no})")


def step_answers():
    exams = load_json(DATA / "exam_ranges.json")["exams"]
    ANSWER_DIR.mkdir(parents=True, exist_ok=True)
    for exam in exams:
        cached = ANSWER_DIR / f"{exam['year']}.json"
        if cached.exists():
            continue
        answers = fetch_answers_for_year(exam)
        if answers:
            save_json(cached, {str(k): v for k, v in answers.items()})


def step_merge_and_ox():
    taxonomy = load_json(DATA / "taxonomy.json")["units"]
    exams = load_json(DATA / "exam_ranges.json")["exams"]
    all_items = []
    review_report = []

    for exam in exams:
        year = exam["year"]
        raw_path = RAW_DIR / f"{year}.json"
        if not raw_path.exists():
            continue
        raw = load_json(raw_path)
        questions = raw["questions"]

        answers = {}
        ans_path = ANSWER_DIR / f"{year}.json"
        if ans_path.exists():
            loaded = load_json(ans_path)
            answers = {int(k): v for k, v in loaded.items()}
            for meta in answers.values():
                if meta.get("explanation"):
                    meta["explanation"] = clean_scraped_text(meta["explanation"])
                for cno, expl in list((meta.get("choice_explanations") or {}).items()):
                    meta["choice_explanations"][cno] = clean_scraped_text(expl)
        else:
            answers = fetch_answers_for_year(exam)

        items = build_ox_items(exam, questions, answers, taxonomy)
        save_json(MERGED_DIR / f"{year}.json", items)
        all_items.extend(items)
        missing = [q["question_no"] for q in questions if q["question_no"] not in answers]
        if missing:
            review_report.append({"year": year, "missing_answers": missing[:10], "count": len(missing)})

    save_json(PIPE / "questions_final.json", all_items)
    save_json(PIPE / "review_report.json", review_report)
    print(f"Total OX items: {len(all_items)}")
    return all_items


def step_build_app_data(all_items: list):
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    by_year: dict[int, list] = {}
    for item in all_items:
        y = item["year"]
        by_year.setdefault(y, []).append(item)

    index = []
    for year in sorted(by_year.keys()):
        items = sorted(
            by_year[year],
            key=lambda x: (x.get("textbook_order", 0), x["question_no"], x["choice_no"]),
        )
        # strip needs_review for app bundle (keep in pipeline only)
        app_items = [{k: v for k, v in it.items() if k != "needs_review"} for it in items]
        save_json(OUT_DIR / f"{year}.json", app_items)
        index.append(
            {
                "year": year,
                "round": items[0]["round"] if items else 0,
                "count": len(app_items),
                "file": f"{year}.json",
            }
        )

    save_json(OUT_DIR / "index.json", index)

    # legacy single file for backwards compat during dev
    legacy = sorted(all_items, key=lambda x: (x.get("textbook_order", 0), x["year"], x["question_no"], x["choice_no"]))
    legacy_app = [{k: v for k, v in it.items() if k != "needs_review"} for it in legacy]
    save_json(ROOT / "src" / "data" / "questions.json", legacy_app)


def main():
    steps = sys.argv[1:] or ["all"]
    if "all" in steps:
        steps = ["extract", "answers", "ox", "app"]

    if "extract" in steps:
        step_extract()
    if "answers" in steps:
        step_answers()
    if "ox" in steps:
        items = step_merge_and_ox()
        if "app" not in steps:
            step_build_app_data(items)
    if "app" in steps:
        final_path = PIPE / "questions_final.json"
        if final_path.exists():
            step_build_app_data(load_json(final_path))
        else:
            print("Run ox step first")


if __name__ == "__main__":
    main()
