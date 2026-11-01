/* ─────────────── Second and third views: Day Replay and Light & Fog ───────────────
   Both are three.js scenes built from the same city pack as the globe. three.js is
   loaded only when one of these tabs is first opened. */

const TAB = { current: 'globe', three: null, ready: null };

/* Sun position (degrees; azimuth clockwise from north). */
function sunPos(ms, lat, lon) {
  const r = Math.PI / 180;
  const d = ms / 86400000 + 2440587.5 - 2451545.0;
  const g = ((357.529 + 0.98560028 * d) % 360) * r;
  const q = (280.459 + 0.98564736 * d) % 360;
  const L = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * r;
  const e = (23.439 - 0.00000036 * d) * r;
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L));
  const dec = Math.asin(Math.sin(e) * Math.sin(L));
  const gmst = (((18.697374558 + 24.06570982441908 * d) % 24) + 24) % 24;
  const ha = (gmst * 15 + lon) * r - ra;
  const la = lat * r;
  const el = Math.asin(Math.sin(la) * Math.sin(dec) + Math.cos(la) * Math.cos(dec) * Math.cos(ha));
  const az = Math.atan2(-Math.sin(ha), Math.tan(dec) * Math.cos(la) - Math.sin(la) * Math.cos(ha));
  return { az: ((az / r) + 360) % 360, el: el / r };
}
const dayMs = (di, min) => Date.UTC(2026, 10, 14 + di, 8, 0) + min * 60000; // local minutes → UTC ms (PST)
const fmtMin = (m) => hm(Math.round(((m % 1440) + 1440) % 1440));
function lightPhase(el) {
  if (el > 6) return { id: 'day', label: 'Daylight' };
  if (el > -0.833) return { id: 'golden', label: 'Golden hour' };
  if (el > -6) return { id: 'blue', label: 'Blue hour' };
  return { id: 'night', label: 'After dark' };
}
const PHASE_COLOR = { day: '#e7ecef', golden: '#f2c78f', blue: '#7f93b3', night: '#1d2636' };

/* ───── Day schedule: arrive / depart / travel legs, derived from the plan + real routes ───── */
function endMin(t) {
  const m = t.match(/–\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/);
  if (!m) return null;
  let h = +m[1] % 12; const ap = m[3] || (t.match(/AM|PM/g) || []).pop();
  if (ap === 'PM') h += 12;
  return h * 60 + (+m[2] || 0);
}
function travelMin(a, b) {
  const r = ROUTES[b.id];
  if (r) return Math.max(3, Math.round(r.min));
  const d = haversine(a, b);
  return Math.max(4, Math.round(b.via === 'walk' ? (d * 1.3) / 80 : d / 450 + 6));
}
function scheduleFor(di) {
  const st = DAYS[di].stops.filter((s) => !s.leg && s.via !== 'none');
  const items = st.map((s) => ({ s, start: startMin(s.t), end: s.until ? startMin(s.until) : endMin(s.t) }));
  const legs = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i], nx = items[i + 1];
    if (nx) {
      const tm = travelMin(it.s, nx.s);
      const depart = Math.max(it.start + 5, nx.start - tm);
      if (it.end === null || it.end > depart) it.end = depart;
      it.next = nx;
      legs.push({ from: it.s, to: nx.s, t0: depart, t1: nx.start, mode: nx.s.via || 'drive' });
    } else if (it.end === null) it.end = it.start + 120;
  }
  return { items, legs, first: items[0] ? items[0].start : 480, last: items.length ? items[items.length - 1].end : 1200 };
}

/* ───────────────────────── Tab switching ───────────────────────── */
function setTab(id) {
  if (id === TAB.current) return;
  TAB.current = id;
  document.querySelectorAll('#tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === id)));
  const globeOn = id === 'globe';
  document.body.dataset.tab = id;
  if (typeof widget !== 'undefined' && widget) widget.useDefaultRenderLoop = globeOn;
  if (!globeOn) { stopAll(); closeCard(); }
  $('#threeStage').hidden = globeOn;
  $('#replayUi').hidden = id !== 'replay';
  $('#lightUi').hidden = id !== 'light';
  $('#lightPanel').hidden = id !== 'light';
  if (!globeOn) ensureThree().then(() => (id === 'replay' ? Replay.enter() : Light.enter())).catch((e) => {
    console.error(e);
    $('#threeMsg').hidden = false;
    $('#threeMsg').textContent = 'This view needs WebGL and could not start here.';
  });
  else { Replay.leave(); Light.leave(); }
}

/* ───────────────────────── three.js plumbing ───────────────────────── */
const T = { renderer: null, scene: null, camera: null, controls: null, raf: 0, active: null, rtA: null, rtB: null, post: null, size: [1, 1] };
function ensureThree() {
  if (TAB.ready) return TAB.ready;
  TAB.ready = (async () => {
    if (!CITY) throw new Error('city not loaded yet');
    const THREE = await import('three');
    const { OrbitControls } = await import('./three/OrbitControls.js');
    TAB.three = THREE;
    const host = $('#threeCanvas');
    const renderer = new THREE.WebGLRenderer({ antialias: !LOW, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, LOW ? 1.25 : 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = !LOW;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.append(renderer.domElement);
    T.renderer = renderer;
    T.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 4000);
    T.controls = new OrbitControls(T.camera, renderer.domElement);
    T.controls.enableDamping = true;
    T.controls.maxPolarAngle = Math.PI * 0.47;
    T.controls.minDistance = 3;
    T.controls.maxDistance = 420;
    buildPost(THREE);
    const ro = new ResizeObserver(() => resizeThree());
    ro.observe(host);
    resizeThree();
    World.build(THREE);
    const loop = (now) => {
      T.raf = requestAnimationFrame(loop);
      if (TAB.current === 'globe' || document.hidden) return;
      const dt = Math.min(0.1, (now - (T.last || now)) / 1000); T.last = now;
      if (T.active && T.active.tick) T.active.tick(dt);
      T.controls.update();
      renderPost();
    };
    T.raf = requestAnimationFrame(loop);
  })();
  return TAB.ready;
}
function resizeThree() {
  const host = $('#threeCanvas');
  const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight);
  T.size = [w, h];
  T.renderer.setSize(w, h, false);
  T.camera.aspect = w / h; T.camera.updateProjectionMatrix();
  const pr = T.renderer.getPixelRatio();
  if (T.rtA) { T.rtA.setSize(w * pr, h * pr); T.rtB.setSize(w * pr, h * pr); }
}

/* Tilt-shift: render to a target, then a two-pass blur whose radius grows away from a focus band. */
function buildPost(THREE) {
  const opts = { samples: LOW ? 0 : 4 };
  T.rtA = new THREE.WebGLRenderTarget(2, 2, opts);
  T.rtB = new THREE.WebGLRenderTarget(2, 2);
  const vs = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  const fs = `
    uniform sampler2D tex; uniform vec2 dir; uniform float focus; uniform float band; uniform float amount; uniform float finalPass;
    varying vec2 vUv;
    void main(){
      float d = smoothstep(band * 0.35, band, abs(vUv.y - focus));
      float r = amount * d;
      vec4 c = vec4(0.0); float wsum = 0.0;
      for (int i = -6; i <= 6; i++) { float w = exp(-float(i*i) / 18.0); c += texture2D(tex, vUv + dir * float(i) * r) * w; wsum += w; }
      c /= wsum;
      if (finalPass > 0.5) {
        float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
        c.rgb = mix(vec3(l), c.rgb, 1.12);
        vec2 q = vUv - 0.5; c.rgb *= 1.0 - dot(q, q) * 0.45;
      }
      gl_FragColor = c;
    }`;
  const mk = () => new THREE.ShaderMaterial({ vertexShader: vs, fragmentShader: fs, depthTest: false, depthWrite: false,
    uniforms: { tex: { value: null }, dir: { value: new THREE.Vector2() }, focus: { value: 0.46 }, band: { value: 0.4 }, amount: { value: 1 }, finalPass: { value: 0 } } });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mk());
  const scene = new THREE.Scene(); scene.add(quad);
  T.post = { quad, scene, cam: new THREE.Camera(), h: mk(), v: mk(), tilt: 1 };
}
function renderPost() {
  const { renderer, scene, camera, post } = T;
  if (!scene) return;
  if (!post || post.tilt <= 0.01) { renderer.setRenderTarget(null); renderer.render(scene, camera); return; }
  const [w, h] = T.size;
  renderer.setRenderTarget(T.rtA); renderer.render(scene, camera);
  post.quad.material = post.h;
  post.h.uniforms.tex.value = T.rtA.texture; post.h.uniforms.dir.value.set(1 / w, 0); post.h.uniforms.amount.value = 1.5 * post.tilt;
  renderer.setRenderTarget(T.rtB); renderer.render(post.scene, post.cam);
  post.quad.material = post.v;
  post.v.uniforms.tex.value = T.rtB.texture; post.v.uniforms.dir.value.set(0, 1 / h); post.v.uniforms.amount.value = 1.5 * post.tilt; post.v.uniforms.finalPass.value = 1;
  renderer.setRenderTarget(null); renderer.render(post.scene, post.cam);
}

