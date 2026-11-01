'use strict';
/* Operation Fog City — trip globe built on the God's Eye View stack. */

const C = window.Cesium;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const LOW = matchMedia('(pointer: coarse)').matches || innerWidth < 860 || (navigator.hardwareConcurrency || 8) <= 4;
const IN_CLAUDE = !!(window.claude && typeof window.claude.use === 'function');
// Preview a moment of the trip: ?now=2026-11-14T22:40:00Z (ignored when invalid).
const NOW_OFFSET = (() => { try { const q = new URLSearchParams(location.search).get('now'); const t = q ? Date.parse(q) : NaN; return Number.isFinite(t) ? t - Date.now() : 0; } catch { return 0; } })();
const tripNow = () => Date.now() + NOW_OFFSET;
const perf = { fogSteps: LOW ? 10 : 20, near: LOW ? 4500 : 7500, level: 0 };
const $ = (s) => document.querySelector(s);
const el = (tag, attrs = {}, kids = []) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null && v !== false) n.setAttribute(k, v === true ? '' : v);
  }
  for (const c of [].concat(kids)) if (c != null) n.append(c);
  return n;
};

/* ───────────────────────── Trip ───────────────────────── */
const HOTEL = { lat: 37.8063, lon: -122.4170 };
const HYATT = { lat: 37.7946, lon: -122.3954 };
const AVIS = { lat: 37.8069, lon: -122.4201 };
const ORIGIN = { code: 'CMH', lat: 39.998, lon: -82.8919 };
const SFO = { code: 'SFO', lat: 37.6152, lon: -122.3900 };
const LANDING_UTC = Date.UTC(2026, 10, 14, 17, 30); // 9:30 AM PST, Sat Nov 14

const DAYS = [
  { id: 'sat', dw: 'SAT', dn: 14, tag: 'Coast', out: true,
    title: 'The city & the coast', eyebrow: 'Saturday · West side · Rideshare',
    sub: 'Arrive, drop bags, then Presidio art, the Lands End trail and Sutro Baths for sunset.',
    stops: [
      { t: '9:30–11:30 AM', n: 'Wheels down → Kimpton Alton', lat: SFO.lat, lon: SFO.lon, range: 9000, d: 'Land at SFO, collect bags, rideshare to the hotel and leave luggage at the front desk before check-in.', also: HOTEL },
      { via: 'drive', t: '11:30 AM', n: "Quick lunch at the Wharf", until: '12:00 PM', lat: 37.8080, lon: -122.4177, range: 900, d: 'Something simple near the hotel. Keep it short to save the afternoon light.' },
      { via: 'drive', t: '12:15 PM', n: 'Palace of Fine Arts', until: '12:55 PM', lat: 37.8029, lon: -122.4484, must: true, range: 700, d: 'The rotunda, colonnades and lagoon, built for the 1915 Panama-Pacific Exposition. Outdoor architecture rather than a museum.' },
      { via: 'walk', t: '1:05 PM', n: 'Yoda Fountain', until: '1:30 PM', lat: 37.7986, lon: -122.4497, must: true, range: 450, d: 'The bronze Yoda at Lucasfilm\'s One Letterman campus in the Presidio. Outdoors and open on weekends.' },
      { via: 'walk', t: '1:35 PM', n: "Lovers' Lane + Wood Line", until: '2:20 PM', lat: 37.7931, lon: -122.4485, must: true, range: 650, d: "Walk part of the Presidio's oldest footpath to Andy Goldsworthy's Wood Line, eucalyptus trunks laid in a long curving line through the grove. Prioritize Wood Line over finishing the lane." },
      { leg: true, t: '2:20 PM', n: 'Rideshare west to Lands End Lookout' },
      { via: 'drive', t: '2:50 PM', n: 'Lands End Coastal Trail', until: '3:55 PM', lat: 37.7838, lon: -122.5081, must: true, range: 1500, d: 'Out-and-back toward Mile Rock for cypress, Pacific and Golden Gate views. Stairs and uneven ground. Turn around in time for the baths.' },
      { via: 'walk', t: '3:55 PM', n: 'Sutro Baths + sunset', until: '5:00 PM', lat: 37.7804, lon: -122.5137, must: true, range: 700, d: 'Ruins of an 1896 bathhouse that once held seven pools. Sunset is about 4:58. Stay off the rocks and away from the surf.' },
      { via: 'drive', t: '6:30 PM', n: 'Dinner: North Beach or the Wharf', until: '9:00 PM', lat: 37.8008, lon: -122.4101, flex: true, range: 900, d: 'Check in and freshen up, then North Beach for dinner. Pier 39 and Ghirardelli Square are easy add-ons near the hotel.' },
    ] },
  { id: 'sun', dw: 'SUN', dn: 15, tag: 'Redwoods', out: true,
    title: 'Redwood road trip', eyebrow: 'Sunday · Marin County · Rental car',
    sub: 'Across the Golden Gate to the old-growth redwoods, the Pacific cliffs and Sausalito, then the classic bridge views.',
    stops: [
      { t: '7:30 AM', n: 'Pick up the rental car', until: '8:00 AM', lat: AVIS.lat, lon: AVIS.lon, range: 700, d: 'Avis at Anchorage Square, 500 Beach St, a short walk from the hotel. Leave luggage and laptops at the hotel.' },
      { leg: true, t: '8:00 AM', n: 'North across the Golden Gate Bridge' },
      { via: 'drive', t: '9:00 AM', n: 'Muir Woods', until: '10:45 AM', lat: 37.8916, lon: -122.5716, must: true, range: 2200, d: 'Main Trail along Redwood Creek through coast redwoods, some over 1,000 years old. About 90 minutes. Timed parking reservation required, and there\'s no signal.' },
      { via: 'drive', t: '11:15 AM', n: 'Muir Beach Overlook', until: '11:45 AM', lat: 37.8622, lon: -122.5866, must: true, range: 1200, d: 'Cliff-top WWII lookout over the Pacific. Windy. Stay behind the rails.' },
      { via: 'drive', t: '12:30 PM', n: 'Sausalito waterfront + lunch', until: '1:45 PM', lat: 37.8596, lon: -122.4848, range: 1000, d: 'Harbor walk on Bridgeway. Bar Bocce does pizza on the sand.' },
      { via: 'drive', t: '2:00 PM', n: 'Battery Spencer', until: '2:45 PM', lat: 37.8277, lon: -122.4836, must: true, range: 1300, d: 'The classic elevated shot of the Golden Gate Bridge from the Marin Headlands. Parking is tight; allow extra time.' },
      { via: 'drive', t: '3:00 PM', n: 'Bridge Welcome Center', until: '4:15 PM', lat: 37.8077, lon: -122.4752, must: true, range: 1100, d: 'Drive south across the bridge, see the exhibits and walk a stretch of the span if the weather allows.' },
      { via: 'drive', t: '4:15 PM', n: 'Return the car + dinner', until: '6:00 PM', lat: AVIS.lat, lon: AVIS.lon, range: 800, d: 'Refuel, return the car to Avis during business hours, then an easy dinner before QCon.' },
    ] },
  { id: 'mon', dw: 'MON', dn: 16, tag: 'QCon',
    title: 'QCon begins', eyebrow: 'Monday · Conference · Evening out',
    sub: 'Keynotes and sessions at the Hyatt Regency, then Italian in North Beach.',
    stops: [
      { t: '7:15 AM', n: 'F-line streetcar to the Embarcadero', lat: 37.8077, lon: -122.4146, range: 900, d: 'The historic F Market & Wharves line runs from near the hotel along the waterfront. Badge pickup opens at 7:15.' },
      { via: 'streetcar', t: '9 AM–7 PM', n: 'QCon day 1', lat: HYATT.lat, lon: HYATT.lon, conf: true, range: 800, d: 'Badge pickup from 7:15, keynote at 9 in the Grand Ballroom, sessions until 6, then the 6–7 PM social.' },
      { via: 'drive', t: '7:15 PM', n: 'North Beach dinner', until: '9:00 PM', lat: 37.8008, lon: -122.4101, range: 800, d: 'Italian food and a walk around Washington Square. Waymo or Uber back.' },
    ] },
  { id: 'tue', dw: 'TUE', dn: 17, tag: 'QCon',
    title: 'Conference & Chinatown', eyebrow: 'Tuesday · Conference · Evening out',
    sub: 'Day two at QCon, then dinner on Grant Avenue and a cable car if they\'re running.',
    stops: [
      { t: '9 AM–6:30 PM', n: 'QCon day 2', lat: HYATT.lat, lon: HYATT.lon, conf: true, range: 800, d: 'Breakfast from 8, keynote at 9, sessions until 6, then a short reception.' },
      { via: 'walk', t: '7:15 PM', n: 'Chinatown + cable cars', until: '9:30 PM', lat: 37.7908, lon: -122.4058, range: 700, d: 'In through the Dragon Gate and up Grant Avenue for dinner, then a cable car ride. The Cable Car Museum is better in daylight.' },
    ] },
  { id: 'wed', dw: 'WED', dn: 18, tag: 'QCon',
    title: 'QCon finale', eyebrow: 'Wednesday · Conference · Evening out',
    sub: 'Last main conference day, then a pier full of antique arcade machines.',
    stops: [
      { t: '9 AM–6 PM', n: 'QCon day 3', lat: HYATT.lat, lon: HYATT.lon, conf: true, range: 800, d: 'Keynote at 9, sessions until 4:45, the closing reception, then an evening keynote at 5:15.' },
      { via: 'drive', t: '7:00 PM', n: 'Musée Mécanique', until: '8:00 PM', lat: 37.8094, lon: -122.4159, flex: true, range: 500, d: 'A free hall of coin-operated games and automatons on Pier 45, some over 100 years old. Bring quarters. Get there before it closes.' },
    ] },
  { id: 'thu', dw: 'THU', dn: 19, tag: 'Training',
    title: 'Training + After Dark', eyebrow: 'Thursday · QCon training · Evening event',
    sub: 'A full day of QCon workshops, then an adults-only night at the Exploratorium.',
    stops: [
      { t: '9 AM–4 PM', n: 'QCon training day 1', lat: HYATT.lat, lon: HYATT.lon, conf: true, range: 800, d: 'Two half-day workshops, 9 AM and 1 PM.' },
      { via: 'walk', t: '6–10 PM', n: 'Exploratorium After Dark: Glow', lat: 37.8017, lon: -122.3973, must: true, range: 600, d: 'Adults-only night at the science museum on Pier 15, with interactive exhibits and art made with light. A short walk up the Embarcadero from the Hyatt. Reserve ahead.' },
    ] },
  { id: 'fri', dw: 'FRI', dn: 20, tag: 'Training',
    title: 'Training + the Bay at night', eyebrow: 'Friday · QCon training · Check the flight',
    sub: 'The last workshop day, then two hours on the Bay at dusk.',
    stops: [
      { t: '9 AM–4 PM', n: 'QCon training day 2', lat: HYATT.lat, lon: HYATT.lon, conf: true, range: 900, d: 'One full-day workshop at the Hyatt Regency.' },
      { via: 'streetcar', t: '5:30 PM', n: 'City Lights Cruise', until: '7:30 PM', lat: 37.8087, lon: -122.4148, must: true, range: 1600, d: 'Red and White Fleet, Pier 43½. Two hours on the Bay with the skyline and bridges lit. Book once the flight time is settled.' },
    ] },
];
DAYS.forEach((d, di) => {
  let n = 0;
  d.stops.forEach((s, si) => {
    s.day = di; s.idx = si; s.id = `${d.id}-${si}`;
    if (!s.leg) s.num = ++n;
  });
});
const DATE_OF = (di) => new Date(Date.UTC(2026, 10, 14 + di, 20));

