#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""손상된 new2016.md 복구: 줄바꿈·문항 구조를 유지한 채 fix_glued + 해설 힌트만 적용."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

from import_md_year import NUM_START, PAGE_MARK, SUB_ITEM_RE, CHOICE_RE, CHOICE_MARKERS  # noqa: E402
from polish_text import polish_exam_text  # noqa: E402


def load_explains() -> dict:
    try:
        from build_exam_questions import md_path, parse_explain_blocks

        p = md_path("2016-explain.md")
        if p.exists() and p.stat().st_size > 100:
            return parse_explain_blocks(p.read_text(encoding="utf-8"))
    except Exception:
        pass
    return {}


def split_blocks(text: str) -> list[tuple[int, list[str]]]:
    """문항 번호별 원본 줄 목록 보존."""
    text = PAGE_MARK.sub("\n", text)
    matches = list(NUM_START.finditer(text))
    blocks: list[tuple[int, list[str]]] = []
    for i, m in enumerate(matches):
        qno = int(m.group(1))
        if qno < 41 or qno > 80:
            continue
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        body = text[m.end() : end]
        lines = [ln.rstrip() for ln in body.splitlines()]
        while lines and not lines[0].strip():
            lines.pop(0)
        blocks.append((qno, lines))
    return blocks


def polish_line(line: str, hint: str = "") -> str:
    line = line.strip()
    if not line:
        return line
    m = re.match(r"^((?:4[1-9])|(?:5\d)|(?:6\d)|(?:7\d)|(?:80))\.\s*(.*)$", line)
    if m:
        return f"{m.group(1)}. {polish_exam_text(m.group(2), hint)}"
    jm = re.match(r"^([ㄱ-ㅎ])\.\s*(.*)$", line)
    if jm:
        return f"{jm.group(1)}. {polish_exam_text(jm.group(2), hint)}"
    cm = re.match(r"^([①②③④⑤])\s*(.*)$", line)
    if cm:
        return f"{cm.group(1)} {polish_exam_text(cm.group(2), hint)}"
    if line.startswith("(") and "판례" in line:
        return polish_exam_text(line, hint)
    return polish_exam_text(line, hint)


def rebuild_md(blocks: list[tuple[int, list[str]]], explains: dict) -> str:
    out: list[str] = []
    for i, (qno, lines) in enumerate(blocks):
        if i > 0:
            out.append("")
        if not lines:
            continue
        expl_items = explains.get(qno, {}).get("items") or {}
        for j, line in enumerate(lines):
            hint = ""
            jm = re.match(r"^([ㄱ-ㅎ])\.", line.strip())
            if jm and jm.group(1) in expl_items:
                hint = expl_items[jm.group(1)].get("explanation", "")
            cm = re.match(r"^([①②③④⑤])", line.strip())
            if cm:
                key = str(CHOICE_MARKERS.index(cm.group(1)) + 1)
                hint = expl_items.get(key, {}).get("explanation", hint)
            if j == 0 and not re.match(r"^\d+\.", line.strip()):
                out.append(f"{qno}. {polish_exam_text(line.strip(), hint)}")
            else:
                out.append(polish_line(line, hint))
    return "\n".join(out) + "\n"


def main():
    src = ROOT / "new2016.md"
    if not src.exists():
        print("ERROR: new2016.md missing")
        return 1
    raw = src.read_text(encoding="utf-8")
    blocks = split_blocks(raw)
    if len(blocks) < 30:
        print("ERROR: too few question blocks - save new2016.md in editor (Ctrl+S) then retry")
        return 1

    explains = load_explains()
    text = rebuild_md(blocks, explains)
    for path in [src, ROOT / "data" / "source" / "2016-exam.md"]:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
        print(f"Wrote {path} ({len(text)} chars, {len(blocks)} blocks)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
