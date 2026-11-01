"""Download the Wikimedia Commons photos the site uses into site/photos/.
Run by the Pages workflow; skips files that already exist."""
import json, pathlib, re, time, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = json.loads((ROOT / "scripts" / "photo_sources.json").read_text())
OUT = ROOT / "site" / "photos"
OUT.mkdir(parents=True, exist_ok=True)
UA = "OperationFogCity/1.0 (https://github.com/vosbek/trip-view; trip site)"
ok = fail = 0
for key, url in sorted(SRC.items()):
    dest = OUT / f"{key}.jpg"
    if dest.exists() and dest.stat().st_size > 1000:
        continue
    # Wikimedia only serves standard thumbnail widths; try 960, then 500, then the original.
    cands = [url]
    m = re.match(r"(https://upload\.wikimedia\.org/wikipedia/commons)/thumb/(.+?)/\d+px-[^/]+$", url)
    if m:
        name = url.rsplit("/", 1)[1].split("px-", 1)[1]
        cands = [f"{m.group(1)}/thumb/{m.group(2)}/{w}px-{name}" for w in (960, 500)] + [f"{m.group(1)}/{m.group(2)}"]
    for attempt in range(len(cands)):
        url = cands[attempt]
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=60) as r:
                data = r.read()
            dest.write_bytes(data)
            ok += 1
            print("got", key, len(data) // 1024, "KB")
            break
        except Exception as e:  # noqa: BLE001
            print("next size", key, e)
            time.sleep(1)
    else:
        fail += 1
    time.sleep(0.5)
print(f"downloaded {ok}, failed {fail}")
