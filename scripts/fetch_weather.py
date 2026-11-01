"""Pull the National Weather Service forecast for San Francisco into
site/data/weather.json. The NWS publishes about seven days out, so trip days
fill in as they come into range."""
import datetime, json, pathlib, re, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "site" / "data" / "weather.json"
UA = "OperationFogCity/1.0 (https://github.com/vosbek/Trip-view)"


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/geo+json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


prev = json.loads(OUT.read_text()) if OUT.exists() else {"days": {}}
pt = get("https://api.weather.gov/points/37.7955,-122.4180")
periods = get(pt["properties"]["forecast"])["properties"]["periods"]
days = dict(prev.get("days", {}))
fresh = {}
for p in periods:
    date = p["startTime"][:10]
    if not date.startswith("2026-11-") or not (14 <= int(date[-2:]) <= 20):
        continue
    d = fresh.setdefault(date, {"hi": None, "lo": None, "pop": None, "wind": "", "short": ""})
    pop = (p.get("probabilityOfPrecipitation") or {}).get("value")
    if p["isDaytime"]:
        d.update(hi=p["temperature"], short=p["shortForecast"], wind=f"{p['windDirection']} {p['windSpeed']}".strip())
        d["pop"] = pop if pop is not None else d["pop"]
    else:
        d["lo"] = p["temperature"]
        if pop is not None:
            d["pop"] = max(pop, d["pop"] or 0)
        if not d["short"]:
            d["short"] = p["shortForecast"] + " (night)"
for k, v in fresh.items():
    v["wind"] = re.sub(r"\s+", " ", v["wind"])
    days[k] = v
out = {"updated": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="minutes"), "source": "api.weather.gov", "days": days}
OUT.write_text(json.dumps(out, indent=1))
print("trip days with forecast:", sorted(fresh) or "none yet")
