"""Fetch real walking/driving routes for each trip leg into site/data/routes.json.

Uses the FOSSGIS OSRM servers (OpenStreetMap data), falling back to the OSRM demo
server for driving. Re-fetches only legs whose endpoints changed."""
import json, math, pathlib, time, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
LEGS = json.loads((ROOT / "scripts" / "legs.json").read_text())
OUT = ROOT / "site" / "data" / "routes.json"
UA = "OperationFogCity/1.0 (https://github.com/vosbek/Trip-view)"
old = json.loads(OUT.read_text()) if OUT.exists() else {}


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def thin(coords, min_m=8):
    out = [coords[0]]
    for lon, lat in coords[1:]:
        plon, plat = out[-1]
        dx = (lon - plon) * 111320 * math.cos(math.radians(lat))
        dy = (lat - plat) * 110540
        if math.hypot(dx, dy) >= min_m:
            out.append([lon, lat])
    if out[-1] != coords[-1]:
        out.append(coords[-1])
    return [[round(a, 5), round(b, 5)] for a, b in out]


routes = {}
for leg in LEGS:
    key = f"{leg['from']}{leg['to']}{leg['mode']}"
    prev = old.get(leg["id"])
    if prev and prev.get("key") == key:
        routes[leg["id"]] = prev
        continue
    (alon, alat), (blon, blat) = leg["from"], leg["to"]
    pair = f"{alon},{alat};{blon},{blat}?overview=full&geometries=geojson"
    foot = leg["mode"] == "walk"
    urls = [f"https://routing.openstreetmap.de/routed-{'foot' if foot else 'car'}/route/v1/driving/{pair}"]
    if not foot:
        urls.append(f"https://router.project-osrm.org/route/v1/driving/{pair}")
    for url in urls:
        try:
            d = get(url)
            r = d["routes"][0]
            routes[leg["id"]] = {
                "key": key, "mode": leg["mode"],
                "min": round(r["duration"] / 60, 1), "km": round(r["distance"] / 1000, 2),
                "coords": thin(r["geometry"]["coordinates"]),
            }
            print("route", leg["id"], leg["mode"], routes[leg["id"]]["min"], "min")
            break
        except Exception as e:  # noqa: BLE001
            print("fail", leg["id"], url[:60], e)
            time.sleep(2)
    time.sleep(1.2)

OUT.write_text(json.dumps(routes, separators=(",", ":")))
print("wrote", len(routes), "routes")
