import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const PROJECTS = window.PROJECTS || [];

const wrap = document.getElementById('globe-wrap');
const tip = document.getElementById('globe-tip');
const tipTitle = tip.querySelector('.ch-pin-tip-title');
const tipArch = tip.querySelector('.ch-pin-tip-arch');
const tipLoc = tip.querySelector('.ch-pin-tip-loc');

const PALETTE = {
  light: { pin: 0xB07A3E, pinHover: 0xC13574 },
  dark:  { pin: 0xD8A66C, pinHover: 0xE8488F },
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
const DEFAULT_DIST = 2.6;
const MIN_DIST = 1.5;
const MAX_DIST = 4;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
camera.position.set(0, 0, DEFAULT_DIST);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
wrap.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
// zoom is handled by the +/- buttons below, not the wheel — scroll-to-zoom
// on a globe embedded in a scrolling page fights the page's own scrolling
controls.enableZoom = false;
controls.rotateSpeed = 0.5;

scene.add(new THREE.AmbientLight(0xffffff, 1.1));
const sunLight = new THREE.DirectionalLight(0xfff2e0, 1.4);
sunLight.position.set(3, 2, 4);
scene.add(sunLight);

const globeGroup = new THREE.Group();
scene.add(globeGroup);

const sphere = new THREE.Mesh(
  new THREE.SphereGeometry(R, 64, 48),
  // dark ocean-blue fallback shows briefly while the texture streams in
  new THREE.MeshStandardMaterial({ color: 0x0a1a2e, roughness: 0.85, metalness: 0 })
);
globeGroup.add(sphere);
new THREE.TextureLoader().load('assets/img/earth.jpg', (texture) => {
  texture.colorSpace = THREE.SRGBColorSpace;
  sphere.material.color.set(0xffffff);
  sphere.material.map = texture;
  sphere.material.needsUpdate = true;
  renderer.render(scene, camera);
});

const pinsGroup = new THREE.Group();
const pinEntries = PROJECTS.map((project) => {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.016, 14, 14),
    new THREE.MeshBasicMaterial({ color: PALETTE[currentTheme()].pin })
  );
  mesh.position.copy(latLonToVector3(project.lat, project.lon, R * 1.02));
  pinsGroup.add(mesh);
  return { project, mesh };
});
globeGroup.add(pinsGroup);

function applyTheme(){
  const p = PALETTE[currentTheme()];
  pinEntries.forEach(({ mesh }) => { if (mesh !== hovered?.mesh) mesh.material.color.setHex(p.pin); });
}
document.getElementById('theme-toggle').addEventListener('click', () => setTimeout(applyTheme, 0));

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

// zoom: dedicated buttons instead of the scroll wheel, smoothly eased in
// the render loop rather than jumping straight to the target distance
let zoomTarget = DEFAULT_DIST;
function nudgeZoom(factor){
  zoomTarget = THREE.MathUtils.clamp(zoomTarget * factor, MIN_DIST, MAX_DIST);
}
document.getElementById('globe-zoom-in').addEventListener('click', () => nudgeZoom(0.72));
document.getElementById('globe-zoom-out').addEventListener('click', () => nudgeZoom(1 / 0.72));

function animate(){
  requestAnimationFrame(animate);
  controls.update();
  const dist = camera.position.length();
  if (Math.abs(dist - zoomTarget) > 0.001) {
    camera.position.setLength(THREE.MathUtils.lerp(dist, zoomTarget, 0.15));
  }
  if (hovered) updateTipPosition(hovered);
  renderer.render(scene, camera);
}
animate();
