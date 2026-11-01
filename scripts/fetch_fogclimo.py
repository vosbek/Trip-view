"""November fog and low-cloud climatology by hour for two stations, from the
Iowa Environmental Mesonet ASOS archive: Half Moon Bay airport (coast) and SFO (bay).
An hour counts as foggy when visibility is under 3 miles or a broken/overcast
ceiling sits under 1,000 ft. Writes site/data/fogclimo.json; skipped if present."""
import csv, io, json, pathlib, time, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "site" / "data" / "fogclimo.json"
if OUT.exists():
    print("fogclimo.json already present"); raise SystemExit
UA = "OperationFogCity/1.0 (https://github.com/vosbek/Trip-view)"
STATIONS = {"HAF": "Half Moon Bay airport", "SFO": "SFO"}
Y0, Y1 = 2011, 2025
out = {"years": f"Nov {Y0}–{Y1}", "definition": "visibility < 3 mi or BKN/OVC ceiling < 1,000 ft", "stations": {}}
for sid, name in STATIONS.items():
    hits = [0] * 24; tot = [0] * 24
    for y in range(Y0, Y1 + 1):
        url = ("https://mesonet.agron.iastate.edu/cgi-bin/request/asos.py?"
               f"station={sid}&data=vsby&data=skyc1&data=skyl1&data=skyc2&data=skyl2"
               f"&year1={y}&month1=11&day1=1&year2={y}&month2=12&day2=1"
               "&tz=America%2FLos_Angeles&format=onlycomma&latlon=no&missing=M&trace=T&direct=no&report_type=3")
        for attempt in range(4):
            try:
                req = urllib.request.Request(url, headers={"User-Agent": UA})
                with urllib.request.urlopen(req, timeout=120) as r:
                    text = r.read().decode()
                break
            except Exception as e:  # noqa: BLE001
                print("retry", sid, y, e); time.sleep(10 * (attempt + 1))
        else:
            continue
        seen = set()
        for row in csv.DictReader(io.StringIO(text)):
            ts = row.get("valid", "")
            if len(ts) < 13: continue
            key = ts[:13]
            if key in seen: continue
            seen.add(key)
            h = int(ts[11:13])
            def num(v):
                try: return float(v)
                except (TypeError, ValueError): return None
            vs = num(row.get("vsby"))
            low = False
            for c, l in (("skyc1", "skyl1"), ("skyc2", "skyl2")):
                if row.get(c) in ("BKN", "OVC", "VV") and (num(row.get(l)) or 99999) < 1000:
                    low = True
            if vs is None and not low: continue
            tot[h] += 1
            if low or (vs is not None and vs < 3): hits[h] += 1
        print(sid, y, sum(tot))
        time.sleep(1.5)
    out["stations"][sid] = {"name": name, "n": sum(tot), "hours": [round(100 * a / b, 1) if b else 0 for a, b in zip(hits, tot)]}
OUT.write_text(json.dumps(out, indent=1))
print("wrote", OUT)
