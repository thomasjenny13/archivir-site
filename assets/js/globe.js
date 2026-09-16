import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const PROJECTS = window.PROJECTS || [];
const WORLD_LAND = window.WORLD_LAND || [];

const wrap = document.getElementById('globe-wrap');
const tip = document.getElementById('globe-tip');
const tipTitle = tip.querySelector('.ch-pin-tip-title');
const tipArch = tip.querySelector('.ch-pin-tip-arch');
const tipLoc = tip.querySelector('.ch-pin-tip-loc');

const PALETTE = {
  light: { water: 0xD7E8ED, landFill: 0xEDE2C9, land: 0x8A5D2C, grid: 0xE3E1DB, pin: 0xB07A3E, pinHover: 0xC13574 },
  dark:  { water: 0x16232A, landFill: 0x362E22, land: 0xD8A66C, grid: 0x332F2B, pin: 0xD8A66C, pinHover: 0xE8488F },
};
function currentTheme(){
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

function latLonToVector3(lat, lon, r){
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

const R = 1;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
camera.position.set(0, 0, 2.6);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
wrap.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
controls.minDistance = 1.5;
controls.maxDistance = 4;
controls.rotateSpeed = 0.5;
controls.zoomSpeed = 0.4;

scene.add(new THREE.AmbientLight(0xffffff, 0.75));
const sunLight = new THREE.DirectionalLight(0xfff2e0, 0.7);
sunLight.position.set(3, 2, 4);
scene.add(sunLight);

const globeGroup = new THREE.Group();
scene.add(globeGroup);

// land/water fill is painted onto a flat equirectangular canvas (lon/lat
// map 1:1 to x/y) using the canvas 2D fill — it handles arbitrarily
// concave coastlines natively, unlike triangulating each country and
// projecting the (often huge) triangles onto the sphere, which drew
// visible straight-chord "sails" cutting across bays at a country's
// widest points instead of following the curved surface
const mapCanvas = document.createElement('canvas');
mapCanvas.width = 2048;
mapCanvas.height = 1024;
const mapCtx = mapCanvas.getContext('2d');
function lonLatToCanvas(lon, lat){
  return [(lon + 180) / 360 * mapCanvas.width, (90 - lat) / 180 * mapCanvas.height];
}
function paintMap(theme){
  const p = PALETTE[theme];
  mapCtx.fillStyle = '#' + p.water.toString(16).padStart(6, '0');
  mapCtx.fillRect(0, 0, mapCanvas.width, mapCanvas.height);
  mapCtx.fillStyle = '#' + p.landFill.toString(16).padStart(6, '0');
  WORLD_LAND.forEach((ring) => {
    mapCtx.beginPath();
    ring.forEach(([lon, lat], i) => {
      const [x, y] = lonLatToCanvas(lon, lat);
      if (i === 0) mapCtx.moveTo(x, y); else mapCtx.lineTo(x, y);
    });
    mapCtx.closePath();
    mapCtx.fill();
  });
}
paintMap(currentTheme());
const mapTexture = new THREE.CanvasTexture(mapCanvas);
mapTexture.colorSpace = THREE.SRGBColorSpace;

const sphere = new THREE.Mesh(
  new THREE.SphereGeometry(R * 0.995, 64, 48),
  new THREE.MeshLambertMaterial({ map: mapTexture })
);
globeGroup.add(sphere);

// lat/lon graticule, one circle per line — cheap and gives the classic globe grid feel
const graticule = new THREE.Group();
const graticuleMat = new THREE.LineBasicMaterial({ color: PALETTE[currentTheme()].grid, transparent: true, opacity: 0.6 });
for (let lat = -60; lat <= 60; lat += 30){
  const pts = [];
  for (let lon = -180; lon <= 180; lon += 4) pts.push(latLonToVector3(lat, lon, R * 1.001));
  graticule.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), graticuleMat));
}
for (let lon = -180; lon < 180; lon += 30){
  const pts = [];
  for (let lat = -90; lat <= 90; lat += 4) pts.push(latLonToVector3(lat, lon, R * 1.001));
  graticule.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), graticuleMat));
}
globeGroup.add(graticule);

