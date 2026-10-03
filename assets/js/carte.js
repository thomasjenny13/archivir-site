// each entry: { nom, architecte, lieu, lat, lon, url, glb, categorie,
// type } — read by map.js to place markers and, on click, spin up a
// live 3D preview (glb is the same relative-from-root path used as
// data-glb on the index table). categorie/type mirror the index
// table's own "Catégorie d'ouvrage" / "Type de mandat" columns so the
// map's filters can match exactly what the index filters on (see
// filter-sync.js).
window.PROJECTS = [
  { nom: "Monument de la Résistance", architecte: "Aldo Rossi", lieu: "Coni (Italie)", lat: 44.384005, lon: 7.549698, url: "ouvrages/pavillon/", glb: "projets/pavillon cueno_aldo rossi/pavillon.glb", categorie: "Mémoriel", type: "Concours" },
  { nom: "Tupi", architecte: "mijong architecture", lieu: "Sion (VS)", lat: 46.232209, lon: 7.386007, url: "ouvrages/tupi/", glb: "projets/tupi/tupi.glb", categorie: "Santé", type: "Concours" },
  { nom: "Haus am See", architecte: "Jan Kinsbergen", lieu: "Wollerau (SZ)", lat: 47.1988262, lon: 8.7182138, url: "ouvrages/haus/", glb: "projets/jan kinsbergen/haus am see/has.glb", categorie: "Habitation", type: "Nouvelle construction" },
  { nom: "Oberaletschhütte", architecte: "mijong architecture design", lieu: "Belalp (VS)", lat: 46.42493694470926, lon: 7.973840971676474, url: "ouvrages/oberaletsch/", glb: "projets/concours/oberaletsch/base.glb", categorie: "Refuge de montagne", type: "Concours" },
  { nom: "Caserne de Bernex", architecte: "bunq", lieu: "Bernex (GE)", lat: 46.1826254, lon: 6.0825067, url: "ouvrages/casernebernex/", glb: "projets/concours/caserne bernex/blend.glb", categorie: "Équipement public", type: "Concours" },
  { nom: "Atelier Hansaallee 94", architecte: "Herzog & de Meuron", lieu: "Düsseldorf (Allemagne)", lat: 51.235433, lon: 6.743714, url: "ouvrages/hansaallee/", glb: "projets/herzog de meuron/atelier hansaallee/atelier.glb", categorie: "Atelier", type: "Nouvelle construction" },
  { nom: "Plywood House", architecte: "Herzog & de Meuron", lieu: "Bottmingen (BL)", lat: 47.528976808370366, lon: 7.585112755354861, url: "ouvrages/plywood/", glb: "projets/herzog de meuron/plywood house/plywood.glb", categorie: "Habitation", type: "Nouvelle construction" },
  { nom: "Umbrella Pavilion", architecte: "charly jolliet architectes", lieu: "Fribourg (FR)", lat: 46.791417, lon: 7.157472, url: "ouvrages/umbrella/", glb: "projets/charly jolliet/umbrella pavilion/umbrella.glb", categorie: "Pavillon", type: "Nouvelle construction" },
];