/* ───────────────────────── Geo helpers ───────────────────────── */
const R = 6371008.8;
function haversine(a, b) {
  const p1 = (a.lat * Math.PI) / 180, p2 = (b.lat * Math.PI) / 180;
  const dp = p2 - p1, dl = ((b.lon - a.lon) * Math.PI) / 180;
  const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const walkMin = (m) => Math.max(1, Math.round((m * 1.3) / 80));
function distLabel(m) {
  const w = walkMin(m);
  if (w <= 25) return `${w} min walk`;
  const mi = m / 1609.34;
  return `${mi < 10 ? mi.toFixed(1) : Math.round(mi)} mi`;
}
function dms(v, pos, neg) {
  const a = Math.abs(v), d = Math.floor(a), mf = (a - d) * 60, m = Math.floor(mf), s = Math.round((mf - m) * 60);
  const ss = s === 60 ? 59 : s;
  return `${d}°${String(m).padStart(2, '0')}′${String(ss).padStart(2, '0')}″${v >= 0 ? pos : neg}`;
}
function mgrsOf(lat, lon) {
  try {
    const raw = window.mgrs.forward([lon, lat], 4);
    const m = raw.match(/^(\d{1,2}[A-Z])([A-Z]{2})(\d{4})(\d{4})$/);
    return m ? `${m[1]} ${m[2]} ${m[3]} ${m[4]}` : raw;
  } catch { return '—'; }
}
// NOAA sunrise/sunset (minutes past local midnight, PST = UTC-8)
function sunTimes(date, lat, lon) {
  const rad = Math.PI / 180;
  const jd = date.getTime() / 86400000 + 2440587.5;
  const n = Math.round(jd - 2451545.0 + 0.0008);
  const Js = n - lon / 360;
  const M = (357.5291 + 0.98560028 * Js) % 360;
  const Cc = 1.9148 * Math.sin(M * rad) + 0.02 * Math.sin(2 * M * rad) + 0.0003 * Math.sin(3 * M * rad);
  const L = (M + Cc + 180 + 102.9372) % 360;
  const Jt = 2451545.0 + Js + 0.0053 * Math.sin(M * rad) - 0.0069 * Math.sin(2 * L * rad);
  const dec = Math.asin(Math.sin(L * rad) * Math.sin(23.4397 * rad));
  const cosw = (Math.sin(-0.833 * rad) - Math.sin(lat * rad) * Math.sin(dec)) / (Math.cos(lat * rad) * Math.cos(dec));
  const w = Math.acos(cosw) / rad;
  const toLocal = (j) => { const ms = (j - 2440587.5) * 86400000; const d = new Date(ms - 8 * 3600000); return d.getUTCHours() * 60 + d.getUTCMinutes(); };
  return { rise: toLocal(Jt - w / 360), set: toLocal(Jt + w / 360) };
}
const hm = (min) => { let h = Math.floor(min / 60), m = min % 60; const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return `${h}:${String(m).padStart(2, '0')} ${ap}`; };

/* ───────────────────────── Places ───────────────────────── */
const KIND = {
  eat: { label: 'Eat', plural: 'Eats' },
  coffee: { label: 'Coffee', plural: 'Coffee' },
  drink: { label: 'Drinks', plural: 'Drinks' },
  gem: { label: 'Hidden gem', plural: 'Hidden gems' },
};
const STOPS = DAYS.flatMap((d) => d.stops.filter((s) => !s.leg));
const slug = (t) => t.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
PLACES.forEach((p) => {
  p.id = slug(p.name);
  let best = null;
  for (const s of STOPS) {
    const dm = haversine(p, s);
    if (!best || dm < best.m) best = { s, m: dm };
  }
  p.near = best;
  p.fromHotel = haversine(p, HOTEL);
});
const PHOTOS = /*@@PHOTOS@@*/;
function photoFor(id) { return PHOTOS[id] || null; }
function figure(cls, ph, alt) {
  const img = el('img', { src: ph.src, alt, loading: 'lazy', decoding: 'async' });
  const fig = el('figure', { class: cls }, [img, el('figcaption', {}, [ph.page ? el('a', { href: ph.page, target: '_blank', rel: 'noopener', text: `${ph.author} · ${ph.license}` }) : `${ph.author} · ${ph.license}`])]);
  img.addEventListener('error', () => { if (ph.remote && !img.dataset.r) { img.dataset.r = '1'; img.src = ph.remote; } else fig.remove(); });
  return fig;
}
function nearbyFor(stop) {
  const lim = stop.range > 1800 ? 6000 : 1700;
  return PLACES.map((p) => ({ p, m: haversine(p, stop) }))
    .filter((x) => x.m <= lim)
    .sort((a, b) => a.m - b.m)
    .slice(0, 5);
}

/* ───────────────────────── City pack ───────────────────────── */
let CITY = null;
let WEATHER = null;
let DEM = null;
function u2ll(x, z) { const o = CITY.origin; return [o.lon0 + x / o.kx, o.lat0 - z / o.ky]; }
function demHeight(lon, lat) {
  if (!DEM) return 0;
  const [S, W, N, E] = DEM.bbox;
  if (lat <= S || lat >= N || lon <= W || lon >= E) return 0;
  const fx = ((lon - W) / (E - W)) * (DEM.nx - 1), fy = ((lat - S) / (N - S)) * (DEM.ny - 1);
  const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
  const g = (x, y) => DEM.z[y * DEM.nx + x];
  return g(x0, y0) * (1 - tx) * (1 - ty) + g(x0 + 1, y0) * tx * (1 - ty) + g(x0, y0 + 1) * (1 - tx) * ty + g(x0 + 1, y0 + 1) * tx * ty;
}
function b64bytes(s) { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }

/* ───────────────────────── Viewer ───────────────────────── */
let widget, scene, camera;
let satellite = false;
const layers = {};
const prims = {};

async function boot() {
  if (!C) throw new Error('The 3D engine did not load.');
  const credits = $('#credits');
  widget = new C.CesiumWidget('globe', {
    baseLayer: false,
    terrainProvider: new C.EllipsoidTerrainProvider(),
    skyBox: new C.SkyBox({ sources: {
      positiveX: 'sky/milkyway_px.webp', negativeX: 'sky/milkyway_nx.webp',
      positiveY: 'sky/milkyway_py.webp', negativeY: 'sky/milkyway_ny.webp',
      positiveZ: 'sky/milkyway_pz.webp', negativeZ: 'sky/milkyway_nz.webp' } }),
    skyAtmosphere: new C.SkyAtmosphere(),
    scene3DOnly: true,
    creditContainer: credits,
    msaaSamples: LOW ? 1 : 4,
  });
  scene = widget.scene; camera = scene.camera;
  scene.globe.baseColor = C.Color.fromCssColorString('#b9c8d1');
  scene.globe.showGroundAtmosphere = false;
  scene.globe.enableLighting = false;
  scene.globe.depthTestAgainstTerrain = false;
  scene.globe.maximumScreenSpaceError = LOW ? 2.2 : 1.5;
  scene.highDynamicRange = false;
  scene.fog.enabled = true; scene.fog.density = 0.00012;
  scene.sun.show = false; scene.moon.show = false;
  scene.skyAtmosphere.atmosphereLightIntensity = 14;
  widget.clock.currentTime = C.JulianDate.fromDate(new Date(Date.UTC(2026, 10, 14, 21, 0)));
  widget.clock.shouldAnimate = false;
  const sscc = scene.screenSpaceCameraController;
  sscc.minimumZoomDistance = 120;
  sscc.maximumZoomDistance = 2.5e7;

  // Natural Earth ships inside Cesium: the whole-planet view works with no network.
  layers.earth = C.ImageryLayer.fromProviderAsync(
    C.TileMapServiceImageryProvider.fromUrl(C.buildModuleUrl('Assets/Textures/NaturalEarthII')));
  scene.imageryLayers.add(layers.earth);

  // Opening shot: high over North America with the flight in.
  camera.setView({ destination: C.Cartesian3.fromDegrees(-101, 30, 9.5e6) });
  drawFlight();

  const side = await Promise.allSettled([fetch('data/routes.json').then((r) => r.ok ? r.json() : {}), fetch('data/weather.json').then((r) => r.ok ? r.json() : null)]);
  ROUTES = (side[0].status === 'fulfilled' && side[0].value) || {};
  WEATHER = side[1].status === 'fulfilled' ? side[1].value : null;
  renderDay();
  const res = await fetch('data/city.json');
  if (!res.ok) throw new Error(`city data ${res.status}`);
  CITY = await res.json();
  const e = CITY.elev;
  DEM = { nx: e.nx, ny: e.ny, bbox: e.bbox, z: new Int16Array(b64bytes(e.b64).buffer) };

  scene.terrainProvider = makeDemTerrain();
  await addSchematicImagery();
  buildBridge();
  buildTall();
  buildHoods();
  setTimeout(buildBuildings, 60);

  scene.preRender.addEventListener(fadeEarth);
  scene.postRender.addEventListener(updateOverlay);
  probeSatellite();
}

function fadeEarth() {
  if (satellite) return;
  const h = camera.positionCartographic.height;
  const a = C.Math.clamp((h - 90000) / 400000, 0, 1);
  if (layers.earth) layers.earth.alpha = a;
}

/* DEM terrain from the SRTM grid (land-masked so the bay stays flat). */
function makeDemTerrain() {
  const W = 32, H = 32;
  return new C.CustomHeightmapTerrainProvider({
    width: W, height: H,
    callback(x, y, level) {
      const out = new Float32Array(W * H);
      if (level < 7) return out;
      const r = this.tilingScheme.tileXYToRectangle(x, y, level);
      const w = C.Math.toDegrees(r.west), ea = C.Math.toDegrees(r.east);
      const s = C.Math.toDegrees(r.south), n = C.Math.toDegrees(r.north);
      const [S, Wb, N, E] = DEM.bbox;
      if (ea < Wb || w > E || n < S || s > N) return out;
      for (let j = 0; j < H; j++) {
        const lat = n - ((n - s) * j) / (H - 1);
        for (let i = 0; i < W; i++) out[j * W + i] = demHeight(w + ((ea - w) * i) / (W - 1), lat);
      }
      return out;
    },
  });
}

/* Paint the schematic map: land, parks, piers, roads and a hillshade, into two
   rasters (Bay Area overview + detailed city) used as imagery layers. */
const MAP = {
  water: '#b9c8d1', land: '#f1f1ec', landFar: '#e9eae4', park: '#d4e0cc', forest: '#c3d4bc',
  golf: '#d9e5cf', scrub: '#dfe3d2', pier: '#e2e4e2', road: '#ffffff', roadCase: '#d6d9d6', coast: '#9fb1bd',
};
function paintRaster(rect, w, h, draw) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d');
  const [S, W, N, E] = rect;
  const px = (lon, lat) => [((lon - W) / (E - W)) * w, ((N - lat) / (N - S)) * h];
  draw(g, px, w, h);
  return cv;
}
function pathRings(g, px, rings) {
  g.beginPath();
  for (const ring of rings) {
    ring.forEach(([x, z], i) => { const [lo, la] = u2ll(x, z); const [a, b] = px(lo, la); i ? g.lineTo(a, b) : g.moveTo(a, b); });
    g.closePath();
  }
}
async function addSchematicImagery() {
  const city = CITY;
  const regionRect = [37.45, -122.85, 38.15, -122.05];
  const regionCv = paintRaster(regionRect, 2048, 2048, (g, px, w, h) => {
    g.fillStyle = MAP.water; g.fillRect(0, 0, w, h);
    g.fillStyle = MAP.landFar;
    for (const poly of city.region) { pathRings(g, px, poly); g.fill('evenodd'); }
    g.fillStyle = MAP.land;
    for (const poly of city.land) { pathRings(g, px, poly); g.fill('evenodd'); }
  });
  const [S, W, N, E] = city.origin.bbox;
  const cityCv = paintRaster([S, W, N, E], 4096, 3640, (g, px, w, h) => {
    g.fillStyle = MAP.water; g.fillRect(0, 0, w, h);
    g.fillStyle = MAP.landFar;
    for (const poly of city.region) { pathRings(g, px, poly); g.fill('evenodd'); }
    g.fillStyle = MAP.land;
    for (const poly of city.land) { pathRings(g, px, poly); g.fill('evenodd'); }
    const greens = { park: MAP.park, golf: MAP.golf, scrub: MAP.scrub, forest: MAP.forest };
    for (const [k, col] of Object.entries(greens)) {
      g.fillStyle = col;
      for (const poly of city.green[k] || []) { pathRings(g, px, poly); g.fill('evenodd'); }
    }
    // hillshade (multiply) from the DEM, light from the northwest
    const hs = document.createElement('canvas'); hs.width = DEM.nx; hs.height = DEM.ny;
    const hg = hs.getContext('2d'); const img = hg.createImageData(DEM.nx, DEM.ny);
    const cell = ((E - W) * 111320 * Math.cos((37.77 * Math.PI) / 180)) / (DEM.nx - 1);
    const az = (315 * Math.PI) / 180, alt = (40 * Math.PI) / 180;
    for (let j = 0; j < DEM.ny; j++) for (let i = 0; i < DEM.nx; i++) {
      const z = (x, y) => DEM.z[Math.min(DEM.ny - 1, Math.max(0, y)) * DEM.nx + Math.min(DEM.nx - 1, Math.max(0, x))];
      const dzdx = (z(i + 1, j) - z(i - 1, j)) / (2 * cell) * 2.2;
      const dzdy = (z(i, j + 1) - z(i, j - 1)) / (2 * cell) * 2.2;
      const slope = Math.atan(Math.hypot(dzdx, dzdy));
      const aspect = Math.atan2(dzdy, -dzdx);
      let sh = Math.sin(alt) * Math.cos(slope) + Math.cos(alt) * Math.sin(slope) * Math.cos(az - aspect);
      sh = Math.max(0, Math.min(1, sh));
      const v = Math.round(255 * (0.62 + 0.38 * sh / Math.sin(alt) * 0.95));
      const k = ((DEM.ny - 1 - j) * DEM.nx + i) * 4;
      const land = DEM.z[j * DEM.nx + i] > 0;
      img.data[k] = img.data[k + 1] = img.data[k + 2] = land ? Math.min(255, v) : 255;
      img.data[k + 3] = 255;
    }
    hg.putImageData(img, 0, 0);
    g.save(); g.globalCompositeOperation = 'multiply'; g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(hs, 0, 0, w, h); g.restore();
    g.fillStyle = MAP.pier;
    for (const poly of city.piers) { pathRings(g, px, poly); g.fill('evenodd'); }
    g.strokeStyle = MAP.coast; g.lineWidth = 1.6;
    for (const poly of city.land) { pathRings(g, px, poly); g.stroke(); }
    // roads, minor first; class 0 = motorway … 3 = tertiary
    g.lineCap = 'round'; g.lineJoin = 'round';
    const widths = [6.5, 5, 3.6, 2.6];
    for (const pass of ['case', 'fill']) {
      for (let cls = 3; cls >= 0; cls--) {
        g.strokeStyle = pass === 'case' ? MAP.roadCase : MAP.road;
        g.lineWidth = widths[cls] + (pass === 'case' ? 1.6 : 0);
        g.beginPath();
        for (const [c, pts] of city.roads) {
          if (c !== cls) continue;
          pts.forEach(([x, z], i) => { const [lo, la] = u2ll(x, z); const [a, b] = px(lo, la); i ? g.lineTo(a, b) : g.moveTo(a, b); });
        }
        g.stroke();
      }
    }
  });
  window.FC_MAPS = { regionCv, cityCv, regionRect, cityRect: [S, W, N, E] };
  const toUrl = (cv) => new Promise((ok) => cv.toBlob((b) => ok(URL.createObjectURL(b)), 'image/png'));
  const [ru, cu] = await Promise.all([toUrl(regionCv), toUrl(cityCv)]);
  const rect = (r) => C.Rectangle.fromDegrees(r[1], r[0], r[3], r[2]);
  layers.region = C.ImageryLayer.fromProviderAsync(C.SingleTileImageryProvider.fromUrl(ru, { rectangle: rect(regionRect) }));
  layers.city = C.ImageryLayer.fromProviderAsync(C.SingleTileImageryProvider.fromUrl(cu, { rectangle: rect([S, W, N, E]) }));
  scene.imageryLayers.add(layers.region);
  scene.imageryLayers.add(layers.city);
}