/* ───────────────────────── The model city ─────────────────────────
   Scene units: 1 = 100 m, x east, z south, y up; relief exaggerated. */
const VEX = 1.8;
const World = {
  group: null, lights: null, water: null, litMat: null, bldMat: null, fog: null, bridge: null, sky: null,
  toXZ(lon, lat) { const o = CITY.origin; return [(lon - o.lon0) * o.kx, -(lat - o.lat0) * o.ky]; },
  y(lon, lat) { return (demHeight(lon, lat) / 100) * VEX; },
  build(THREE) {
    const scene = new THREE.Scene();
    T.scene = scene;
    this.group = new THREE.Group(); scene.add(this.group);
    const M = window.FC_MAPS;
    const tex = (cv) => { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = T.renderer.capabilities.getMaxAnisotropy(); return t; };
    const o = CITY.origin;
    // region plinth (Bay Area painting) with a thin edge, like an architect's model
    const [rS, rW, rN, rE] = M.regionRect;
    const [x0, z0] = this.toXZ(rW, rN), [x1, z1] = this.toXZ(rE, rS);
    const rw = x1 - x0, rd = z1 - z0;
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(rw, 1.2, rd),
      [new THREE.MeshLambertMaterial({ color: 0xdfe3e2 }), new THREE.MeshLambertMaterial({ color: 0xdfe3e2 }),
        new THREE.MeshBasicMaterial({ map: tex(M.regionCv) }), new THREE.MeshLambertMaterial({ color: 0xcfd4d3 }),
        new THREE.MeshLambertMaterial({ color: 0xdfe3e2 }), new THREE.MeshLambertMaterial({ color: 0xdfe3e2 })]);
    plinth.position.set(x0 + rw / 2, -0.62, z0 + rd / 2);
    plinth.receiveShadow = true;
    this.group.add(plinth);
    this.regionMat = plinth.material[2];
    // city terrain from the DEM, wearing the same schematic map as the globe
    const [S, W, N, E] = M.cityRect;
    const [cx0, cz0] = this.toXZ(W, N), [cx1, cz1] = this.toXZ(E, S);
    const nx = DEM.nx, ny = DEM.ny;
    const geo = new THREE.PlaneGeometry(cx1 - cx0, cz1 - cz0, nx - 1, ny - 1);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let iy = 0; iy < ny; iy++) for (let ix = 0; ix < nx; ix++) {
      const k = iy * nx + ix;
      pos.setY(k, (DEM.z[(ny - 1 - iy) * nx + ix] / 100) * VEX + 0.02);
    }
    geo.translate(cx0 + (cx1 - cx0) / 2, 0, cz0 + (cz1 - cz0) / 2);
    geo.computeVertexNormals();
    this.cityMat = new THREE.MeshBasicMaterial({ map: tex(M.cityCv) });
    const terrain = new THREE.Mesh(geo, this.cityMat);
    terrain.receiveShadow = true;
    this.group.add(terrain);
    this.terrainBounds = [cx0, cz0, cx1, cz1];
    this.buildBuildings(THREE);
    this.buildTall(THREE);
    this.buildBridge(THREE);
    this.buildFog(THREE);
    this.buildRedwoods(THREE);
    // light rig
    const hemi = new THREE.HemisphereLight(0xffffff, 0xb9c3c6, 0.9);
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.castShadow = !LOW;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera; sc.left = -40; sc.right = 40; sc.top = 40; sc.bottom = -40; sc.near = 1; sc.far = 600;
    sun.shadow.bias = -0.0006;
    scene.add(hemi, sun, sun.target);
    this.lights = { hemi, sun };
    scene.fog = new THREE.Fog(0xe7ecef, 160, 520);
    scene.background = new THREE.Color(0xe7ecef);
  },
  buildBuildings(THREE) {
    const bytes = b64bytes(CITY.bld_b64), dv = new DataView(bytes.buffer), n = CITY.bld_n, o = CITY.origin;
    const keepAll = !LOW;
    const ids = [];
    for (let i = 0; i < n; i++) {
      const w = bytes[i * 8 + 4] / 2, d = bytes[i * 8 + 5] / 2;
      if (keepAll || w * d > 160 || bytes[i * 8 + 7] / 2 > 14) ids.push(i);
    }
    const box = new THREE.BoxGeometry(1, 1, 1); box.translate(0, 0.5, 0);
    this.bldMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    this.litMat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x000000 });
    const lit = [], dark = [];
    for (const i of ids) ((i * 2654435761) >>> 0) % 100 < 28 ? lit.push(i) : dark.push(i);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), col = new THREE.Color();
    const make = (list, mat) => {
      const mesh = new THREE.InstancedMesh(box, mat, list.length);
      list.forEach((i, k) => {
        const off = i * 8;
        const x = dv.getInt16(off, true) / 100, z = dv.getInt16(off + 2, true) / 100;
        const w = bytes[off + 4] / 200, d = bytes[off + 5] / 200, ang = (bytes[off + 6] * Math.PI) / 180, h = Math.max(4, bytes[off + 7] / 2);
        const lon = o.lon0 + x / o.kx, lat = o.lat0 - z / o.ky;
        const base = (demHeight(lon, lat) / 100) * VEX - 0.03;
        p.set(x, base, z); q.setFromAxisAngle(up, -ang); s.set(Math.max(0.05, w), (h / 100) * VEX * 1.15 + 0.03, Math.max(0.05, d));
        mesh.setMatrixAt(k, m4.compose(p, q, s));
        const t = 0.94 + (((i * 40503) >>> 0) % 100) / 1600;
        col.setRGB(t, t * 0.995, t * 0.985); mesh.setColorAt(k, col);
      });
      mesh.castShadow = true; mesh.receiveShadow = true;
      this.group.add(mesh);
      return mesh;
    };
    make(dark, this.bldMat); make(lit, this.litMat);
  },
  buildTall(THREE) {
    const mat = new THREE.MeshLambertMaterial({ color: 0xf4f6f7 });
    this.tallMat = mat;
    for (const [, hgt, rings] of CITY.tall) {
      for (const poly of rings) {
        const outer = poly[0];
        if (outer.length < 4) continue;
        const shape = new THREE.Shape(outer.map(([x, z]) => new THREE.Vector2(x, -z)));
        let base = Infinity;
        for (const [x, z] of outer) { const [lo, la] = u2ll(x, z); base = Math.min(base, (demHeight(lo, la) / 100) * VEX); }
        const g = new THREE.ExtrudeGeometry(shape, { depth: (hgt / 100) * VEX * 1.15, bevelEnabled: false });
        g.rotateX(-Math.PI / 2); g.translate(0, base - 0.02, 0);
        const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true;
        this.group.add(m);
      }
    }
  },
  buildBridge(THREE) {
    const orange = new THREE.MeshLambertMaterial({ color: 0xc0362c });
    const P = (lon, lat, hM) => { const [x, z] = this.toXZ(lon, lat); return new THREE.Vector3(x, (hM / 100) * VEX, z); };
    const S = [37.81156, -122.47751], Nn = [37.82294, -122.47873], SA = [37.80795, -122.47707], NA = [37.83020, -122.47942];
    const g = new THREE.Group();
    const deckA = P(SA[1], SA[0], 67), deckB = P(NA[1], NA[0], 67);
    const len = deckA.distanceTo(deckB);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, len), orange);
    deck.position.copy(deckA).lerp(deckB, 0.5); deck.lookAt(deckB); g.add(deck);
    for (const T0 of [S, Nn]) {
      const base = P(T0[1], T0[0], 0), top = P(T0[1], T0[0], 227);
      const tower = new THREE.Group();
      for (const side of [-1, 1]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, top.y, 0.1), orange);
        leg.position.set(side * 0.15, top.y / 2, 0); tower.add(leg);
      }
      for (const hh of [0.55, 0.78, 0.97]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.08), orange); b.position.set(0, top.y * hh, 0); tower.add(b); }
      tower.position.set(base.x, 0, base.z);
      tower.lookAt(deckB.x, 0, deckB.z);
      g.add(tower);
    }
    const cable = (a, b, h0, h1, sag, side) => {
      const pts = [];
      for (let i = 0; i <= 32; i++) {
        const t = i / 32, lat = a[0] + (b[0] - a[0]) * t, lon = a[1] + (b[1] - a[1]) * t;
        const p = P(lon, lat, h0 + (h1 - h0) * t - sag * 4 * t * (1 - t));
        p.x += side * 0.15; pts.push(p);
      }
      return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.018, 4), orange);
    };
    for (const sd of [-1, 1]) { g.add(cable(SA, S, 69, 227, 30, sd)); g.add(cable(S, Nn, 227, 227, 154, sd)); g.add(cable(Nn, NA, 227, 69, 30, sd)); }
    g.traverse((m) => { m.castShadow = true; });
    this.group.add(g);
  },
  buildRedwoods(THREE) {
    // Marin has no building or elevation data in the pack, so the redwood grove is drawn as a stand of model trees.
    const [mx, mz] = this.toXZ(-122.5716, 37.8916);
    const N = LOW ? 500 : 1200;
    const cone = new THREE.ConeGeometry(0.1, 1, 6); cone.translate(0, 0.5, 0);
    const mesh = new THREE.InstancedMesh(cone, new THREE.MeshLambertMaterial({ color: 0xffffff }), N);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
    let rnd = 7; const rand = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < N; i++) {
      // denser along Redwood Creek, which runs roughly SW from the visitor center
      const t = rand(), along = (t - 0.3) * 24, off = (rand() - 0.5) * (6 + 10 * rand());
      const x = mx + along * 0.6 + off * 0.8, z = mz + along * 0.8 - off * 0.6;
      const h = 0.45 + rand() * 0.5;
      p.set(x, 0, z); sc.set(1 + rand() * 0.6, h, 1 + rand() * 0.6);
      mesh.setMatrixAt(i, m4.compose(p, q, sc));
      col.setHSL(0.36 + rand() * 0.04, 0.32, 0.4 + rand() * 0.12); mesh.setColorAt(i, col);
    }
    mesh.castShadow = true;
    this.group.add(mesh);
  },
  buildFog(THREE) {
    // Karl: soft billboard puffs that stream in from the Pacific and through the Golden Gate.
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const c = cv.getContext('2d'); const gr = c.createRadialGradient(64, 64, 4, 64, 64, 62);
    gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = gr; c.fillRect(0, 0, 128, 128);
    const N = LOW ? 260 : 520;
    const pos = new Float32Array(N * 3), seed = new Float32Array(N);
    const gate = this.toXZ(-122.478, 37.8197);
    for (let i = 0; i < N; i++) {
      const inGate = i % 3 === 0;
      const x = inGate ? gate[0] - 30 + Math.random() * 40 : -120 + Math.random() * 60;
      const z = inGate ? gate[1] + (Math.random() - 0.5) * 18 : -60 + Math.random() * 140;
      pos[i * 3] = x; pos[i * 3 + 1] = 0.6 + Math.random() * 2.6; pos[i * 3 + 2] = z; seed[i] = Math.random();
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ map: new THREE.CanvasTexture(cv), size: 26, sizeAttenuation: true, transparent: true, opacity: 0.0, depthWrite: false, color: 0xffffff, fog: false });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    this.group.add(pts);
    this.fog = { pts, mat, pos, seed, gate, N };
  },
  tickFog(dt, density) {
    const f = this.fog; if (!f) return;
    f.mat.opacity = 0.04 + 0.4 * density;
    f.pts.visible = density > 0.03 && state.layers.fog;
    const p = f.pos;
    for (let i = 0; i < f.N; i++) {
      p[i * 3] += dt * (0.8 + f.seed[i] * 0.9);
      if (p[i * 3] > 25 + f.seed[i] * 20) { p[i * 3] = -120 + Math.random() * 30; }
    }
    f.pts.geometry.attributes.position.needsUpdate = true;
  },
  setSun(THREE, ms, focus) {
    const sp = sunPos(ms, 37.78, -122.45);
    const ph = lightPhase(sp.el);
    const r = Math.PI / 180;
    const dir = new THREE.Vector3(Math.sin(sp.az * r) * Math.cos(sp.el * r), Math.sin(Math.max(sp.el, 2) * r), -Math.cos(sp.az * r) * Math.cos(sp.el * r)).normalize();
    const { sun, hemi } = this.lights;
    sun.position.copy(focus).addScaledVector(dir, 220); sun.target.position.copy(focus);
    const day = THREE.MathUtils.smoothstep(sp.el, -6, 12);
    const warm = 1 - THREE.MathUtils.smoothstep(sp.el, 2, 22);
    sun.intensity = 0.2 + 1.5 * THREE.MathUtils.smoothstep(sp.el, -2, 8);
    sun.color.setRGB(1, 1 - 0.28 * warm, 1 - 0.5 * warm);
    const lift = THREE.MathUtils.smoothstep(sp.el, -8, 6);
    hemi.intensity = 0.35 + 0.75 * lift;
    hemi.color.setRGB(0.55 + 0.45 * day, 0.6 + 0.4 * day, 0.75 + 0.25 * day);
    const night = 1 - THREE.MathUtils.smoothstep(sp.el, -10, -1);
    this.litMat.emissive.setRGB(1.0 * night, 0.72 * night, 0.38 * night);
    const tint = 0.3 + 0.7 * lift;
    this.cityMat.color.setRGB(tint, tint, Math.min(1, tint + 0.12 * (1 - day)));
    this.regionMat.color.copy(this.cityMat.color);
    const bg = new THREE.Color(PHASE_COLOR.night).lerp(new THREE.Color(PHASE_COLOR.blue), THREE.MathUtils.smoothstep(sp.el, -12, -4))
      .lerp(new THREE.Color(PHASE_COLOR.golden), THREE.MathUtils.smoothstep(sp.el, -4, 0) * (1 - THREE.MathUtils.smoothstep(sp.el, 4, 12)))
      .lerp(new THREE.Color(PHASE_COLOR.day), THREE.MathUtils.smoothstep(sp.el, 4, 14));
    T.scene.background.copy(bg); T.scene.fog.color.copy(bg);
    document.body.classList.toggle('three-dark', sp.el < -4);
    return { sp, ph };
  },
};

