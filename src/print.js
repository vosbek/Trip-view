/* ───────────────────────── Printable itinerary ─────────────────────────
   A paper version of the week, built from the same plan as the map: every stop with times and
   how to get there, sunrise and sunset, the forecast once it exists, nearby picks (hearted ones
   first), the booking checklist and room to scribble. Opens over the map; prints on Letter or A4. */
const PRINT_URL = 'vosbek.github.io/Trip-view';
const VIA_WORD = { walk: 'Walk', drive: 'Rideshare or drive', streetcar: 'Streetcar or rideshare' };

function printTime(s) {
  if (!s.until) return s.t;
  // "11:30 AM" + "12:00 PM" stays as is; "1:05 PM" + "1:30 PM" becomes "1:05–1:30 PM"
  const a = s.t.match(/^(.*\d)\s*(AM|PM)$/), b = s.until.match(/(AM|PM)$/);
  if (a && b && a[2] === b[1]) return `${a[1]}–${s.until}`;
  return `${s.t}–${s.until}`;
}
function firstSentence(t) { const m = t.match(/^.*?[.!?](\s|$)/); return m ? m[0].trim() : t; }

function buildPrintDoc() {
  const doc = $('#printDoc');
  const hearted = new Set(Object.values(social.hearts).flat());
  const stamp = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const kids = [];

  // cover block
  kids.push(el('header', { class: 'pd-head' }, [
    el('div', { class: 'pd-eyebrow', text: 'Field itinerary · San Francisco + Marin · 37°48′N 122°25′W' }),
    el('h1', {}, ['Operation ', el('span', { text: 'Fog' }), ' City']),
    el('p', { class: 'pd-lede', text: 'Matt & Val · Saturday 14 to Friday 20 November 2026' }),
    el('dl', { class: 'pd-facts' }, [
      el('div', {}, [el('dt', { text: 'Arrive' }), el('dd', { text: 'SFO 9:30 AM Sat' })]),
      el('div', {}, [el('dt', { text: 'Base' }), el('dd', { text: 'Kimpton Alton · 2700 Jones St' })]),
      el('div', {}, [el('dt', { text: 'QCon' }), el('dd', { text: 'Hyatt Regency · 5 Embarcadero Ctr' })]),
      el('div', {}, [el('dt', { text: 'Car (Sun)' }), el('dd', { text: 'Avis · 500 Beach St' })]),
    ]),
  ]));

  // week at a glance + checklist, side by side
  const glance = el('table', { class: 'pd-glance' }, [
    el('thead', {}, el('tr', {}, [el('th', { text: 'Day' }), el('th', { text: 'Plan' }), el('th', { text: 'Sunset' }), el('th', { text: 'Weather' })])),
    el('tbody', {}, DAYS.map((d, di) => {
      const st = sunTimes(DATE_OF(di), 37.79, -122.44);
      const w = WEATHER && WEATHER.days && WEATHER.days[`2026-11-${d.dn}`];
      return el('tr', {}, [
        el('td', { class: 'pd-dw' }, [el('b', { text: d.dw }), ` ${d.dn}`]),
        el('td', {}, [el('b', { text: d.title }), el('span', { class: 'pd-tag', text: d.tag })]),
        el('td', { class: 'pd-num', text: hm(st.set) }),
        el('td', { class: 'pd-num', text: w ? `${w.hi ?? '–'}°/${w.lo ?? '–'}° ${w.short || ''}` : '—' }),
      ]);
    })),
  ]);
  const checks = el('ul', { class: 'pd-checks' }, CHECKS.map((c) => {
    const done = social.checks[c.id] && social.checks[c.id].done;
    return el('li', { class: done ? 'done' : '' }, [el('i', { 'aria-hidden': 'true', text: done ? '✓' : '' }), el('div', {}, [el('b', { text: c.t }), el('span', { text: c.s })])]);
  }));
  kids.push(el('section', { class: 'pd-front' }, [
    el('div', {}, [el('h2', { text: 'The week' }), glance,
      el('p', { class: 'pd-note', text: WEATHER ? `Forecast from the National Weather Service, ${new Date(WEATHER.updated).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}. Print again closer to the trip for fresher numbers.` : 'The National Weather Service forecast appears about a week out; print again then for the weather column.' })]),
    el('div', {}, [el('h2', { text: 'Before we go' }), checks]),
  ]));

  // one block per day
  DAYS.forEach((d, di) => {
    const st = sunTimes(DATE_OF(di), 37.79, -122.44);
    const w = WEATHER && WEATHER.days && WEATHER.days[`2026-11-${d.dn}`];
    const rows = [];
    d.stops.forEach((s) => {
      if (s.leg) {
        rows.push(el('tr', { class: 'pd-leg' }, [el('td', { class: 'pd-num', text: s.t }), el('td', { colspan: '2' }, ['↳ ', s.n])]));
        return;
      }
      const r = routeFor(s);
      const how = s.via ? (r ? legLabel(r).replace(' · ', '\n') : VIA_WORD[s.via] || s.via) : '';
      const tags = [s.must && 'Must', s.conf && 'Conference', s.flex && 'Flexible'].filter(Boolean);
      rows.push(el('tr', { class: s.conf ? 'pd-conf' : '' }, [
        el('td', { class: 'pd-num pd-time', text: printTime(s) }),
        el('td', {}, [
          el('div', { class: 'pd-stop' }, [el('b', { class: 'pd-n', text: String(s.num) }), el('span', { text: s.n }), ...tags.map((t) => el('em', { class: `pd-t pd-t-${t.toLowerCase()}`, text: t }))]),
          el('p', { text: s.d }),
        ]),
        el('td', { class: 'pd-how', text: how }),
      ]));
      if (s.conf && QCON[d.id]) rows.push(el('tr', { class: 'pd-qa' }, [el('td'), el('td', { colspan: '2' }, qconAgenda(d.id, { print: true }))]));
    });
    const picks = PLACES.filter((p) => p.near.s.day === di)
      .sort((a, b) => (hearted.has(b.id) - hearted.has(a.id)) || a.near.m - b.near.m)
      .slice(0, 5);
    const near = picks.length ? el('div', { class: 'pd-near' }, [
      el('h4', { text: 'Nearby, if there’s time' }),
      el('ul', {}, picks.map((p) => el('li', {}, [
        hearted.has(p.id) ? el('i', { class: 'pd-heart', title: 'On the wishlist', text: '♥' }) : null,
        el('b', { text: p.name }),
        el('span', { class: 'pd-kind', text: ` ${KIND[p.kind].label} · ${distLabel(p.near.m)} from ${p.near.s.n.split(/[:+(→]/)[0].trim()}` }),
        el('span', { text: ` — ${firstSentence(p.blurb)}` }),
      ]))),
    ]) : null;
    kids.push(el('section', { class: 'pd-day' }, [
      el('div', { class: 'pd-dayhead' }, [
        el('div', { class: 'pd-stamp' }, [el('b', { text: d.dw }), el('span', { text: String(d.dn) }), el('small', { text: 'NOV' })]),
        el('div', { class: 'pd-daytitle' }, [
          el('div', { class: 'pd-eyebrow', text: d.eyebrow }),
          el('h3', { text: d.title }),
          el('p', { text: d.sub }),
        ]),
        el('div', { class: 'pd-sun' }, [
          el('div', {}, [el('small', { text: 'Sunrise' }), hm(st.rise)]),
          el('div', {}, [el('small', { text: 'Sunset' }), hm(st.set)]),
          w ? el('div', {}, [el('small', { text: 'Forecast' }), `${w.hi ?? '–'}°/${w.lo ?? '–'}° ${w.pop != null ? `· ${w.pop}% rain` : ''}`]) : null,
        ]),
      ]),
      el('table', { class: 'pd-plan' }, [
        el('colgroup', {}, [el('col', { class: 'c-t' }), el('col'), el('col', { class: 'c-h' })]),
        el('tbody', {}, rows),
      ]),
      near,
      el('div', { class: 'pd-lines', 'aria-hidden': 'true' }, [el('span', { text: 'Notes' })]),
    ]));
  });

  kids.push(el('footer', { class: 'pd-foot' }, [
    el('span', { text: `Live map, photos and the shared wishlist: ${PRINT_URL}` }),
    el('span', { text: `Printed ${stamp}` }),
  ]));
  doc.replaceChildren(...kids);
}