/* ───── Buildings: 140k OSM footprints as one batched mesh per city block ───── */
function buildBuildings() {
  const bytes = b64bytes(CITY.bld_b64);
  const dv = new DataView(bytes.buffer);
  const n = CITY.bld_n;
  const o = CITY.origin;
  const GRID = 12;
  const chunks = Array.from({ length: GRID * GRID }, (_, k) => ({ ids: [], gx: k % GRID, gz: Math.floor(k / GRID), prim: null }));
  for (let i = 0; i < n; i++) {
    const x = dv.getInt16(i * 8, true), z = dv.getInt16(i * 8 + 2, true);
    const gx = Math.min(GRID - 1, Math.max(0, Math.floor(((x / 100) / 176 + 0.5) * GRID)));
    const gz = Math.min(GRID - 1, Math.max(0, Math.floor(((z / 100) / 156 + 0.5) * GRID)));
    chunks[gz * GRID + gx].ids.push(i);
  }
  const live = chunks.filter((c) => c.ids.length);
  for (const c of live) {
    const x = ((c.gx + 0.5) / GRID - 0.5) * 176, z = ((c.gz + 0.5) / GRID - 0.5) * 156;
    const [lon, lat] = u2ll(x, z);
    c.center = C.Cartesian3.fromDegrees(lon, lat, 40);
  }
  prims.buildings = new C.PrimitiveCollection();
  scene.primitives.add(prims.buildings);
  const RAD = Math.PI / 180;
  const carto = new C.Cartographic(), cart = new C.Cartesian3(), ell = C.Ellipsoid.WGS84;
  const make = (c) => {
    const ids = c.ids;
    const pos = new Float64Array(ids.length * 12 * 3);
    const col = new Uint8Array(ids.length * 12 * 4);
    const idx = new Uint32Array(ids.length * 30);
    let v = 0, ii = 0;
    for (const i of ids) {
      const off = i * 8;
      const cx = dv.getInt16(off, true), cz = dv.getInt16(off + 2, true);
      const w = bytes[off + 4] / 2, d = bytes[off + 5] / 2, ang = bytes[off + 6] * RAD;
      const h = Math.max(4, bytes[off + 7] / 2);
      const ca = Math.cos(ang), sa = Math.sin(ang);
      let base = Infinity;
      const ll = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([a, b]) => {
        const x = cx + a * ca - b * sa, z = cz + a * sa + b * ca;
        const lon = o.lon0 + x / 100 / o.kx, lat = o.lat0 - z / 100 / o.ky;
        base = Math.min(base, demHeight(lon, lat));
        return [lon, lat];
      });
      base -= 1.5;
      const top = base + 1.5 + h;
      const tint = 0.97 + (((i * 2654435761) >>> 0) % 997) / 997 * 0.05;
      const hh = Math.min(1, h / 40);
      const shades = [[192, 199, 207], [230 + 12 * hh, 234 + 10 * hh, 238 + 8 * hh], [252, 252, 251]];
      const v0 = v;
      for (let ring = 0; ring < 3; ring++) {
        const alt = ring === 0 ? base : top;
        const sh = shades[ring];
        for (let k = 0; k < 4; k++) {
          carto.longitude = ll[k][0] * RAD; carto.latitude = ll[k][1] * RAD; carto.height = alt;
          ell.cartographicToCartesian(carto, cart);
          pos[v * 3] = cart.x; pos[v * 3 + 1] = cart.y; pos[v * 3 + 2] = cart.z;
          col[v * 4] = Math.min(255, sh[0] * tint); col[v * 4 + 1] = Math.min(255, sh[1] * tint); col[v * 4 + 2] = Math.min(255, sh[2] * tint); col[v * 4 + 3] = 255;
          v++;
        }
      }
      for (let k = 0; k < 4; k++) {
        const k2 = (k + 1) % 4;
        idx[ii++] = v0 + k; idx[ii++] = v0 + k2; idx[ii++] = v0 + 4 + k2;
        idx[ii++] = v0 + k; idx[ii++] = v0 + 4 + k2; idx[ii++] = v0 + 4 + k;
      }
      idx[ii++] = v0 + 8; idx[ii++] = v0 + 9; idx[ii++] = v0 + 10;
      idx[ii++] = v0 + 8; idx[ii++] = v0 + 10; idx[ii++] = v0 + 11;
    }
    const geometry = new C.Geometry({
      attributes: {
        position: new C.GeometryAttribute({ componentDatatype: C.ComponentDatatype.DOUBLE, componentsPerAttribute: 3, values: pos }),
        color: new C.GeometryAttribute({ componentDatatype: C.ComponentDatatype.UNSIGNED_BYTE, componentsPerAttribute: 4, normalize: true, values: col }),
      },
      indices: idx, primitiveType: C.PrimitiveType.TRIANGLES, boundingSphere: C.BoundingSphere.fromVertices(pos),
    });
    c.prim = prims.buildings.add(new C.Primitive({
      geometryInstances: new C.GeometryInstance({ geometry }),
      appearance: new C.PerInstanceColorAppearance({ flat: true, translucent: false }),
      asynchronous: false, allowPicking: false, compressVertices: false,
    }));
  };
  // Build and show city blocks lazily, only near the camera.
  scene.preRender.addEventListener(() => {
    const on = state.layers.buildings && !satellite;
    let built = 0;
    for (const c of live) {
      const near = on && C.Cartesian3.distance(camera.positionWC, c.center) < perf.near;
      if (near && !c.prim && built < 1) { make(c); built++; }
      if (c.prim) c.prim.show = near;
    }
  });
}

function buildTall() {
  const instances = [];
  for (const [, hgt, rings] of CITY.tall) {
    for (const poly of rings) {
      const outer = poly[0].map(([x, z]) => u2ll(x, z));
      if (outer.length < 4) continue;
      let base = Infinity;
      for (const [lo, la] of outer) base = Math.min(base, demHeight(lo, la));
      base -= 1;
      try {
        instances.push(new C.GeometryInstance({
          geometry: new C.PolygonGeometry({
            polygonHierarchy: new C.PolygonHierarchy(C.Cartesian3.fromDegreesArray(outer.flat()),
              poly.slice(1).map((r) => new C.PolygonHierarchy(C.Cartesian3.fromDegreesArray(r.map(([x, z]) => u2ll(x, z)).flat())))),
            height: base, extrudedHeight: base + hgt,
            vertexFormat: C.PerInstanceColorAppearance.VERTEX_FORMAT,
          }),
          attributes: { color: C.ColorGeometryInstanceAttribute.fromColor(C.Color.fromCssColorString('#e8ecef')) },
        }));
      } catch { /* skip degenerate rings */ }
    }
  }
  prims.tall = scene.primitives.add(new C.Primitive({
    geometryInstances: instances,
    appearance: new C.PerInstanceColorAppearance({ translucent: false, closed: true }),
    allowPicking: false,
  }));
}

/* The Golden Gate Bridge, modeled from its real dimensions in International Orange. */
function buildBridge() {
  const S = { lat: 37.81156, lon: -122.47751 }, Nn = { lat: 37.82294, lon: -122.47873 };
  const SA = { lat: 37.80795, lon: -122.47707 }, NA = { lat: 37.83020, lon: -122.47942 };
  const orange = C.Color.fromCssColorString('#c0362c');
  const deckH = 67, towerH = 227;
  const lerp = (a, b, t) => ({ lat: a.lat + (b.lat - a.lat) * t, lon: a.lon + (b.lon - a.lon) * t });
  const heading = Math.atan2((Nn.lon - S.lon) * Math.cos(37.82 * Math.PI / 180), Nn.lat - S.lat);
  const inst = [];
  // deck
  inst.push(new C.GeometryInstance({
    geometry: new C.CorridorGeometry({
      positions: C.Cartesian3.fromDegreesArray([SA.lon, SA.lat, NA.lon, NA.lat]),
      width: 27, height: deckH - 4, extrudedHeight: deckH, vertexFormat: C.PerInstanceColorAppearance.VERTEX_FORMAT,
    }),
    attributes: { color: C.ColorGeometryInstanceAttribute.fromColor(orange) },
  }));
  // towers: two legs plus three portal struts each
  for (const T of [S, Nn]) {
    const center = C.Cartesian3.fromDegrees(T.lon, T.lat, 0);
    const enu = C.Transforms.headingPitchRollToFixedFrame(center, new C.HeadingPitchRoll(heading - Math.PI / 2, 0, 0));
    const box = (x, y, z, dx, dy, dz) => new C.GeometryInstance({
      geometry: C.BoxGeometry.fromDimensions({ dimensions: new C.Cartesian3(dx, dy, dz), vertexFormat: C.PerInstanceColorAppearance.VERTEX_FORMAT }),
      modelMatrix: C.Matrix4.multiplyByTranslation(enu, new C.Cartesian3(x, y, z), new C.Matrix4()),
      attributes: { color: C.ColorGeometryInstanceAttribute.fromColor(orange) },
    });
    // in this frame +x = along bridge heading? headingPitchRoll frame: x = forward(east rotated) — use both axes symmetric
    inst.push(box(0, 15, towerH / 2, 10, 10, towerH));
    inst.push(box(0, -15, towerH / 2, 10, 10, towerH));
    for (const zz of [deckH + 40, 150, towerH - 8]) inst.push(box(0, 0, zz, 8, 30, 9));
    inst.push(box(0, 0, 8, 40, 60, 16));
  }
  prims.bridge = scene.primitives.add(new C.Primitive({
    geometryInstances: inst,
    appearance: new C.PerInstanceColorAppearance({ translucent: false, closed: true }),
    allowPicking: false,
  }));
  // main cables and suspenders
  const pc = new C.PolylineCollection();
  const mat = C.Material.fromType('Color', { color: orange });
  const span = (a, b, h0, h1, sag, side, nSeg) => {
    const pts = [];
    for (let i = 0; i <= nSeg; i++) {
      const t = i / nSeg;
      const p = lerp(a, b, t);
      const hh = h0 + (h1 - h0) * t - sag * 4 * t * (1 - t);
      const off = side * 13.5 / 111320;
      const dl = off * Math.cos(heading) / Math.cos(37.82 * Math.PI / 180);
      const dla = -off * Math.sin(heading);
      pts.push(C.Cartesian3.fromDegrees(p.lon + dl, p.lat + dla, hh));
    }
    return pts;
  };
  for (const side of [-1, 1]) {
    const segs = [
      span(SA, S, deckH + 2, towerH, 30, side, 20),
      span(S, Nn, towerH, towerH, towerH - deckH - 6, side, 64),
      span(Nn, NA, towerH, deckH + 2, 30, side, 20),
    ];
    for (const positions of segs) pc.add({ positions, width: 2.2, material: mat });
    const main = segs[1];
    for (let i = 2; i < main.length - 2; i += 2) {
      const top = C.Cartographic.fromCartesian(main[i]);
      pc.add({ positions: [main[i], C.Cartesian3.fromRadians(top.longitude, top.latitude, deckH)], width: 1, material: mat });
    }
  }
  prims.cables = scene.primitives.add(pc);
}

