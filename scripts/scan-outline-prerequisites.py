#!/usr/bin/env python3
"""
Scan public/**/courseOutline and CE outlines for course-code prerequisites.
Writes scripts/data/outline-prerequisites.json

Requires: pip install pypdf (venv recommended)
Then: node scripts/apply-outline-prerequisites.mjs
"""
from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(__file__).resolve().parent / "data" / "outline-prerequisites.json"
COURSE_RE = re.compile(r"\b([A-Z]{2,6})\s*(\d{4}[A-Z]?)\b")


def extract_blocks(text: str) -> list[str]:
    blocks = []
    for m in re.finditer(
        r"Pre[\s\-]?requisites?\s*[:\]]?\s*(.*?)(?=Co[\s\-]?requisites?|Mutually exclusive|Course Website|COURSE DESCRIPTION|Reference|$)",
        text,
        re.I | re.S,
    ):
        blocks.append(re.sub(r"\s+", " ", m.group(1)).strip())
    return blocks


def is_nil(block: str) -> bool:
    if re.fullmatch(
        r"(nil|none|n\.?a\.?|n/a|not applicable|—|-|–|\[ ?\]|\[ ?N\.?A\.? ?\])\.?",
        block.strip(),
        re.I,
    ):
        return True
    if re.match(r"^(nil|none|n\.?a\.?|n/a|not applicable)\b", block.strip(), re.I) and not COURSE_RE.search(
        block
    ):
        return True
    if re.search(r"no pre-?requisite courses", block, re.I) and not COURSE_RE.search(block):
        return True
    return False


def main() -> None:
    pdfs = list((ROOT / "public").glob("**/courseOutline/**/*.pdf")) + list(
        (ROOT / "public").glob("**/outlines/**/*.pdf")
    )
    by_course: dict[str, dict[str, str | None]] = defaultdict(dict)

    for pdf in sorted(pdfs):
        m2 = re.search(r"([A-Z]{2,6})[_\- ]?(\d{4})", pdf.name, re.I)
        course = (m2.group(1) + m2.group(2)).upper() if m2 else None
        if not course:
            continue
        try:
            reader = PdfReader(str(pdf))
            text = "\n".join((p.extract_text() or "") for p in reader.pages[:4])
        except Exception:
            continue
        for block in extract_blocks(text):
            if is_nil(block):
                continue
            for cm in COURSE_RE.finditer(block):
                code = re.sub(r"\s", "", (cm.group(1) + cm.group(2)).upper())
                if code == course:
                    continue
                after = block[cm.end() : cm.end() + 80]
                if re.match(r"\s*(is|are)\s+not\s+required", after, re.I):
                    continue
                title = None
                mtitle = re.search(
                    re.escape(cm.group(0))
                    + r"\s+([A-Z][A-Za-z0-9 &/\-]{2,80}?)(?=\s+and\s+[A-Z]{2,6}|\s*\.|$|\s*\(|\s*Co-|\s*Mutually|\s*Course|\s+is\s+not)",
                    block,
                )
                if mtitle:
                    title = mtitle.group(1).strip(" .;,-")
                prev = by_course[course].get(code)
                if title and (not prev or len(title) > len(prev or "")):
                    by_course[course][code] = title
                elif code not in by_course[course]:
                    by_course[course][code] = title

    ce_path = ROOT / "public/common-electives/26-27/index.json"
    title_map: dict[str, str] = {}
    if ce_path.exists():
        ce = json.loads(ce_path.read_text())
        for entry in ce.get("courses", []):
            code = entry.get("courseCode")
            if not code:
                continue
            if entry.get("courseTitle"):
                title_map[code] = entry["courseTitle"]
            for p in entry.get("prerequisites") or []:
                pc = p.get("courseCode")
                if not pc:
                    continue
                by_course[code][pc] = p.get("courseTitle") or by_course[code].get(pc)
        for p in ce.get("prerequisiteIndex") or []:
            if p.get("courseCode") and (p.get("courseTitle") or p.get("title")):
                title_map[p["courseCode"]] = p.get("courseTitle") or p["title"]

    for pack in ("msba", "mgm", "mecon"):
        path = ROOT / "public" / pack / "courses.json"
        if not path.exists():
            continue
        for c in json.loads(path.read_text()):
            title_map[c["courseCode"]] = c["courseTitle"]

    out: dict[str, list[dict]] = {}
    for course, codes in sorted(by_course.items()):
        if not codes:
            continue
        out[course] = [
            {
                "courseCode": code,
                "courseTitle": title_map.get(code) or title,
            }
            for code, title in sorted(codes.items())
        ]

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n")
    print(f"Wrote {OUT} ({len(out)} courses)")


if __name__ == "__main__":
    main()
