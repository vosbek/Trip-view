"""Download the Wikimedia Commons photos the site uses into site/photos/.
Run by the Pages workflow; skips files that already exist."""
import json, pathlib, time, urllib.request

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
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=60) as r:
                data = r.read()
            dest.write_bytes(data)
            ok += 1
            print("got", key, len(data) // 1024, "KB")
            break
        except Exception as e:  # noqa: BLE001
            print("retry", key, e)
            time.sleep(3 * (attempt + 1))
    else:
        fail += 1
    time.sleep(0.5)
print(f"downloaded {ok}, failed {fail}")