function buildHoods() {
  const pc = new C.PolylineCollection();
  const mat = C.Material.fromType('PolylineDash', { color: C.Color.fromCssColorString('#12171b').withAlpha(0.35), dashLength: 12 });
  for (const [, , rings] of CITY.hoods) {
    for (const ring of rings) {
      const pts = ring.map(([x, z]) => { const [lo, la] = u2ll(x, z); return C.Cartesian3.fromDegrees(lo, la, demHeight(lo, la) + 6); });
      pc.add({ positions: pts, width: 1.4, material: mat });
    }
  }
  prims.hoods = scene.primitives.add(pc);
  prims.hoods.show = false;
}

/* Flight arc from home to SFO, and the per-day connector arcs. */
function arcPoints(a, b, peak, n = 64, h0 = 0, h1 = 0) {
  const g = new C.EllipsoidGeodesic(C.Cartographic.fromDegrees(a.lon, a.lat), C.Cartographic.fromDegrees(b.lon, b.lat));
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n; const c = g.interpolateUsingFraction(t);
    pts.push(C.Cartesian3.fromRadians(c.longitude, c.latitude, h0 + (h1 - h0) * t + peak * Math.sin(Math.PI * t)));
  }
  return pts;
}
function drawFlight() {
  const pc = new C.PolylineCollection();
  pc.add({ positions: arcPoints(ORIGIN, SFO, 420000, 128), width: 3,
    material: C.Material.fromType('PolylineGlow', { color: C.Color.fromCssColorString('#ff6a52'), glowPower: 0.25, taperPower: 1 }) });
  prims.flight = scene.primitives.add(pc);
}
let ROUTES = {};
function legFrom(st, i) {
  // the previous real stop, skipping an "or" alternative
  let j = i - 1;
  while (j >= 0 && st[j].via === 'none') j--;
  return j >= 0 ? st[j] : null;
}
function routeFor(b) { return ROUTES[b.id] || null; }
function legLabel(r) {
  if (!r) return '';
  const mode = { walk: 'walk', drive: 'drive', streetcar: 'by streetcar or car' }[r.mode] || r.mode;
  const mi = r.km / 1.609;
  return `${Math.max(1, Math.round(r.min))} min ${mode} · ${mi < 10 ? mi.toFixed(1) : Math.round(mi)} mi`;
}
function drawDayRoute(day) {
  if (prims.route) { scene.primitives.remove(prims.route); prims.route = null; }
  for (const k of ['routeWalk', 'routeDrive']) if (prims[k]) { scene.groundPrimitives.remove(prims[k]); prims[k] = null; }
  const pc = new C.PolylineCollection();
  const st = DAYS[day].stops.filter((s) => !s.leg);
  const orange = C.Color.fromCssColorString('#c0362c');
  const dash = C.Material.fromType('PolylineDash', { color: orange, gapColor: C.Color.TRANSPARENT, dashLength: 14 });
  const walk = [], drive = [];
  for (let i = 1; i < st.length; i++) {
    const b = st[i];
    if (b.via === 'none') continue;
    const a = legFrom(st, i);
    if (!a || (a.lat === b.lat && a.lon === b.lon)) continue;
    const r = routeFor(b);
    if (r && r.coords && r.coords.length > 1) {
      const inst = new C.GeometryInstance({ geometry: new C.GroundPolylineGeometry({ positions: C.Cartesian3.fromDegreesArray(r.coords.flat()), width: r.mode === 'walk' ? 4 : 5 }) });
      (r.mode === 'walk' ? walk : drive).push(inst);
    } else {
      const dm = haversine(a, b);
      const ha = groundAt(a.lon, a.lat) + 25, hb = groundAt(b.lon, b.lat) + 25;
      pc.add({ positions: arcPoints(a, b, Math.min(900, dm * 0.12), 48, ha, hb), width: 2.4, material: dash });
    }
  }
  prims.route = scene.primitives.add(pc);
  const ground = (instances, material) => instances.length ? scene.groundPrimitives.add(new C.GroundPolylinePrimitive({
    geometryInstances: instances, appearance: new C.PolylineMaterialAppearance({ material }), allowPicking: false })) : null;
  prims.routeDrive = ground(drive, C.Material.fromType('Color', { color: orange.withAlpha(0.9) }));
  prims.routeWalk = ground(walk, C.Material.fromType('PolylineDash', { color: orange, gapColor: C.Color.WHITE.withAlpha(0.85), dashLength: 10 }));
  for (const k of ['route', 'routeWalk', 'routeDrive']) if (prims[k]) prims[k].show = state.layers.route;
}
const GEOID_SF = -32.3;
const satHeights = new Map();
const hkey = (lon, lat) => `${lon.toFixed(5)},${lat.toFixed(5)}`;
function groundAt(lon, lat) {
  if (!satellite) return demHeight(lon, lat);
  if (mapMode === 'google') { const g = googleHeights.get(hkey(lon, lat)); if (g !== undefined) return g; }
  const k = satHeights.get(hkey(lon, lat));
  if (k !== undefined) return k;
  const h = scene.globe.getHeight(C.Cartographic.fromDegrees(lon, lat));
  return h === undefined ? GEOID_SF : h;
}
async function sampleSatHeights() {
  const pts = [...STOPS, ...PLACES];
  try {
    const res = await C.sampleTerrainMostDetailed(scene.terrainProvider, pts.map((p) => C.Cartographic.fromDegrees(p.lon, p.lat)));
    res.forEach((c, i) => { if (Number.isFinite(c.height)) satHeights.set(hkey(pts[i].lon, pts[i].lat), c.height); });
  } catch (e) { console.warn('terrain sampling failed', e); }
}

/* ───── Satellite link: Esri imagery + keyless terrain, exactly as God's Eye View
   uses them. Inside the shared page these hosts are blocked, so we stay schematic. */
const ESRI_URL = 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer';
// Browser-visible Google Maps key for Photorealistic 3D Tiles. Restrict it to this site's referrer
// and the Map Tiles API in Google Cloud; it only works where the page can reach tile.googleapis.com.
const GOOGLE_KEY = '__GOOGLE_KEY__';
let mapMode = 'drawn', google3d = null, googleOk = null;
const googleHeights = new Map();
const REEARTH_TERRAIN = 'https://terrain.reearth.land/cesium-mesh/ellipsoid';
let satAvailable = false;
function probeSatellite() {
  const img = new Image();
  let done = false;
  const finish = (ok) => {
    if (done) return; done = true; satAvailable = ok; renderLinkChip(); renderLayerPanel();
    let pref = null; try { pref = localStorage.getItem('fogcity.map'); } catch { /* ignore */ }
    if (ok) setMapMode(pref || 'google');
  };
  img.onload = () => finish(true);
  img.onerror = () => finish(false);
  setTimeout(() => finish(false), 6000);
  img.crossOrigin = 'anonymous';
  img.src = `${ESRI_URL}/tile/12/1582/655`;
}
async function setSatellite(on) {
  if (on === satellite) return;
  satellite = on;
  if (on) {
    if (!layers.esri) {
      layers.esri = C.ImageryLayer.fromProviderAsync(C.ArcGisMapServerImageryProvider.fromUrl(ESRI_URL, {
        enablePickFeatures: false,
        credit: 'Powered by Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
      }));
      scene.imageryLayers.add(layers.esri);
    }
    layers.esri.show = true;
    layers.earth.alpha = 1;
    try { scene.terrainProvider = await C.CesiumTerrainProvider.fromUrl(REEARTH_TERRAIN, { requestVertexNormals: true }); }
    catch { scene.terrainProvider = new C.EllipsoidTerrainProvider(); }
    scene.globe.enableLighting = true;
    if (!satHeights.size) await sampleSatHeights();
    const up = C.Cartesian3.normalize(C.Cartesian3.fromDegrees(-122.478, 37.818), new C.Cartesian3());
    const shift = C.Matrix4.fromTranslation(C.Cartesian3.multiplyByScalar(up, GEOID_SF, new C.Cartesian3()));
    prims.bridge.modelMatrix = shift; prims.cables.modelMatrix = shift;
  } else {
    if (layers.esri) layers.esri.show = false;
    scene.globe.enableLighting = false;
    scene.terrainProvider = makeDemTerrain();
    prims.bridge.modelMatrix = C.Matrix4.IDENTITY; prims.cables.modelMatrix = C.Matrix4.IDENTITY;
  }
  layers.city.show = layers.region.show = !on;
  pins.forEach((p) => { p.h = null; });
  drawDayRoute(state.day);
  applyLayerVisibility();
  renderLinkChip();
  renderLayerPanel();
}

async function sampleGoogleHeights() {
  const pts = [...STOPS, ...PLACES];
  try {
    const res = await scene.sampleHeightMostDetailed(pts.map((p) => C.Cartographic.fromDegrees(p.lon, p.lat)));
    res.forEach((c, i) => { if (c && Number.isFinite(c.height)) googleHeights.set(hkey(pts[i].lon, pts[i].lat), c.height); });
  } catch (e) { console.warn('3D tile height sampling failed', e); }
}
async function setMapMode(mode) {
  if (mode === mapMode) return;
  if (mode === 'google' && GOOGLE_KEY.startsWith('__')) { googleOk = false; return setMapMode('satellite'); }
  if (mode === 'google') {
    if (!google3d) {
      try {
        google3d = await C.createGooglePhotorealistic3DTileset({ key: GOOGLE_KEY, onlyUsingWithGoogleGeocoder: true },
          { cacheBytes: (LOW ? 256 : 768) * 1024 * 1024, maximumScreenSpaceError: LOW ? 24 : 12 });
        scene.primitives.add(google3d);
        googleOk = true;
      } catch (e) {
        console.warn('Google 3D tiles unavailable, using satellite imagery', e);
        googleOk = false;
        return setMapMode('satellite');
      }
    }
    await setSatellite(true);
    mapMode = 'google';
    google3d.show = true;
    scene.globe.show = false;
    sampleGoogleHeights().then(() => { pins.forEach((p) => { p.h = null; }); drawDayRoute(state.day); });
  } else {
    if (google3d) google3d.show = false;
    scene.globe.show = true;
    mapMode = mode;
    await setSatellite(mode === 'satellite');
  }
  pins.forEach((p) => { p.h = null; });
  drawDayRoute(state.day);
  applyLayerVisibility();
  renderLinkChip();
  renderLayerPanel();
}
function renderLinkChip() {
  const chip = $('#link');
  const text = mapMode === 'google' ? 'GOOGLE 3D · LIVE' : satellite ? 'SAT LINK · ESRI' : satAvailable ? 'SCHEMATIC · SAT READY' : 'SCHEMATIC · OSM';
  setSplitFlapText(chip, text);
  chip.classList.toggle('live', satellite);
}

