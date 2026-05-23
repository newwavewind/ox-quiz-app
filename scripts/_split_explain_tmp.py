#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
src = (ROOT / "2016해설.md").read_text(encoding="utf-8")
lines = src.splitlines(keepends=True)
if not lines and src:
    lines = [src]
ranges = [
    (1, 70, "part1.txt"),
    (71, 140, "part2.txt"),
    (141, 210, "part3.txt"),
    (211, len(lines), "part4.txt"),
]
out_dir = ROOT / "data" / "source" / "_explain_chunks"
out_dir.mkdir(parents=True, exist_ok=True)
for start, end, name in ranges:
    chunk = "".join(lines[start - 1 : end])
    (out_dir / name).write_text(chunk, encoding="utf-8")
    print(f"{name}: lines {start}-{end}, {len(chunk)} bytes")
print(f"Total source lines: {len(lines)}")
