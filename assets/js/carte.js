// each entry: { nom, architecte, lieu, lat, lon, url, glb, categorie, type,
// master } — read by map.js to place markers and, on click, spin up a
// live 3D preview (glb is the same relative-from-root path used as
// data-glb on the index table). categorie/type mirror the index
// table's own "Catégorie d'ouvrage" / "Type de mandat" columns so the
// map's filters can match exactly what the index filters on (see
// filter-sync.js). master:true marks the "Nouvelles églises" master's
// thesis selection — a separate category from Archivir's own projects,
// toggled independently via the église icon (see map.js/index.html).
window.PROJECTS = [
  { nom: "Monument de la Résistance", architecte: "Aldo Rossi", lieu: "Coni (Italie)", lat: 44.384005, lon: 7.549698, url: "projets/viewer.html?p=pavillon", glb: "projets/pavillon cueno_aldo rossi/pavillon.glb", categorie: "Mémoriel", type: "Concours" },
  { nom: "Tupi", architecte: "mijong architecture", lieu: "Sion (VS)", lat: 46.232209, lon: 7.386007, url: "projets/viewer.html?p=tupi", glb: "projets/tupi/tupi.glb", categorie: "Santé", type: "Concours" },
  { nom: "Haus am See", architecte: "Jan Kinsbergen", lieu: "Wollerau (SZ)", lat: 47.1988262, lon: 8.7182138, url: "projets/viewer.html?p=haus", glb: "projets/haus am see/has.glb", categorie: "Habitation", type: "Nouvelle construction" },
  { nom: "Oberaletschhütte", architecte: "mijong architecture design", lieu: "Belalp (VS)", lat: 46.42493694470926, lon: 7.973840971676474, url: "projets/viewer.html?p=oberaletsch", glb: "projets/concours/oberaletsch/base.glb", categorie: "Refuge de montagne", type: "Concours" },
  // no glb yet — the popup falls back to a plain "à venir" placeholder
  // in the 3D bubble instead of trying to load a model (see map.js).
  // "Nouvelles églises" studio selection (Atelier Menzel & Esquivié,
  // JMA - HEIA Fribourg SA 2026), Ruhr valley reconversion candidates
  { nom: "St. Paulus", architecte: "Alfons et Florian Leitl", lieu: "Bochum (Allemagne)", lat: 51.4577264, lon: 7.2717421, url: "projets/viewer.html?p=stpaulus", categorie: "Culte", type: "Nouvelle construction" , master: true },
  { nom: "Hl. Familie (Heimkehrer Dankeskirche)", architecte: "Kurt Hubert Vieth", lieu: "Bochum-Weitmar-Mark (Allemagne)", lat: 51.4417371, lon: 7.2107848, url: "projets/viewer.html?p=hlfamilie", categorie: "Culte", type: "Nouvelle construction" , master: true },
  { nom: "St. Johannes (WAT-Leithe)", architecte: "Josef Franke", lieu: "Bochum-Leithe (Allemagne)", lat: 51.4798968, lon: 7.1105441, url: "projets/viewer.html?p=stjohannes", categorie: "Culte", type: "Nouvelle construction" , master: true },
  { nom: "Heilig Geist", architecte: "Karl Hellrung", lieu: "Bochum-Harpen (Allemagne)", lat: 51.4997566, lon: 7.2729947, url: "projets/viewer.html?p=heiliggeistharpen", categorie: "Culte", type: "Nouvelle construction" , master: true },
  { nom: "St. Albertus Magnus", architecte: "Gottfried Böhm", lieu: "Bochum-Wiemelhausen (Allemagne)", lat: 51.458577, lon: 7.2249947, url: "projets/viewer.html?p=albertusmagnus", categorie: "Culte", type: "Nouvelle construction" , master: true },
  { nom: "St. Antonius", architecte: "Rudolf Schwarz", lieu: "Essen-Frohnhausen (Allemagne)", lat: 51.4476571, lon: 6.9731342, url: "projets/viewer.html?p=stantonius", categorie: "Culte", type: "Nouvelle construction" , master: true },
  { nom: "Heilig Geist", architecte: "Emil Steffann", lieu: "Mülheim an der Ruhr (Allemagne)", lat: 51.4171671, lon: 6.9042691, url: "projets/viewer.html?p=heiliggeistmuelheim", categorie: "Culte", type: "Nouvelle construction" , master: true },
  { nom: "St. Franziskus", architecte: "Ernst A. Burghartz", lieu: "Bottrop-Welheim (Allemagne)", lat: 51.5265128, lon: 6.9837384, url: "projets/viewer.html?p=stfranziskus", categorie: "Culte", type: "Nouvelle construction" , master: true },
  { nom: "Heilige Familie (Tafel-Kirche)", architecte: "Rudolf Schwarz et Josef Bernard", lieu: "Oberhausen (Allemagne)", lat: 51.4790702, lon: 6.8492863, url: "projets/viewer.html?p=heiligefamilie", categorie: "Culte", type: "Nouvelle construction" , master: true },
  { nom: "St. Bonifatius", architecte: "Ernst von Rudloff", lieu: "Gelsenkirchen (Allemagne)", lat: 51.5555914, lon: 7.0960222, url: "projets/viewer.html?p=stbonifatius", categorie: "Culte", type: "Nouvelle construction" , master: true },
  { nom: "Heilig Kreuz (Kulturkirche)", architecte: "Rudolf Schwarz", lieu: "Bottrop (Allemagne)", lat: 51.5251453, lon: 6.9311929, url: "projets/viewer.html?p=heiligkreuz", categorie: "Culte", type: "Nouvelle construction" , master: true },
  { nom: "St. Andreas", architecte: "Rudolf Schwarz", lieu: "Essen-Rüttenscheid (Allemagne)", lat: 51.4374982, lon: 7.01222, url: "projets/viewer.html?p=standreas", categorie: "Culte", type: "Nouvelle construction" , master: true },
  { nom: "St. Martin", architecte: "Nikolaus Rosiny", lieu: "Bochum-Steinkuhl (Allemagne)", lat: 51.4568603, lon: 7.2502336, url: "projets/viewer.html?p=stmartin", categorie: "Culte", type: "Nouvelle construction" , master: true },
  { nom: "Christ-König (Steinring 34)", architecte: "Franz Schneider", lieu: "Bochum-Innenstadt (Allemagne)", lat: 51.4748876, lon: 7.231101, url: "projets/viewer.html?p=christkoenig", categorie: "Culte", type: "Nouvelle construction" , master: true },
];
