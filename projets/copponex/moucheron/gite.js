// Gîte au vent du Moucheron, dans le viewer : bouton « vent » + petit panneau.
// Monté par viewer.html pour un ouvrage déclarant `simulation` dans projects.js.
// Même physique que la page simulation/ : I·φ'' = HM(φ) − RM(φ) − c·φ'.
// Le bateau est dans le repère du modèle (X vers l'arrière, Y haut, flottaison à y = 0).

export let active = null;   // instance montée, utile pour piloter tick() en test

const P = { mass: 620, g: 9.81, rho: 1.2, area: 15, GM: 0.62, lever: 3.4, inertia: 450, damping: 1000 };
// selon l'angle au vent : coefficient de force latérale, ouverture de la bôme et du foc (degrés)
const TAB = { awa: [0, 28, 40, 55, 90, 120, 150, 180],
              ch:  [0, 0.15, 1.0, 0.95, 0.70, 0.50, 0.32, 0.20],
              boom:[0, 0, 7, 16, 38, 55, 70, 80],
              jib: [0, 0, 5, 11, 22, 32, 38, 40] };
const lerpTab = (key, a) => {
  const A = TAB.awa; let i = 0;
  while (i < A.length - 2 && a > A[i + 1]) i++;
  const f = Math.min(1, Math.max(0, (a - A[i]) / (A[i + 1] - A[i])));
  return TAB[key][i] + (TAB[key][i + 1] - TAB[key][i]) * f;
};
const allure = (a) => a < 28 ? 'vent debout' : a < 50 ? 'près' : a < 75 ? 'bon plein' : a < 105 ? 'travers' : a < 135 ? 'largue' : a < 165 ? 'grand largue' : 'vent arrière';
const RM = (phi) => P.mass * P.g * P.GM * Math.sin(phi) * (1 + 0.35 * Math.sin(phi) ** 2);
const HM = (v, ch, phi) => 0.5 * P.rho * v * v * P.area * ch * P.lever * Math.cos(phi) ** 2;
const wave = (x, z, t, amp) => amp * (0.55 * Math.sin(0.55 * x + 0.9 * t) + 0.35 * Math.sin(0.8 * z - 0.7 * t + 1.3) + 0.18 * Math.sin(1.7 * (x + z) + 1.6 * t));

const CSS = `
.sim-fab{ bottom: 208px; }
.sim-fab.active{ background: var(--ink); color: var(--bg); border-color: var(--ink); }
.sim-panel{
  position: fixed; left: 28px; top: 92px; z-index: 5; width: 280px;
  display: grid; gap: 12px; padding: 14px 16px;
  font-family: var(--mono); font-size: 0.75rem; color: var(--ink-soft);
  background: color-mix(in srgb, var(--bg-2) 80%, transparent);
  backdrop-filter: blur(6px);
  border: 1px solid var(--line); border-radius: 8px;
}
.sim-panel[hidden]{ display: none; }
.sim-row{ display: grid; gap: 6px; }
.sim-row > div{ display: flex; justify-content: space-between; gap: 8px; }
.sim-row output{ color: var(--ink); text-align: right; }
.sim-panel input[type=range]{ width: 100%; margin: 0; accent-color: var(--ink); }
.sim-heel{ display: flex; align-items: baseline; justify-content: space-between; border-top: 1px solid var(--line); padding-top: 10px; }
.sim-heel output{ font-family: var(--title); font-size: 1.6rem; color: var(--ink); font-variant-numeric: tabular-nums; }
.sim-panel a{ color: inherit; }
@media (max-width: 768px){
  .sim-fab{ bottom: 168px; }
  .sim-panel{ left: 18px; top: 76px; width: min(240px, calc(100vw - 130px)); padding: 10px 12px; gap: 8px; }
  .sim-heel output{ font-size: 1.25rem; }
}`;

const WIND_ICON = '<svg viewBox="0 0 16 16" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><path d="M1.5 6h8.2a2 2 0 1 0-1.9-2.6"/><path d="M1.5 9.5h11a1.8 1.8 0 1 1-1.7 2.4"/><path d="M1.5 13H7"/></svg>';

