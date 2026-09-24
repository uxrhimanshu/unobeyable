"""Re-vendor the coded items from clicked-through at a pinned commit.

Writes vendor/coded.csv (item_id, code) and vendor/items.csv (item_id, code,
permalink, text) for the 76 coded items only. Author fields are not copied.

    python3 vendor/refresh.py            # uses vendor/SOURCE_SHA
    python3 vendor/refresh.py <sha>      # re-pins to another commit
"""
import base64, csv, io, json, pathlib, subprocess, sys

REPO = "uxrhimanshu/clicked-through"
HERE = pathlib.Path(__file__).parent


def gh(path):
    return json.loads(subprocess.run(["gh", "api", path], check=True,
                                     capture_output=True, text=True).stdout)


def blob(sha, path):
    tree = gh(f"repos/{REPO}/git/trees/{sha}?recursive=1")["tree"]
    blob_sha = next(t["sha"] for t in tree if t["path"] == path)
    return base64.b64decode(gh(f"repos/{REPO}/git/blobs/{blob_sha}")["content"]).decode()


def main():
    sha = sys.argv[1] if len(sys.argv) > 1 else (HERE / "SOURCE_SHA").read_text().strip()
    csv.field_size_limit(10**8)
    coded_text = blob(sha, "coded.csv")
    coded = {r["item_id"]: r["code"] for r in csv.DictReader(io.StringIO(coded_text))}
    corpus = {r["item_id"]: r for r in csv.DictReader(io.StringIO(blob(sha, "corpus/corpus.csv")))}
    (HERE / "coded.csv").write_text(coded_text)
    with open(HERE / "items.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["item_id", "code", "permalink", "text"])
        for iid, code in coded.items():
            r = corpus[iid]
            w.writerow([iid, code, r["permalink"], r["text"]])
    (HERE / "SOURCE_SHA").write_text(sha + "\n")
    print(f"vendored {len(coded)} items from {REPO}@{sha[:7]}")


if __name__ == "__main__":
    main()
