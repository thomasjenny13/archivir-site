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

// angle (degrés) dont le vent doit passer l'axe arrière pour faire changer la voile de bord
const MAIN_GYBE = 15, JIB_GYBE = 3;

const CSS = `
.sim-fab{ bottom: 208px; }
.sim-fab.active{ background: var(--ink); color: var(--bg); border-color: var(--ink); }
.sim-panel{
  position: fixed; left: 28px; top: 92px; z-index: 5; width: 260px;
  display: grid; gap: 14px; justify-items: stretch;
  font-family: var(--mono); font-size: 0.75rem; color: var(--ink-soft);
}
.sim-panel[hidden]{ display: none; }
.sim-row{ display: grid; gap: 4px; }
.sim-row > div{ display: flex; justify-content: space-between; gap: 8px; }
.sim-row output{ color: var(--ink); text-align: right; }
/* curseur réduit à un filet et un trait, sans le rendu natif du navigateur */
.sim-panel input[type=range]{
  -webkit-appearance: none; appearance: none; display: block;
  width: 100%; height: 22px; margin: 0; background: transparent; cursor: pointer;
}
.sim-panel input[type=range]::-webkit-slider-runnable-track{ height: 1px; background: var(--ink); }
.sim-panel input[type=range]::-moz-range-track{ height: 1px; background: var(--ink); }
.sim-panel input[type=range]::-webkit-slider-thumb{
  -webkit-appearance: none; width: 3px; height: 15px; margin-top: -7px;
  background: var(--ink); border: 0; border-radius: 0;
}
.sim-panel input[type=range]::-moz-range-thumb{ width: 3px; height: 15px; background: var(--ink); border: 0; border-radius: 0; }
.sim-panel input[type=range]:focus-visible{ outline: 1px solid var(--ink); outline-offset: 2px; }
/* roue de cap : le vent vient du haut, le bateau tourne dedans, tour complet possible */
.sim-dial{ display: block; width: 132px; height: 132px; margin: 2px auto 0; cursor: grab; touch-action: none; color: var(--ink); }
.sim-dial:active{ cursor: grabbing; }
.sim-dial:focus-visible{ outline: 1px solid var(--ink); outline-offset: 2px; }
@media (max-width: 768px){
  .sim-fab{ bottom: 168px; }
  .sim-panel{ left: 18px; top: 76px; width: min(220px, calc(100vw - 130px)); gap: 8px; }
  .sim-dial{ width: 104px; height: 104px; }
}`;

