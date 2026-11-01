"""Assemble the schematic city pack for Operation Fog City.

Sources
- hausfath/sf-train-set data/sf_data.json (MIT code; OSM data (c) OpenStreetMap
  contributors, ODbL; SRTM elevation): land, parks, piers, roads, buildings, DEM.
- plotly/datasets geojson-counties-fips.json (US Census cartographic boundaries,
  public domain): coarse land outlines for the counties around SF.
- bilawalsidhu/gods-eye-view src/data/local_data/neighborhoods/san-francisco.json
  (DataSF Analysis Neighborhoods, PDDL).

Everything is written in the sf-train-set local frame: 1 unit = 100 m,
x east, z south, origin at the bbox centre. The page converts back to lon/lat.
"""
import json, math, sys
from shapely.geometry import Polygon, MultiPolygon, box, mapping
from shapely.ops import unary_union

SRC = sys.argv[1]
COUNTIES = sys.argv[2]
HOODS = sys.argv[3]
OUT = sys.argv[4]

S, W, N, E = 37.70, -122.53, 37.84, -122.33
LAT0, LON0 = (S + N) / 2, (W + E) / 2
KY = 111.32e3 / 100.0
KX = 111.32e3 * math.cos(math.radians(LAT0)) / 100.0


def proj(lon, lat):
    return ((lon - LON0) * KX, -(lat - LAT0) * KY)


def r(v):
    return round(v, 2)


d = json.load(open(SRC))

out = {
    "origin": {"lat0": LAT0, "lon0": LON0, "kx": KX, "ky": KY,
               "bbox": [S, W, N, E]},
    "land": d["land"],
    "green": {k: v for k, v in d["green"].items() if v},
    "piers": d["piers"],
    "roads": [[c, p] for c, _b, t, _n, p in d["roads"] if not t],
    "tall": [[t["name"], t["h"], t["rings"]] for t in d["tall"]],
    "elev": {"nx": d["elev"]["nx"], "ny": d["elev"]["ny"], "z": d["elev"]["z"],
             "bbox": [S, W, N, E]},
    "bld_n": d["bld_n"],
    "bld_b64": d["bld_b64"],
}

# Golden Gate Bridge alignment (from the OSM bridge ways)
ggb = [b[2] for b in d["bridges"] if b[0] == "Golden Gate Bridge"]
pts = [p for seg in ggb for p in seg]
pts.sort(key=lambda p: p[1])  # south (z larger) -> north
out["ggb"] = [pts[-1], pts[0]]


def chaikin(coords, n=2):
    for _ in range(n):
        res = []
        for i in range(len(coords) - 1):
            (x0, y0), (x1, y1) = coords[i], coords[i + 1]
            res += [(0.75 * x0 + 0.25 * x1, 0.75 * y0 + 0.25 * y1),
                    (0.25 * x0 + 0.75 * x1, 0.25 * y0 + 0.75 * y1)]
        res.append(res[0])
        coords = res
    return coords


# Surrounding counties, outside the detailed SF box
cty = json.load(open(COUNTIES))
want = {"06041", "06081", "06001", "06013", "06097", "06095", "06055", "06085"}
sfbox = box(*proj(W, N), *proj(E, S))
sfbox = box(min(sfbox.bounds[0], sfbox.bounds[2]), min(sfbox.bounds[1], sfbox.bounds[3]),
            max(sfbox.bounds[0], sfbox.bounds[2]), max(sfbox.bounds[1], sfbox.bounds[3]))
polys = []
for f in cty["features"]:
    if f["id"] not in want:
        continue
    g = f["geometry"]
    parts = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
    for part in parts:
        ring = [proj(lon, lat) for lon, lat in part[0]]
        polys.append(Polygon(chaikin(ring, 2)).buffer(0))
region = unary_union(polys).difference(sfbox)
geoms = list(region.geoms) if hasattr(region, "geoms") else [region]
out["region"] = []
for g in geoms:
    g = g.simplify(0.2)
    if g.is_empty or g.area < 1:
        continue
    out["region"].append([[[r(x), r(y)] for x, y in g.exterior.coords]])

# Neighborhoods (outlines only)
hoods = json.load(open(HOODS))
out["hoods"] = []
for f in hoods["features"]:
    g = f["geometry"]
    parts = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
    rings = []
    for part in parts:
        p = Polygon([proj(lon, lat) for lon, lat in part[0]]).simplify(0.15)
        rings.append([[r(x), r(y)] for x, y in p.exterior.coords])
    c = unary_union([Polygon(x) for x in rings]).representative_point()
    out["hoods"].append([f["properties"]["name"], [r(c.x), r(c.y)], rings])

s = json.dumps(out, separators=(",", ":"))
open(OUT, "w").write(s)
print("wrote", OUT, len(s) // 1024, "KB")
for k, v in out.items():
    print(" ", k, len(json.dumps(v, separators=(",", ":"))) // 1024, "KB")

# ---- upsampled DEM with a land mask (so water stays flat at sea level) ----
import numpy as np, base64
from shapely import contains_xy
el = d["elev"]; nx, ny = el["nx"], el["ny"]
Z = np.array(el["z"], dtype=float).reshape(ny, nx)          # row 0 = south
F = 4
NX2, NY2 = (nx - 1) * F + 1, (ny - 1) * F + 1
xs = np.linspace(0, nx - 1, NX2); ys = np.linspace(0, ny - 1, NY2)
X, Y = np.meshgrid(xs, ys)
x0 = np.floor(X).astype(int).clip(0, nx - 2); y0 = np.floor(Y).astype(int).clip(0, ny - 2)
fx = X - x0; fy = Y - y0
Z2 = (Z[y0, x0] * (1 - fx) * (1 - fy) + Z[y0, x0 + 1] * fx * (1 - fy)
      + Z[y0 + 1, x0] * (1 - fx) * fy + Z[y0 + 1, x0 + 1] * fx * fy)
lons = W + (E - W) * X / (nx - 1); lats = S + (N - S) * Y / (ny - 1)
px = (lons - LON0) * KX; pz = -(lats - LAT0) * KY
land_polys = [Polygon(p[0], p[1:]) for p in d["land"]]
landU = unary_union([p.buffer(0) for p in land_polys])
mask = contains_xy(landU, px.ravel(), pz.ravel()).reshape(Z2.shape)
Z2 = np.where(mask, np.maximum(Z2, 3.0), 0.0)
Z2 = np.where(lats > 37.8125, 0.0, Z2)  # keep Marin flat like the rest of the county
out["elev"] = {"nx": NX2, "ny": NY2, "bbox": [S, W, N, E],
               "b64": base64.b64encode(np.round(Z2).astype("<i2").tobytes()).decode()}
s = json.dumps(out, separators=(",", ":"))
open(OUT, "w").write(s)
print("dem", NX2, NY2, float(Z2.max()), "land cells", int(mask.sum()), "total", len(s)//1024, "KB")