/* ───────────────────────── Sensor looks (God's Eye View shaders) ───────────────────────── */
const SENSORS = [
  { id: 'day', label: 'Day', shader: null },
  { id: 'story', label: 'Storybook', shader: animeShader },
];
let stage = null;
const t0 = performance.now();
function setSensor(id) {
  const s = SENSORS.find((x) => x.id === id) || SENSORS[0];
  if (stage) { scene.postProcessStages.remove(stage); stage = null; }
  if (s.shader) {
    const uniforms = { intensity: 1, time: () => (performance.now() - t0) / 1000 };
    for (const [k, u] of Object.entries(s.shader.uniforms)) uniforms[k] = u.default;
    Object.assign(uniforms, s.set || {});
    let fs = s.shader.fragmentShader;
    // The schematic map is far brighter than night imagery: dim the input for the intensifier.
    if (s.pre) fs = fs.replace(/texture\(colorTexture,/g, `${s.pre.toFixed(2)} * texture(colorTexture,`);
    stage = scene.postProcessStages.add(new C.PostProcessStage({ fragmentShader: fs, uniforms }));
  }
  document.querySelectorAll('#sensorSeg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === s.id)));
  $('#stage').classList.toggle('sensor-dark', !!s.dark);
  state.sensor = s.id;
}

/* ───────────────────────── Overlay pins ───────────────────────── */
const pins = [];
const labelsEl = $('#labels');
function makePins() {
  for (const s of STOPS) {
    const b = el('button', { class: 'pin stop', 'aria-label': `${DAYS[s.day].dw} stop ${s.num}: ${s.n}`,
      onclick: (e) => { e.stopPropagation(); selectStop(s.day, s.idx); } },
    [el('span', { class: 'mk', text: String(s.num) }), el('span', { class: 'lb', text: s.n })]);
    labelsEl.append(b);
    pins.push({ type: 'stop', ref: s, node: b, lat: s.lat, lon: s.lon, h: null, w: 0 });
  }
  for (const p of PLACES) {
    const b = el('button', { class: 'pin place', 'data-kind': p.kind, 'aria-label': `${KIND[p.kind].label}: ${p.name}`,
      onclick: (e) => { e.stopPropagation(); openPlace(p); } },
    [el('span', { class: 'mk' }), el('span', { class: 'lb', text: p.name })]);
    labelsEl.append(b);
    pins.push({ type: 'place', ref: p, node: b, lat: p.lat, lon: p.lon, h: null, w: 0 });
  }
  for (const [name, [x, z]] of CITY.hoods) {
    const [lon, lat] = u2ll(x, z);
    const n = el('div', { class: 'hood', text: name, 'aria-hidden': 'true' });
    labelsEl.append(n);
    pins.push({ type: 'hood', node: n, lat, lon, h: null, w: 0 });
  }
}
const scratch = new C.Cartesian3();
const win = new C.Cartesian2();
let occluder = null;
function pinVisible(p) {
  if (p.type === 'me') return true;
  if (p.type === 'stop') return p.ref.day === state.day || (state.layers.route && camera.positionCartographic.height < 6000);
  if (p.type === 'hood') return state.layers.hoods;
  const k = p.ref.kind;
  if (k === 'eat') return state.layers.eat;
  if (k === 'coffee' || k === 'drink') return state.layers.coffee;
  return state.layers.gem;
}
function updateOverlay() {
  if (!CITY) return;
  const camH = camera.positionCartographic.height;
  occluder = new C.EllipsoidalOccluder(C.Ellipsoid.WGS84, camera.positionWC);
  const W = scene.canvas.clientWidth, H = scene.canvas.clientHeight;
  const taken = [];
  const order = pins.slice().sort((a, b) => prio(b) - prio(a));
  for (const p of order) {
    const show = pinVisible(p) && camH < (p.type === 'stop' || p.type === 'me' ? 4e6 : p.type === 'hood' ? 16000 : 26000);
    if (!show) { if (!p.hidden) { p.node.style.display = 'none'; p.hidden = true; } continue; }
    if (p.h === null) p.h = groundAt(p.lon, p.lat) + (p.type === 'hood' ? 40 : 8);
    C.Cartesian3.fromDegrees(p.lon, p.lat, p.h, C.Ellipsoid.WGS84, scratch);
    const sc = occluder.isPointVisible(scratch) ? C.SceneTransforms.worldToWindowCoordinates(scene, scratch, win) : undefined;
    if (p.type !== 'hood' && !(p.type === 'stop' && p.ref.day === state.day) && C.Cartesian3.distance(camera.positionWC, scratch) > 3500 + camH * 2.5) {
      if (!p.hidden) { p.node.style.display = 'none'; p.hidden = true; } continue;
    }
    if (!sc || sc.x < -40 || sc.y < -20 || sc.x > W + 40 || sc.y > H + 20) {
      if (!p.hidden) { p.node.style.display = 'none'; p.hidden = true; } continue;
    }
    if (p.hidden) { p.node.style.display = ''; p.hidden = false; p.w = 0; }
    const isSel = (p.type === 'stop' && state.stop === p.ref.id) || (p.type === 'place' && state.place === p.ref.id);
    if (!p.w) p.w = p.node.offsetWidth || 120;
    let x = sc.x, y = sc.y;
    if (p.type === 'hood') { x -= p.w / 2; y -= 5; }
    else { x -= p.type === 'stop' ? 10 : 5.5; y -= p.type === 'stop' ? 10 : 5.5; }
    const rect = [x, y - 2, x + p.w, y + 22];
    const collides = taken.some((r) => rect[0] < r[2] && rect[2] > r[0] && rect[1] < r[3] && rect[3] > r[1]);
    const wantLabel = p.type === 'hood' || isSel || (p.type === 'stop' && p.ref.day === state.day && camH < 60000) || (p.type === 'place' && camH < 3500);
    const label = wantLabel && (!collides || isSel);
    if (p.type === 'hood' && !label) { p.node.style.display = 'none'; p.hidden = true; continue; }
    if (label) taken.push(rect);
    p.node.classList.toggle('nolabel', !label);
    if (p.type !== 'hood') {
      p.node.classList.toggle('sel', isSel);
      if (p.type === 'place') p.node.classList.toggle('loved', loveCount(p.ref.id) > 0);
      if (p.type === 'stop') p.node.classList.toggle('muted', p.ref.day !== state.day);
      p.node.style.zIndex = isSel ? 30 : p.type === 'stop' ? (p.ref.day === state.day ? 20 : 5) : 10;
    }
    p.node.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
  }
}
function prio(p) {
  if (p.type === 'stop') return (state.stop === p.ref.id ? 1000 : 0) + (p.ref.day === state.day ? 500 - p.ref.idx : 100);
  if (p.type === 'place') return (state.place === p.ref.id ? 1000 : 0) + 200;
  return 50;
}

/* ───────────────────────── HUD ───────────────────────── */
function updateHud() {
  if (!scene) return;
  const c = camera.positionCartographic;
  const ray = camera.getPickRay(new C.Cartesian2(scene.canvas.clientWidth / 2, scene.canvas.clientHeight / 2));
  const hit = ray && (scene.globe.pick(ray, scene) || camera.pickEllipsoid(new C.Cartesian2(scene.canvas.clientWidth / 2, scene.canvas.clientHeight / 2)));
  const t = hit ? C.Cartographic.fromCartesian(hit) : c;
  const lat = C.Math.toDegrees(t.latitude), lon = C.Math.toDegrees(t.longitude);
  $('#rLat').textContent = dms(lat, 'N', 'S');
  $('#rLon').textContent = dms(lon, 'E', 'W');
  $('#rMgrs').textContent = mgrsOf(lat, lon);
  const alt = c.height;
  $('#rAlt').textContent = alt > 10000 ? `${(alt / 1000).toLocaleString('en-US', { maximumFractionDigits: 0 })} km` : `${Math.round(alt).toLocaleString('en-US')} m`;
  $('#rHdg').textContent = `${String(Math.round(C.Math.toDegrees(camera.heading)) % 360).padStart(3, '0')}°`;
}
function startMin(t) {
  if (/All day/.test(t)) return 540;
  const m = t.match(/(\d{1,2})(?::(\d{2}))?/);
  if (!m) return null;
  const ap = (t.match(/AM|PM/) || [''])[0];
  let h = +m[1] % 12; if (ap === 'PM' && !(t.indexOf('AM') > -1 && t.indexOf('AM') < t.indexOf('PM'))) h += 12;
  if (/^\d{1,2}(:\d{2})?–\d/.test(t) && /PM$/.test(t) && +m[1] < 12 && +m[1] >= 6 && !/AM/.test(t)) h = (+m[1] % 12) + 12;
  return h * 60 + (+m[2] || 0);
}
function sfNow() {
  const d = new Date(tripNow() - 8 * 3600000);
  return { day: Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - Date.UTC(2026, 10, 14)) / 86400000), min: d.getUTCHours() * 60 + d.getUTCMinutes() };
}
let fieldShown = '';
function updateField() {
  const { day, min } = sfNow();
  if (day < 0 || day > 6) return null;
  const st = DAYS[day].stops.filter((s) => !s.leg && s.via !== 'none' && startMin(s.t) !== null);
  const next = st.find((s) => startMin(s.t) >= min - 20) || null;
  if (!next) { setNow(`${DAYS[day].dw} · DONE FOR TODAY`, 'Rest up. Tomorrow: ' + (DAYS[day + 1] ? DAYS[day + 1].title : 'home')); return { day, next: null }; }
  const dt = startMin(next.t) - min;
  const when = dt <= 0 ? 'NOW' : dt < 60 ? `IN ${dt} MIN` : `IN ${Math.floor(dt / 60)}H ${String(dt % 60).padStart(2, '0')}M`;
  const key = `NEXT · ${next.t} · ${when}`;
  if (key !== fieldShown) { fieldShown = key; setNow(key, next.n); }
  return { day, next };
}
function updateClock() {
  const now = new Date(tripNow());
  const f = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  $('#sfclock').textContent = `SF ${f.format(now).toUpperCase()}`;
  const ms = LANDING_UTC - now.getTime();
  let txt;
  if (ms > 0) {
    const d = Math.floor(ms / 86400000), h = Math.floor((ms % 86400000) / 3600000), m = Math.floor((ms % 3600000) / 60000);
    txt = `WHEELS DOWN T−${d}D ${String(h).padStart(2, '0')}H ${String(m).padStart(2, '0')}M`;
  } else {
    const day = Math.floor((now.getTime() - Date.UTC(2026, 10, 14, 8)) / 86400000) + 1;
    txt = day <= 7 ? `IN THE FIELD · DAY ${day} OF 7` : 'OPERATION COMPLETE';
  }
  $('#countdown').textContent = txt;
  if (state.field) updateField();
}

