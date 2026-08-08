#!/usr/bin/env python3
"""Convert create-prd evals.json → SkillHone probe.jsonl format."""
import json, re, sys

with open("evals.json") as f:
    data = json.load(f)

lines = []
for e in data["evals"]:
    # Build verification snippet
    verif_lines = [
        "import glob, os",
        "answer_list = sorted(glob.glob('docs/spec/*.md'))",
        "answer = open(answer_list[0]).read().strip() if answer_list else ''",
        "if not answer and os.path.exists('answer.txt'):",
        "    with open('answer.txt') as fh: answer = fh.read().strip()",
        "scores = {}",
    ]
    for a in e["assertions"]:
        name = a["name"]
        typ = a["type"]
        pattern = a["pattern"]
        if typ == "contains":
            verif_lines.append(
                f"scores[{name!r}] = {pattern!r} in answer"
            )
        elif typ == "not_contains":
            verif_lines.append(
                f"scores[{name!r}] = {pattern!r} not in answer"
            )
        elif typ == "regex":
            verif_lines.append(
                f"scores[{name!r}] = bool(re.search({pattern!r}, answer))"
            )
        elif typ == "max_count":
            max_n = a.get("max", 1)
            verif_lines.append(
                f"scores[{name!r}] = len(re.findall({pattern!r}, answer)) <= {max_n}"
            )
        else:
            print(f"WARN: unknown type {typ} for {name}", file=sys.stderr)
            verif_lines.append(f"scores[{name!r}] = True  # uncheckable")

    line = json.dumps({
        "question": e["prompt"],
        "verification": "\n".join(verif_lines),
    }, ensure_ascii=False)
    lines.append(line)

with open("probe.jsonl", "w") as f:
    for l in lines:
        f.write(l + "\n")

print(f"Converted {len(lines)} items → probe.jsonl")
