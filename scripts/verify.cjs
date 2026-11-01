// Screenshot the live site so the deploy can be checked by eye.
const { chromium } = require('playwright');
(async () => {
  const url = process.argv[2];
  const out = process.argv[3];
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const log = [];
  async function shot(name, vp, opts = {}) {
    const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => log.push(`${name} PAGEERROR ${e.message}`));
    p.on('console', (m) => { if (m.type() === 'error') log.push(`${name} console ${m.text().slice(0, 200)}`); });
    await p.goto(url + (opts.query || '') + (opts.hash || ''), { waitUntil: 'load' });
    await p.waitForTimeout(opts.wait || 30000);
    if (opts.js) { await p.evaluate(opts.js); await p.waitForTimeout(opts.after || 20000); }
    const info = await p.evaluate(() => ({ sat: typeof satellite !== 'undefined' && satellite, map: typeof mapMode !== 'undefined' && mapMode, routes: typeof ROUTES !== 'undefined' ? Object.keys(ROUTES).length : -1, weather: typeof WEATHER !== 'undefined' && !!WEATHER, now: document.querySelector('#nowText')?.textContent, loop: typeof widget !== 'undefined' && widget.useDefaultRenderLoop, cam: typeof camera !== 'undefined' && Math.round(camera.positionCartographic.height), chip: document.querySelector('#link')?.textContent, hours: document.querySelector('.gm-hours')?.textContent?.slice(0, 80), sv: document.querySelector('.gm-sv img')?.naturalWidth || 0, traffic: document.querySelector('.gm-traffic')?.textContent || '', fly: !!document.querySelector('.gm-fly'), rp: typeof Replay !== 'undefined' && Replay.entered ? { live: Replay.live, g3: G3.ok, tiles: G3.tiles ? G3.tiles.visibleTiles.size : 0, t: Math.round(Replay.t), credit: document.querySelector('#rpCredit')?.textContent?.slice(0, 80) } : null, print: !document.querySelector('#printView')?.hidden }));
    log.push(`${name} ${JSON.stringify(info)}`);
    await p.screenshot({ path: `${out}/${name}.png`, timeout: 120000, fullPage: !!opts.full });
    await ctx.close();
  }
  await shot('field', { width: 1440, height: 900 }, { query: '?now=2026-11-14T22:40:00Z', wait: 40000 });
  await shot('overview', { width: 1440, height: 900 }, { wait: 35000 });
  await shot('sutro', { width: 1440, height: 900 }, { hash: '#sat', wait: 20000, js: 'selectStop(0, 7)', after: 25000 });
  await shot('muir', { width: 1440, height: 900 }, { hash: '#sun', wait: 20000, js: 'selectStop(1, 2)', after: 25000 });
  await shot('phone', { width: 390, height: 844 }, { hash: '#sun', wait: 30000 });
  await shot('replay', { width: 1440, height: 900 }, { hash: '#sat', wait: 25000, js: 'setTab("replay"); setTimeout(() => { Replay.t = 930; }, 6000)', after: 40000 });
  await shot('replay-next', { width: 1440, height: 900 }, { hash: '#sun', wait: 25000, js: 'setTab("replay"); setTimeout(() => { document.querySelector("#rpNext").click(); document.querySelector("#rpNext").click(); }, 15000)', after: 45000 });
  await shot('replay-model', { width: 390, height: 844 }, { hash: '#sat', wait: 25000, js: 'setTab("replay"); setTimeout(() => { document.querySelector("#rpMap [data-map=model]").click(); document.querySelector("#rpNext").click(); }, 8000)', after: 20000 });
  await shot('print', { width: 1100, height: 1400 }, { hash: '#print', wait: 15000, full: true });
  await shot('google', { width: 1440, height: 900 }, { hash: '#sat', wait: 30000, js: 'selectStop(0, 2, { fly: false }); openPlace(PLACES.find((p) => p.id === "the-buena-vista"))', after: 15000 });
  require('fs').writeFileSync(`${out}/log.txt`, log.join('\n') + '\n');
  console.log(log.join('\n'));
  await b.close();
  if (log.some((l) => l.includes('PAGEERROR'))) { console.error('page errors found'); process.exit(1); }
})();