const landMat = new THREE.LineBasicMaterial({ color: PALETTE[currentTheme()].land });
const landGroup = new THREE.Group();
WORLD_LAND.forEach((ring) => {
  const pts = ring.map(([lon, lat]) => latLonToVector3(lat, lon, R * 1.003));
  landGroup.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), landMat));
});
globeGroup.add(landGroup);

const pinsGroup = new THREE.Group();
const pinEntries = PROJECTS.map((project) => {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.014, 14, 14),
    new THREE.MeshBasicMaterial({ color: PALETTE[currentTheme()].pin })
  );
  mesh.position.copy(latLonToVector3(project.lat, project.lon, R * 1.02));
  pinsGroup.add(mesh);
  return { project, mesh };
});
globeGroup.add(pinsGroup);

function applyTheme(){
  const theme = currentTheme();
  const p = PALETTE[theme];
  paintMap(theme);
  mapTexture.needsUpdate = true;
  graticuleMat.color.setHex(p.grid);
  landMat.color.setHex(p.land);
  pinEntries.forEach(({ mesh }) => { if (mesh !== hovered?.mesh) mesh.material.color.setHex(p.pin); });
}
document.getElementById('theme-toggle').addEventListener('click', () => setTimeout(() => { applyTheme(); renderer.render(scene, camera); }, 0));

function resize(){
  const w = wrap.clientWidth, h = wrap.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(wrap);
resize();

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let hovered = null;

function setHover(entry){
  if (hovered === entry) return;
  const theme = currentTheme();
  if (hovered) { hovered.mesh.material.color.setHex(PALETTE[theme].pin); hovered.mesh.scale.setScalar(1); }
  hovered = entry;
  if (hovered) { hovered.mesh.material.color.setHex(PALETTE[theme].pinHover); hovered.mesh.scale.setScalar(1.7); }
  wrap.style.cursor = hovered ? 'pointer' : 'grab';
  tip.hidden = !hovered;
  if (hovered) {
    tipTitle.textContent = hovered.project.nom;
    tipArch.textContent = hovered.project.architecte;
    tipLoc.textContent = hovered.project.lieu;
  }
}

function updateTipPosition(entry){
  if (!entry) return;
  const screen = entry.mesh.position.clone().applyMatrix4(globeGroup.matrixWorld).project(camera);
  const rect = wrap.getBoundingClientRect();
  const x = (screen.x * 0.5 + 0.5) * rect.width;
  const y = (1 - (screen.y * 0.5 + 0.5)) * rect.height;
  tip.style.left = x + 'px';
  tip.style.top = y + 'px';
}

renderer.domElement.addEventListener('pointermove', (e) => {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const pinHit = raycaster.intersectObjects(pinEntries.map((p) => p.mesh))[0];
  const sphereHit = raycaster.intersectObject(sphere)[0];
  // ignore a pin hit that's actually behind the opaque globe (far side)
  const valid = pinHit && (!sphereHit || pinHit.distance < sphereHit.distance);
  setHover(valid ? pinEntries.find((p) => p.mesh === pinHit.object) : null);
});
renderer.domElement.addEventListener('pointerleave', () => setHover(null));
renderer.domElement.addEventListener('click', () => {
  if (hovered?.project.url) window.location.href = hovered.project.url;
});

wrap.style.cursor = 'grab';
controls.domElement.addEventListener('pointerdown', () => { wrap.style.cursor = 'grabbing'; });
window.addEventListener('pointerup', () => { wrap.style.cursor = hovered ? 'pointer' : 'grab'; });

function animate(){
  requestAnimationFrame(animate);
  controls.update();
  if (hovered) updateTipPosition(hovered);
  renderer.render(scene, camera);
}
animate();
