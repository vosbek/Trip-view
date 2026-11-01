"""Download the Wikimedia Commons photos the site uses into site/photos/.

Run by the Pages workflow. Skips files that already exist, asks only for
Wikimedia's standard thumbnail widths, backs off on HTTP 429, and re-encodes
everything to at most 960 px wide so the page stays light."""
import io, json, pathlib, re, time, urllib.error, urllib.request

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = json.loads((ROOT / "scripts" / "photo_sources.json").read_text())
OUT = ROOT / "site" / "photos"
OUT.mkdir(parents=True, exist_ok=True)
UA = "OperationFogCity/1.0 (https://github.com/vosbek/trip-view; personal trip site) python-urllib"


def candidates(url):
    m = re.match(r"(https://upload\.wikimedia\.org/wikipedia/commons)/thumb/(.+?)/\d+px-[^/]+$", url)
    if not m:
        return [url]
    name = url.rsplit("/", 1)[1].split("px-", 1)[1]
    return [f"{m.group(1)}/thumb/{m.group(2)}/{w}px-{name}" for w in (960, 500)] + [f"{m.group(1)}/{m.group(2)}"]


def fetch(url):
    for attempt in range(6):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=90) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code == 429:
                wait = int(e.headers.get("Retry-After") or 0) or 20 * (attempt + 1)
                print(f"  429, waiting {wait}s")
                time.sleep(wait)
                continue
            raise
    raise RuntimeError("still rate limited")


def save(dest, data):
    im = Image.open(io.BytesIO(data)).convert("RGB")
    if im.width > 960:
        im = im.resize((960, round(im.height * 960 / im.width)), Image.LANCZOS)
    im.save(dest, "JPEG", quality=80, optimize=True, progressive=True)


ok = fail = 0
for key, url in sorted(SRC.items()):
    dest = OUT / f"{key}.jpg"
    if dest.exists() and dest.stat().st_size > 1000:
        continue
    for cand in candidates(url):
        try:
            save(dest, fetch(cand))
            ok += 1
            print("got", key, dest.stat().st_size // 1024, "KB")
            break
        except Exception as e:  # noqa: BLE001
            print("next size", key, str(e)[:120])
    else:
        fail += 1
    time.sleep(4)
print(f"downloaded {ok}, failed {fail}")
