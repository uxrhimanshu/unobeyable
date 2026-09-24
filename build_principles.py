"""Write PRINCIPLES.md from principles.json, so the two cannot drift apart.

    python3 build_principles.py
"""
import json, pathlib

ROOT = pathlib.Path(__file__).parent
spec = json.loads((ROOT / "principles.json").read_text())

out = ["# Principles", "",
       "Seven principles, each resting on items coded in "
       "[clicked-through](https://github.com/uxrhimanshu/clicked-through). "
       "Every quote below is checked against the vendored corpus by "
       "`python3 check_trace.py`: the item exists, it carries the code shown, "
       "and the words appear in it verbatim.", "",
       "This file is generated from `principles.json` by `build_principles.py`. "
       "Edit the JSON, not this file.", ""]
for p in spec["principles"]:
    out += [f"## {p['id']} · {p['title']}", "", p["body"], ""]
    for e in p["evidence"]:
        out += [f"> {e['quote']}", "",
                f"[item {e['item_id']}](https://news.ycombinator.com/item?id={e['item_id']}) · `{e['code']}`", ""]
(ROOT / "PRINCIPLES.md").write_text("\n".join(out))
print("wrote PRINCIPLES.md")
