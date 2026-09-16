import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const PROJECTS = window.PROJECTS || [];

const map = L.map('osm-map', {
  minZoom: 2,
  maxZoom: 19,
  worldCopyJump: true,
  zoomControl: false,
  fadeAnimation: false,
});
L.control.zoom({ position: 'topright' }).addTo(map);

// Esri's free, no-key "Canvas" basemaps — abstract flat gray shapes
// instead of a busy street map, with a real light/dark pair (each is a
// Base fill layer plus a Reference layer of labels/borders on top). A
// hillshade layer sits between the two so mountain terrain (ridges,
// glaciers, valleys) reads at a glance — useful context for a pin like
// Oberaletschhütte that can't be checked against a street address.
// Explicit panes keep the stacking order fixed regardless of when each
// layer is added/removed (theme toggles swap Base + Reference only).
const ATTRIBUTION = 'Esri, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';
const CANVAS = {
  light: ['World_Light_Gray_Base', 'World_Light_Gray_Reference'],
  dark: ['World_Dark_Gray_Base', 'World_Dark_Gray_Reference'],
};

['paneBase', 'paneHillshade', 'paneReference', 'paneTopo'].forEach((name, i) => {
  map.createPane(name);
  map.getPane(name).style.zIndex = 200 + i * 10;
});

L.tileLayer('https://services.arcgisonline.com/arcgis/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}', {
  maxZoom: 19,
  maxNativeZoom: 13,
  opacity: 0.45,
  pane: 'paneHillshade',
  className: 'map-hillshade',
  attribution: ATTRIBUTION,
}).addTo(map);

// hillshade alone reads as terrain texture but has no traced elevation
// lines; past a close zoom, switch over to OpenTopoMap, which bakes in
// real contour lines (from SRTM data) — its own full style, so it
// covers the abstract canvas/hillshade underneath rather than blending
// with them, only within its own zoom range
// OpenTopoMap's own style is full-color (green forest fill, blue water,
// brown contours) — a CSS filter strips that down to grayscale linework
// so it reads as an extension of the flat canvas basemap instead of a
// completely different, busier map dropped on top
L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
  minZoom: 13,
  maxZoom: 19,
  maxNativeZoom: 17,
  subdomains: 'abc',
  pane: 'paneTopo',
  className: 'map-topo',
  attribution: 'Contours: &copy; <a href="https://opentopomap.org" target="_blank" rel="noopener">OpenTopoMap</a> (CC-BY-SA)',
}).addTo(map);

function currentTheme(){
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

let canvasLayers = [];
function applyTileTheme(){
  canvasLayers.forEach((layer) => map.removeLayer(layer));
  const [base, reference] = CANVAS[currentTheme()];
  canvasLayers = [
    L.tileLayer(`https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/${base}/MapServer/tile/{z}/{y}/{x}`, {
      maxZoom: 19, maxNativeZoom: 16, pane: 'paneBase', attribution: ATTRIBUTION,
    }).addTo(map),
    L.tileLayer(`https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/${reference}/MapServer/tile/{z}/{y}/{x}`, {
      maxZoom: 19, maxNativeZoom: 16, pane: 'paneReference',
    }).addTo(map),
  ];
}
applyTileTheme();
document.getElementById('theme-toggle').addEventListener('click', () => {
  setTimeout(applyTileTheme, 0);
  popupCache.forEach((entry) => entry.model.traverse(recolorMesh));
  if (popupRenderer) popupRenderer.render(popupScene, popupCamera);
});

// ---------- click popup: closer zoom + a live-spinning 3D preview,
// reusing the same mini-viewer approach as the index table's hover
// thumbnail (assets/js/... in index.html), but docked inside the popup
// instead of floating at the cursor, and opened on click rather than
// hover so it survives on touch devices too ----------
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
let popupRenderer, popupScene, popupCamera, popupKeyLight, popupModel, popupSpinId;

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

function popupSpinFrame(){
  if (popupModel) popupModel.rotation.y += 0.006;
  if (popupRenderer) popupRenderer.render(popupScene, popupCamera);
  popupSpinId = requestAnimationFrame(popupSpinFrame);
}
function stopPopupSpin(){ if (popupSpinId) { cancelAnimationFrame(popupSpinId); popupSpinId = null; } }

function popupHtml(project){
  const wrap = document.createElement('div');
  wrap.className = 'map-popup';
  wrap.innerHTML =
    `<p class="map-popup-title">${project.nom}</p>` +
    `<p class="map-popup-arch">${project.architecte}</p>` +
    `<p class="map-popup-loc">${project.lieu}</p>` +
    `<div class="map-popup-3d"></div>` +
    `<a class="map-popup-link" href="${project.url}">Voir en 3D →</a>`;
  return wrap;
}

// how close "agrandir l'environnement" zooms in on click — close enough
// to sit inside the OpenTopoMap contour range (kicks in at 13), so the
// terrain around the pin actually shows relief instead of a flat tile
const FOCUS_ZOOM = 16;

const markers = PROJECTS.map((project) => {
  const icon = L.divIcon({
    className: 'map-pin',
    html: '<span></span>',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
  const marker = L.marker([project.lat, project.lon], { icon, keyboard: false });
  marker.bindTooltip(
    `<span class="map-tip-title">${project.nom}</span>` +
    `<span class="map-tip-arch">${project.architecte}</span>` +
    `<span class="map-tip-loc">${project.lieu}</span>`,
    { direction: 'top', offset: [0, -10], className: 'map-tip' }
  );
  if (project.glb) {
    marker.bindPopup(popupHtml(project), { className: 'map-popup-wrap', maxWidth: 240, closeButton: true });
  }
  marker.on('mouseover', () => marker.getElement()?.classList.add('is-active'));
  marker.on('mouseout', () => marker.getElement()?.classList.remove('is-active'));
  marker.on('click', () => {
    if (map.getZoom() < FOCUS_ZOOM) map.flyTo([project.lat, project.lon], FOCUS_ZOOM, { duration: 1.1 });
    else map.panTo([project.lat, project.lon], { animate: true });
  });
  marker.addTo(map);
  return { marker, project };
});

map.on('popupopen', (e) => {
  const project = markers.find((m) => m.marker === e.popup._source)?.project;
  const container = e.popup.getElement()?.querySelector('.map-popup-3d');
  if (!project || !container) return;
  showPopupModel(project.glb, container);
  if (!popupSpinId) popupSpinId = requestAnimationFrame(popupSpinFrame);
});
map.on('popupclose', () => stopPopupSpin());

if (markers.length) {
  map.fitBounds(L.featureGroup(markers.map((m) => m.marker)).getBounds().pad(0.35), { maxZoom: 9 });
} else {
  map.setView([20, 10], 2);
}