/* ───────────────────────── Camera ───────────────────────── */
let orbitOff = null;
let flightToken = 0;
function stopOrbit() {
  if (orbitOff) { orbitOff(); orbitOff = null; camera.lookAtTransform(C.Matrix4.IDENTITY); }
  $('#btnOrbit').setAttribute('aria-pressed', 'false');
}
function startOrbit(target, range, pitchDeg, speedDeg = 4) {
  stopOrbit();
  if (REDUCED) return;
  let angle = camera.heading, last = performance.now();
  orbitOff = scene.preRender.addEventListener(() => {
    const now = performance.now(); angle += C.Math.toRadians(speedDeg) * ((now - last) / 1000); last = now;
    camera.lookAt(target, new C.HeadingPitchRange(angle, C.Math.toRadians(pitchDeg), range));
  });
  $('#btnOrbit').setAttribute('aria-pressed', 'true');
}
function stopAll() { stopOrbit(); tour.cancel(); camera.cancelFlight(); }
function flyToStop(s, { duration = 2.8, orbit = true } = {}) {
  stopOrbit(); camera.cancelFlight();
  const token = ++flightToken;
  const h = groundAt(s.lon, s.lat);
  const target = C.Cartesian3.fromDegrees(s.lon, s.lat, h);
  const heading = C.Math.toRadians((s.num * 67 + s.day * 31) % 360);
  const pitch = s.range > 3000 ? -50 : -32;
  return new Promise((done) => {
    camera.flyToBoundingSphere(new C.BoundingSphere(target, 1), {
      offset: new C.HeadingPitchRange(heading, C.Math.toRadians(pitch), s.range),
      duration: REDUCED ? 0 : duration,
      maximumHeight: camera.positionCartographic.height < 50000 ? Math.max(4000, s.range * 4) : undefined,
      complete: () => { if (token === flightToken && orbit) startOrbit(target, s.range, pitch); done(true); },
      cancel: () => done(false),
    });
    // Watchdog: if a long flight stalls (heavy terrain loading can drop it), land the camera directly.
    setTimeout(() => {
      if (token !== flightToken || orbitOff) return;
      if (C.Cartesian3.distance(camera.positionWC, target) > s.range * 6) {
        camera.cancelFlight();
        camera.lookAt(target, new C.HeadingPitchRange(heading, C.Math.toRadians(pitch), s.range));
        if (orbit) startOrbit(target, s.range, pitch); else camera.lookAtTransform(C.Matrix4.IDENTITY);
        done(true);
      }
    }, (REDUCED ? 0 : duration * 1000) + 2500);
  });
}
function flyToDay(di, duration = 2.6) {
  stopOrbit(); camera.cancelFlight();
  const st = DAYS[di].stops.filter((s) => !s.leg && !(di === 0 && s.idx === 0));
  const pts = st.map((s) => C.Cartesian3.fromDegrees(s.lon, s.lat, groundAt(s.lon, s.lat)));
  const bs = C.BoundingSphere.fromPoints(pts);
  const r = Math.max(bs.radius * 3.1, 2600);
  camera.flyToBoundingSphere(new C.BoundingSphere(bs.center, 1), {
    offset: new C.HeadingPitchRange(C.Math.toRadians(-20), C.Math.toRadians(-52), r),
    duration: REDUCED ? 0 : duration,
  });
}
function flyHome(duration = 3.2) {
  stopAll();
  camera.flyTo({
    destination: C.Cartesian3.fromDegrees(-122.44, 37.655, 16500),
    orientation: { heading: C.Math.toRadians(-8), pitch: C.Math.toRadians(-38), roll: 0 },
    duration: REDUCED ? 0 : duration,
  });
  setNow('OVERVIEW', 'SAN FRANCISCO + MARIN · 7 DAYS');
}

/* Tour: fly every stop of a day in order, orbiting each for a beat. */
const tour = {
  run: 0, active: false,
  cancel() { if (this.active) { this.run++; this.active = false; renderPlay(); } },
  async play(di) {
    this.cancel();
    const run = ++this.run; this.active = true; renderPlay();
    const stops = DAYS[di].stops.filter((s) => !s.leg);
    for (const s of stops) {
      if (run !== this.run) return;
      selectStop(di, s.idx, { fly: false, fromTour: true });
      await flyToStop(s, { duration: 3.2 });
      if (run !== this.run) return;
      await new Promise((r) => setTimeout(r, REDUCED ? 2500 : 4200));
    }
    if (run === this.run) { this.active = false; renderPlay(); }
  },
};
function renderPlay() {
  const b = $('#btnPlay');
  b.querySelector('span').textContent = tour.active ? 'Stop the flight' : 'Fly the day';
  b.querySelector('svg').innerHTML = tour.active ? '<path d="M2 2h8v8H2z"/>' : '<path d="M2 1l9 5-9 5z"/>';
}

/* ───────────────────────── State + UI ───────────────────────── */
const state = {
  day: 0, stop: null, place: null, sensor: 'day', filter: 'all',
  layers: { route: true, eat: true, coffee: true, gem: true, fog: true, hoods: false, buildings: true },
};
try { Object.assign(state.layers, JSON.parse(localStorage.getItem('fogcity.layers') || '{}')); } catch { /* storage unavailable */ }

function setNow(key, text) {
  $('#nowKey').textContent = key;
  setSplitFlapText($('#nowText'), text.toUpperCase(), { maxTotalMs: 900 });
}

function renderBoard() {
  const board = $('#board');
  board.replaceChildren(...DAYS.map((d, i) => el('button', {
    class: `day${d.out ? ' out' : ''}`, role: 'tab', id: `tab-${d.id}`,
    'aria-selected': String(i === state.day), 'aria-controls': 'timeline',
    onclick: () => selectDay(i),
  }, [el('span', { class: 'dw', text: d.dw }), el('span', { class: 'dn', text: String(d.dn) }), el('span', { class: 'dt', text: d.tag })])));
}

function renderDay() {
  const d = DAYS[state.day];
  document.querySelectorAll('.day').forEach((b, i) => b.setAttribute('aria-selected', String(i === state.day)));
  $('#dayEyebrow').textContent = d.eyebrow;
  setSplitFlapText($('#dayTitle'), d.title.toUpperCase(), { maxTotalMs: 900 });
  $('#daySub').textContent = d.sub;
  const st = sunTimes(DATE_OF(state.day), 37.79, -122.44);
  const meta = $('#dayMeta');
  meta.replaceChildren(
    el('span', { text: `NOV ${d.dn}` }),
    el('span', { text: `SUNRISE ${hm(st.rise)}` }),
    el('span', { text: `SUNSET ${hm(st.set)}` }),
    el('span', { text: `${d.stops.filter((s) => !s.leg).length} STOPS` }),
  );
  const fc = $('#dayFc');
  const w = WEATHER && WEATHER.days && WEATHER.days[`2026-11-${d.dn}`];
  if (w) {
    fc.replaceChildren(el('b', { text: `${w.hi ?? '–'}° / ${w.lo ?? '–'}°F` }), ` ${w.short}`,
      w.pop != null ? ` · ${w.pop}% rain` : '', w.wind ? ` · wind ${w.wind}` : '',
      el('span', { class: 'fcsrc', text: ` NWS forecast, updated ${new Date(WEATHER.updated).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` }));
    fc.hidden = false;
  } else {
    fc.replaceChildren(el('b', { text: 'Forecast' }), ' The National Weather Service posts it about 7 days out, so this fills in around Nov 7.');
    fc.hidden = false;
  }
  renderTimeline();
  renderPicks();
  if (typeof window.onFcDay === 'function') window.onFcDay();
}

function renderTimeline() {
  const d = DAYS[state.day];
  const list = $('#timeline');
  const real = d.stops.filter((x) => !x.leg);
  const nextReal = (i) => d.stops.slice(i + 1).find((x) => !x.leg);
  const rows = [];
  d.stops.forEach((s, i) => {
    if (s.leg) {
      const nx = nextReal(i), r = nx && routeFor(nx);
      rows.push(el('li', { class: 'stop leg', 'data-leg': nx ? nx.id : null }, el('button', { disabled: true, tabindex: '-1' }, [
        el('span', { class: 't', text: s.t }), el('span', { class: 'nm' }, [s.n, r ? el('span', { class: 'legmeta', text: legLabel(r) }) : null])])));
      return;
    }
    const prevRow = d.stops[i - 1];
    const r = routeFor(s);
    if (r && !(prevRow && prevRow.leg) && real.indexOf(s) > 0) {
      rows.push(el('li', { class: 'via', 'data-leg': s.id }, [el('span', { class: `vm ${r.mode}`, 'aria-hidden': 'true' }), legLabel(r)]));
    }
    rows.push(stopRow(s));
  });
  list.replaceChildren(...rows);
  if (typeof GM !== 'undefined' && GM.on) {
    GM.legs(state.day);
    const selStop = d.stops.find((x) => x.id === state.stop);
    if (selStop) GM.stop(selStop);
  }
}
function stopRow(s) {
  {
    const sel = state.stop === s.id;
    const li = el('li', { class: `stop${sel ? ' sel' : ''}`, id: `stop-${s.id}` });
    li.append(el('button', { 'aria-expanded': String(sel), onclick: () => selectStop(s.day, s.idx) }, [
      el('span', { class: 't' }, [el('span', { class: 'n', text: String(s.num) }), el('br'), s.t]),
      el('span', {}, [
        el('span', { class: 'nm' }, [el('span', { text: s.n }), s.conf ? el('em', { class: 'conf', text: 'Conference' }) : s.must ? el('em', { text: 'Must-see' }) : s.flex ? el('em', { class: 'flex', text: 'Flexible' }) : null]),
        el('span', { class: 'ds', text: s.d }),
        sel && photoFor(s.id) ? figure('stopphoto', photoFor(s.id), s.n) : null,
        sel ? el('div', { class: 'gm-stop', 'data-gm-stop': s.id }) : null,
      ]),
    ]));
    if (s.conf) { const ag = qconAgenda(DAYS[s.day].id); if (ag) li.append(ag); }
    if (sel) {
      const near = nearbyFor(s);
      if (near.length) {
        li.append(el('div', { class: 'near' }, [
          el('div', { class: 'h', text: 'Within reach' }),
          ...near.map(({ p, m }) => el('button', { onclick: () => openPlace(p) }, [
            el('span', { class: `glyph ${p.kind}`, 'aria-hidden': 'true' }),
            el('span', { class: 'pn', text: p.name }),
            el('span', { class: 'pd', text: distLabel(m) }),
          ])),
        ]));
      }
    }
    return li;
  }
}

function renderFilters() {
  const f = $('#filters');
  const opts = [['all', 'All'], ['eat', 'Eats'], ['coffee', 'Coffee & drinks'], ['gem', 'Hidden gems']];
  f.replaceChildren(...opts.map(([id, label]) => el('button', {
    'aria-pressed': String(state.filter === id), onclick: () => { state.filter = id; renderFilters(); renderPicks(); },
  }, [id === 'all' ? null : el('span', { class: `glyph ${id}`, 'aria-hidden': 'true' }), label])));
}
function renderPicks() {
  const d = state.day;
  const list = PLACES.filter((p) => p.near.s.day === d || (d >= 2 && d <= 5 && p.near.s.day >= 2 && p.near.s.day <= 6))
    .filter((p) => state.filter === 'all' || p.kind === state.filter || (state.filter === 'coffee' && p.kind === 'drink'))
    .sort((a, b) => a.near.m - b.near.m);
  $('#pickCount').textContent = `${list.length} NEAR ${DAYS[d].dw}`;
  const host = $('#picks');
  if (!list.length) { host.replaceChildren(el('p', { class: 'sub', text: 'Nothing in this category near today’s stops.' })); return; }
  host.replaceChildren(...list.map((p) => el('button', { onclick: () => openPlace(p) }, [
    el('span', { class: `glyph ${p.kind}`, 'aria-hidden': 'true' }),
    el('span', { class: 'pn', text: p.name }),
    el('span', { class: 'pd' }, [loveCount(p.id) ? el('span', { class: 'loveflag', text: `♥ ${loveCount(p.id)}  ` }) : null, `${distLabel(p.near.m)} · ${p.near.s.n.split(/[:+(→]/)[0].trim()}`]),
    el('span', { class: 'pb', text: p.blurb.split('. ')[0].replace(/\.$/, '') + '.' }),
  ])));
}

const LAYER_DEFS = [
  ['route', 'Our stops & route', 'stop'], ['eat', 'Eats', 'eat'], ['coffee', 'Coffee & drinks', 'coffee'],
  ['gem', 'Hidden gems', 'gem'], ['fog', 'Karl the Fog', null], ['hoods', 'Neighborhoods', null], ['buildings', '3D buildings', null],
];
function renderLayerPanel() {
  const host = $('#layers');
  const counts = { route: STOPS.length, eat: PLACES.filter((p) => p.kind === 'eat').length, coffee: PLACES.filter((p) => p.kind === 'coffee' || p.kind === 'drink').length, gem: PLACES.filter((p) => p.kind === 'gem').length, hoods: CITY ? CITY.hoods.length : 41 };
  const rows = LAYER_DEFS.map(([id, label, g]) => el('label', {}, [
    el('input', { type: 'checkbox', id: `layer-${id}`, checked: state.layers[id], onchange: (e) => { state.layers[id] = e.target.checked; saveLayers(); applyLayerVisibility(); } }),
    g ? el('span', { class: `glyph ${g}`, 'aria-hidden': 'true' }) : null,
    label,
    counts[id] ? el('span', { class: 'ct', text: String(counts[id]) }) : null,
  ]));
  host.replaceChildren(...rows);
  // map style lives on the map, next to the sensor looks
  const mm = $('#mapSeg');
  if (satAvailable) {
    const opts = [['google', '3D city', '3D'], ['satellite', 'Satellite', 'Sat'], ['drawn', 'Drawn map', 'Drawn']].filter(([id]) => id !== 'google' || googleOk !== false);
    mm.replaceChildren(el('span', { class: 'seg-label', text: 'MAP' }), ...opts.map(([id, label, short]) => el('button', { 'aria-pressed': String(mapMode === id), 'aria-label': label, title: label, onclick: () => {
      try { localStorage.setItem('fogcity.map', id); } catch { /* ignore */ }
      setMapMode(id);
    } }, [el('span', { class: 'lg', text: label }), el('span', { class: 'sh', text: short })])));
    mm.hidden = false;
  } else mm.hidden = true;
}
function saveLayers() { try { localStorage.setItem('fogcity.layers', JSON.stringify(state.layers)); } catch { /* ignore */ } }
function applyLayerVisibility() {
  for (const k of ['route', 'routeWalk', 'routeDrive']) if (prims[k]) prims[k].show = state.layers.route;
  if (prims.hoods) prims.hoods.show = state.layers.hoods && !satellite;
  if (prims.tall) prims.tall.show = state.layers.buildings && !satellite;
  if (prims.bridge) prims.bridge.show = prims.cables.show = mapMode !== 'google';
  if (scene && CITY && !!fogStage !== !!state.layers.fog) setFog(state.layers.fog);
}