/* ───────────────────────── Day Replay ───────────────────────── */
const Replay = {
  t: 600, playing: false, speed: 300, sched: null, token: null, routeGroup: null, follow: true, entered: false,
  enter() {
    const THREE = TAB.three;
    T.active = this; T.post.tilt = 1;
    World.group.visible = true; if (Light.group) Light.group.visible = false;
    if (!this.entered) { this.entered = true; this.initUi(); }
    this.load(state.day, true);
  },
  leave() { this.playing = false; this.renderPlayBtn && this.renderPlayBtn(); },
  initUi() {
    $('#rpPlay').addEventListener('click', () => { this.playing = !this.playing; if (this.playing && this.t >= this.sched.last + 30) this.t = this.sched.first - 20; this.renderPlayBtn(); });
    document.querySelectorAll('#rpSpeed button').forEach((b) => b.addEventListener('click', () => {
      this.speed = +b.dataset.speed;
      document.querySelectorAll('#rpSpeed button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    }));
    const sl = $('#rpSlider');
    sl.addEventListener('input', () => { this.t = +sl.value; this.playing = false; this.renderPlayBtn(); this.follow = true; });
    $('#rpFollow').addEventListener('click', () => { this.follow = true; });
    T.controls.addEventListener('start', () => { if (TAB.current === 'replay') this.follow = false; });
    this.renderPlayBtn = () => {
      $('#rpPlay').querySelector('span').textContent = this.playing ? 'Pause' : 'Play';
      $('#rpPlay').querySelector('svg').innerHTML = this.playing ? '<path d="M3 2h2.5v8H3zM6.5 2H9v8H6.5z"/>' : '<path d="M3 1.5l7 4.5-7 4.5z"/>';
    };
  },
  load(di, reset) {
    const THREE = TAB.three;
    this.sched = scheduleFor(di);
    const sl = $('#rpSlider');
    const lo = Math.max(300, Math.floor((this.sched.first - 45) / 30) * 30), hi = Math.min(1439, Math.ceil((this.sched.last + 45) / 30) * 30);
    sl.min = lo; sl.max = hi; this.lo = lo; this.hi = hi;
    if (reset || this.t < lo || this.t > hi) this.t = this.sched.first - 15;
    this.drawTrack(di);
    // route tubes + stop pins
    if (this.routeGroup) { World.group.remove(this.routeGroup); this.routeGroup.traverse((m) => { m.geometry && m.geometry.dispose(); }); }
    const g = new THREE.Group();
    const orange = new THREE.MeshBasicMaterial({ color: 0xc0362c });
    const walkMat = new THREE.MeshBasicMaterial({ color: 0xe8806f });
    this.paths = [];
    for (const leg of this.sched.legs) {
      const r = ROUTES[leg.to.id];
      const ll = r && r.coords && r.coords.length > 1 ? r.coords : [[leg.from.lon, leg.from.lat], [leg.to.lon, leg.to.lat]];
      const pts = ll.map(([lon, lat]) => { const [x, z] = World.toXZ(lon, lat); return new THREE.Vector3(x, World.y(lon, lat) + 0.12, z); });
      if (!r) { // straight hop: arc it so it reads as "as the crow flies"
        const a = pts[0], b = pts[1], mid = a.clone().lerp(b, 0.5); mid.y += Math.min(6, a.distanceTo(b) * 0.15);
        pts.splice(1, 0, mid);
      }
      const path = new THREE.CurvePath();
      for (let i = 1; i < pts.length; i++) path.add(new THREE.LineCurve3(pts[i - 1], pts[i]));
      const segs = Math.min(600, pts.length * 2 + 8);
      g.add(new THREE.Mesh(new THREE.TubeGeometry(path, segs, leg.mode === 'walk' ? 0.07 : 0.1, 5), leg.mode === 'walk' ? walkMat : orange));
      this.paths.push({ leg, path, len: path.getLength() });
    }
    this.pinEls = [];
    const host = $('#rpPins'); host.replaceChildren();
    for (const it of this.sched.items) {
      const s = it.s, [x, z] = World.toXZ(s.lon, s.lat), y = World.y(s.lon, s.lat);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.4, 6), orange);
      stem.position.set(x, y + 1.2, z); g.add(stem);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), orange);
      head.position.set(x, y + 2.45, z); g.add(head);
      const n = el('div', { class: 'rp-pin' }, [el('b', { text: String(s.num) }), el('span', { text: s.n })]);
      host.append(n);
      this.pinEls.push({ n, v: new THREE.Vector3(x, y + 2.7, z), s });
    }
    // the traveller
    if (!this.token) {
      const car = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.16, 0.62), new THREE.MeshLambertMaterial({ color: 0x12171b }));
      body.position.y = 0.14; car.add(body);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.32), new THREE.MeshLambertMaterial({ color: 0xc0362c }));
      roof.position.set(0, 0.28, -0.03); car.add(roof);
      const walker = new THREE.Group();
      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.34, 10), new THREE.MeshLambertMaterial({ color: 0xc0362c }));
      torso.position.y = 0.2; walker.add(torso);
      const headM = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8), new THREE.MeshLambertMaterial({ color: 0x12171b }));
      headM.position.y = 0.44; walker.add(headM);
      const halo = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.56, 40), new THREE.MeshBasicMaterial({ color: 0xc0362c, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false }));
      halo.rotation.x = -Math.PI / 2; halo.position.y = 0.03;
      const token = new THREE.Group(); token.add(car, walker, halo);
      token.traverse((m) => { if (m.isMesh) m.castShadow = true; });
      token.scale.setScalar(1.6);
      this.token = { g: token, car, walker, halo };
      T.scene.add(token);
    }
    World.group.add(g); this.routeGroup = g;
    this.place(true);
  },
  drawTrack(di) {
    // the slider track is painted with the sky: night, blue hour, golden hour, daylight
    const cv = $('#rpSky'), w = (cv.width = 600), h = (cv.height = 8), c = cv.getContext('2d');
    for (let px = 0; px < w; px++) {
      const m = this.lo + ((this.hi - this.lo) * px) / (w - 1);
      c.fillStyle = PHASE_COLOR[lightPhase(sunPos(dayMs(di, m), 37.78, -122.45).el).id];
      c.fillRect(px, 0, 1, h);
    }
    const ticks = $('#rpTicks'); ticks.replaceChildren();
    const pct = (m) => `${(((m - this.lo) / (this.hi - this.lo)) * 100).toFixed(2)}%`;
    for (const it of this.sched.items) ticks.append(el('span', { class: 'tk', style: `left:${pct(it.start)}`, text: String(it.s.num), title: `${it.s.n} · ${fmtMin(it.start)}` }));
    const st = sunTimes(DATE_OF(di), 37.79, -122.44);
    if (st.set > this.lo && st.set < this.hi) ticks.append(el('span', { class: 'tk sunset', style: `left:${pct(st.set)}`, title: `Sunset ${hm(st.set)}`, text: '☼' }));
    // daylight check in the dossier
    const warn = [];
    for (const it of this.sched.items) {
      const outdoor = OUTDOOR[it.s.id];
      if (!outdoor) continue;
      if (it.end > st.set + 5 && it.start < st.set) warn.push(`${it.s.n}: you're there until ${fmtMin(it.end)}; sunset is ${hm(st.set)}, so the end of it is dusk.`);
      else if (it.start >= st.set + 10) warn.push(`${it.s.n} starts after dark (${fmtMin(it.start)}).`);
    }
    const box = $('#rpCheck');
    box.replaceChildren(el('b', { text: 'Daylight check' }), warn.length ? el('span', { text: warn.join(' ') }) : el('span', { text: `Every outdoor stop on ${DAYS[di].dw} fits before sunset at ${hm(st.set)}.` }));
  },
  locate(t) {
    for (const p of this.paths) if (t >= p.leg.t0 && t < p.leg.t1) {
      const f = Math.min(1, Math.max(0, (t - p.leg.t0) / (p.leg.t1 - p.leg.t0)));
      const pt = p.path.getPointAt(f), ahead = p.path.getPointAt(Math.min(1, f + 0.01));
      return { pos: pt, ahead, leg: p.leg, f };
    }
    let cur = this.sched.items[0];
    for (const it of this.sched.items) if (t >= it.start - 0.01) cur = it;
    const s = cur.s, [x, z] = World.toXZ(s.lon, s.lat);
    return { pos: new TAB.three.Vector3(x, World.y(s.lon, s.lat) + 0.05, z), at: cur };
  },
  place(snap) {
    const THREE = TAB.three;
    const loc = this.locate(this.t);
    const tk = this.token;
    tk.g.position.copy(loc.pos);
    const moving = !!loc.leg;
    tk.car.visible = moving && loc.leg.mode !== 'walk';
    tk.walker.visible = !moving || loc.leg.mode === 'walk';
    if (loc.ahead) tk.g.lookAt(loc.ahead.x, loc.pos.y, loc.ahead.z);
    const { sp, ph } = World.setSun(THREE, dayMs(state.day, this.t), loc.pos);
    if (this.follow) {
      const tgt = T.controls.target;
      const k = snap ? 1 : 0.06;
      tgt.lerp(loc.pos, k);
      if (snap) { T.camera.position.set(loc.pos.x + 14, loc.pos.y + 16, loc.pos.z + 22); }
    }
    // HUD
    const d = DAYS[state.day];
    $('#rpClock').textContent = `${d.dw} ${d.dn} · ${fmtMin(this.t)}`;
    $('#rpPhase').textContent = ph.label + (sp.el > -0.833 && sp.el < 40 ? ` · sun ${Math.round(sp.el)}° up` : '');
    $('#rpPhase').dataset.phase = ph.id;
    let act;
    if (loc.leg) {
      const left = Math.max(1, Math.round(loc.leg.t1 - this.t));
      act = `${loc.leg.mode === 'walk' ? 'Walking' : 'Driving'} to ${loc.leg.to.n} · ${left} min`;
    } else if (this.t < this.sched.first) act = `Day starts at ${fmtMin(this.sched.first)}: ${this.sched.items[0].s.n}`;
    else if (loc.at && this.t <= loc.at.end) act = `At ${loc.at.s.n} until ${fmtMin(loc.at.end)}`;
    else if (loc.at && loc.at.next) act = `Free time · next: ${loc.at.next.s.n} at ${fmtMin(loc.at.next.start)}`;
    else act = 'Done for the day';
    $('#rpAct').textContent = act;
    $('#rpSlider').value = String(Math.round(this.t));
    $('#rpSlider').setAttribute('aria-valuetext', `${fmtMin(this.t)}, ${act}`);
    // highlight the live row in the dossier timeline
    const liveId = loc.leg ? loc.leg.to.id : loc.at && loc.at.s.id;
    if (liveId !== this.liveId) {
      document.querySelectorAll('.stop.live').forEach((x) => x.classList.remove('live'));
      const row = document.getElementById(`stop-${liveId}`); if (row) row.classList.add('live');
      this.liveId = liveId;
    }
    // fog follows November climatology for this hour where we have it
    this.fogDensity = fogOdds('coast', this.t / 60) / 100;
  },
  tick(dt) {
    if (this.playing) {
      this.t += (dt * this.speed) / 60;
      if (this.t >= this.hi) { this.t = this.hi; this.playing = false; this.renderPlayBtn(); }
    }
    this.place(false);
    World.tickFog(dt, this.fogDensity || 0);
    // pin labels
    const [w, h] = T.size, v = new TAB.three.Vector3();
    for (const p of this.pinEls) {
      v.copy(p.v).project(T.camera);
      const on = v.z < 1 && v.x > -1.1 && v.x < 1.1 && v.y > -1.1 && v.y < 1.1;
      p.n.style.display = on ? '' : 'none';
      if (on) p.n.style.transform = `translate3d(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px, 0)`;
    }
  },
};

