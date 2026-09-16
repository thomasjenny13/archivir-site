const PROJECTS = window.PROJECTS || [];

const map = L.map('osm-map', {
  minZoom: 2,
  maxZoom: 19,
  worldCopyJump: true,
  zoomControl: false,
  fadeAnimation: false,
});
L.control.zoom({ position: 'topright' }).addTo(map);

// standard OpenStreetMap raster tiles — no API key needed, unlike the
// CARTO basemaps this replaced (their free anonymous tier now blocks
// unregistered domains and stamps "API KEY REQUIRED" across every tile)
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  subdomains: 'abc',
  maxZoom: 19,
  attribution: ATTRIBUTION,
}).addTo(map);

// OSM only ships one (light) style, so dark theme is approximated with a
// CSS filter on the tile layer rather than swapping to a different,
// possibly key-gated tile source
function currentTheme(){
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}
function applyTileTheme(){
  map.getContainer().classList.toggle('map-dark-tiles', currentTheme() === 'dark');
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