function selectDay(i, { fly = true } = {}) {
  if (i !== state.day) tour.cancel();
  state.day = i; state.stop = null;
  if (location.hash !== `#${DAYS[i].id}`) history.replaceState(null, '', `#${DAYS[i].id}`);
  renderDay();
  if (scene) {
    drawDayRoute(i);
    if (fly) flyToDay(i);
  }
  setNow(`${DAYS[i].dw} ${DAYS[i].dn} NOV`, DAYS[i].title);
}
function selectStop(di, si, { fly = true, fromTour = false } = {}) {
  if (!fromTour) tour.cancel();
  if (di !== state.day) { state.day = di; history.replaceState(null, '', `#${DAYS[di].id}`); renderDay(); drawDayRoute(di); }
  const s = DAYS[di].stops[si];
  state.stop = s.id;
  closeCard();
  renderTimeline();
  setNow(`${DAYS[di].dw} · ${s.t}`, s.n);
  const row = document.getElementById(`stop-${s.id}`);
  if (row && !fromTour) row.scrollIntoView({ block: 'nearest', behavior: REDUCED ? 'auto' : 'smooth' });
  if (typeof TAB !== 'undefined' && TAB.current === 'replay' && Replay.entered) { Replay.jumpTo(s.id); return; }
  if (fly && scene) flyToStop(s);
}

function stepStop(dir) {
  if (typeof TAB !== 'undefined' && TAB.current === 'replay' && Replay.entered) { Replay.step(dir); return; }
  const st = DAYS[state.day].stops.filter((s) => !s.leg);
  let i = st.findIndex((s) => s.id === state.stop);
  if (i < 0) i = dir > 0 ? -1 : st.length;
  const j = i + dir;
  if (j >= st.length) { if (state.day < DAYS.length - 1) { selectDay(state.day + 1, { fly: false }); const n = DAYS[state.day].stops.find((s) => !s.leg); selectStop(n.day, n.idx); } return; }
  if (j < 0) { if (state.day > 0) { selectDay(state.day - 1, { fly: false }); const ps = DAYS[state.day].stops.filter((s) => !s.leg); const n = ps[ps.length - 1]; selectStop(n.day, n.idx); } return; }
  selectStop(st[j].day, st[j].idx);
}
function openPlace(p) {
  state.place = p.id;
  const k = KIND[p.kind];
  $('#cardKind').replaceChildren(el('span', { class: `glyph ${p.kind}`, 'aria-hidden': 'true' }), k.label);
  $('#cardName').textContent = p.name;
  $('#cardBlurb').textContent = p.blurb;
  const tip = $('#cardTip'); tip.textContent = p.tip; tip.hidden = !p.tip;
  const ns = p.near.s;
  $('#cardMeta').textContent = `${DAYS[ns.day].dw} · ${distLabel(p.near.m)} from ${ns.n.split(/[:+(→]/)[0].trim()} · ${distLabel(p.fromHotel)} from the hotel`;
  const links = [el('a', { href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.name} ${p.lat},${p.lon}`)}`, target: '_blank', rel: 'noopener', text: 'Open in Maps ↗' })];
  if (p.url) links.push(el('a', { href: p.url, target: '_blank', rel: 'noopener', text: 'Website ↗' }));
  $('#cardLinks').replaceChildren(...links);
  const ph = photoFor(p.id), fig = $('#cardPhoto');
  if (ph) {
    fig.hidden = false;
    const img = $('#cardImg'); img.alt = p.name; img.dataset.r = '';
    img.onerror = () => { if (ph.remote && !img.dataset.r) { img.dataset.r = '1'; img.src = ph.remote; } else fig.hidden = true; };
    img.src = ph.src;
    const cr = $('#cardCredit'); cr.replaceChildren(ph.page ? el('a', { href: ph.page, target: '_blank', rel: 'noopener', text: `${ph.author} · ${ph.license}` }) : `${ph.author} · ${ph.license}`);
  } else fig.hidden = true;
  renderCardSocial();
  if (typeof GM !== 'undefined') GM.placeCard(p);
  $('#card').hidden = false;
  if (scene) {
    stopAll();
    const h = groundAt(p.lon, p.lat);
    camera.flyToBoundingSphere(new C.BoundingSphere(C.Cartesian3.fromDegrees(p.lon, p.lat, h), 1), {
      offset: new C.HeadingPitchRange(camera.heading, C.Math.toRadians(-38), p.near.m > 3000 ? 1400 : 650),
      duration: REDUCED ? 0 : 2,
    });
  }
}
let mePin = null;
function showMe(me) {
  if (!mePin) {
    const n = el('div', { class: 'pin me', 'aria-label': 'You are here' }, [el('span', { class: 'mk' })]);
    labelsEl.append(n);
    mePin = { type: 'me', node: n, lat: me.lat, lon: me.lon, h: null, w: 0 };
    pins.push(mePin);
  }
  Object.assign(mePin, { lat: me.lat, lon: me.lon, h: null });
}
function closeCard() { state.place = null; $('#card').hidden = true; }

function renderSensors() {
  const seg = $('#sensorSeg');
  for (const s of SENSORS) seg.append(el('button', { 'data-id': s.id, 'aria-pressed': String(s.id === state.sensor), onclick: () => setSensor(s.id) }, [el('span', { class: 'lg', text: s.label }), el('span', { class: 'sh', text: s.id === 'story' ? 'Story' : s.label })]));
}


/* ───────────────────────── Shared wishlist + checklist ─────────────────────────
   Inside claude.ai the page uses the artifact's shared database, so Matt and Val
   see each other's hearts and ticks. Anywhere else it falls back to this device. */
const CHECKS = [
  { id: 'parking', t: 'Reserve Muir Woods parking', s: 'Sunday Nov 15, aim for a 9:00 AM slot', url: 'https://gomuirwoods.com/' },
  { id: 'rental', t: 'Reserve the Sunday rental car', s: 'Avis, 500 Beach St. Confirm return hours', url: 'https://www.avis.com/en/locations/nam/us/ca/san-francisco/fmw' },
  { id: 'workshops', t: 'Register for the QCon workshops', s: 'Thu: Measuring What Matters (9 AM), Skills That Actually Work (1 PM). Fri: Harness Engineering', url: 'https://qconsf.com/training/nov2026' },
  { id: 'exploratorium', t: 'Book Exploratorium After Dark', s: 'Thursday Nov 19, Glow Opening, 6–10 PM', url: 'https://www.exploratorium.edu/visit/calendar/after-dark-glow-opening' },
  { id: 'cruise', t: 'Book the City Lights Cruise', s: 'Friday 5:30 PM, once the flight time is set', url: 'https://www.redandwhite.com/schedule' },
  { id: 'primerib', t: 'House of Prime Rib, if we want it', s: 'Reservations fill weeks out', url: 'https://www.houseofprimerib.net' },
  { id: 'offline', t: 'Download trail maps + parking receipt', s: 'No cell signal at Muir Woods', url: 'https://www.nps.gov/muwo/planyourvisit/know-before-you-go.htm' },
  { id: 'pack', t: 'Pack for the coast', s: 'Grippy shoes, windproof layer, rain shell, charger' },
];
const social = { db: null, user: null, me: null, hearts: {}, checks: {}, profiles: {}, shared: false };
const LOCAL_ME = 'me';
function loveCount(id) { let n = 0; for (const list of Object.values(social.hearts)) if (list.includes(id)) n++; return n; }
function lovers(id) { return Object.entries(social.hearts).filter(([, l]) => l.includes(id)).map(([u]) => u); }
function myHearts() { return social.hearts[social.me || LOCAL_ME] || []; }
function nameOf(uid) {
  if (uid === (social.me || LOCAL_ME)) return 'You';
  return (social.profiles[uid] && social.profiles[uid].name) || 'Someone';
}
async function refreshProfiles() {
  if (!social.user || !social.user.profiles) return;
  const ids = Object.keys(social.hearts).concat(Object.values(social.checks).map((c) => c.by).filter(Boolean));
  if (!ids.length) return;
  try { social.profiles = await social.user.profiles([...new Set(ids)]); } catch { /* names stay generic */ }
}
function whoNode(uids) {
  const box = el('span', { class: 'who' });
  if (!uids.length) return box;
  for (const u of uids.slice(0, 3)) {
    const pr = social.profiles[u];
    if (pr && pr.avatarUrl) box.append(el('img', { src: pr.avatarUrl, alt: '' }));
  }
  const names = uids.map(nameOf);
  box.append(names.length === 1 ? (names[0] === 'You' ? 'You want to go' : `${names[0]} wants to go`) : `${names.join(' & ')} want to go`);
  return box;
}
function renderCardSocial() {
  if (!state.place) return;
  const mine = myHearts().includes(state.place);
  const b = $('#cardHeart');
  b.setAttribute('aria-pressed', String(mine));
  b.querySelector('span').textContent = mine ? 'On our list' : 'Want to go';
  $('#cardWho').replaceWith(Object.assign(whoNode(lovers(state.place)), { id: 'cardWho' }));
}
function renderWish() {
  const host = $('#wish');
  const ids = [...new Set(Object.values(social.hearts).flat())];
  const items = ids.map((id) => PLACES.find((p) => p.id === id)).filter(Boolean)
    .sort((a, b) => a.near.s.day - b.near.s.day || a.near.m - b.near.m);
  $('#wishCount').textContent = items.length ? `${items.length} SAVED` : '';
  if (!items.length) {
    host.replaceChildren(el('p', { class: 'empty', text: 'Nothing yet. Open any dot on the map or a place below and tap “Want to go”.' }));
  } else {
    host.replaceChildren(...items.map((p) => el('button', { onclick: () => openPlace(p) }, [
      el('span', { class: `glyph ${p.kind}`, 'aria-hidden': 'true' }),
      el('span', { class: 'pn' }, [p.name, el('span', { class: 'pd', text: `${DAYS[p.near.s.day].dw} · near ${p.near.s.n.split(/[:+(→]/)[0].trim()}` })]),
      whoNode(lovers(p.id)),
    ])));
  }
  $('#wishNote').textContent = social.shared
    ? 'Shared: anyone you share this page with sees the same hearts and ticks.'
    : 'Saved on this device. Open it from the shared claude.ai link to sync hearts between your phones.';
}
function renderChecks() {
  const host = $('#checks');
  const done = CHECKS.filter((c) => social.checks[c.id] && social.checks[c.id].done).length;
  $('#checkProg').textContent = `${done} OF ${CHECKS.length}`;
  host.replaceChildren(...CHECKS.map((c) => {
    const st = social.checks[c.id];
    const by = st && st.done && st.by && social.shared ? ` · ticked by ${nameOf(st.by)}` : '';
    return el('li', {}, el('label', {}, [
      el('input', { type: 'checkbox', id: `chk-${c.id}`, checked: !!(st && st.done), onchange: (e) => toggleCheck(c.id, e.target.checked) }),
      el('span', {}, [el('span', { class: 'ct', text: c.t }), el('span', { class: 'cs', text: c.s + by })]),
      c.url ? el('a', { href: c.url, target: '_blank', rel: 'noopener', text: 'Book ↗', onclick: (e) => e.stopPropagation() }) : el('span'),
    ]));
  }));
}
function renderSocial() { renderWish(); renderChecks(); renderCardSocial(); renderPicks(); }
function saveLocal() { try { localStorage.setItem('fogcity.social', JSON.stringify({ hearts: social.hearts[LOCAL_ME] || [], checks: social.checks })); } catch { /* ignore */ } }
async function toggleHeart(id) {
  const me = social.me || LOCAL_ME;
  const list = new Set(social.hearts[me] || []);
  list.has(id) ? list.delete(id) : list.add(id);
  social.hearts[me] = [...list];
  renderSocial();
  if (social.shared) {
    try { await social.db.doc(`hearts/${me}`).set({ places: [...list], at: Date.now() }); }
    catch (e) { console.warn('heart not saved', e && e.code); }
  } else saveLocal();
}
async function toggleCheck(id, done) {
  social.checks[id] = { done, by: social.me || LOCAL_ME, at: Date.now() };
  renderChecks();
  if (social.shared) {
    try { await social.db.doc(`checks/${id}`).set(social.checks[id]); }
    catch (e) { console.warn('check not saved', e && e.code); }
  } else saveLocal();
}
async function initSocial() {
  try {
    const loc = JSON.parse(localStorage.getItem('fogcity.social') || '{}');
    social.hearts[LOCAL_ME] = loc.hearts || [];
    social.checks = loc.checks || {};
  } catch { /* storage unavailable */ }
  renderSocial();
  $('#cardHeart').addEventListener('click', () => state.place && toggleHeart(state.place));
  if (!window.claude || typeof window.claude.use !== 'function') return;
  const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]).catch(() => [null, null]);
  if (!db || !user) return;
  const me = await user.id().catch(() => null);
  if (!me) return;
  Object.assign(social, { db, user, me, shared: true, hearts: {}, checks: {} });
  renderSocial();
  db.collection('hearts').onSnapshot(async (snap) => {
    const next = {};
    for (const d of snap.docs) { const v = d.data(); if (v && Array.isArray(v.places)) next[d.id] = v.places.filter((x) => typeof x === 'string'); }
    social.hearts = next;
    await refreshProfiles();
    renderSocial();
  }, (e) => console.warn('hearts feed', e && e.code));
  db.collection('checks').onSnapshot(async (snap) => {
    const next = {};
    for (const d of snap.docs) { const v = d.data(); if (v) next[d.id] = { done: !!v.done, by: typeof v.by === 'string' ? v.by : null, at: v.at }; }
    social.checks = next;
    await refreshProfiles();
    renderChecks();
  }, (e) => console.warn('checks feed', e && e.code));
}

