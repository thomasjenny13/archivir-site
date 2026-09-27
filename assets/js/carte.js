// each entry: { nom, architecte, lieu, lat, lon, url, glb, categorie,
// type } — read by map.js to place markers and, on click, spin up a
// live 3D preview (glb is the same relative-from-root path used as
// data-glb on the index table). categorie/type mirror the index
// table's own "Catégorie d'ouvrage" / "Type de mandat" columns so the
// map's filters can match exactly what the index filters on (see
// filter-sync.js).
window.PROJECTS = [
  { nom: "Monument de la Résistance", architecte: "Aldo Rossi", lieu: "Coni (Italie)", lat: 44.384005, lon: 7.549698, url: "projets/viewer.html?p=pavillon", glb: "projets/pavillon cueno_aldo rossi/pavillon.glb", categorie: "Mémoriel", type: "Concours" },
  { nom: "Tupi", architecte: "mijong architecture", lieu: "Sion (VS)", lat: 46.232209, lon: 7.386007, url: "projets/viewer.html?p=tupi", glb: "projets/tupi/tupi.glb", categorie: "Santé", type: "Concours" },
  { nom: "Haus am See", architecte: "Jan Kinsbergen", lieu: "Wollerau (SZ)", lat: 47.1988262, lon: 8.7182138, url: "projets/viewer.html?p=haus", glb: "projets/haus am see/has.glb", categorie: "Habitation", type: "Nouvelle construction" },
  { nom: "Oberaletschhütte", architecte: "mijong architecture design", lieu: "Belalp (VS)", lat: 46.42493694470926, lon: 7.973840971676474, url: "projets/viewer.html?p=oberaletsch", glb: "projets/concours/oberaletsch/base.glb", categorie: "Refuge de montagne", type: "Concours" },
  { nom: "Caserne de Bernex", architecte: "bunq", lieu: "Bernex (GE)", lat: 46.1826254, lon: 6.0825067, url: "projets/viewer.html?p=casernebernex", glb: "projets/concours/caserne bernex/blend.glb", categorie: "Équipement public", type: "Concours" },
];
