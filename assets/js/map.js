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
// Base fill layer plus a Reference layer of labels/borders on top)
const ATTRIBUTION = 'Esri, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';
const CANVAS = {
  light: ['World_Light_Gray_Base', 'World_Light_Gray_Reference'],
  dark: ['World_Dark_Gray_Base', 'World_Dark_Gray_Reference'],
};

function currentTheme(){
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

let canvasLayers = [];
function applyTileTheme(){
  canvasLayers.forEach((layer) => map.removeLayer(layer));
  canvasLayers = CANVAS[currentTheme()].map((name) =>
    L.tileLayer(`https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/${name}/MapServer/tile/{z}/{y}/{x}`, {
      maxZoom: 19,
      maxNativeZoom: 16,
      attribution: ATTRIBUTION,
    }).addTo(map)
  );
}
applyTileTheme();
document.getElementById('theme-toggle').addEventListener('click', () => setTimeout(applyTileTheme, 0));

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
  marker.on('mouseover', () => marker.getElement()?.classList.add('is-active'));
  marker.on('mouseout', () => marker.getElement()?.classList.remove('is-active'));
  if (project.url) marker.on('click', () => { window.location.href = project.url; });
  marker.addTo(map);
  return marker;
});

if (markers.length) {
  map.fitBounds(L.featureGroup(markers).getBounds().pad(0.35), { maxZoom: 9 });
} else {
  map.setView([20, 10], 2);
}