const ticks = Array.from({ length: 12 }, (_, i) => {
  const a = i * Math.PI / 6, r0 = i % 3 ? 54 : 50;
  return `<line x1="${(66 + r0 * Math.sin(a)).toFixed(1)}" y1="${(66 - r0 * Math.cos(a)).toFixed(1)}" x2="${(66 + 58 * Math.sin(a)).toFixed(1)}" y2="${(66 - 58 * Math.cos(a)).toFixed(1)}"/>`;
}).join('');
const DIAL = `<svg class="sim-dial" id="sim-dial" viewBox="0 0 132 132" role="slider" tabindex="0" aria-label="Cap du bateau par rapport au vent" aria-valuemin="-180" aria-valuemax="180">
  <g fill="none" stroke="currentColor" stroke-width="1">
    <circle cx="66" cy="66" r="58"/>
    ${ticks}
    <path d="M66 1v10M62 7l4 4 4-4"/>
  </g>
  <g id="sim-boat" fill="currentColor"><path d="M66 28C74 38 77 52 77 66C77 82 75 94 73 102H59C57 94 55 82 55 66C55 52 58 38 66 28Z"/></g>
  <rect x="0" y="0" width="132" height="132" fill="transparent"/>
</svg>`;

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
    <div class="sim-row"><span>Cap</span>${DIAL}</div>`;
  document.body.append(button, panel);
  // les flèches et les gestes sur le panneau règlent les curseurs, sans changer d'ouvrage
  ['keydown', 'touchstart', 'touchmove', 'touchend', 'pointerdown', 'wheel'].forEach((type) =>
    panel.addEventListener(type, (e) => e.stopPropagation()));
  const $ = (id) => panel.querySelector('#' + id);
  const state = { wind: 12, cap: 40 };
  const showWind = () => { $('sim-windv').textContent = `${state.wind.toLocaleString('fr-CH')} nœuds`; };
  // le cap n'est pas affiché, seulement annoncé aux lecteurs d'écran
  const capText = () => {
    const a = Math.round(Math.abs(state.cap));
    return a === 0 || a === 180 ? `${a}° · ${allure(a)}` : `${a}° ${state.cap < 0 ? 'bâbord' : 'tribord'} · ${allure(a)}`;
  };
  $('sim-wind').addEventListener('input', (e) => { state.wind = +e.target.value; showWind(); });
  showWind();

  // roue de cap : le bateau y est vu du dessus, vent venant du haut. Cap positif
  // (vent sur tribord) : l'étrave part vers la gauche, comme le bateau en 3D vu de haut.
  const dial = $('sim-dial');
  const wrap = (c) => { const w = ((c + 180) % 360 + 360) % 360 - 180; return w === -180 ? 180 : w; };
  const setCap = (c) => {
    state.cap = wrap(c);
    $('sim-boat').setAttribute('transform', `rotate(${-state.cap} 66 66)`);
    dial.setAttribute('aria-valuenow', Math.round(state.cap));
    dial.setAttribute('aria-valuetext', capText());
  };
  const pointerAngle = (e) => {
    const r = dial.getBoundingClientRect();
    return Math.atan2(e.clientX - (r.left + r.width / 2), -(e.clientY - (r.top + r.height / 2))) * 180 / Math.PI;
  };
  let dragAngle = null;
  dial.addEventListener('pointerdown', (e) => {
    dial.setPointerCapture(e.pointerId);
    dragAngle = pointerAngle(e);
    e.preventDefault();
  });
  dial.addEventListener('pointermove', (e) => {
    if (dragAngle === null) return;
    const a = pointerAngle(e);
    setCap(state.cap - wrap(a - dragAngle));   // en relatif : le bateau ne saute pas à la prise
    dragAngle = a;
  });
  const endDrag = () => { dragAngle = null; };
  dial.addEventListener('pointerup', endDrag);
  dial.addEventListener('pointercancel', endDrag);
  dial.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    setCap(state.cap + (e.key === 'ArrowLeft' ? 3 : -3));
    e.preventDefault();
  });
  setCap(state.cap);

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
      new THREE.MeshBasicMaterial({ color: 0x101010, transparent: true, opacity: 0.9, depthWrite: false })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = off.y;
    water.renderOrder = 2;
    rig.group.add(water);

    // filets de vent : traits fins en volume, au-dessus de l'empreinte du disque.
    // Gris moyen et opaque, pour se lire autant sur le blanc de la page que sur l'eau noire
    const N = 60;
    const radius = rig.maxDim * 0.75;
    const streakPos = new Float32Array(N * 6);
    const streakGeo = new THREE.BufferGeometry();
    streakGeo.setAttribute('position', new THREE.BufferAttribute(streakPos, 3));
    const streaks = new THREE.LineSegments(streakGeo, new THREE.LineBasicMaterial({ color: 0x777777 }));
    streaks.frustumCulled = false;
    rig.group.add(streaks);
    const newSeed = (s) => {
      s.x = (Math.random() * 2 - 1) * radius * 0.97;
      s.y = 0.6 + Math.random() * 8;
      return s;
    };
    const seeds = Array.from({ length: N }, () => newSeed({ u: Math.random() }));

    rig.group.add(boat);
    boat.add(rig.model);
    rig.group.scale.setScalar(scale);
    built = { rig, off, boat, meshes, parts, allLines, stay, mask, water, streaks, streakGeo, streakPos, seeds, newSeed, radius, center: V(0, off.y, 0) };
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
  let running = false, t = 0, last = 0, phi = 0, omega = 0, gust = 1, boom = 0, jib = 0, yaw = null, rudder = 0, camber = 1, sailSide = null, jibSide = null, gybing = false, boomSpeed = 0;
  const groundY = ground.position.y;

  function start() {
    const rig = getRig();
    if (!rig) return;
    exitSectionView();
    if (!built || built.rig !== rig) build(rig);
    show(true);
    ground.position.y = built.off.y * rig.group.scale.y + 0.002;
    ground.renderOrder = 3;
    yaw = null; phi = omega = rudder = boomSpeed = 0; sailSide = null; gybing = false; t = 0; last = performance.now();
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

    // Côté de la voile. Dans la moitié avant du cercle, elle suit le vent : au virement
    // elle faseye et passe doucement. Vent arrière, elle reste sur son bord même une fois
    // le vent passé de l'autre côté (« sur la mauvaise panne »), jusqu'à ce qu'il la
    // prenne par derrière : elle traverse alors d'un coup, c'est l'empannage.
    if (sailSide === null) sailSide = jibSide = lee;
    const byLee = 180 - awaD;
    if (awaD < 90) {
      sailSide = lee;
      jibSide = lee;
    } else {
      if (lee !== jibSide && byLee > JIB_GYBE) jibSide = lee;   // abrité par la grand-voile, le foc passe d'abord
      if (lee !== sailSide && byLee > MAIN_GYBE) {
        sailSide = lee;
        gybing = true;
        boomSpeed = 0;
      }
    }
    const boomGoal = sailSide * lerpTab('boom', awaD);
    if (gybing) {
      // poussée par le vent, la bôme accélère vers l'autre bord et s'arrête net au bout de l'écoute
      const w = 1.6 + v * 0.1;   // environ 0,7 s de bord à bord
      boomSpeed += (w * w * (boomGoal - boom) - 2 * 0.25 * w * boomSpeed) * dt;
      boom += boomSpeed * dt;
      if ((boom - boomGoal) * sailSide >= 0) {
        boom = boomGoal;
        boomSpeed = 0;
        gybing = false;
        omega += sailSide * 0.18 * Math.min(1, v / 6);   // le choc fait gîter le bateau
      }
    } else {
      boom += (boomGoal - boom) * Math.min(1, dt * 1.5);
    }
    jib += (jibSide * lerpTab('jib', awaD) - jib) * Math.min(1, dt * (Math.abs(jibSide * lerpTab('jib', awaD) - jib) > 15 && awaD >= 90 ? 4 : 1.5));

    for (let i = 0; i < 4; i++) {
      const h = dt / 4;
      omega += (sailSide * HM(v, ch, phi) - RM(phi) - P.damping * omega) / P.inertia * h;   // le bateau gîte du côté de la voile
      phi = Math.max(-1.2, Math.min(1.2, phi + omega * h));
    }

    camber += (sailSide - camber) * Math.min(1, dt * (gybing ? 10 : 3));
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

    // filets de vent : chaque trait suit une corde du disque, dans le sens du vent (+z)
    const speed = 0.6 + v * 0.35, len = 0.4 + v * 0.06;
    b.streaks.visible = state.wind >= 0.5;
    b.seeds.forEach((s, i) => {
      s.u += speed * dt / (2 * b.radius);
      if (s.u > 1) { s.u -= 1; b.newSeed(s); }
      const h = Math.sqrt(b.radius * b.radius - s.x * s.x);   // demi-corde à cette position
      const z1 = -h + s.u * (2 * h + len);
      const y = b.off.y + s.y;
      b.streakPos.set([s.x, y, Math.max(-h, z1 - len), s.x, y, Math.min(h, z1)], i * 6);
    });
    b.streakGeo.attributes.position.needsUpdate = true;

    // les traits suivent le style courant (teinte, largeur, résolution)
    const ref = b.rig.innerEdges.material;
    b.allLines.forEach((l) => {
      l.material.color.copy(ref.color);
      l.material.linewidth = ref.linewidth;
      l.material.resolution.copy(ref.resolution);
    });

  }

  button.addEventListener('click', () => (running ? stop() : start()));

  const instance = {
    running: false, tick, stop,
    unmount() { stop(); button.remove(); panel.remove(); style.remove(); if (active === instance) active = null; },
  };
  active = instance;
  return instance;
}
