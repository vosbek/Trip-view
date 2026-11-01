/* ───────────── Google extras on the hosted site: hours, Street View, traffic, flyovers ─────────────
   All calls run in the visitor's browser with the site's website-restricted key, on demand,
   and are kept only for the browser session. Inside the claude.ai link these hosts are blocked,
   so none of this shows there. */
var GM = (() => {
  const on = !IN_CLAUDE && !GOOGLE_KEY.startsWith('__');
  const memo = new Map();
  const cache = (k, fn) => {
    if (memo.has(k)) return memo.get(k);
    let v = null;
    try { const s = sessionStorage.getItem(`gm:${k}`); if (s) v = Promise.resolve(JSON.parse(s)); } catch { /* ignore */ }
    if (!v) v = fn().then((r) => { try { sessionStorage.setItem(`gm:${k}`, JSON.stringify(r)); } catch { /* ignore */ } return r; });
    v = v.catch((e) => { memo.delete(k); console.warn('google', k, e && e.message); return null; });
    memo.set(k, v);
    return v;
  };
  const json = async (url, opts = {}) => {
    const r = await fetch(url, opts);
    if (!r.ok) { const e = new Error(`${r.status}`); e.status = r.status; throw e; }
    return r.json();
  };
  const WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const tripWeekday = (di) => WD[(6 + di) % 7]; // Nov 14, 2026 is a Saturday

  /* Street View Static: the arrival view. return_error_code makes "no imagery" a 404, so the image just hides. */
  function streetView(lat, lon, cls, alt) {
    if (!on) return null;
    const src = `https://maps.googleapis.com/maps/api/streetview?size=640x360&location=${lat},${lon}&fov=85&radius=120&source=outdoor&return_error_code=true&key=${GOOGLE_KEY}`;
    const img = el('img', { src, alt: `Street View near ${alt}`, loading: 'lazy' });
    const fig = el('figure', { class: cls }, [img, el('figcaption', { text: 'Google Street View · what you will see arriving' })]);
    img.addEventListener('error', () => fig.remove());
    return fig;
  }

  /* Places API (New): opening hours for a food or gem dot. */
  function hours(p) {
    return cache(`h:${p.id}`, () => json('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': GOOGLE_KEY,
        'X-Goog-FieldMask': 'places.displayName,places.businessStatus,places.regularOpeningHours.weekdayDescriptions,places.googleMapsUri' },
      body: JSON.stringify({ textQuery: p.name.replace(/\(.*?\)/g, ''), maxResultCount: 1,
        locationBias: { circle: { center: { latitude: p.lat, longitude: p.lon }, radius: 400 } } }),
    }).then((d) => {
      const x = d.places && d.places[0];
      return x ? { name: x.displayName && x.displayName.text, status: x.businessStatus, week: (x.regularOpeningHours && x.regularOpeningHours.weekdayDescriptions) || null, url: x.googleMapsUri } : { none: true };
    }));
  }
  async function placeCard(p) {
    const box = $('#cardGoogle');
    box.replaceChildren();
    box.hidden = !on;
    if (!on) return;
    const sv = streetView(p.lat, p.lon, 'gm-sv', p.name);
    box.append(el('div', { class: 'gm-hours', text: 'Checking today’s hours…' }));
    if (sv) box.append(sv);
    const h = await hours(p);
    if (state.place !== p.id) return;
    const hb = box.querySelector('.gm-hours');
    if (!h || h.none) { hb.textContent = 'No hours found on Google for this spot.'; return; }
    if (h.status && h.status !== 'OPERATIONAL') {
      hb.replaceChildren(el('b', { class: 'gm-warn', text: h.status === 'CLOSED_TEMPORARILY' ? 'Temporarily closed' : 'Permanently closed' }), ' according to Google.');
      return;
    }
    if (!h.week) { hb.textContent = 'No posted hours on Google (often means open all day).'; return; }
    const di = p.near.s.day, wd = tripWeekday(di);
    const line = h.week.find((w) => w.startsWith(wd)) || '';
    const rest = line.replace(/^[A-Za-z]+:\s*/, '');
    const all = el('details', { class: 'gm-week' }, [el('summary', { text: 'All week' }), ...h.week.map((w) => el('div', { text: w }))]);
    hb.replaceChildren(el('b', { text: `${DAYS[di].dw} ${DAYS[di].dn} NOV` }), ` ${rest || 'not listed'}`, all, el('span', { class: 'gm-src', text: 'Hours from Google' }));
  }

  /* Routes API: traffic-aware drive time for the planned departure. */
  function traffic(leg, departIso) {
    return cache(`r:${leg.id}:${departIso}`, () => json('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': GOOGLE_KEY, 'X-Goog-FieldMask': 'routes.duration,routes.staticDuration,routes.distanceMeters' },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: leg.from[1], longitude: leg.from[0] } } },
        destination: { location: { latLng: { latitude: leg.to[1], longitude: leg.to[0] } } },
        travelMode: 'DRIVE', routingPreference: 'TRAFFIC_AWARE_OPTIMAL', departureTime: departIso,
      }),
    }).then((d) => {
      const r = d.routes && d.routes[0];
      return r ? { min: Math.round(parseInt(r.duration, 10) / 60), base: Math.round(parseInt(r.staticDuration || r.duration, 10) / 60) } : null;
    }));
  }
  async function legs(di) {
    if (!on) return;
    const sched = scheduleFor(di);
    for (const L of sched.legs) {
      if (L.mode === 'walk') continue;
      const row = document.querySelector(`[data-leg="${L.to.id}"]`);
      if (!row) continue;
      const depart = new Date(dayMs(di, L.t0)).toISOString().replace(/\.\d+Z$/, 'Z');
      const leg = { id: L.to.id, from: [L.from.lon, L.from.lat], to: [L.to.lon, L.to.lat] };
      traffic(leg, depart).then((r) => {
        if (!r || !row.isConnected) return;
        const leave = L.t1 - r.min - 5;
        let n = row.querySelector('.gm-traffic');
        if (!n) { n = el('span', { class: 'gm-traffic' }); row.append(n); }
        n.textContent = `Google traffic for ${fmtMin(L.t0)}: ${r.min} min${r.base && r.base !== r.min ? ` (${r.base} with no traffic)` : ''} · leave by ${fmtMin(leave)}`;
      });
    }
  }

  /* Aerial View API: cinematic flyover for a stop's address, when Google has rendered one. */
  const ADDR = {
    'sat-0': '2700 Jones St, San Francisco, CA 94133',
    'sat-2': '3601 Lyon St, San Francisco, CA 94123',
    'sat-3': '1 Letterman Dr, San Francisco, CA 94129',
    'sat-6': '680 Point Lobos Ave, San Francisco, CA 94121',
    'sat-7': '1004 Point Lobos Ave, San Francisco, CA 94121',
    'sun-2': '1 Muir Woods Rd, Mill Valley, CA 94941',
    'sun-4': '1250 Bridgeway, Sausalito, CA 94965',
    'mon-1': '5 Embarcadero Center, San Francisco, CA 94111',
    'wed-1': 'Pier 45, San Francisco, CA 94133',
    'thu-1': 'Pier 15, San Francisco, CA 94111',
    'fri-1': 'Pier 43 1/2, San Francisco, CA 94133',
  };
  const addrFor = (s) => ADDR[s.id] || (s.lat === HYATT.lat ? ADDR['mon-1'] : null);
  function flyover(addr) {
    return cache(`a:${addr}`, () => fetch(`https://aerialview.googleapis.com/v1/videos:lookupVideo?key=${GOOGLE_KEY}&address=${encodeURIComponent(addr)}`)
      .then(async (r) => {
        if (r.status === 404) {
          // Ask Google to render one for next time (takes a few hours); only once per browser.
          try {
            if (!localStorage.getItem(`gm:render:${addr}`)) {
              localStorage.setItem(`gm:render:${addr}`, '1');
              fetch(`https://aerialview.googleapis.com/v1/videos:renderVideo?key=${GOOGLE_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address: addr }) }).catch(() => {});
            }
          } catch { /* ignore */ }
          return { none: true };
        }
        if (!r.ok) throw new Error(String(r.status));
        const d = await r.json();
        const u = d.uris && (d.uris.MP4_HIGH || d.uris.MP4_MEDIUM || d.uris.MP4_LOW);
        return d.state === 'ACTIVE' && u ? { src: u.landscapeUri } : { none: true, state: d.state };
      }));
  }
  async function stop(s) {
    const host = document.querySelector(`[data-gm-stop="${s.id}"]`);
    if (!host || !on) return;
    const sv = streetView(s.lat, s.lon, 'gm-sv', s.n);
    if (sv) host.append(sv);
    const addr = addrFor(s);
    if (!addr) return;
    const f = await flyover(addr);
    if (!f || f.none || !host.isConnected) return;
    const btn = el('button', { class: 'linkbtn gm-fly', text: '▶ Watch Google’s flyover' });
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const v = el('video', { src: f.src, controls: true, autoplay: true, muted: true, playsinline: true, class: 'gm-video' });
      btn.replaceWith(el('figure', { class: 'gm-flyfig' }, [v, el('figcaption', { text: 'Google Aerial View' })]));
    });
    host.prepend(btn);
  }
  return { on, placeCard, legs, stop };
})();
