// Génère une page par ouvrage (/ouvrages/<slug>/index.html), plus sitemap.xml
// et robots.txt, à partir de projets/projects.js et du gabarit projets/viewer.html.
//
// Usage, à la racine du site :   node build.mjs
// À relancer après chaque modification du viewer ou de projects.js, avant de pousser.
// Le dossier ouvrages/ est entièrement régénéré : ne pas l'éditer à la main.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SITE = 'https://archivir.ch';
const DEFAULT_OG = '/assets/img/logo.jpg';

const src = fs.readFileSync(path.join(ROOT, 'projets/projects.js'), 'utf8');
const { PROJECTS } = await import('data:text/javascript;charset=utf-8,' + encodeURIComponent(src));
const template = fs.readFileSync(path.join(ROOT, 'projets/viewer.html'), 'utf8');

const strip = (h) => h.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const attr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fileUrl = (rel) => SITE + '/projets/' + rel.split('/').map(encodeURIComponent).join('/');

function replaceOnce(s, search, replacement, label) {
  const found = typeof search === 'string' ? s.includes(search) : search.test(s);
  if (!found) throw new Error(`gabarit viewer.html : « ${label} » introuvable`);
  return s.replace(search, () => replacement);
}

function describe(cfg) {
  const name = cfg.title.split(' — ')[0];
  const author = strip(cfg.creditHtml.replace(/<strong>[\s\S]*?<\/strong>/, ''));
  const meta = cfg.creditMeta ? strip(cfg.creditMeta) : '';
  let description = cfg.text
    ? `${name}${author ? ' — ' + author : ''}. ${strip(cfg.text)}`
    : `${name}${author ? ' — ' + author : ''}${meta ? ' (' + meta + ')' : ''}. Maquette 3D interactive à explorer sur Archivir.`;
  if (description.length > 300) description = description.slice(0, 297).replace(/\s+\S*$/, '') + '…';
  return { name, description };
}

function page(slug, cfg) {
  const url = `${SITE}/ouvrages/${slug}/`;
  const { name, description } = describe(cfg);
  const image = cfg.og ? fileUrl(cfg.og) : SITE + DEFAULT_OG;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': '3DModel',
    name,
    description,
    url,
    image,
    isPartOf: { '@type': 'WebSite', name: 'Archivir', url: SITE + '/' },
    ...(cfg.glb ? { encoding: { '@type': 'MediaObject', contentUrl: fileUrl(cfg.glb), encodingFormat: 'model/gltf-binary' } } : {}),
  };
  const head = [
    `<meta name="description" content="${attr(description)}">`,
    // les chemins relatifs du gabarit (modèles, CSS, plans) partent de projets/
    '<base href="/projets/">',
    `<link rel="canonical" href="${url}">`,
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="Archivir">',
    '<meta property="og:locale" content="fr_CH">',
    `<meta property="og:title" content="${attr(cfg.title)}">`,
    `<meta property="og:description" content="${attr(description)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${image}">`,
    '<meta name="twitter:card" content="summary_large_image">',
    `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`,
  ].join('\n');
  const credit = cfg.creditHtml
    + (cfg.creditMeta ? '<br><span class="credit-meta">' + cfg.creditMeta + '</span>' : '')
    + (cfg.text ? '<span class="credit-text">' + cfg.text + '</span>' : '');

  let html = template;
  html = replaceOnce(html, '<!doctype html>', '<!doctype html>\n<!-- Page générée par build.mjs depuis projets/viewer.html et projets/projects.js — ne pas éditer à la main -->', 'doctype');
  html = replaceOnce(html, /<title>[\s\S]*?<\/title>/, `<title>${attr(cfg.title)}</title>`, '<title>');
  html = replaceOnce(html, /<meta name="description"[^>]*>/, head, 'meta description');
  html = replaceOnce(html, '<p id="viewer-credit" class="viewer-credit"></p>', `<p id="viewer-credit" class="viewer-credit">${credit}</p>`, 'viewer-credit');
  return html;
}

// ---------- pages ----------
const outDir = path.join(ROOT, 'ouvrages');
fs.rmSync(outDir, { recursive: true, force: true });
const slugs = Object.keys(PROJECTS);
const order = slugs.filter((s) => PROJECTS[s].glb);
for (const slug of slugs) {
  fs.mkdirSync(path.join(outDir, slug), { recursive: true });
  fs.writeFileSync(path.join(outDir, slug, 'index.html'), page(slug, PROJECTS[slug]));
}
// /ouvrages/ seul → premier ouvrage
const first = order[0] || slugs[0];
fs.writeFileSync(path.join(outDir, 'index.html'), `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>Archivir</title>
<meta name="robots" content="noindex">
<link rel="canonical" href="${SITE}/ouvrages/${first}/">
<meta http-equiv="refresh" content="0; url=/ouvrages/${first}/">
</head><body><a href="/ouvrages/${first}/">Voir les ouvrages</a></body></html>
`);

// ---------- sitemap.xml + robots.txt ----------
const today = new Date().toISOString().slice(0, 10);
const urls = ['/', '/carte.html', ...slugs.map((s) => `/ouvrages/${s}/`)];
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'),
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls.map((u) => `  <url><loc>${SITE}${u}</loc><lastmod>${today}</lastmod></url>`).join('\n') +
  '\n</urlset>\n');
fs.writeFileSync(path.join(ROOT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);

console.log(`${slugs.length} pages générées dans ouvrages/ (+ sitemap.xml, robots.txt)`);
