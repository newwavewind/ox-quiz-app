#!/usr/bin/env python3
"""Generate data/source/2025-explain.md from embedded 2025 civil-law explanations."""
from pathlib import Path

from _2025_explain_data_part1 import EXPLANATIONS as PART1
from _2025_explain_data_part2 import EXPLANATIONS_PART2 as PART2
from _2025_explain_data_part3 import EXPLANATIONS_PART3 as PART3

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "source" / "2025-explain.md"

HEADER = """2025년 제36회 공인중개사 1차 1교시 A형
제2과목 : 민법 및 민사특별법 정답 및 해설
"""

EXPLANATIONS = [*PART1, *PART2, *PART3]

# 제36회 최종정답 PDF (1차 민법 41~80)
ANSWER_KEY: dict[int, str] = {
    41: "②", 42: "③", 43: "①", 44: "⑤", 45: "③", 46: "①", 47: "②", 48: "③", 49: "④", 50: "③",
    51: "④", 52: "②", 53: "①", 54: "⑤", 55: "④", 56: "④", 57: "③", 58: "①", 59: "②", 60: "⑤",
    61: "④", 62: "④", 63: "②", 64: "⑤", 65: "①", 66: "③", 67: "⑤", 68: "④", 69: "①", 70: "④",
    71: "⑤", 72: "③", 73: "②", 74: "②", 75: "⑤", 76: "②", 77: "③", 78: "⑤", 79: "①", 80: "②",
}


def format_question(no: int, answer: str, lines: list[str]) -> str:
    parts = [f"{no}. 정답: {answer}", "해설:"]
    parts.extend(lines)
    return "\n".join(parts)


def main() -> None:
    if len(EXPLANATIONS) != 40:
        raise SystemExit(f"Expected 40 questions, got {len(EXPLANATIONS)}")

    for no, answer, _lines in EXPLANATIONS:
        expected = ANSWER_KEY.get(no)
        if expected and answer != expected:
            raise SystemExit(f"Q{no}: embedded answer {answer} != key {expected}")

    body = "\n\n".join(format_question(no, ans, lines) for no, ans, lines in EXPLANATIONS)
    text = HEADER + "\n" + body + "\n"
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(text, encoding="utf-8")
    line_count = len(text.splitlines())
    print(f"Wrote {OUT} ({line_count} lines)")


if __name__ == "__main__":
    main()
