#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""기출·OX JSON의 category/subcategory를 data/taxonomy.json(민법 기준)으로 재분류."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

from import_md_year import classify_topic, load_json  # noqa: E402

DATA = ROOT / "data"
LEGACY_CATEGORY = {
    "법률행위총론": "법률행위",
    "법률행위부관": "법률행위",
    "물권일반": "물권총칙",
    "물권변동등기": "물권변동",
    "점유권취득시효": "점유·시효",
    "보물권": None,
    "특별법": "민사특별법",
}


def load_overrides() -> dict:
    path = DATA / "category_overrides.json"
    if not path.is_file():
        return {}
    data = load_json(path)
    return data.get("overrides") or {}


def question_blob(q: dict) -> str:
    parts = [q.get("stem") or ""]
    for item in q.get("items") or []:
        parts.append(item.get("text") or "")
        parts.append(item.get("explanation") or "")
    return " ".join(p for p in parts if p)


def remap_record(q: dict, taxonomy: list, overrides: dict) -> dict:
    exam_id = q.get("id")
    if exam_id and exam_id in overrides:
        o = overrides[exam_id]
        q["category"] = o["category"]
        q["subcategory"] = o["subcategory"]
        return q
    topic = classify_topic(q.get("stem") or "", taxonomy, question_blob(q))
    q["category"] = topic["category"]
    q["subcategory"] = topic["subcategory"]
    if "textbook_order" in q or topic.get("textbook_order"):
        q["textbook_order"] = topic["textbook_order"]
    return q


def process_file(path: Path, taxonomy: list, overrides: dict) -> int:
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, list):
        return 0
    changed = 0
    for q in data:
        before = (q.get("category"), q.get("subcategory"))
        remap_record(q, taxonomy, overrides)
        if (q.get("category"), q.get("subcategory")) != before:
            changed += 1
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return changed


def main() -> None:
    taxonomy = load_json(DATA / "taxonomy.json")["units"]
    overrides = load_overrides()
    targets: list[Path] = []
    targets.extend((ROOT / "src/data/exam").glob("*.json"))
    targets.extend((ROOT / "src/data/questions").glob("*.json"))
    qroot = ROOT / "src/data/questions.json"
    if qroot.is_file():
        targets.append(qroot)

    total = 0
    for path in sorted(set(targets)):
        n = process_file(path, taxonomy, overrides)
        print(f"{path.relative_to(ROOT)}: {n} records updated")
        total += n

    print(f"overrides applied: {len(overrides)} ids")
    print(f"legacy map (reference): {LEGACY_CATEGORY}")
    print(f"done, {total} record field updates")


if __name__ == "__main__":
    main()