/* ───────────────────────── Karl the Fog ─────────────────────────
   A ray-marched fog bank that rolls in from the Pacific and pours through the Golden Gate. */
const FOG_FS = `
uniform sampler2D colorTexture;
uniform sampler2D depthTexture;
uniform float time;
uniform mat4 w2l;
in vec2 v_textureCoordinates;
float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.55; for (int i = 0; i < 4; i++){ v += a*vnoise(p); p = p*2.03 + 17.1; a *= 0.5; } return v; }
float density(vec3 p){
  float t = time;
  vec2 q = (p.xy - vec2(t*11.0, -t*2.0)) * 0.00038;
  float n = fbm(q);
  float top = 90.0 + 200.0*n;
  float h = smoothstep(top, top*0.25, p.z);
  float ocean = smoothstep(-5200.0, -8200.0, p.x + 900.0*sin(t*0.03 + p.y*0.0003));
  float gate = exp(-pow((p.y - 5650.0)/950.0, 2.0)) * smoothstep(2500.0, -4500.0, p.x);
  float wisp = 0.22 * smoothstep(0.62, 0.9, n);
  float region = exp(-dot(p.xy, p.xy) / (22000.0*22000.0));
  float m = max(max(ocean, gate), wisp) * region;
  return 0.0007 * h * smoothstep(0.38, 0.72, n + 0.3*m) * m;
}
void main(){
  vec4 base = texture(colorTexture, v_textureCoordinates);
  float depth = czm_readDepth(depthTexture, v_textureCoordinates);
  vec4 ec = czm_windowToEyeCoordinates(gl_FragCoord.xy, depth);
  vec3 wc = (czm_inverseView * vec4(ec.xyz/ec.w, 1.0)).xyz;
  vec3 cam = (w2l * vec4(czm_inverseView[3].xyz, 1.0)).xyz;
  vec3 end = (w2l * vec4(wc, 1.0)).xyz;
  vec3 d = end - cam; float dist = length(d); vec3 dir = d / max(dist, 1e-3);
  if (depth >= 1.0 || dist > 40000.0) dist = 40000.0;
  if (cam.z > 6000.0 && dir.z > -0.01) { out_FragColor = base; return; }
  float t0 = 0.0, t1 = dist;
  if (cam.z > 480.0) { if (dir.z >= 0.0) { out_FragColor = base; return; } t0 = (cam.z - 480.0) / -dir.z; }
  if (dir.z < -1e-4) t1 = min(t1, (cam.z + 5.0) / -dir.z);  // never march below sea level
  t1 = min(t1, 25000.0);
  if (t0 >= t1) { out_FragColor = base; return; }
  const int N = __STEPS__;
  float ds = (t1 - t0) / float(N);
  float j = hash(gl_FragCoord.xy);
  float T = 1.0; vec3 acc = vec3(0.0);
  for (int i = 0; i < N; i++){
    vec3 p = cam + dir * (t0 + (float(i) + j) * ds);
    float k = density(p);
    if (k > 0.0) {
      float a = 1.0 - exp(-k * ds);
      vec3 c = mix(vec3(0.80, 0.84, 0.87), vec3(0.97, 0.975, 0.98), smoothstep(0.0, 260.0, p.z));
      acc += T * a * c; T *= 1.0 - a;
      if (T < 0.03) break;
    }
  }
  out_FragColor = vec4(base.rgb * T + acc, base.a);
}`;
let fogStage = null;
function setFog(on) {
  if (fogStage) { scene.postProcessStages.remove(fogStage); fogStage = null; }
  if (on) {
    const o = CITY.origin;
    const w2l = C.Matrix4.inverseTransformation(C.Transforms.eastNorthUpToFixedFrame(C.Cartesian3.fromDegrees(o.lon0, o.lat0, 0)), new C.Matrix4());
    fogStage = scene.postProcessStages.add(new C.PostProcessStage({ fragmentShader: FOG_FS.replace('__STEPS__', String(perf.fogSteps)), uniforms: { time: () => (performance.now() - t0) / 1000, w2l } }));
  }
  setSensor(state.sensor); // keep the sensor look last in the chain
}

/* ───────────────────────── Start ───────────────────────── */
function initUi() {
  renderBoard();
  renderFilters();
  renderLayerPanel();
  renderSensors();
  const fromHash = DAYS.findIndex((d) => `#${d.id}` === location.hash);
  state.day = fromHash >= 0 ? fromHash : 0;
  renderDay();
  setNow('INBOUND', `${ORIGIN.code} → ${SFO.code} · SAT 14 NOV 9:30 AM`);
  renderPlay();
  updateClock(); setInterval(updateClock, 30000);
  $('#btnPlay').addEventListener('click', () => { if (tour.active) tour.cancel(); else if (scene) tour.play(state.day); });
  $('#btnDay').addEventListener('click', () => { tour.cancel(); state.stop = null; renderTimeline(); flyToDay(state.day); setNow(`${DAYS[state.day].dw} ${DAYS[state.day].dn} NOV`, DAYS[state.day].title); });
  $('#btnHome').addEventListener('click', () => flyHome());
  ['#btnNext', '#nowNext'].forEach((q) => $(q).addEventListener('click', () => stepStop(1)));
  ['#btnPrev', '#nowPrev'].forEach((q) => $(q).addEventListener('click', () => stepStop(-1)));
  $('#btnOrbit').addEventListener('click', () => {
    if (orbitOff) { stopOrbit(); return; }
    const W = scene.canvas.clientWidth, H = scene.canvas.clientHeight;
    const hit = scene.globe.pick(camera.getPickRay(new C.Cartesian2(W / 2, H / 2)), scene);
    if (!hit) return;
    const range = C.Cartesian3.distance(camera.positionWC, hit);
    startOrbit(hit, range, C.Math.toDegrees(camera.pitch), 5);
  });
  $('#cardX').addEventListener('click', closeCard);
  const loc = $('#btnLocate');
  if (!IN_CLAUDE && navigator.geolocation) {
    loc.hidden = false;
    loc.addEventListener('click', () => {
      navigator.geolocation.getCurrentPosition((pos) => {
        const me = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        showMe(me);
        const far = haversine(me, HOTEL);
        if (far > 80000) { setNow('YOUR LOCATION', `${Math.round(far / 1609).toLocaleString('en-US')} MI FROM THE HOTEL`); return; }
        stopAll();
        camera.flyToBoundingSphere(new C.BoundingSphere(C.Cartesian3.fromDegrees(me.lon, me.lat, groundAt(me.lon, me.lat)), 1),
          { offset: new C.HeadingPitchRange(camera.heading, C.Math.toRadians(-45), 900), duration: REDUCED ? 0 : 2 });
        const near = STOPS.filter((s) => s.day === state.day).map((s) => ({ s, m: haversine(me, s) })).sort((a, b) => a.m - b.m)[0];
        setNow('YOU ARE HERE', near ? `${distLabel(near.m)} to ${near.s.n}` : 'SAN FRANCISCO');
      }, () => setNow('LOCATION', 'NOT AVAILABLE'), { enableHighAccuracy: true, timeout: 10000 });
    });
  }
  window.addEventListener('hashchange', () => {
    const i = DAYS.findIndex((d) => `#${d.id}` === location.hash);
    if (i >= 0 && i !== state.day) selectDay(i);
  });
  document.addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea')) return;
    if (e.key === 'Escape') { closeCard(); stopAll(); }
    if ((e.key === 'n' || e.key === 'N') && !e.metaKey && !e.ctrlKey) stepStop(1);
    if ((e.key === 'p' || e.key === 'P') && !e.metaKey && !e.ctrlKey) stepStop(-1);
    if (e.key === 'ArrowRight' && e.altKey) selectDay((state.day + 1) % 7);
    if (e.key === 'ArrowLeft' && e.altKey) selectDay((state.day + 6) % 7);
  });
}

initUi();
initSocial();
boot().then(() => {
  makePins();
  setSensor('day');
  applyLayerVisibility();
  drawDayRoute(state.day);
  const g = $('#globe');
  ['pointerdown', 'wheel'].forEach((ev) => g.addEventListener(ev, () => { stopOrbit(); tour.cancel(); }, { passive: true }));
  let hudT = 0;
  scene.postRender.addEventListener(() => { const n = performance.now(); if (n - hudT > 180) { hudT = n; updateHud(); } });
  // Step quality down if frames run slow (phones, older laptops).
  let frames = 0, slow = 0, last = performance.now();
  scene.postRender.addEventListener(() => {
    const n = performance.now(), dt = n - last; last = n;
    if (dt > 400 || document.hidden) return;
    frames++; if (dt > 42) slow++;
    if (frames < 150) return;
    const bad = slow / frames > 0.6; frames = 0; slow = 0;
    if (!bad || perf.level >= 3) return;
    perf.level++;
    if (perf.level === 1) { perf.fogSteps = 8; if (fogStage) setFog(true); }
    if (perf.level === 2) { perf.near = 3200; scene.globe.maximumScreenSpaceError = 3; }
    if (perf.level === 3) { widget.resolutionScale = 0.75; }
    console.info('quality step down', perf.level);
  });
  $('#boot').remove();
  const go = () => {
    const f = sfNow();
    if (f.day >= 0 && f.day <= 6 && !location.hash) {
      state.field = true;
      selectDay(f.day, { fly: false });
      const r = updateField();
      if (r && r.next) selectStop(r.next.day, r.next.idx); else flyToDay(f.day);
      fieldShown = '';
      updateField();
      return;
    }
    if (state.stop) { const [d, i] = state.stop.split('-'); flyToStop(DAYS.find((x) => x.id === d).stops[+i]); }
    else if (location.hash) selectDay(state.day);
    else flyHome(4.5);
  };
  if (REDUCED) go(); else setTimeout(go, 1600);
}).catch((err) => {
  console.error(err);
  const b = $('#boot');
  b.className = 'err';
  b.textContent = 'The 3D map could not start in this browser (WebGL is required). The plan on the right still works.';
});
