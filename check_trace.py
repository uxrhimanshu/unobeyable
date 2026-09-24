"""Check that every design principle rests on real, correctly coded evidence.

For each evidence entry in principles.json:
  - the item_id exists in vendor/coded.csv
  - it is coded there with the code the principle claims
  - the quote appears verbatim in that item's text (vendor/items.csv)

Also checks that PRINCIPLES.md and index.html carry no quote that is not in
principles.json, so prose cannot drift away from the traced evidence.

    python3 check_trace.py
"""
import csv, html, json, pathlib, re, sys

ROOT = pathlib.Path(__file__).parent
csv.field_size_limit(10**8)


def norm(s):
    return re.sub(r"\s+", " ", html.unescape(s)).strip()


def main():
    coded = {r["item_id"]: r["code"] for r in csv.DictReader(open(ROOT / "vendor/coded.csv"))}
    text = {r["item_id"]: norm(r["text"]) for r in csv.DictReader(open(ROOT / "vendor/items.csv"))}
    spec = json.loads((ROOT / "principles.json").read_text())
    errors, quotes, n = [], set(), 0

    for p in spec["principles"]:
        for e in p["evidence"]:
            n += 1
            iid, code, quote = e["item_id"], e["code"], norm(e["quote"])
            quotes.add(quote)
            if iid not in coded:
                errors.append(f"{p['id']}: item {iid} is not in coded.csv")
                continue
            if coded[iid] != code:
                errors.append(f"{p['id']}: item {iid} is coded {coded[iid]}, not {code}")
            if quote not in text[iid]:
                errors.append(f"{p['id']}: quote not found in item {iid}: {quote[:60]}")

    # Quotes in prose must be ones that were traced above.
    for name in ("PRINCIPLES.md", "index.html"):
        f = ROOT / name
        if not f.exists():
            continue
        for q in re.findall(r"<q[^>]*>(.*?)</q>|^> (.+)$", f.read_text(), re.M):
            q = norm(re.sub(r"<[^>]+>", "", q[0] or q[1]))
            if q and "${" not in q and q not in quotes:
                errors.append(f"{name}: quote not traced in principles.json: {q[:60]}")

    for e in errors:
        print("FAIL", e)
    print(f"{n} evidence entries across {len(spec['principles'])} principles; {len(errors)} problems")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
