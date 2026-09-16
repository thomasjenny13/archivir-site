import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
// v6's ESM build has no default export (only named exports) — a
// namespace import keeps every maplibregl.X reference below unchanged
import * as maplibregl from 'maplibre-gl';

const PROJECTS = window.PROJECTS || [];

function currentTheme(){
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

// OpenFreeMap: free, no-key vector tiles (OpenMapTiles schema) rendered
// with MapLibre GL — "positron"/"dark" are its own minimal, near-
// monochrome styles (thin gray streets, place labels, no landuse
// clutter), the same family CARTO's raster Positron belongs to, but
// vector — crisp at any zoom and stylable in code (see applyWaterColor)
// instead of guessed at with CSS filters over a raster image.
const STYLES = {
  light: 'https://tiles.openfreemap.org/styles/positron',
  dark: 'https://tiles.openfreemap.org/styles/dark',
};
// both styles ship a "water" fill layer close to the land color (barely
// legible as water) — set explicitly instead, muted but distinct,
// broadly in line with the site's warm/neutral palette
const WATER_COLOR = { light: '#a9c7ce', dark: '#1c2b31' };

const map = new maplibregl.Map({
  container: 'osm-map',
  style: STYLES[currentTheme()],
  center: [10, 45],
  zoom: 2,
  minZoom: 2,
  maxZoom: 19,
  attributionControl: { compact: false },
});
map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

// OpenMapTiles has no elevation data — contour lines still come from
// OpenTopoMap as a raster overlay, just added as a MapLibre raster
// source/layer now instead of a Leaflet tile layer. raster-saturation
// mutes its full-color style (green forest, blue water, brown
// contours) toward the site's calmer palette without flattening it to
// pure grayscale the way a CSS filter would.
function addContourLayer(){
  if (map.getSource('topo')) return;
  map.addSource('topo', {
    type: 'raster',
    tiles: [
      'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
      'https://b.tile.opentopomap.org/{z}/{x}/{y}.png',
      'https://c.tile.opentopomap.org/{z}/{x}/{y}.png',
    ],
    tileSize: 256,
    minzoom: 2,
    maxzoom: 17,
    attribution: 'Contours: &copy; <a href="https://opentopomap.org" target="_blank" rel="noopener">OpenTopoMap</a> (CC-BY-SA)',
  });
  map.addLayer({
    id: 'topo',
    type: 'raster',
    source: 'topo',
    paint: { 'raster-opacity': 0.85, 'raster-saturation': -0.35, 'raster-contrast': 0.15 },
  });
}
function applyWaterColor(){
  if (map.getLayer('water')) map.setPaintProperty('water', 'fill-color', WATER_COLOR[currentTheme()]);
}
// fires on the initial style load AND every later setStyle() call —
// setStyle() wipes any source/layer added on top, so both need redoing
// each time rather than just once
map.on('style.load', () => {
  addContourLayer();
  applyWaterColor();
});

document.getElementById('theme-toggle').addEventListener('click', () => {
  setTimeout(() => map.setStyle(STYLES[currentTheme()]), 0);
  popupCache.forEach((entry) => entry.model.traverse(recolorMesh));
  if (popupRenderer) popupRenderer.render(popupScene, popupCamera);
});

// ---------- click popup: closer zoom + a fixed (non-spinning) 3D
// preview, reusing the same mini-viewer approach as the index table's
// hover thumbnail (assets/js/... in index.html), but docked in a round
// bubble inside the popup card rather than floating at the cursor ----------
const TINT_STYLE = {
  white: { color: [0.735, 0.72, 0.675], roughness: 0.725, envMapIntensity: 0.4 },
  dark:  { color: [0.02, 0.02, 0.02],   roughness: 1.0,   envMapIntensity: 0 },
};
function tintStyle(){
  return TINT_STYLE[(localStorage.getItem('archivir-model-tint') || 'white') === 'dark' ? 'dark' : 'white'];
}
function recolorMesh(child){
  if (!child.isMesh) return;
  const style = tintStyle();
  child.material.color.setRGB(style.color[0], style.color[1], style.color[2]);
  child.material.roughness = style.roughness;
  child.material.envMapIntensity = style.envMapIntensity;
}

const popupLoader = new GLTFLoader();
const popupCache = new Map();
let popupRenderer, popupScene, popupCamera, popupKeyLight, popupModel;

function ensurePopupViewer(container){
  if (!popupRenderer) {
    popupRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    popupRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    popupRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    popupRenderer.toneMappingExposure = 0.95;
    popupRenderer.shadowMap.enabled = true;
    popupRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
    popupRenderer.outputColorSpace = THREE.SRGBColorSpace;

    popupScene = new THREE.Scene();
    const pmremGenerator = new THREE.PMREMGenerator(popupRenderer);
    popupScene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

    popupCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);

    popupKeyLight = new THREE.DirectionalLight(0xfff2e0, 3.2);
    popupKeyLight.position.set(5, 8, 3);
    popupKeyLight.castShadow = true;
    popupKeyLight.shadow.mapSize.set(1024, 1024);
    popupScene.add(popupKeyLight);
    popupScene.add(new THREE.HemisphereLight(0x5fc7e3, 0x1b1a18, 0.28));

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.ShadowMaterial({ opacity: 0.3 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    popupScene.add(ground);
  }
  container.appendChild(popupRenderer.domElement);
  const w = container.clientWidth, h = container.clientHeight;
  popupRenderer.setSize(w, h);
  popupCamera.aspect = w / h;
  popupCamera.updateProjectionMatrix();
}

function applyPopupModel(entry){
  popupModel = entry.model;
  popupScene.add(popupModel);

  const fov = popupCamera.fov * (Math.PI / 180);
  const distance = (entry.sphere.radius / Math.sin(fov / 2)) * 1.55;
  const dir = new THREE.Vector3(-1.5, 0.5, 0.55).normalize();
  popupCamera.position.copy(dir.multiplyScalar(distance)).add(entry.sphere.center);
  popupCamera.near = distance / 100;
  popupCamera.far = distance * 100;
  popupCamera.lookAt(entry.sphere.center);
  popupCamera.updateProjectionMatrix();

  popupKeyLight.position.set(entry.maxDim * 0.8, entry.maxDim * 1.4, entry.maxDim * 0.5);
  popupKeyLight.shadow.camera.left = -entry.maxDim;
  popupKeyLight.shadow.camera.right = entry.maxDim;
  popupKeyLight.shadow.camera.top = entry.maxDim;
  popupKeyLight.shadow.camera.bottom = -entry.maxDim;
  popupKeyLight.shadow.camera.updateProjectionMatrix();

  popupRenderer.render(popupScene, popupCamera);
}

function showPopupModel(glbPath, container){
  ensurePopupViewer(container);
  if (popupModel) { popupScene.remove(popupModel); popupModel = null; }

  if (popupCache.has(glbPath)) {
    applyPopupModel(popupCache.get(glbPath));
    return;
  }

  popupLoader.load(glbPath, (gltf) => {
    const model = gltf.scene;
    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        recolorMesh(child);
        child.material.metalness = 0;
        if (child.material.name === 'Transparent plastic') child.visible = false;
      }
    });

    const box = new THREE.Box3().setFromObject(model);
    const center = new THREE.Vector3();
    box.getCenter(center);
    model.position.x -= center.x;
    model.position.z -= center.z;
    model.position.y -= box.min.y;

    const fitBox = new THREE.Box3().setFromObject(model);
    const sphere = new THREE.Sphere();
    fitBox.getBoundingSphere(sphere);
    const maxDim = sphere.radius * 2;

    const entry = { model, sphere, maxDim };
    popupCache.set(glbPath, entry);
    applyPopupModel(entry);
  });
}

