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

function themeColor(name){
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function projectBounds(list = PROJECTS){
  const lons = list.map((p) => p.lon), lats = list.map((p) => p.lat);
  return [[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]];
}

// the "Lieu" column on the index table filters by the country in
// parentheses at the end of a project's lieu string (e.g. "Bochum
// (Allemagne)") — same convention reused here so a country picked on
// the map means the same thing it does in the index
function countryOf(project){
  const m = project.lieu.match(/\(([^)]+)\)\s*$/);
  return m ? m[1] : '';
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
// custom control: same look as MapLibre's own zoom pair, but the
// bottom "-" button is replaced with a "vue globale" button that fits
// every project into view instead of a single zoom-out step
class MapControls {
  onAdd(mapInstance){
    this._map = mapInstance;
    const el = document.createElement('div');
    el.className = 'maplibregl-ctrl maplibregl-ctrl-group';

    const zoomIn = document.createElement('button');
    zoomIn.type = 'button';
    zoomIn.className = 'maplibregl-ctrl-zoom-in';
    zoomIn.setAttribute('aria-label', 'Zoomer');
    zoomIn.innerHTML = '<span class="maplibregl-ctrl-icon" aria-hidden="true"></span>';
    zoomIn.addEventListener('click', () => mapInstance.zoomIn());

    const fitAll = document.createElement('button');
    fitAll.type = 'button';
    fitAll.className = 'map-ctrl-fit';
    fitAll.setAttribute('aria-label', 'Vue globale des projets');
    fitAll.title = 'Vue globale des projets';
    fitAll.innerHTML = '<svg viewBox="0 0 15 15" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M1.5 5.5v-4h4M13.5 5.5v-4h-4M1.5 9.5v4h4M13.5 9.5v4h-4"/></svg>';
    fitAll.addEventListener('click', () => {
      if (PROJECTS.length) mapInstance.fitBounds(projectBounds(), { padding: 60, maxZoom: 9, duration: 900 });
    });

    el.appendChild(zoomIn);
    el.appendChild(fitAll);
    this._el = el;
    return el;
  }
  onRemove(){ this._el.parentNode.removeChild(this._el); this._map = undefined; }
}
map.addControl(new MapControls(), 'top-right');

// "Lieu" filter — same country grouping as the index table's own Lieu
// filter, restricted to the map instead of the table rows. Picking a
// country hides every other marker (and its tooltip/popup) and reframes
// the view on what's left; "Tous" restores everything.
let activeCountry = '';
class FilterControl {
  onAdd(mapInstance){
    this._map = mapInstance;
    const el = document.createElement('div');
    el.className = 'maplibregl-ctrl map-filter-ctrl';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'map-filter-btn';
    btn.textContent = 'Lieu';

    const dropdown = document.createElement('div');
    dropdown.className = 'filter-dropdown';

    const countries = Array.from(new Set(PROJECTS.map(countryOf).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'fr'));

    const setCountry = (value) => {
      activeCountry = value;
      btn.textContent = value || 'Lieu';
      btn.classList.toggle('is-filtered', !!value);
      buildOptions();
      applyCountryFilter();
      dropdown.classList.remove('open');
    };

    const buildOptions = () => {
      dropdown.innerHTML = '';
      const allBtn = document.createElement('button');
      allBtn.type = 'button';
      allBtn.textContent = 'Tous';
      allBtn.classList.toggle('active', !activeCountry);
      allBtn.addEventListener('click', (e) => { e.stopPropagation(); setCountry(''); });
      dropdown.appendChild(allBtn);
      countries.forEach((country) => {
        const optBtn = document.createElement('button');
        optBtn.type = 'button';
        optBtn.textContent = country;
        optBtn.classList.toggle('active', activeCountry === country);
        optBtn.addEventListener('click', (e) => { e.stopPropagation(); setCountry(country); });
        dropdown.appendChild(optBtn);
      });
    };

    btn.addEventListener('click', (e) => { e.stopPropagation(); dropdown.classList.toggle('open'); });
    document.addEventListener('click', () => dropdown.classList.remove('open'));

    buildOptions();
    el.appendChild(btn);
    el.appendChild(dropdown);
    this._el = el;
    return el;
  }
  onRemove(){ this._el.parentNode.removeChild(this._el); this._map = undefined; }
}
map.addControl(new FilterControl(), 'top-left');

function applyCountryFilter(){
  markers.forEach(({ marker, project, popup, tip }) => {
    const visible = !activeCountry || countryOf(project) === activeCountry;
    marker.getElement().style.display = visible ? '' : 'none';
    if (!visible) {
      if (popup.isOpen()) popup.remove();
      tip.remove();
    }
  });
  clearHighlight();
  const visibleProjects = PROJECTS.filter((p) => !activeCountry || countryOf(p) === activeCountry);
  if (visibleProjects.length) map.fitBounds(projectBounds(visibleProjects), { padding: 60, maxZoom: 9, duration: 900 });
}

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
const HIGHLIGHT_SOURCE = 'project-highlight';
function emptyFC(){ return { type: 'FeatureCollection', features: [] }; }

map.on('style.load', () => {
  HIDE_LAYERS.forEach((id) => { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none'); });
  // casing + main line both forced white so a road reads as a single
  // flat white stroke, not a colored line with a contrasting border
  WHITE_ROAD_LAYERS.forEach((id) => { if (map.getLayer(id)) map.setPaintProperty(id, 'line-color', '#ffffff'); });
  Object.entries(RECOLOR).forEach(([id, props]) => {
    if (!map.getLayer(id)) return;
    Object.entries(props).forEach(([prop, value]) => map.setPaintProperty(id, prop, value));
  });

  // highlight layer for the cadastral footprint of whichever project's
  // popup is open — an empty source until a marker is clicked
  map.addSource(HIGHLIGHT_SOURCE, { type: 'geojson', data: emptyFC() });
  map.addLayer({
    id: 'project-highlight-fill', type: 'fill', source: HIGHLIGHT_SOURCE,
    paint: { 'fill-color': themeColor('--rose-gold'), 'fill-opacity': 0.35 },
  });
  map.addLayer({
    id: 'project-highlight-line', type: 'line', source: HIGHLIGHT_SOURCE,
    paint: { 'line-color': themeColor('--rose-gold'), 'line-width': 2 },
  });
});

function clearHighlight(){
  const src = map.getSource(HIGHLIGHT_SOURCE);
  if (src) src.setData(emptyFC());
}

// finds the building footprint under a project's marker (once its tiles
// are actually loaded) and paints it in the theme's accent color — a
// quiet "here's the plot" cue instead of just a dot. Silently does
// nothing if the geocoded point doesn't land on a rendered building.
function highlightBuildingAt(lon, lat){
  const src = map.getSource(HIGHLIGHT_SOURCE);
  if (!src || !map.getLayer('building')) return;
  const point = map.project([lon, lat]);
  const features = map.queryRenderedFeatures(point, { layers: ['building'] });
  if (!features.length) { clearHighlight(); return; }
  src.setData({ type: 'FeatureCollection', features: [{ type: 'Feature', geometry: features[0].geometry, properties: {} }] });
}

document.getElementById('theme-toggle').addEventListener('click', () => {
  popupCache.forEach((entry) => entry.model.traverse(recolorMesh));
  if (popupRenderer) popupRenderer.render(popupScene, popupCamera);
  if (map.getLayer('project-highlight-fill')) {
    const color = themeColor('--rose-gold');
    map.setPaintProperty('project-highlight-fill', 'fill-color', color);
    map.setPaintProperty('project-highlight-line', 'line-color', color);
  }
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
  // project text anchored bottom-left underneath it in the same card.
  // No glb yet: the bubble shows a plain "à venir" label instead of
  // trying (and failing) to load a model, and the card itself isn't a
  // link — there's no 3D viewer page worth clicking through to.
  const wrap = document.createElement(project.glb ? 'a' : 'div');
  wrap.className = project.glb ? 'map-popup' : 'map-popup map-popup-pending';
  if (project.glb) wrap.href = project.url;
  wrap.innerHTML =
    (project.glb
      ? `<div class="map-popup-3d"></div>`
      : `<div class="map-popup-3d map-popup-3d-pending"><span>À venir</span></div>`) +
    `<div class="map-popup-info">` +
    `<p class="map-popup-title">${project.nom}</p>` +
    `<p class="map-popup-arch">${project.architecte}</p>` +
    `<p class="map-popup-loc">${project.lieu}</p>` +
    `</div>`;
  return wrap;
}

// how close "agrandir l'environnement" zooms in on click
const FOCUS_ZOOM = 16;

function anyPopupOpen(){
  return markers.some((m) => m.popup && m.popup.isOpen());
}

// offset the card away from the marker regardless of which side MapLibre
// ends up anchoring it on, so the pin (and the plot underneath it) stays
// visible next to the card instead of tucked directly under it
const POPUP_OFFSET = {
  top: [0, 24], 'top-left': [16, 16], 'top-right': [-16, 16],
  bottom: [0, -24], 'bottom-left': [16, -16], 'bottom-right': [-16, -16],
  left: [24, 0], right: [-24, 0],
};

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

  // every project gets the popup — glb-less ones just show the "à
  // venir" bubble from popupHtml() instead of loading a model
  const popup = new maplibregl.Popup({ closeButton: true, className: 'map-popup-wrap', maxWidth: '240px', offset: POPUP_OFFSET })
    .setDOMContent(popupHtml(project));
  marker.setPopup(popup);
  popup.on('open', () => {
    if (!project.glb) return;
    const container = popup.getElement()?.querySelector('.map-popup-3d');
    if (container) showPopupModel(project.glb, container);
  });
  // dismissing a popup (✕, Escape, clicking the map) no longer flies the
  // view back anywhere — it just clears the cadastral highlight once no
  // popup is left open. Deferred a tick: switching straight from one
  // marker's popup to another closes the old one and opens the new one
  // in the same call stack, and that case should keep the highlight.
  popup.on('close', () => {
    setTimeout(() => { if (!anyPopupOpen()) clearHighlight(); }, 0);
  });

  el.addEventListener('click', () => {
    tip.remove();
    markers.forEach((m) => { if (m.popup && m.popup !== popup && m.popup.isOpen()) m.popup.remove(); });
    if (map.getZoom() < FOCUS_ZOOM) map.flyTo({ center: [project.lon, project.lat], zoom: FOCUS_ZOOM, duration: 1100 });
    else map.panTo([project.lon, project.lat]);
    map.once('idle', () => highlightBuildingAt(project.lon, project.lat));
  });

  markers.push({ marker, project, popup, tip });
});

if (PROJECTS.length) {
  map.fitBounds(projectBounds(), { padding: 60, maxZoom: 9, duration: 0 });
}