function openPrint() {
  buildPrintDoc();
  const v = $('#printView');
  v.hidden = false;
  document.body.classList.add('printing');
  v.scrollTop = 0;
  $('#printClose').focus();
}
function closePrint() {
  $('#printView').hidden = true;
  document.body.classList.remove('printing');
}
(() => {
  $('#btnPrint').addEventListener('click', openPrint);
  $('#printClose').addEventListener('click', closePrint);
  $('#printGo').addEventListener('click', () => { try { window.print(); } catch { /* blocked in some previews */ } });
  if (IN_CLAUDE) $('#printHint').hidden = false;
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#printView').hidden) closePrint(); });
  // the browser's own Print command from the map prints the itinerary, not a screenshot of WebGL
  window.addEventListener('beforeprint', () => { if ($('#printView').hidden) { buildPrintDoc(); document.body.classList.add('printing', 'print-auto'); } });
  window.addEventListener('afterprint', () => { if (document.body.classList.contains('print-auto')) document.body.classList.remove('printing', 'print-auto'); });
  if (/^#print$/.test(location.hash) || /[?&]print\b/.test(location.search)) {
    // wait for the routes so travel times are filled in
    const go = () => (Object.keys(ROUTES).length || performance.now() > 6000 ? openPrint() : setTimeout(go, 200));
    go();
  }
  // if the routes arrive after the sheet opened, refill the travel times
  {
    let had = Object.keys(ROUTES).length > 0, tries = 0;
    const iv = setInterval(() => {
      const has = Object.keys(ROUTES).length > 0;
      if (has && !had && !$('#printView').hidden) buildPrintDoc();
      had = has;
      if (has || ++tries > 60) clearInterval(iv);
    }, 500);
  }
})();
