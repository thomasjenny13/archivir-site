// The look of the map: which "bright" layers show, and in which colors.
// Shared by carte.html and carte-reglages.html, the page with the sliders.
import { setTextures } from './map-textures.js?v=14';

export const DEFAULT_PALETTE = {
  paper: '#f4f1e6',
  water: '#e4ecec',
  waterLine: '#89a8a6',
  wood: '#d2dab4',
  grass: '#f6f2df',
  park: '#f3f5ea',
  zone: '#af7f60',
  zoneOpacity: 0.14,
  road: '#fffcf4',
  boundary: '#a2876d',
  building: '#34312f',
  buildingLine: '#a39f97',
  reliefShadow: '#a18a72',
  relief: 0.18,
};

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
  // protected areas, not parks: OSM draws nature reserves and whole
  // regional parks here, which covered large parts of the map in one tint
  'park',
  // ferry routes
  'ferry',
  // dashed footpaths and underground rail
  'tunnel-path', 'highway-path', 'bridge-path-casing', 'bridge-path', 'tunnel-railway',
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
const WATER_LINE_LAYERS = [
  'waterway_tunnel', 'waterway-other', 'waterway-other-intermittent',
  'waterway-stream-canal', 'waterway-stream-canal-intermittent',
  'waterway-river', 'waterway-river-intermittent',
];
const ZONE_LAYERS = [
  'landuse-residential', 'landuse-suburb', 'landuse-commercial', 'landuse-industrial',
  'landuse-cemetery', 'landuse-hospital', 'landuse-school', 'landuse-railway',
];
const BOUNDARY_LAYERS = ['boundary_2', 'boundary_3', 'boundary_disputed'];
const RELIEF_LAYER = 'relief';

function rgba(hex, alpha){
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function setPaint(map, id, props){
  if (!map.getLayer(id)) return;
  Object.entries(props).forEach(([prop, value]) => map.setPaintProperty(id, prop, value));
}

// Everything the sliders can change. "bright" tints its zoning categories
// with candy colors that mean nothing here, so they collapse into one wash.
// Urban parks, wood and grass stay opaque because OSM stacks these polygons: a
// see-through fill would show every overlap as a darker hard-edged shape.
export function paintMap(map, palette){
  setTextures(map, palette);
  setPaint(map, 'background', { 'background-pattern': 'pencil-paper' });
  setPaint(map, 'water', { 'fill-pattern': 'pencil-water' });
  setPaint(map, 'water-intermittent', { 'fill-pattern': 'pencil-water', 'fill-opacity': 1 });
  setPaint(map, 'building', { 'fill-pattern': 'pencil-building' });
  setPaint(map, 'road_area_pier', { 'fill-color': palette.paper });
  setPaint(map, 'landcover-sand', { 'fill-color': palette.paper });
  setPaint(map, 'landcover-grass', { 'fill-color': palette.grass, 'fill-opacity': 1 });
  setPaint(map, 'landcover-grass-park', { 'fill-color': palette.park, 'fill-opacity': 1 });
  setPaint(map, 'landcover-wood', { 'fill-color': palette.wood, 'fill-opacity': 1, 'fill-outline-color': palette.wood });
  ZONE_LAYERS.forEach((id) => setPaint(map, id, { 'fill-color': rgba(palette.zone, palette.zoneOpacity) }));
  BOUNDARY_LAYERS.forEach((id) => setPaint(map, id, { 'line-color': palette.boundary }));
  WATER_LINE_LAYERS.forEach((id) => setPaint(map, id, { 'line-color': palette.waterLine }));
  // casing + main line share one color so a road reads as a single pale
  // stroke; slightly see-through so the paper grain carries on under it
  WHITE_ROAD_LAYERS.forEach((id) => setPaint(map, id, { 'line-color': rgba(palette.road, 0.85) }));
  setPaint(map, 'building-pencil-line', { 'line-color': palette.buildingLine });
  setPaint(map, RELIEF_LAYER, {
    'hillshade-exaggeration': palette.relief,
    'hillshade-shadow-color': palette.reliefShadow,
  });
}

export function applyMapStyle(map, palette){
  HIDE_LAYERS.forEach((id) => { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none'); });
  // "bright" fakes a 3D roof with a second copy of every building
  // ('building-top') shifted 2px up-left from z16, which just looks like
  // every building is drawn twice once they are dark
  if (map.getLayer('building-top')) map.setLayoutProperty('building-top', 'visibility', 'none');

  // a pattern fill draws no outline of its own
  map.addLayer({
    id: 'building-pencil-line', type: 'line', source: 'openmaptiles', 'source-layer': 'building',
    minzoom: 14,
    paint: { 'line-opacity': 0.75, 'line-width': 0.6 },
  }, 'building-top');

  // hill shading over the land colors, under water, roads and buildings
  map.addSource(RELIEF_LAYER, {
    type: 'raster-dem',
    tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
    encoding: 'terrarium',
    tileSize: 256,
    maxzoom: 12,
    attribution: 'Relief : Mapzen Terrain Tiles',
  });
  map.addLayer({
    id: RELIEF_LAYER, type: 'hillshade', source: RELIEF_LAYER,
    paint: { 'hillshade-highlight-color': 'rgba(255, 255, 255, 0.5)', 'hillshade-accent-color': 'rgba(0, 0, 0, 0)' },
  }, 'waterway_tunnel');

  paintMap(map, palette);
}
