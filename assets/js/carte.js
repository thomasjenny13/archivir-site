// each entry: { nom, architecte, lieu, lat, lon, url, glb, categorie,
// type } — read by map.js to place markers and, on click, spin up a
// live 3D preview (glb is the same relative-from-root path used as
// data-glb on the index table). categorie/type mirror the index
// table's own "Catégorie d'ouvrage" / "Type de mandat" columns so the
// map's filters can match exactly what the index filters on (see
// filter-sync.js). master:true marks the "Nouvelles églises" master's
// thesis selection (map only, not in the index).
window.PROJECTS = [
  { nom: "Monument de la Résistance", architecte: "Aldo Rossi", lieu: "Coni (Italie)", lat: 44.384005, lon: 7.549698, url: "ouvrages/pavillon/", glb: "projets/pavillon cueno_aldo rossi/pavillon.glb", categorie: "Mémoriel", type: "Concours" },
  { nom: "Tupi", architecte: "mijong architecture design", lieu: "Sion (VS)", lat: 46.232209, lon: 7.386007, url: "ouvrages/tupi/", glb: "projets/tupi/tupi.glb", categorie: "Santé", type: "Concours" },
  { nom: "Haus am See", architecte: "Jan Kinsbergen", lieu: "Wollerau (SZ)", lat: 47.1988262, lon: 8.7182138, url: "ouvrages/haus/", glb: "projets/jan kinsbergen/haus am see/has.glb", categorie: "Habitation", type: "Nouvelle construction" },
  { nom: "Oberaletschhütte", architecte: "mijong architecture design", lieu: "Belalp (VS)", lat: 46.42493694470926, lon: 7.973840971676474, url: "ouvrages/oberaletsch/", glb: "projets/concours/oberaletsch/base.glb", categorie: "Refuge de montagne", type: "Concours" },
  { nom: "Caserne de Bernex", architecte: "bunq", lieu: "Bernex (GE)", lat: 46.1826254, lon: 6.0825067, url: "ouvrages/casernebernex/", glb: "projets/concours/caserne bernex/blend.glb", categorie: "Équipement public", type: "Concours" },
  { nom: "Atelier Hansaallee 94", architecte: "Herzog & de Meuron", lieu: "Düsseldorf (Allemagne)", lat: 51.235433, lon: 6.743714, url: "ouvrages/hansaallee/", glb: "projets/herzog de meuron/atelier hansaallee/atelier.glb", categorie: "Atelier", type: "Nouvelle construction" },
  { nom: "Plywood House", architecte: "Herzog & de Meuron", lieu: "Bottmingen (BL)", lat: 47.528976808370366, lon: 7.585112755354861, url: "ouvrages/plywood/", glb: "projets/herzog de meuron/plywood house/plywood.glb", categorie: "Habitation", type: "Nouvelle construction" },
  { nom: "Umbrella Pavilion", architecte: "charly jolliet architectes", lieu: "Fribourg (FR)", lat: 46.791417, lon: 7.157472, url: "ouvrages/umbrella/", glb: "projets/charly jolliet/umbrella pavilion/umbrella.glb", categorie: "Pavillon", type: "Nouvelle construction" },
  { nom: "Reuse the Convent", architecte: "Reuse Italy", lieu: "Bussi sul Tirino (Italie)", lat: 42.216029056030244, lon: 13.818218574277982, url: "ouvrages/convent/", glb: "projets/concours/reuse the convent/convent.glb", categorie: "Couvent", type: "Concours ouvert" },
  // "Nouvelles églises" studio selection (Atelier Menzel & Esquivié,
  // JMA - HEIA Fribourg SA 2026), Ruhr valley reconversion candidates —
  // no glb yet, so no page to link to: the popup shows a historical
  // photo when one is available (photo:), otherwise "à venir" (see map.js)
  { nom: "St. Paulus", architecte: "Alfons et Florian Leitl", lieu: "Bochum (Allemagne)", lat: 51.4577264, lon: 7.2717421, categorie: "Culte", type: "Nouvelle construction", master: true, photo: "assets/img/eglises/stpaulus.jpg" },
  { nom: "Hl. Familie (Heimkehrer Dankeskirche)", architecte: "Kurt Hubert Vieth", lieu: "Bochum-Weitmar-Mark (Allemagne)", lat: 51.4417371, lon: 7.2107848, categorie: "Culte", type: "Nouvelle construction", master: true, photo: "assets/img/eglises/hlfamilie.jpg" },
  { nom: "St. Johannes (WAT-Leithe)", architecte: "Josef Franke", lieu: "Bochum-Leithe (Allemagne)", lat: 51.4798968, lon: 7.1105441, categorie: "Culte", type: "Nouvelle construction", master: true },
  { nom: "Heilig Geist", architecte: "Karl Hellrung", lieu: "Bochum-Harpen (Allemagne)", lat: 51.4997566, lon: 7.2729947, categorie: "Culte", type: "Nouvelle construction", master: true },
  { nom: "St. Albertus Magnus", architecte: "Gottfried Böhm", lieu: "Bochum-Wiemelhausen (Allemagne)", lat: 51.458577, lon: 7.2249947, categorie: "Culte", type: "Nouvelle construction", master: true },
  { nom: "St. Antonius", architecte: "Rudolf et Maria Schwarz", lieu: "Essen-Frohnhausen (Allemagne)", lat: 51.4476571, lon: 6.9731342, categorie: "Culte", type: "Reconstruction", master: true },
  { nom: "Heilig Geist", architecte: "Emil Steffann et Gisberth Hülsman", lieu: "Mülheim an der Ruhr (Allemagne)", lat: 51.4171671, lon: 6.9042691, categorie: "Culte", type: "Nouvelle construction", master: true },
  { nom: "St. Franziskus", architecte: "Ernst Burghartz", lieu: "Bottrop-Welheim (Allemagne)", lat: 51.5265128, lon: 6.9837384, categorie: "Culte", type: "Nouvelle construction", master: true },
  { nom: "Heilige Familie (Tafel-Kirche)", architecte: "Rudolf Schwarz et Josef Bernard", lieu: "Oberhausen (Allemagne)", lat: 51.4790702, lon: 6.8492863, categorie: "Culte", type: "Nouvelle construction", master: true },
  { nom: "St. Bonifatius", architecte: "Ernst von Rudloff", lieu: "Gelsenkirchen (Allemagne)", lat: 51.5555914, lon: 7.0960222, categorie: "Culte", type: "Nouvelle construction", master: true, photo: "assets/img/eglises/stbonifatius.jpg" },
  { nom: "Heilig Kreuz (Kulturkirche)", architecte: "Rudolf Schwarz", lieu: "Bottrop (Allemagne)", lat: 51.5251453, lon: 6.9311929, categorie: "Culte", type: "Nouvelle construction", master: true, photo: "assets/img/eglises/heiligkreuz.jpg" },
  { nom: "St. Andreas", architecte: "Rudolf Schwarz", lieu: "Essen-Rüttenscheid (Allemagne)", lat: 51.4374982, lon: 7.01222, categorie: "Culte", type: "Nouvelle construction", master: true },
  { nom: "St. Martin", architecte: "Nikolaus Rosiny", lieu: "Bochum-Steinkuhl (Allemagne)", lat: 51.4568603, lon: 7.2502336, categorie: "Culte", type: "Nouvelle construction", master: true },
  { nom: "Christ-König (Steinring 34)", architecte: "Franz Schneider", lieu: "Bochum-Innenstadt (Allemagne)", lat: 51.4748876, lon: 7.231101, categorie: "Culte", type: "Nouvelle construction", master: true },
];