function popupHtml(project){
  // the whole card is the link — a round, static 3D bubble up top, the
  // project text anchored bottom-left underneath it in the same card
  const wrap = document.createElement('a');
  wrap.className = 'map-popup';
  wrap.href = project.url;
  wrap.innerHTML =
    `<div class="map-popup-3d"></div>` +
    `<div class="map-popup-info">` +
    `<p class="map-popup-title">${project.nom}</p>` +
    `<p class="map-popup-arch">${project.architecte}</p>` +
    `<p class="map-popup-loc">${project.lieu}</p>` +
    `</div>`;
  return wrap;
}

// how close "agrandir l'environnement" zooms in on click — close enough
// to sit inside the OpenTopoMap contour range, so the terrain around
// the pin actually shows relief instead of a flat tile
const FOCUS_ZOOM = 16;
// view to fly back to when a popup is dismissed — captured right before
// the *first* zoom-in of a viewing session (not overwritten while
// switching from one open popup straight to another), so closing after
// checking several projects in a row returns to wherever the visitor
// actually started, not a forced reset to the global overview
let previousView = null;

function anyPopupOpen(){
  return markers.some((m) => m.popup && m.popup.isOpen());
}

const markers = [];
PROJECTS.forEach((project) => {
  const el = document.createElement('div');
  el.className = 'map-pin';
  el.innerHTML = '<span></span>';

  const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
    .setLngLat([project.lon, project.lat])
    .addTo(map);

  const tip = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 14, className: 'map-tip-wrap', anchor: 'bottom' })
    .setLngLat([project.lon, project.lat])
    .setHTML(
      `<span class="map-tip-title">${project.nom}</span>` +
      `<span class="map-tip-arch">${project.architecte}</span>` +
      `<span class="map-tip-loc">${project.lieu}</span>`
    );
  el.addEventListener('mouseenter', () => { el.classList.add('is-active'); tip.addTo(map); });
  el.addEventListener('mouseleave', () => { el.classList.remove('is-active'); tip.remove(); });

  let popup = null;
  if (project.glb) {
    popup = new maplibregl.Popup({ closeButton: true, className: 'map-popup-wrap', maxWidth: '240px' })
      .setDOMContent(popupHtml(project));
    marker.setPopup(popup);
    popup.on('open', () => {
      const container = popup.getElement()?.querySelector('.map-popup-3d');
      if (container) showPopupModel(project.glb, container);
    });
    // closing a popup flies back to wherever the visitor was looking
    // before this viewing session started — so checking several
    // projects in a row is close → look → close → close → look, not
    // close → manually zoom back out → click the next one. Deferred a
    // tick: switching straight from one marker's popup to another
    // closes the old one and opens the new one in the same call stack,
    // and that case should NOT fly back — only an actual dismissal (✕,
    // Escape, clicking the map) leaves no popup open by the time this runs.
    popup.on('close', () => {
      setTimeout(() => {
        if (!anyPopupOpen() && previousView) {
          map.flyTo({ center: previousView.center, zoom: previousView.zoom, duration: 1100 });
          previousView = null;
        }
      }, 0);
    });
  }

  el.addEventListener('click', () => {
    tip.remove();
    markers.forEach((m) => { if (m.popup && m.popup !== popup && m.popup.isOpen()) m.popup.remove(); });
    if (!previousView) previousView = { center: map.getCenter(), zoom: map.getZoom() };
    if (map.getZoom() < FOCUS_ZOOM) map.flyTo({ center: [project.lon, project.lat], zoom: FOCUS_ZOOM, duration: 1100 });
    else map.panTo([project.lon, project.lat]);
  });

  markers.push({ marker, project, popup });
});

if (PROJECTS.length) {
  const lons = PROJECTS.map((p) => p.lon), lats = PROJECTS.map((p) => p.lat);
  map.fitBounds(
    [[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]],
    { padding: 60, maxZoom: 9, duration: 0 }
  );
}
