// Données des ouvrages — source unique pour le viewer (projets/viewer.html)
// et pour build.mjs, qui génère les pages /ouvrages/<slug>/ et le sitemap.
// Après toute modification : lancer `node build.mjs` à la racine du site.
//
// Champs optionnels pour le référencement :
//   text: '…'              quelques phrases sur l'ouvrage, affichées sous le crédit
//                          et reprises comme description pour Google
//   section: { cap, only, hide }  vue en coupe sur mesure : cap = section plate du .glb
//                          (hors scène) servant de remplissage, only = maillages hors
//                          scène affichés en coupe, hide = maillages masqués en coupe
//   simulation: 'x/y.js?v=N'  module d'animation (chemin depuis projets/), ajoute son
//                          bouton ; augmenter v à chaque modification du module
//   og: 'tupi/apercu.jpg'  image d'aperçu des partages (chemin depuis projets/),
//                          idéalement 1200×630 ; à défaut, le logo est utilisé
export const PROJECTS = {
  pavillon: {
    glb: 'pavillon cueno_aldo rossi/pavillon.glb',
    title: 'Monument de la Résistance — Archivir',
    creditHtml: '<strong>Monument de la Résistance</strong>Aldo Rossi',
    creditMeta: '1962 · Coni · Mémoriel · Concours',
    hasPlans: true,
  },
  tupi: {
    glb: 'tupi/tupi.glb',
    title: 'Tupi — Archivir',
    creditHtml: '<a class="credit-link" href="https://www.mijong.ch/projects/tupi-sion/" target="_blank" rel="noopener noreferrer"><strong>Tupi</strong></a><a class="credit-author" href="https://www.mijong.ch/" target="_blank" rel="noopener noreferrer">mijong architecture design</a>',
    creditMeta: '2019 · Sion (VS) · Santé · <a class="credit-author" href="tupi/Campus PÔLE SANTE - Rapport du jury - Sion (2019).pdf" target="_blank" rel="noopener noreferrer">Concours</a>',
    hasPlans: false,
  },
  haus: {
    glb: 'jan kinsbergen/haus am see/has.glb',
    title: 'Haus am See — Archivir',
    creditHtml: '<strong>Haus am See</strong><a class="credit-author" href="https://jankinsbergen.ch/" target="_blank" rel="noopener noreferrer">Jan Kinsbergen</a>',
    creditMeta: '2017 · Wollerau (SZ)',
    hasPlans: true,
  },
  oberaletsch: {
    glb: 'concours/oberaletsch/base.glb',
    // the site model's terrain, as a single ground sheet (no block sides) —
    // outline only, see terrainOutlinePositions
    terrainMeshes: ['Geometry214'],
    // the existing hut itself is reduced to a simple gabled volume (Geometry243,
    // like the prize volumes), cut by the terrain: flat base at −2.56 under the
    // lower floor (south of y −2.4), resting on the ground north of it —
    // its walls, floors, beams and openings are gone;
    // annexes, low walls, terrace and trough around it are kept
    // slab buried flush with the terrain — its outline drew a stray line
    // across the ground between the hut and the path; surface kept
    edgelessMeshes: ['Geometry213'],
    // only the hut and the prize volumes are filled when cut; everything
    // else around them reads as a sheet, like the terrain — outline only
    noCapMeshes: ['Geometry213', 'maisonnette_nord', 'maisonnette_sud_est', 'muret_sud_ouest', 'muret_sud', 'muret_sud_est', 'muret_est', 'baignoire_bloc', 'annexe_ouest_1', 'annexe_ouest_2', 'annexe_ouest_3', 'mur_courbe_1', 'mur_courbe_2', 'mur_courbe_3', 'mur_courbe_4'],
    // annexes, low walls, curved walls and trough are baked into base.glb as
    // simple blocks whose base follows the terrain (cut at the ground); the
    // terrain sheet is cut away under the hut and under every block
    title: 'Oberaletschhütte — Archivir',
    creditHtml: '<strong>Oberaletschhütte</strong>Transformation et extension — SAC section Chasseral',
    creditMeta: '2024 · Belalp (VS) · Refuge de montagne · Concours',
    hasPlans: false,
    // building runs the other way vs. the other projects — cut left/right
    // instead of the default front/back, so the section actually crosses it
    clipNormal: [-1, 0, 0],
    // mirrored on X to match clipNormal above — otherwise the default
    // view faces the kept half's *outside*, with the cut cap hidden
    // around the back
    viewDir: [1.5, 1.3, 0.55],
    // one competition, several submitted volumetries added onto the
    // same existing-hut base model — switched via the prize picker
    // rather than the project carousel. "glb" above doubles as the
    // "base" variant so the two never load twice.
    variants: {
      base:  { glb: 'concours/oberaletsch/base.glb', label: 'Existant' },
      // GayMenzel démolit les deux maisonnettes (nord et sud-est) : retirées du modèle de base pour cette variante
      prix1: { glb: 'concours/oberaletsch/gaymenzel.glb', excludeMeshes: ['maisonnette_nord', 'maisonnette_sud_est'], label: '1er prix', creditHtml: '<strong>Aile d’Épervier</strong>GayMenzel Sàrl · Monthey' },
      prix2: { glb: 'concours/oberaletsch/mijong.glb', label: '2e prix', creditHtml: '<strong>LUA</strong>mijong architecture design · Sion' },
      // Tandem remplace l'annexe ouest : ses murs contre le pignon sont retirés
      prix3: { glb: 'concours/oberaletsch/studiov9.glb', excludeMeshes: ['annexe_ouest_1', 'annexe_ouest_2', 'annexe_ouest_3'], label: '3e prix', creditHtml: '<strong>Tandem</strong>Studio V9 · Bienne' },
    },
    variantOrder: ['base', 'prix1', 'prix2', 'prix3'],
  },
  casernebernex: {
    glb: 'concours/caserne bernex/blend.glb',
    title: 'Caserne de Bernex — Archivir',
    creditHtml: '<strong>Caserne de Bernex</strong><a class="credit-author" href="https://www.bunq.ch/" target="_blank" rel="noopener noreferrer">bunq</a>',
    creditMeta: '2011 · Bernex (GE) · Équipement public · Concours',
    hasPlans: false,
    // "Geometry7" sits ~500m away from the rest of the model in the
    // source export (a leftover object never moved to match the
    // recentered building) — including it in the bounding box was
    // wrecking the camera framing and hiding the ground shadow
    excludeMeshes: ['Geometry7'],
    // the building's façades face the diagonals (n-o on the Route de
    // Pré-Marais, n-e on the yard, s-e, s-o on the Chemin des Suzettes):
    // true north measured from the model, compass turned 45° so each
    // button looks straight at one façade
    north: [-0.145, -0.989],
    compassDiagonal: true,
  },
  hansaallee: {
    glb: 'herzog de meuron/atelier hansaallee/atelier.glb',
    title: 'Atelier Hansaallee 94 — Archivir',
    creditHtml: '<strong>Atelier Hansaallee 94</strong><a class="credit-author" href="https://www.herzogdemeuron.com/" target="_blank" rel="noopener noreferrer">Herzog &amp; de Meuron</a>',
    creditMeta: '2015 · Düsseldorf (Allemagne) · Atelier · Nouvelle construction',
    hasPlans: false,
  },
  plywood: {
    glb: 'herzog de meuron/plywood house/plywood.glb',
    title: 'Plywood House — Archivir',
    creditHtml: '<a class="credit-link" href="https://www.herzogdemeuron.com/projects/027-plywood-house/" target="_blank" rel="noopener noreferrer"><strong>Plywood House</strong></a><a class="credit-author" href="https://www.herzogdemeuron.com/" target="_blank" rel="noopener noreferrer">Herzog &amp; de Meuron</a>',
    creditMeta: '1985 · Bottmingen (BL) · Habitation · Nouvelle construction',
    hasPlans: false,
    // cut across the house instead of along it (same setup as Oberaletsch)
    clipNormal: [-1, 0, 0],
    viewDir: [1.5, 1.3, 0.55],
  },
  umbrella: {
    glb: 'charly jolliet/umbrella pavilion/umbrella.glb',
    title: 'Umbrella Pavilion — Archivir',
    creditHtml: '<a class="credit-link" href="https://charlyjolliet.ch/projects/umbrella-pavillon/" target="_blank" rel="noopener noreferrer"><strong>Umbrella Pavilion</strong></a><a class="credit-author" href="https://charlyjolliet.ch/" target="_blank" rel="noopener noreferrer">charly jolliet architectes</a>',
    creditMeta: '2020–2022 · Fribourg (FR) · Pavillon · Nouvelle construction',
    hasPlans: false,
  },
  convent: {
    glb: 'concours/reuse the convent/convent.glb',
    // the site's toposolid — outline only, like Oberaletsch
    terrainMeshes: ['Toposolid'],
    title: 'Reuse the Convent — Archivir',
    creditHtml: '<a class="credit-link" href="https://www.reuseitaly.com/competitions/reuse-the-convent-bussi-sul-tirino/" target="_blank" rel="noopener noreferrer"><strong>Reuse the Convent</strong></a>Concours ouvert — <a class="credit-author" href="https://www.reuseitaly.com/" target="_blank" rel="noopener noreferrer">Reuse Italy</a>',
    creditMeta: '2026 · Bussi sul Tirino (Italie) · Couvent · Concours ouvert',
    text: 'Concours d’idées international pour la reconversion d’un couvent abandonné à Bussi sul Tirino, dans les Abruzzes. Maquette de l’existant fournie aux participants, non réalisé.',
    hasPlans: true,
  },
  moucheron: {
    glb: 'copponex/moucheron/moucheron.glb',
    title: 'Moucheron — Archivir',
    creditHtml: '<strong>Moucheron</strong>Henri Copponex',
    creditMeta: '1934 · Genève (GE) · Bateau · Projet',
    text: 'Monotype de 15 m² dessiné par l’ingénieur Henri Copponex, plans datés de Paris, le 27 octobre 1934. Longueur 5,30 m, largeur 1,60 m, tirant d’eau 0,90 m, déplacement 620 kg. Maquette reconstruite d’après les plans publiés : précision de 2 à 3 cm pour la coque, de 10 à 20 cm pour le gréement.',
    hasPlans: true,
    // the hull runs along X: open on the broadside, close to the horizon,
    // so the keel and the sail plan read (the default view looks down the bow).
    // The cut shows a half-hull, like a wall-mounted half model: solid hull,
    // keel and rudder, closed deck, no rig (the section comes from coupe.py).
    viewDir: [0.6, 0.18, -1],
    clipNormal: [0, 0, 1],
    section: {
      cap: 'Coupe',
      only: ['Pont_plein'],
      hide: ['Pont', 'Hiloire', 'Cockpit', 'Mat', 'Bome', 'Barre', 'Grand_voile', 'Foc', 'Greement_courant'],
    },
    simulation: 'copponex/moucheron/gite.js?v=11',
  },
};
