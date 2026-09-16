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

// OpenFreeMap, free/no-key vector tiles via MapLibre GL — "bright" is
// one of OpenFreeMap's own ready-made styles (alongside liberty,
// positron, dark). One style regardless of the site's light/dark
// theme, matching how the geodataviewer.com reference behaves — its
// own dark mode only re-themes its UI chrome, never re-requests a
// different map style.
const STYLE = 'https://tiles.openfreemap.org/styles/bright';

const map = new maplibregl.Map({
  container: 'osm-map',
  style: STYLE,
  center: [10, 45],
  zoom: 2,
  minZoom: 2,
  maxZoom: 19,
  attributionControl: { compact: false },
});
map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

// strip "bright" down to just city names on a plain white-roads base —
// no POI icons, no route-number shields, no street/water names, no
// admin-region or country labels. Layer ids are OpenMapTiles' own,
// read straight off the fetched style (openfreemap.org/…/bright).
const HIDE_LAYERS = [
  // POI / shop / transit / airport icons
  'poi_r20', 'poi_r7', 'poi_r1', 'poi_transit', 'airport',
  // route-number shields (A9, "9", …)
  'highway-shield-non-us', 'highway-shield-us-interstate', 'road_shield_us',
  // street and path name labels
  'highway-name-path', 'highway-name-minor', 'highway-name-major',
  // one-way arrows
  'road_oneway', 'road_oneway_opposite',
  // river/lake names
  'waterway_line_label', 'water_name_point_label', 'water_name_line_label',
  // every place label except city/town/village
  'label_other', 'label_state', 'label_country_1', 'label_country_2', 'label_country_3',
];
const WHITE_ROAD_LAYERS = [
  'tunnel-service-track-casing', 'tunnel-motorway-link-casing', 'tunnel-minor-casing',
  'tunnel-link-casing', 'tunnel-secondary-tertiary-casing', 'tunnel-trunk-primary-casing',
  'tunnel-motorway-casing', 'tunnel-motorway-link', 'tunnel-service-track', 'tunnel-link',
  'tunnel-minor', 'tunnel-secondary-tertiary', 'tunnel-trunk-primary', 'tunnel-motorway',
  'highway-motorway-link-casing', 'highway-link-casing', 'highway-minor-casing',
  'highway-secondary-tertiary-casing', 'highway-primary-casing', 'highway-trunk-casing',
  'highway-motorway-casing', 'highway-motorway-link', 'highway-link', 'highway-minor',
  'highway-secondary-tertiary', 'highway-primary', 'highway-trunk', 'highway-motorway',
  'bridge-motorway-link-casing', 'bridge-link-casing', 'bridge-secondary-tertiary-casing',
  'bridge-trunk-primary-casing', 'bridge-motorway-casing', 'bridge-minor-casing',
  'bridge-motorway-link', 'bridge-link', 'bridge-minor', 'bridge-secondary-tertiary',
  'bridge-trunk-primary', 'bridge-motorway',
];
// "bright" tints its zoning categories with OSM-default candy colors —
// hospitals pink, schools lavender, commercial reddish, industrial
// yellow. None of that means anything on an architecture portfolio map
// and it visibly clashes with the site's own warm/neutral palette, so
// every one of those zone categories collapses into a single quiet
// wash instead of keeping a rainbow of database categories. Buildings
// go solid near-black, boundaries a plain warm gray — nothing left
// that isn't either the site's own ink/line tones or a legible
// natural feature (water, greenery).
const BUILDING_COLOR = '#1c1a17';
const ZONE_TINT = 'rgba(92, 86, 75, 0.07)';
const BOUNDARY_COLOR = '#c9c4ba';
const RECOLOR = {
  'building': { 'fill-color': BUILDING_COLOR },
  'building-top': { 'fill-color': BUILDING_COLOR, 'fill-outline-color': BUILDING_COLOR },
  'landuse-residential': { 'fill-color': ZONE_TINT },
  'landuse-suburb': { 'fill-color': ZONE_TINT },
  'landuse-commercial': { 'fill-color': ZONE_TINT },
  'landuse-industrial': { 'fill-color': ZONE_TINT },
  'landuse-cemetery': { 'fill-color': ZONE_TINT },
  'landuse-hospital': { 'fill-color': ZONE_TINT },
  'landuse-school': { 'fill-color': ZONE_TINT },
  'landuse-railway': { 'fill-color': ZONE_TINT },
  'boundary_2': { 'line-color': BOUNDARY_COLOR },
  'boundary_3': { 'line-color': BOUNDARY_COLOR },
  'boundary_disputed': { 'line-color': BOUNDARY_COLOR },
};
map.on('style.load', () => {
  HIDE_LAYERS.forEach((id) => { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none'); });
  // casing + main line both forced white so a road reads as a single
  // flat white stroke, not a colored line with a contrasting border
  WHITE_ROAD_LAYERS.forEach((id) => { if (map.getLayer(id)) map.setPaintProperty(id, 'line-color', '#ffffff'); });
  Object.entries(RECOLOR).forEach(([id, props]) => {
    if (!map.getLayer(id)) return;
    Object.entries(props).forEach(([prop, value]) => map.setPaintProperty(id, prop, value));
  });
});

document.getElementById('theme-toggle').addEventListener('click', () => {
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

// how close "agrandir l'environnement" zooms in on click
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
