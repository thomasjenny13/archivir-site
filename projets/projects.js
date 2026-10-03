// Données des ouvrages — source unique pour le viewer (projets/viewer.html)
// et pour build.mjs, qui génère les pages /ouvrages/<slug>/ et le sitemap.
// Après toute modification : lancer `node build.mjs` à la racine du site.
//
// Champs optionnels pour le référencement :
//   text: '…'              quelques phrases sur l'ouvrage, affichées sous le crédit
//                          et reprises comme description pour Google
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
    // the site model's terrain block — outline only, see terrainOutlinePositions
    terrainMeshes: ['Geometry214'],
    // slab buried flush with the terrain — its outline drew a stray line
    // across the ground between the hut and the path; surface kept
    edgelessMeshes: ['Geometry213'],
    // the two small annexes (walls + inset roof) and the path's low wall
    // shown as solid blocks
    blockGroups: [
      ['Geometry225', 'Geometry226', 'Geometry232', 'Geometry233', 'Geometry231'],
      ['Geometry227', 'Geometry228', 'Geometry229', 'Geometry230', 'Geometry215'],
      // the path's low wall, one block per straight piece (a single
      // envelope would fill the bend with a wedge)
      ['Geometry211', 'Geometry204'], // long wall + its in-line left head
      ['Geometry209', 'Geometry210', 'Geometry239'],
      ['Geometry238'],
    ],
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
      prix1: { label: '1er prix', creditHtml: '<strong>Aile d’Épervier</strong>GayMenzel Sàrl · Monthey' },
      prix2: { glb: 'concours/oberaletsch/mijong.glb', label: '2e prix', creditHtml: '<strong>LUA</strong>mijong architecture design · Sion' },
      prix3: { label: '3e prix', creditHtml: '<strong>Tandem</strong>Studio V9 · Bienne' },
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
};
