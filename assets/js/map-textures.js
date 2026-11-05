// Pencil-on-paper textures for the map, drawn once on a canvas at load.
// Seeded, so the map looks the same on every visit, and seamless, so
// MapLibre can repeat them as fill patterns: every stroke that crosses
// an edge is drawn again on the opposite side.

function seeded(seed){
  let a = seed;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function strokes(ctx, size, rand, o){
  const between = (range) => range[0] + rand() * (range[1] - range[0]);
  ctx.lineCap = 'round';
  for (let i = 0; i < o.count; i++){
    const x = rand() * size;
    const y = rand() * size;
    const angle = o.angle + (rand() - 0.5) * o.wobble;
    const half = between(o.length) / 2;
    const dx = Math.cos(angle) * half;
    const dy = Math.sin(angle) * half;
    const bow = (rand() - 0.5) * half * 0.08;
    ctx.strokeStyle = o.color;
    ctx.globalAlpha = between(o.alpha);
    ctx.lineWidth = between(o.width);
    for (const ox of [-size, 0, size]){
      for (const oy of [-size, 0, size]){
        const left = x + ox - Math.abs(dx);
        const top = y + oy - Math.abs(dy);
        if (left > size || top > size || left + 2 * Math.abs(dx) < 0 || top + 2 * Math.abs(dy) < 0) continue;
        ctx.beginPath();
        ctx.moveTo(x + ox - dx, y + oy - dy);
        ctx.quadraticCurveTo(x + ox - dy / half * bow, y + oy + dx / half * bow, x + ox + dx, y + oy + dy);
        ctx.stroke();
      }
    }
  }
  ctx.globalAlpha = 1;
}

// per-pixel tooth of the paper: only touches pixels that have some ink
function grain(ctx, size, rand, amount){
  const image = ctx.getImageData(0, 0, size, size);
  const d = image.data;
  for (let i = 0; i < d.length; i += 4){
    if (!d[i + 3]) continue;
    const n = (rand() - 0.5) * amount;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(image, 0, 0);
}

// isolated pale dots, like toner that didn't take on a photocopy
function speckle(ctx, size, rand, density, color){
  ctx.fillStyle = color;
  for (let i = 0; i < size * size * density; i++){
    ctx.globalAlpha = 0.25 + rand() * 0.55;
    ctx.fillRect(Math.floor(rand() * size), Math.floor(rand() * size), 1, 1);
  }
  ctx.globalAlpha = 1;
}

function texture(size, seed, draw){
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  draw(ctx, seeded(seed));
  return ctx.getImageData(0, 0, size, size);
}

// MapLibre copies every pattern a tile uses into that tile's own image
// atlas, so large patterns multiply GPU memory by the number of tiles.
// Tile patterns stay at 256 px. Only the paper, which fills the background
// layer and isn't in any tile atlas, can afford more pixels.
const TILE = 256;
const PAPER = 512;

const TEXTURES = {
  paper: { pixelRatio: 2, make: () => texture(PAPER, 11, (ctx, rand) => {
    ctx.fillStyle = '#f4f0e6';
    ctx.fillRect(0, 0, PAPER, PAPER);
    // fibres, then the tooth; no large stains, they repeat visibly
    strokes(ctx, PAPER, rand, { count: 380, angle: 0, wobble: 6.3, length: [6, 30], width: [0.5, 1], alpha: [0.03, 0.09], color: '#8a7a5f' });
    grain(ctx, PAPER, rand, 15);
  }) },
  water: { pixelRatio: 1, make: () => texture(TILE, 23, (ctx, rand) => {
    ctx.fillStyle = '#b4d6dc';
    ctx.fillRect(0, 0, TILE, TILE);
    strokes(ctx, TILE, rand, { count: 200, angle: -0.1, wobble: 0.05, length: [40, 130], width: [0.5, 1], alpha: [0.05, 0.15], color: '#2f8496' });
    strokes(ctx, TILE, rand, { count: 50, angle: -0.1, wobble: 0.05, length: [30, 100], width: [0.5, 1], alpha: [0.08, 0.2], color: '#f2fbf8' });
    grain(ctx, TILE, rand, 8);
  }) },
  park: { pixelRatio: 1, make: () => texture(TILE, 37, (ctx, rand) => {
    ctx.fillStyle = 'rgba(178, 202, 102, 0.3)';
    ctx.fillRect(0, 0, TILE, TILE);
    strokes(ctx, TILE, rand, { count: 420, angle: -1.05, wobble: 0.35, length: [8, 26], width: [0.5, 1], alpha: [0.08, 0.26], color: '#6f9a2c' });
  }) },
  // opaque, because OSM stacks forest polygons on top of each other: a
  // see-through fill would show every overlap as a darker hard-edged shape
  wood: { pixelRatio: 1, make: () => texture(TILE, 41, (ctx, rand) => {
    ctx.fillStyle = '#d6e0a8';
    ctx.fillRect(0, 0, TILE, TILE);
    strokes(ctx, TILE, rand, { count: 620, angle: -1.05, wobble: 0.45, length: [6, 22], width: [0.5, 1.1], alpha: [0.08, 0.26], color: '#5f8a26' });
    grain(ctx, TILE, rand, 10);
  }) },
  // photocopied poché: near-black, faint vertical formwork, pale specks
  building: { pixelRatio: 1, make: () => texture(TILE, 53, (ctx, rand) => {
    ctx.fillStyle = '#34312f';
    ctx.fillRect(0, 0, TILE, TILE);
    strokes(ctx, TILE, rand, { count: 150, angle: 1.57, wobble: 0.03, length: [20, 90], width: [0.5, 1.2], alpha: [0.2, 0.5], color: '#141211' });
    strokes(ctx, TILE, rand, { count: 70, angle: 1.57, wobble: 0.03, length: [10, 50], width: [0.4, 0.8], alpha: [0.06, 0.16], color: '#d8d4cc' });
    grain(ctx, TILE, rand, 34);
    speckle(ctx, TILE, rand, 0.012, '#c9c5bd');
  }) },
};

export function addPencilTextures(map){
  Object.entries(TEXTURES).forEach(([name, { pixelRatio, make }]) => {
    const id = `pencil-${name}`;
    if (!map.hasImage(id)) map.addImage(id, make(), { pixelRatio });
  });
}
