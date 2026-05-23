#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
해설에 ①②③④⑤ 로 나뉜 지문이 있으면, 띄어쓰기가 더 나은 해설 문장으로 statement 를 보강.
(해설은 hypers84 등에서 띄어쓰기가 비교적 잘 된 경우가 많음)
"""

import json
import re
from pathlib import Path

from pdf_text import normalize_whitespace, polish_statement

ROOT = Path(__file__).resolve().parent.parent
QDIR = ROOT / "src" / "data" / "questions"
CHOICE_MARKERS = "①②③④⑤"


def _collapse(s: str) -> str:
    return re.sub(r"\s+", "", s or "")


def _overlap_ratio(a: str, b: str) -> float:
    ca, cb = _collapse(a), _collapse(b)
    if not ca or not cb:
        return 0.0
    shorter, longer = (ca, cb) if len(ca) <= len(cb) else (cb, ca)
    if shorter not in longer and longer not in shorter:
        # partial: longest common subsequence approx via sliding
        hit = sum(1 for i in range(0, len(longer) - len(shorter) + 1) if longer[i : i + len(shorter)] == shorter)
        return hit / max(1, len(longer) // max(1, len(shorter)))
    return len(shorter) / len(longer)


def _quality(s: str) -> int:
    if not s:
        return 0
    if "의 사" in s or "이 행" in s or "이 유" in s:
        return 0
    sp = s.count(" ")
    if sp < max(2, len(s) / 22):
        return 1
    return 2


def parse_numbered_clauses(explanation: str) -> dict[int, str]:
    if not explanation:
        return {}
    out = {}
    for i, mark in enumerate(CHOICE_MARKERS, start=1):
        m = re.search(rf"{re.escape(mark)}\s*([^①②③④⑤]+)", explanation)
        if m:
            clause = normalize_whitespace(m.group(1).strip())
            # 해설 꼬리(…아니다/…할 수 있다) 제거 후 시험지문에 가깝게
            clause = re.sub(
                r"(?:는|은)\s*것은\s*아니다\.?$|할\s*수\s*(?:있|없)다\.?$|이다\.?$",
                "",
                clause,
            ).strip()
            clause = re.sub(r"제\s*3\s*자", "제3자", clause)
            clause = re.sub(r"\s+", " ", clause).strip()
            if len(clause) >= 8:
                out[i] = clause
    return out


def _negated(s: str) -> bool:
    return bool(re.search(r"않|아니|없(?=[다는])|못(?=[한다])", s))


def _adapt_clause_to_statement(clause: str, current: str) -> str:
    """해설 ①②… 문장을 시험 보기(O/X) 문장에 맞게 어미만 맞춤."""
    c = clause
    cur = _collapse(current)
    if "잃지않는다" in _collapse(c) and "잃는다" in cur and "잃지" not in cur:
        c = re.sub(r"사망\s+해도", "사망하면", c)
        c = c.replace("잃지 않는다", "잃는다")
    if "알지못해도" in _collapse(c) and "알아야" in cur:
        c = c.replace("알지 못해도", "알아야")
    if "철회할수없다" in _collapse(c) and "철회할수있다" in cur:
        c = c.replace("철회할 수 없다", "철회할 수 있다")
    if "잃지않는다" in _collapse(c) and "잃는다" in cur and "성년후견" in cur:
        c = c.replace("잃지 않는다", "잃는다")
    return polish_statement(c)


def improve_statement(current: str, clause: str) -> str:
    if _overlap_ratio(current, clause) < 0.45:
        return polish_statement(current)
    adapted = _adapt_clause_to_statement(clause, current)
    if _quality(adapted) > _quality(current):
        return adapted
    if _negated(current) != _negated(clause):
        return polish_statement(current)
    if _quality(current) >= 2 and _quality(clause) <= _quality(current):
        return current
    ending = re.search(r"(한다|없다|있다|된다|아니다)\.?$", current)
    end = ending.group(0) if ending else ""
    base = clause
    if end and not re.search(r"(한다|없다|있다|된다)\.?$", base):
        base = f"{base} {end}".strip()
    return polish_statement(base) if _quality(base) >= _quality(current) else polish_statement(current)


def adapt_from_full_explanation(explanation: str, item: dict) -> str | None:
    """해설 본문 전체가 한 보기 설명일 때 (2018-65-⑤ 등)."""
    expl = explanation or ""
    stmt = item.get("statement", "")
    cno = int(item.get("choice_no", 0))
    if cno == 5 and "당연히" in _collapse(stmt) and "청약자가" in expl:
        s = expl
        s = s.replace("지나 더라도", "지나면 당연히")
        s = s.replace("성립하지 않는다", "성립한다")
        return polish_statement(s)
    return None


def process_items(items: list) -> int:
    by_q = {}
    for it in items:
        key = (it["year"], it["question_no"])
        by_q.setdefault(key, []).append(it)

    n = 0
    for group in by_q.values():
        expl = group[0].get("explanation") or ""
        clauses = parse_numbered_clauses(expl)
        for it in group:
            cno = int(it["choice_no"])
            new_stmt = None
            if cno in clauses:
                new_stmt = improve_statement(it.get("statement", ""), clauses[cno])
            else:
                adapted = adapt_from_full_explanation(expl, it)
                if adapted:
                    new_stmt = adapted
            if new_stmt and (
                new_stmt != it.get("statement")
                or _quality(new_stmt) > _quality(it.get("statement", ""))
            ):
                it["statement"] = new_stmt
                n += 1
    return n


def main():
    total = 0
    for path in sorted(QDIR.glob("*.json")):
        if path.name == "index.json":
            continue
        items = json.loads(path.read_text(encoding="utf-8"))
        n = process_items(items)
        path.write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")
        print(path.name, "updated", n)
        total += n

    legacy = ROOT / "src" / "data" / "questions.json"
    if legacy.exists():
        items = json.loads(legacy.read_text(encoding="utf-8"))
        n = process_items(items)
        legacy.write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")
        print("questions.json updated", n)
        total += n
    print("total updated:", total)


if __name__ == "__main__":
    main()
