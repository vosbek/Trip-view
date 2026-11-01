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
    if (opts.time) await p.clock.setFixedTime(new Date(opts.time));
    p.on('pageerror', (e) => log.push(`${name} PAGEERROR ${e.message}`));
    p.on('console', (m) => { if (m.type() === 'error') log.push(`${name} console ${m.text().slice(0, 200)}`); });
    await p.goto(url + (opts.hash || ''), { waitUntil: 'load' });
    await p.waitForTimeout(opts.wait || 30000);
    if (opts.js) { await p.evaluate(opts.js); await p.waitForTimeout(opts.after || 20000); }
    const info = await p.evaluate(() => ({ sat: typeof satellite !== 'undefined' && satellite, routes: typeof ROUTES !== 'undefined' ? Object.keys(ROUTES).length : -1, weather: typeof WEATHER !== 'undefined' && !!WEATHER, now: document.querySelector('#nowText')?.textContent, chip: document.querySelector('#link')?.textContent }));
    log.push(`${name} ${JSON.stringify(info)}`);
    await p.screenshot({ path: `${out}/${name}.png`, timeout: 120000 });
    await ctx.close();
  }
  await shot('overview', { width: 1440, height: 900 }, { wait: 35000 });
  await shot('sutro', { width: 1440, height: 900 }, { hash: '#sat', wait: 20000, js: 'selectStop(0, 7)', after: 25000 });
  await shot('muir', { width: 1440, height: 900 }, { hash: '#sun', wait: 20000, js: 'selectStop(1, 2)', after: 25000 });
  await shot('phone', { width: 390, height: 844 }, { hash: '#sun', wait: 30000 });
  await shot('field', { width: 1440, height: 900 }, { time: '2026-11-14T22:40:00Z', wait: 35000 });
  require('fs').writeFileSync(`${out}/log.txt`, log.join('\n') + '\n');
  console.log(log.join('\n'));
  await b.close();
})();
