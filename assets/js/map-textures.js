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
    ctx.fillStyle = '#e6e6e3';
    ctx.fillRect(0, 0, PAPER, PAPER);
    // fibres, then the tooth; no large stains, they repeat visibly
    strokes(ctx, PAPER, rand, { count: 380, angle: 0, wobble: 6.3, length: [6, 30], width: [0.5, 1], alpha: [0.03, 0.09], color: '#55554f' });
    grain(ctx, PAPER, rand, 15);
  }) },
  water: { pixelRatio: 1, make: () => texture(TILE, 23, (ctx, rand) => {
    ctx.fillStyle = '#ccd3e0';
    ctx.fillRect(0, 0, TILE, TILE);
    strokes(ctx, TILE, rand, { count: 200, angle: -0.1, wobble: 0.05, length: [40, 130], width: [0.5, 1], alpha: [0.04, 0.13], color: '#5f76a8' });
    strokes(ctx, TILE, rand, { count: 50, angle: -0.1, wobble: 0.05, length: [30, 100], width: [0.5, 1], alpha: [0.08, 0.2], color: '#eef0f5' });
    grain(ctx, TILE, rand, 8);
  }) },
  park: { pixelRatio: 1, make: () => texture(TILE, 37, (ctx, rand) => {
    ctx.fillStyle = 'rgba(150, 190, 145, 0.2)';
    ctx.fillRect(0, 0, TILE, TILE);
    strokes(ctx, TILE, rand, { count: 420, angle: -1.05, wobble: 0.35, length: [8, 26], width: [0.5, 1], alpha: [0.06, 0.22], color: '#4f8a55' });
  }) },
  // opaque, because OSM stacks forest polygons on top of each other: a
  // see-through fill would show every overlap as a darker hard-edged shape
  wood: { pixelRatio: 1, make: () => texture(TILE, 41, (ctx, rand) => {
    ctx.fillStyle = '#d3dad0';
    ctx.fillRect(0, 0, TILE, TILE);
    strokes(ctx, TILE, rand, { count: 620, angle: -1.05, wobble: 0.45, length: [6, 22], width: [0.5, 1.1], alpha: [0.06, 0.24], color: '#3f7448' });
    grain(ctx, TILE, rand, 10);
  }) },
  building: { pixelRatio: 1, make: () => texture(TILE, 53, (ctx, rand) => {
    ctx.fillStyle = '#6a6a67';
    ctx.fillRect(0, 0, TILE, TILE);
    strokes(ctx, TILE, rand, { count: 250, angle: 0.8, wobble: 0.2, length: [8, 34], width: [0.5, 1.1], alpha: [0.2, 0.6], color: '#1e1e1d' });
    strokes(ctx, TILE, rand, { count: 170, angle: 0.8, wobble: 0.3, length: [5, 24], width: [0.4, 1], alpha: [0.15, 0.4], color: '#d6d6d2' });
    grain(ctx, TILE, rand, 24);
  }) },
};

export function addPencilTextures(map){
  Object.entries(TEXTURES).forEach(([name, { pixelRatio, make }]) => {
    const id = `pencil-${name}`;
    if (!map.hasImage(id)) map.addImage(id, make(), { pixelRatio });
  });
}
