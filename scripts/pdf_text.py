# -*- coding: utf-8 -*-
"""PDF 텍스트 추출·공백 정리 (한글 띄어쓰기 추측 없음)"""

from __future__ import annotations

import re
import unicodedata

CHOICE_MARKERS = "①②③④⑤"


def normalize_whitespace(text: str) -> str:
    """추출 텍스트만 정리. 띄어쓰기를 새로 만들지 않음."""
    if not text:
        return text or ""
    text = unicodedata.normalize("NFC", text)
    text = text.replace("\u200b", "").replace("\ufeff", "")
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    # PDF 줄바꿈: 단어 중간 줄끊김은 붙이고, 문장 경계는 공백 유지
    text = re.sub(r"(?<=[가-힣])\n(?=[가-힣])", "", text)
    text = re.sub(r"\n+", " ", text)
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


def normalize_exam_text(text: str) -> str:
    """기출 본문용: 보기 번호·문항 번호 줄 나눔만 추가."""
    text = normalize_whitespace(text)
    for ch in CHOICE_MARKERS:
        text = text.replace(ch, f"\n{ch}")
    text = re.sub(r"(?<![0-9])(\d{1,2})\.", r"\n\1. ", text)
    text = re.sub(r"\n{2,}", "\n", text)
    return text.strip()


def _gap_needs_space(x0: float, prev_x1: float | None, line_height: float) -> bool:
    if prev_x1 is None:
        return False
    gap = x0 - prev_x1
    if gap <= 0.3:
        return False
    if line_height > 0 and gap > line_height * 0.12:
        return True
    return gap > 1.2


def needs_polish(text: str) -> bool:
    """PDF 추출본처럼 띄어쓰기가 부족한지 판별."""
    if not text or len(text) < 10:
        return False
    spaces = text.count(" ")
    return spaces < max(3, len(text) / 18)


def polish_statement(text: str) -> str:
    """보기 문장: PDF 공백 보존 후, 붙은 구간만 민법 용어 사전으로 보정."""
    text = normalize_whitespace(text)
    from korean_space import space_korean

    return space_korean(text)


def polish_explanation(text: str) -> str:
    """해설: 이미 띄어진 hypers84 등은 유지, 거의 붙은 경우만 보정."""
    text = normalize_whitespace(text)
    if not needs_polish(text):
        return text
    from korean_space import space_korean

    return space_korean(text)


def extract_pdf_layout(pdf_path) -> str:
    """PyMuPDF span 좌표로 PDF에 보이는 띄어쓰기를 최대한 보존."""
    import fitz

    doc = fitz.open(pdf_path)
    pages: list[str] = []
    for page in doc:
        data = page.get_text("dict")
        lines_out: list[str] = []
        for block in data.get("blocks", []):
            if block.get("type") != 0:
                continue
            for line in block.get("lines", []):
                spans = line.get("spans") or []
                if not spans:
                    continue
                bbox = line.get("bbox") or [0, 0, 0, 12]
                line_h = max(bbox[3] - bbox[1], 8.0)
                parts: list[str] = []
                prev_x1: float | None = None
                for sp in spans:
                    t = sp.get("text") or ""
                    if not t:
                        continue
                    sb = sp.get("bbox") or [0, 0, 0, 0]
                    if _gap_needs_space(sb[0], prev_x1, line_h):
                        parts.append(" ")
                    parts.append(t)
                    prev_x1 = sb[2]
                if parts:
                    lines_out.append("".join(parts))
        pages.append("\n".join(lines_out))
    doc.close()
    return normalize_exam_text("\n".join(pages))


def extract_pdf_plain(pdf_path) -> str:
    """기존 방식 (공백이 많이 사라짐)."""
    import fitz

    doc = fitz.open(pdf_path)
    text = "".join(page.get_text() for page in doc)
    doc.close()
    return normalize_exam_text(text)
