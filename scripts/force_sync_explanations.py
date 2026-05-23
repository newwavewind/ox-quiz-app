#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""해설 ①②③ 이 있으면 statement 를 무조건 해설 기반으로 갱신."""
import json
from pathlib import Path

from sync_statements_from_explanations import (
    adapt_from_full_explanation,
    improve_statement,
    parse_numbered_clauses,
)

ROOT = Path(__file__).resolve().parent.parent
QDIR = ROOT / "src" / "data" / "questions"


def process(items):
    n = 0
    by_q = {}
    for it in items:
        by_q.setdefault((it["year"], it["question_no"]), []).append(it)
    for group in by_q.values():
        expl = group[0].get("explanation") or ""
        clauses = parse_numbered_clauses(expl)
        for it in group:
            cno = int(it["choice_no"])
            old = it.get("statement", "")
            if cno in clauses:
                it["statement"] = improve_statement(old, clauses[cno])
            else:
                adapted = adapt_from_full_explanation(expl, it)
                if adapted:
                    it["statement"] = adapted
            if it["statement"] != old:
                n += 1
    return n


def main():
    total = 0
    for path in sorted(QDIR.glob("*.json")):
        if path.name == "index.json":
            continue
        items = json.loads(path.read_text(encoding="utf-8"))
        n = process(items)
        path.write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")
        print(path.name, n)
        total += n
    leg = ROOT / "src" / "data" / "questions.json"
    if leg.exists():
        items = json.loads(leg.read_text(encoding="utf-8"))
        n = process(items)
        leg.write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")
        print("questions.json", n)
        total += n
    print("total", total)


if __name__ == "__main__":
    main()
