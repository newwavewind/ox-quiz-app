#!/usr/bin/env python3
import json
from pathlib import Path

TRANSCRIPT = Path(
    r"C:\Users\상토시\.cursor\projects\c-Users-ox-quiz-app\agent-transcripts"
    r"\87ba07f9-4d83-4cce-9bfa-4dbbda61bfc3\87ba07f9-4d83-4cce-9bfa-4dbbda61bfc3.jsonl"
)
OUT = Path(__file__).resolve().parent.parent / "data" / "source" / "2016-exam-pristine.md"

for line in TRANSCRIPT.open(encoding="utf-8"):
    if "2016-exam.md" not in line or '"Write"' not in line:
        continue
    o = json.loads(line)
    for c in o.get("message", {}).get("content", []):
        if c.get("name") != "Write":
            continue
        path = c.get("input", {}).get("path", "")
        if path.endswith("2016-exam.md") and "source" in path.replace("\\", "/"):
            text = c["input"].get("contents", "")
            if len(text) > 5000:
                OUT.write_text(text, encoding="utf-8")
                print(f"OK {len(text)} chars -> {OUT}")
                raise SystemExit(0)
print("FAIL")