/* ───────────────────────── Light & Fog ─────────────────────────
   For each outdoor stop: which way you'll be looking, where the sun is at that hour,
   and how often fog or low cloud covers the nearest station at that hour in November. */
const OUTDOOR = {
  'sat-2': { look: 280, what: 'the rotunda across the lagoon', st: 'bay' },
  'sat-4': { look: null, what: 'the forest floor (canopy light)', st: 'bay' },
  'sat-6': { look: 35, what: 'the Golden Gate from the trail', st: 'coast' },
  'sat-7': { look: 285, what: 'the ruins and the Pacific', st: 'coast' },
  'sun-2': { look: null, what: 'the redwood canopy', st: 'coast' },
  'sun-3': { look: 235, what: 'the Pacific cliffs', st: 'coast' },
  'sun-4': { look: 150, what: 'the SF skyline across the bay', st: 'bay' },
  'sun-5': { look: 145, what: 'the bridge and the city behind it', st: 'coast' },
  'sun-6': { look: 345, what: 'the bridge from the south end', st: 'coast' },
  'fri-1': { look: 160, what: 'the skyline from the water', st: 'bay' },
};
let FOGCLIMO = null;
function fogOdds(kind, hour) {
  const st = FOGCLIMO && FOGCLIMO.stations && FOGCLIMO.stations[kind === 'coast' ? 'HAF' : 'SFO'];
  if (!st) { // gentle default curve until the data file exists
    const h = ((hour % 24) + 24) % 24;
    return kind === 'coast' ? 22 + 18 * Math.cos(((h - 7) / 24) * Math.PI * 2) : 12 + 8 * Math.cos(((h - 7) / 24) * Math.PI * 2);
  }
  const h0 = Math.floor(hour) % 24, h1 = (h0 + 1) % 24, f = hour - Math.floor(hour);
  return st.hours[h0] * (1 - f) + st.hours[h1] * f;
}
function verdict(o, sp) {
  if (sp.el < -6) return { k: 'dark', t: 'After dark' };
  if (o.look === null) return sp.el > 20 ? { k: 'soft', t: 'Soft canopy light' } : { k: 'dim', t: 'Dim under the trees' };
  let d = Math.abs(((sp.az - o.look + 540) % 360) - 180);
  if (sp.el < 0) return { k: 'blue', t: 'Blue hour glow' };
  if (d < 45) return { k: 'into', t: sp.el < 8 ? 'Sunset in the frame' : 'Into the sun (backlit)' };
  if (d > 120) return { k: 'front', t: sp.el < 10 ? 'Golden light on the subject' : 'Front-lit' };
  return { k: 'side', t: 'Side light' };
}
function lookWord(az) { return ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'][Math.round(az / 45) % 8]; }

const Light = {
  group: null, sel: null, t: null, entered: false,
  enter() {
    T.active = this; T.post.tilt = 0;
    World.group.visible = false; if (Replay.token) Replay.token.g.visible = false;
    if (!this.group) this.build();
    this.group.visible = true;
    if (!this.entered) { this.entered = true; this.initUi(); }
    this.renderPanel();
  },
  leave() { if (Replay.token) Replay.token.g.visible = true; },
  initUi() {
    const sl = $('#ltSlider');
    sl.addEventListener('input', () => { this.t = +sl.value; this.update(); });
  },
  build() {
    const THREE = TAB.three;
    const g = new THREE.Group(); this.group = g; T.scene.add(g);
    this.disc = new THREE.Mesh(new THREE.CircleGeometry(10, 96), new THREE.MeshLambertMaterial({ color: 0xffffff }));
    this.disc.rotation.x = -Math.PI / 2; this.disc.receiveShadow = true; g.add(this.disc);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x7c8791, transparent: true, opacity: 0.55 });
    for (const altDeg of [0, 30, 60]) {
      const pts = []; const r = 10 * Math.cos((altDeg * Math.PI) / 180), y = 10 * Math.sin((altDeg * Math.PI) / 180);
      for (let i = 0; i <= 96; i++) { const a = (i / 96) * Math.PI * 2; pts.push(new THREE.Vector3(Math.sin(a) * r, y, -Math.cos(a) * r)); }
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat));
    }
    this.compass = [];
    const host = $('#ltLabels'); host.replaceChildren();
    for (const [lab, az] of [['N', 0], ['E', 90], ['S', 180], ['W', 270]]) {
      const n = el('div', { class: 'lt-c', text: lab }); host.append(n);
      this.compass.push({ n, v: new THREE.Vector3(Math.sin((az * Math.PI) / 180) * 11, 0.2, -Math.cos((az * Math.PI) / 180) * 11) });
    }
    this.sunLabel = el('div', { class: 'lt-sun' }); host.append(this.sunLabel);
    this.viewLabel = el('div', { class: 'lt-view' }); host.append(this.viewLabel);
    this.sunMesh = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 16), new THREE.MeshBasicMaterial({ color: 0xf2a33a }));
    g.add(this.sunMesh);
    this.ray = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineDashedMaterial({ color: 0xf2a33a, dashSize: 0.4, gapSize: 0.3 }));
    g.add(this.ray);
    this.wedge = new THREE.Mesh(new THREE.CircleGeometry(9.5, 32, 0, Math.PI / 4), new THREE.MeshBasicMaterial({ color: 0xc0362c, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }));
    this.wedge.rotation.x = -Math.PI / 2; this.wedge.position.y = 0.04; g.add(this.wedge);
    this.me = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.5, 16), new THREE.MeshLambertMaterial({ color: 0xc0362c }));
    this.me.position.y = 0.25; g.add(this.me);
    this.path = null;
    this.light = new THREE.DirectionalLight(0xffffff, 1.2); this.light.castShadow = !LOW;
    this.light.shadow.mapSize.set(1024, 1024); const c = this.light.shadow.camera; c.left = -12; c.right = 12; c.top = 12; c.bottom = -12;
    this.me.castShadow = true;
    g.add(this.light, this.light.target, new THREE.AmbientLight(0xffffff, 0.55));
  },
  renderPanel() {
    const host = $('#ltList');
    const sched = scheduleFor(state.day);
    const items = sched.items.filter((it) => OUTDOOR[it.s.id]);
    const st = sunTimes(DATE_OF(state.day), 37.79, -122.44);
    $('#ltSun').textContent = `Sunrise ${hm(st.rise)} · golden hour from about ${hm(st.set - 60)} · sunset ${hm(st.set)} · dark by ${hm(st.set + 28)}`;
    if (!items.length) {
      host.replaceChildren(el('p', { class: 'empty', text: `${DAYS[state.day].dw} is indoors at the conference. The evening plan is after dark, so there is no daylight to plan around.` }));
      this.select(null); return;
    }
    host.replaceChildren(...items.map((it) => {
      const o = OUTDOOR[it.s.id];
      const mid = (it.start + it.end) / 2;
      const sp = sunPos(dayMs(state.day, mid), it.s.lat, it.s.lon);
      const v = verdict(o, sp);
      const strip = el('canvas', { class: 'lt-strip', width: '280', height: '30', 'aria-hidden': 'true' });
      this.paintStrip(strip, it, o.st);
      return el('button', { class: `lt-row${this.sel === it.s.id ? ' sel' : ''}`, onclick: () => { this.select(it.s.id); this.renderPanel(); } }, [
        el('span', { class: 'lt-name' }, [el('b', { text: String(it.s.num) }), it.s.n]),
        el('span', { class: `chip-v ${v.k}`, text: v.t }),
        el('span', { class: 'lt-meta', text: `${fmtMin(it.start)}–${fmtMin(it.end)} · looking ${o.look === null ? 'up' : lookWord(o.look)} at ${o.what} · fog or low cloud ~${Math.round(fogOdds(o.st, mid / 60))}% of November hours like this` }),
        strip,
      ]);
    }));
    if (!this.sel || !items.find((it) => it.s.id === this.sel)) this.select(items[0].s.id);
    const src = FOGCLIMO && FOGCLIMO.stations ? `Fog odds: share of hours with visibility under 3 miles or a ceiling under 1,000 ft, ${FOGCLIMO.years}, at ${FOGCLIMO.stations.HAF.name} (coast) and ${FOGCLIMO.stations.SFO.name} (bay). Iowa Environmental Mesonet ASOS archive.` : 'Fog odds are a placeholder until the station climatology finishes downloading.';
    $('#ltSrc').textContent = src;
  },
  paintStrip(cv, it, kind) {
    const c = cv.getContext('2d'), w = cv.width, h = cv.height, lo = 360, hi = 1260;
    for (let px = 0; px < w; px++) {
      const m = lo + ((hi - lo) * px) / (w - 1);
      c.fillStyle = PHASE_COLOR[lightPhase(sunPos(dayMs(state.day, m), it.s.lat, it.s.lon).el).id];
      c.fillRect(px, 0, 1, 14);
      const f = fogOdds(kind, m / 60) / 100;
      c.fillStyle = `rgba(124,135,145,${0.25 + 0.6 * f})`;
      c.fillRect(px, 30 - Math.max(1, f * 14), 1, Math.max(1, f * 14));
    }
    const x0 = ((it.start - lo) / (hi - lo)) * w, x1 = ((it.end - lo) / (hi - lo)) * w;
    c.strokeStyle = '#c0362c'; c.lineWidth = 2; c.strokeRect(Math.max(1, x0), 1, Math.max(3, x1 - x0), 12);
  },
  select(id) {
    this.sel = id;
    const it = id && scheduleFor(state.day).items.find((x) => x.s.id === id);
    $('#ltSlider').disabled = !it;
    if (!it) { $('#ltTitle').textContent = 'No outdoor stops today'; $('#ltVerdict').textContent = ''; return; }
    this.it = it;
    this.t = Math.round((it.start + it.end) / 2);
    const sl = $('#ltSlider'); sl.min = 360; sl.max = 1260; sl.value = String(this.t);
    this.paintDisc(it.s);
    this.drawPath(it.s);
    const o = OUTDOOR[id];
    const r = (o.look ?? 0) * Math.PI / 180;
    this.wedge.visible = o.look !== null;
    this.wedge.rotation.z = Math.PI / 2 - r - Math.PI / 8;
    T.controls.target.set(0, 1.5, 0);
    T.camera.position.set(-Math.sin(r) * 18 + 6, 15, Math.cos(r) * 18 + 4);
    this.update();
  },
  paintDisc(s) {
    // crop of the schematic map around the stop (2 km across) as the ground disc
    const M = window.FC_MAPS;
    const inCity = s.lat > M.cityRect[0] && s.lat < M.cityRect[2] && s.lon > M.cityRect[1] && s.lon < M.cityRect[3];
    const cv = inCity ? M.cityCv : M.regionCv, rect = inCity ? M.cityRect : M.regionRect;
    const [S, W, N, E] = rect;
    const px = ((s.lon - W) / (E - W)) * cv.width, py = ((N - s.lat) / (N - S)) * cv.height;
    const kmX = cv.width / ((E - W) * 111.32 * Math.cos((37.8 * Math.PI) / 180)), kmY = cv.height / ((N - S) * 110.57);
    const out = document.createElement('canvas'); out.width = out.height = 1024;
    const g = out.getContext('2d');
    g.fillStyle = MAP.water; g.fillRect(0, 0, 1024, 1024);
    g.drawImage(cv, px - kmX * 1.0, py - kmY * 1.0, kmX * 2, kmY * 2, 0, 0, 1024, 1024);
    const t = new TAB.three.CanvasTexture(out); t.colorSpace = TAB.three.SRGBColorSpace;
    if (this.disc.material.map) this.disc.material.map.dispose();
    this.disc.material.map = t; this.disc.material.needsUpdate = true;
  },
  drawPath(s) {
    const THREE = TAB.three;
    if (this.path) { this.group.remove(this.path); this.path.geometry.dispose(); }
    const pts = [], cols = [];
    for (let m = 360; m <= 1260; m += 5) {
      const sp = sunPos(dayMs(state.day, m), s.lat, s.lon);
      if (sp.el < -2) continue;
      const v = this.dome(sp, 10);
      pts.push(v.x, v.y, v.z);
      const c = new THREE.Color(PHASE_COLOR[lightPhase(sp.el).id === 'day' ? 'day' : 'golden']);
      if (lightPhase(sp.el).id === 'day') c.set(0x7c8791);
      else c.set(0xf2a33a);
      cols.push(c.r, c.g, c.b);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    this.path = new THREE.Line(g, new THREE.LineBasicMaterial({ vertexColors: true }));
    this.group.add(this.path);
  },
  dome(sp, R) {
    const r = Math.PI / 180, el = Math.max(sp.el, -2);
    return new TAB.three.Vector3(Math.sin(sp.az * r) * Math.cos(el * r) * R, Math.sin(el * r) * R, -Math.cos(sp.az * r) * Math.cos(el * r) * R);
  },
  update() {
    if (!this.it) return;
    const THREE = TAB.three, s = this.it.s, o = OUTDOOR[s.id];
    const sp = sunPos(dayMs(state.day, this.t), s.lat, s.lon);
    const p = this.dome(sp, 10);
    this.sunMesh.position.copy(p);
    this.sunMesh.visible = sp.el > -2;
    this.ray.geometry.setFromPoints([new THREE.Vector3(0, 0.4, 0), p]); this.ray.computeLineDistances();
    this.light.position.copy(p).multiplyScalar(3); this.light.intensity = 0.2 + 1.2 * THREE.MathUtils.smoothstep(sp.el, -2, 10);
    const ph = lightPhase(sp.el);
    T.scene.background.set(PHASE_COLOR[ph.id]);
    document.body.classList.toggle('three-dark', ph.id === 'night' || ph.id === 'blue');
    const v = verdict(o, sp);
    $('#ltTitle').textContent = `${s.n} · ${DAYS[state.day].dw} ${fmtMin(this.t)}`;
    const inWin = this.t >= this.it.start && this.t <= this.it.end;
    const sunWords = sp.el < -0.833 ? `the sun is ${Math.abs(Math.round(sp.el))}° below the horizon` : `the sun is ${Math.round(sp.el)}° up in the ${lookWord(sp.az)}`;
    $('#ltVerdict').replaceChildren(el('span', { class: `chip-v ${v.k}`, text: v.t }),
      ` You'll face ${o.look === null ? 'up into the trees' : lookWord(o.look)}; ${sunWords}. Fog or low cloud: ~${Math.round(fogOdds(o.st, this.t / 60))}% of November hours like this.${inWin ? '' : ' (Outside your planned visit.)'}`);
    this.sunLabel.textContent = fmtMin(this.t);
  },
  tick() {
    const [w, h] = T.size, v = new TAB.three.Vector3();
    const proj = (n, vec) => { v.copy(vec).project(T.camera); const on = v.z < 1; n.style.display = on ? '' : 'none'; if (on) n.style.transform = `translate3d(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px, 0)`; };
    for (const c of this.compass) proj(c.n, c.v);
    if (this.sunMesh.visible) proj(this.sunLabel, this.sunMesh.position.clone().add(new TAB.three.Vector3(0, 0.9, 0))); else this.sunLabel.style.display = 'none';
    if (this.wedge.visible && this.it) {
      const r = OUTDOOR[this.it.s.id].look * Math.PI / 180;
      this.viewLabel.textContent = 'YOUR VIEW';
      proj(this.viewLabel, new TAB.three.Vector3(Math.sin(r) * 7, 0.3, -Math.cos(r) * 7));
    } else this.viewLabel.style.display = 'none';
  },
};

/* ───────────────────────── wiring ───────────────────────── */
window.onFcDay = () => {
  if (TAB.current === 'replay' && TAB.three && Replay.entered) Replay.load(state.day, true);
  if (TAB.current === 'light' && TAB.three && Light.group) { Light.sel = null; Light.renderPanel(); }
};
document.querySelectorAll('#tabs button').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab)));
fetch('data/fogclimo.json').then((r) => (r.ok ? r.json() : null)).then((j) => { FOGCLIMO = j; if (TAB.current === 'light' && Light.group) Light.renderPanel(); }).catch(() => {});
