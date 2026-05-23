#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""보기·지문 띄어쓰기 보정 (기존 공백 유지 + 사전·해설 힌트)."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

from korean_space import fix_glued_phrases  # noqa: E402

_EXPL_LEAD = re.compile(
    r"^[\s\*]*(?:[ㄱ-ㅎ①②③④⑤]|\d+)\.?\s*\([OX]\)\s*|^[\s\*]*(?:[①②③④⑤])\s*\([OX]\)\s*",
    re.IGNORECASE,
)


def repair_wrong_spaces(text: str) -> str:
    """줄바꿈 병합 후 남은 '경우 에도', '놓 인' 등 잘못된 공백 제거."""
    if not text:
        return text
    rules = [
        (r"([가-힣]) 에도\b", r"\1에도"),
        (r"([가-힣]) 인 때", r"\1인 때"),
        (r"([가-힣]) 로 볼", r"\1로 볼"),
        (r"([가-힣]{2,}) 의 효력", r"\1의 효력"),
        (r"([가-힣]) 반송 되", r"\1반송 되"),
        (r"([가-힣]{1,}) 의 ", r"\1의 "),
        (r"놓 인", "놓인"),
        (r"알 수 있는 객관적 상태에 놓 인", "알 수 있는 객관적 상태에 놓인"),
        (r"때에의사", "때에 의사"),
        (r"는도달", "는 도달"),
        (r"의사표시의효력", "의사표시의 효력"),
        (r"위반한조건", "위반한 조건"),
        (r"조건이붙은", "조건이 붙은"),
        (r"붙은법률", "붙은 법률"),
        (r"매매 계약", "매매계약"),
        (r"의한임대차", "의한 임대차"),
    ]
    out = text
    for pat, repl in rules:
        out = re.sub(pat, repl, out)
    return out


def extract_display_from_explanation(explanation: str) -> str | None:
    """해설 문장(민법·판례 인용 전)을 보기 표시용으로 사용할 수 있으면 반환."""
    if not explanation:
        return None
    expl = _EXPL_LEAD.sub("", explanation.strip())
    m = re.match(r"^(.+?)(?:\s*\(민법|\s*\(대판)", expl)
    if not m:
        return None
    core = m.group(1).strip().rstrip(".,·")
    if 12 <= len(core) <= 400:
        return core
    return None


def merge_spacing_from_explanation(text: str, explanation: str) -> str:
    """해설에 이미 맞춰진 띄어쓰기 구간을 붙은 보기 문장에 반영."""
    if not text or not explanation:
        return text
    expl = _EXPL_LEAD.sub("", explanation.strip())
    out = text
    seen: set[str] = set()
    for m in re.finditer(r"[가-힣][가-힣\s·]{3,}[가-힣]", expl):
        phrase = re.sub(r"\s+", " ", m.group()).strip()
        if " " not in phrase or len(phrase) < 5:
            continue
        glued = phrase.replace(" ", "")
        if glued in seen or glued == phrase or len(glued) < 4:
            continue
        if glued in out:
            out = out.replace(glued, phrase, 1)
            seen.add(glued)
    return out


def polish_exam_text(text: str, explanation: str = "") -> str:
    if not text:
        return text
    from import_md_year import strip_exam_decorations

    out = strip_exam_decorations(text)
    out = repair_wrong_spaces(out)
    out = fix_glued_phrases(out)
    if explanation:
        out = merge_spacing_from_explanation(out, explanation)
        out = repair_wrong_spaces(out)
        out = fix_glued_phrases(out)
    return strip_exam_decorations(out)