export function mount({ THREE, scene, ground, getRig, requestRender, exitSectionView }) {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  // ---------- interface ----------
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const button = document.createElement('button');
  button.className = 'view-fab sim-fab';
  button.type = 'button';
  button.title = 'Gîte au vent';
  button.setAttribute('aria-label', 'Animer la gîte au vent');
  button.setAttribute('aria-pressed', 'false');
  button.innerHTML = WIND_ICON;
  const panel = document.createElement('section');
  panel.className = 'sim-panel';
  panel.hidden = true;
  panel.setAttribute('aria-label', 'Gîte au vent');
  panel.innerHTML = `
    <div class="sim-row"><div><label for="sim-wind">Vent</label><output id="sim-windv"></output></div>
      <input id="sim-wind" type="range" min="0" max="25" step="0.5" value="12"></div>
    <div class="sim-row"><div><label for="sim-cap">Cap</label><output id="sim-capv"></output></div>
      <input id="sim-cap" type="range" min="-180" max="180" step="1" value="40"></div>
    <div class="sim-heel"><span>Gîte</span><output id="sim-heel">0°</output></div>
    <a href="/projets/copponex/moucheron/simulation/">Voir les forces et la houle</a>`;
  document.body.append(button, panel);
  // les flèches et les gestes sur le panneau règlent les curseurs, sans changer d'ouvrage
  ['keydown', 'touchstart', 'touchmove', 'touchend', 'pointerdown', 'wheel'].forEach((type) =>
    panel.addEventListener(type, (e) => e.stopPropagation()));
  const $ = (id) => panel.querySelector('#' + id);
  const state = { wind: 12, cap: 40 };
  const showWind = () => { $('sim-windv').textContent = `${state.wind.toLocaleString('fr-CH')} nœuds`; };
  const showCap = () => {
    const a = Math.abs(state.cap);
    $('sim-capv').textContent = a === 0 || a === 180 ? `${a}° · ${allure(a)}` : `${a}° ${state.cap < 0 ? 'bâbord' : 'tribord'} · ${allure(a)}`;
  };
  $('sim-wind').addEventListener('input', (e) => { state.wind = +e.target.value; showWind(); });
  $('sim-cap').addEventListener('input', (e) => { state.cap = +e.target.value; showCap(); });
  showWind(); showCap();

  // ---------- scène : préparée au premier lancement, puis réutilisée ----------
  let built = null;
  function build(rig) {
    const off = rig.model.position.clone();   // repère modèle -> repère des traits
    // arrivé par les flèches, l'ouvrage garde une échelle : les traits se calculent sans elle
    const scale = rig.group.scale.x;
    rig.group.scale.setScalar(1);
    rig.group.updateMatrixWorld(true);
    const meshes = Object.fromEntries(rig.sectionMeshes.map((m) => [m.name, m]));
    const pick = (...names) => names.map((n) => meshes[n]).filter(Boolean);
    // axes relevés sur le plan, en coordonnées modèle
    const mastA = V(1.896, 1.06, 0), mastB = V(2.212, 8.30, 0);
    const stayA = V(0.06, 0.535, 0), stayB = V(2.182, 8.18, 0);
    const rudA = V(3.536, -0.874, 0), rudB = V(4.394, 0.405, 0);
    const part = (names, a, b) => {
      const list = pick(...names);
      const lines = rig.edgesFor(list);
      return { meshes: list, lines, p: a, axis: b.clone().sub(a).normalize() };
    };
    const boat = new THREE.Group();
    const fixed = rig.edgesFor(pick('Coque', 'Pont', 'Hiloire', 'Cockpit', 'Quille', 'Mat'));
    const parts = {
      boom: part(['Bome', 'Grand_voile'], mastA, mastB),
      jib: part(['Foc'], stayA, stayB),
      rudder: part(['Safran', 'Barre'], rudA, rudB),
    };
    const allLines = [fixed, parts.boom.lines, parts.jib.lines, parts.rudder.lines];
    allLines.forEach((l) => boat.add(l));

    // étai seul : les haubans fixes traverseraient les voiles quand elles s'ouvrent
    const stayLen = stayA.distanceTo(stayB);
    const stay = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, stayLen, 6), new THREE.MeshBasicMaterial({ color: 0x333333 }));
    stay.position.copy(stayA).add(stayB).multiplyScalar(0.5).add(off);
    stay.quaternion.setFromUnitVectors(V(0, 1, 0), parts.jib.axis);
    boat.add(stay);

    // masque invisible sur l'ouverture du cockpit : l'eau ne se dessine pas dans le bateau
    const ckX = [2.01, 2.15, 2.40, 2.80, 3.30, 3.90], ckW = [0.20, 0.29, 0.35, 0.39, 0.40, 0.40];
    const shape = new THREE.Shape();
    const edge = [];
    for (let i = 0; i <= 40; i++) {
      const x = 2.01 + (3.90 - 2.01) * i / 40;
      let k = 0; while (k < ckX.length - 2 && x > ckX[k + 1]) k++;
      edge.push([x, ckW[k] + (ckW[k + 1] - ckW[k]) * (x - ckX[k]) / (ckX[k + 1] - ckX[k]) + 0.01]);
    }
    edge.forEach(([x, w], i) => (i ? shape.lineTo(x, w) : shape.moveTo(x, w)));
    [...edge].reverse().forEach(([x, w]) => shape.lineTo(x, -w));
    const maskGeo = new THREE.ShapeGeometry(shape);
    maskGeo.rotateX(Math.PI / 2);
    maskGeo.translate(0, 0.48, 0);
    const mask = new THREE.Mesh(maskGeo, new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide }));
    mask.position.copy(off);
    mask.renderOrder = 1;
    boat.add(mask);

    // eau : disque net à la flottaison, comme le socle d'une maquette ; la quille reste lisible par transparence
    const water = new THREE.Mesh(
      new THREE.CircleGeometry(rig.maxDim * 0.75, 96),
      new THREE.MeshBasicMaterial({ color: 0x9fc2cf, transparent: true, opacity: 0.8, depthWrite: false })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = off.y;
    water.renderOrder = 2;
    rig.group.add(water);

    // filets de vent
    const N = 60;
    const streakPos = new Float32Array(N * 6);
    const streakGeo = new THREE.BufferGeometry();
    streakGeo.setAttribute('position', new THREE.BufferAttribute(streakPos, 3));
    const streaks = new THREE.LineSegments(streakGeo, new THREE.LineBasicMaterial({ color: 0x7f8a90, transparent: true, opacity: 0.4 }));
    streaks.frustumCulled = false;
    rig.group.add(streaks);
    const seeds = Array.from({ length: N }, () => ({ u: Math.random(), y: 0.6 + Math.random() * 8, s: (Math.random() - 0.5) * 18 }));

    rig.group.add(boat);
    boat.add(rig.model);
    rig.group.scale.setScalar(scale);
    built = { rig, off, boat, meshes, parts, allLines, stay, mask, water, streaks, streakGeo, streakPos, seeds, center: V(0, off.y, 0) };
    return built;
  }

  function show(on) {
    const b = built;
    b.rig.innerEdges.visible = !on;
    b.allLines.forEach((l) => { l.visible = on; });
    b.stay.visible = b.mask.visible = b.water.visible = b.streaks.visible = on;
    if (b.meshes.Greement_courant) b.meshes.Greement_courant.visible = !on;
  }

  // ---------- pose ----------
  const q = new THREE.Quaternion(), tmp = new THREE.Vector3();
  // rotation q autour du point p, sans changer de parent
  function pose(obj, p, rot) {
    obj.quaternion.copy(rot);
    obj.position.copy(p).sub(tmp.copy(p).applyQuaternion(rot));
  }
  // scaleZ retourne le creux des voiles de l'autre côté (le plan de symétrie z = 0 ne bouge pas)
  function setPart(part, angle, scaleZ = 1) {
    q.setFromAxisAngle(part.axis, angle);
    part.meshes.forEach((m) => { pose(m, part.p, q); m.scale.z = scaleZ; });
    pose(part.lines, part.p.clone().add(built.off), q);
    part.lines.scale.z = scaleZ;
  }
  const euler = new THREE.Euler(0, 0, 0, 'YXZ');
  const boatQ = new THREE.Quaternion();

  // ---------- état ----------
  let running = false, t = 0, last = 0, phi = 0, omega = 0, gust = 1, boom = 0, jib = 0, yaw = null, rudder = 0, camber = 1;
  const groundY = ground.position.y;

  function start() {
    const rig = getRig();
    if (!rig) return;
    exitSectionView();
    if (!built || built.rig !== rig) build(rig);
    show(true);
    ground.position.y = built.off.y * rig.group.scale.y + 0.002;
    ground.renderOrder = 3;
    yaw = null; phi = omega = rudder = 0; t = 0; last = performance.now();
    running = true;
    instance.running = true;
    button.classList.add('active');
    button.setAttribute('aria-pressed', 'true');
    panel.hidden = false;
    tick(0);
    requestRender();
  }

  function stop() {
    if (!running) return;
    running = false;
    instance.running = false;
    Object.values(built.parts).forEach((part) => {
      part.meshes.forEach((m) => { m.position.set(0, 0, 0); m.quaternion.identity(); m.scale.z = 1; });
    });
    built.boat.position.set(0, 0, 0);
    built.boat.quaternion.identity();
    show(false);
    ground.position.y = groundY;
    ground.renderOrder = 0;
    button.classList.remove('active');
    button.setAttribute('aria-pressed', 'false');
    panel.hidden = true;
    requestRender();
  }

  function tick(forcedDt) {
    const now = performance.now();
    const dt = forcedDt !== undefined ? forcedDt : Math.min((now - last) / 1000, 0.05);
    last = now;
    if (!reduceMotion) t += dt;
    const b = built;

    // le bateau tourne progressivement vers le cap demandé ; le vent souffle vers +z du monde
    const side = state.cap < 0 ? -1 : 1;
    const awaGoal = THREE.MathUtils.degToRad(Math.abs(state.cap));
    const yawGoal = Math.atan2(-Math.cos(awaGoal), side * Math.sin(awaGoal));
    if (yaw === null) yaw = yawGoal;
    let dy = yawGoal - yaw;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    yaw += dy * Math.min(1, dt * 2.2);
    rudder += (Math.max(-0.52, Math.min(0.52, dy * 1.4)) - rudder) * Math.min(1, dt * 6);

    const lwx = -Math.sin(yaw), lwz = Math.cos(yaw);
    const awaD = THREE.MathUtils.radToDeg(Math.acos(Math.max(-1, Math.min(1, lwx))));
    const lee = lwz >= 0 ? 1 : -1;
    const ch = lerpTab('ch', awaD);

    const goal = reduceMotion ? 1 : 1 + 0.18 * Math.sin(t * 0.45) + 0.1 * Math.sin(t * 1.3 + 2) + 0.06 * Math.sin(t * 3.1);
    gust += (goal - gust) * Math.min(1, dt * 2);
    const v = state.wind * 0.5144 * gust;   // nœuds -> m/s

    boom += (lee * lerpTab('boom', awaD) - boom) * Math.min(1, dt * 1.5);
    jib += (lee * lerpTab('jib', awaD) - jib) * Math.min(1, dt * 1.5);

    for (let i = 0; i < 4; i++) {
      const h = dt / 4;
      omega += (lee * HM(v, ch, phi) - RM(phi) - P.damping * omega) / P.inertia * h;
      phi = Math.max(-1.2, Math.min(1.2, phi + omega * h));
    }

    camber += (lee - camber) * Math.min(1, dt * 3);
    const cz = Math.abs(camber) < 0.05 ? 0.05 * Math.sign(camber || 1) : camber;
    const flap = awaD < 32 ? (1 - awaD / 32) * 6 * Math.sin(t * 9) : 0;
    const rad = THREE.MathUtils.degToRad;
    setPart(b.parts.boom, -rad(boom + flap), cz);
    setPart(b.parts.jib, -rad(jib + flap * 1.5), cz);
    setPart(b.parts.rudder, -rudder);

    const amp = 0.04 + 0.11 * Math.min(1, state.wind / 22);
    const fx = -Math.cos(yaw), fz = Math.sin(yaw);
    const heave = wave(0, 0, t, amp) * 0.8;
    const pitch = (wave(-1.5 * fx, -1.5 * fz, t, amp) - wave(1.5 * fx, 1.5 * fz, t, amp)) / 3 * 0.8;
    const roll = (wave(0.6 * fz, -0.6 * fx, t, amp) - wave(-0.6 * fz, 0.6 * fx, t, amp)) / 1.2 * 0.4;
    euler.set(phi + roll, yaw, -pitch);
    boatQ.setFromEuler(euler);
    pose(b.boat, b.center, boatQ);
    b.boat.position.y += heave;

    // filets de vent
    const speed = 0.6 + v * 0.35, len = 0.4 + v * 0.06;
    b.streaks.material.opacity = state.wind < 0.5 ? 0 : 0.15 + 0.3 * Math.min(1, state.wind / 15);
    b.seeds.forEach((s, i) => {
      s.u += speed * dt / 24;
      if (s.u > 1) { s.u -= 1; s.y = 0.6 + Math.random() * 8; s.s = (Math.random() - 0.5) * 18; }
      const z = (s.u - 0.5) * 24, y = b.off.y + s.y;
      b.streakPos.set([s.s, y, z, s.s, y, z + len], i * 6);
    });
    b.streakGeo.attributes.position.needsUpdate = true;

    // les traits suivent le style courant (teinte, largeur, résolution)
    const ref = b.rig.innerEdges.material;
    b.allLines.forEach((l) => {
      l.material.color.copy(ref.color);
      l.material.linewidth = ref.linewidth;
      l.material.resolution.copy(ref.resolution);
    });

    $('sim-heel').textContent = `${Math.round(Math.abs(THREE.MathUtils.radToDeg(phi)))}°`;
  }

  button.addEventListener('click', () => (running ? stop() : start()));

  const instance = {
    running: false, tick, stop,
    unmount() { stop(); button.remove(); panel.remove(); style.remove(); if (active === instance) active = null; },
  };
  active = instance;
  return instance;
}
