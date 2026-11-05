// Paper and building textures for the map, drawn once on a canvas at load.
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
    ctx.fillStyle = '#f4f0e6';
    ctx.fillRect(0, 0, PAPER, PAPER);
    // only the tooth: strokes or stains would repeat visibly
    grain(ctx, PAPER, rand, 15);
  }) },
  // photocopied poché: near-black, grainy, faint vertical formwork
  building: { pixelRatio: 1, make: () => texture(TILE, 53, (ctx, rand) => {
    ctx.fillStyle = '#34312f';
    ctx.fillRect(0, 0, TILE, TILE);
    strokes(ctx, TILE, rand, { count: 150, angle: 1.57, wobble: 0.03, length: [20, 90], width: [0.5, 1.2], alpha: [0.2, 0.5], color: '#141211' });
    grain(ctx, TILE, rand, 34);
  }) },
};

export function addPencilTextures(map){
  Object.entries(TEXTURES).forEach(([name, { pixelRatio, make }]) => {
    const id = `pencil-${name}`;
    if (!map.hasImage(id)) map.addImage(id, make(), { pixelRatio });
  });
}
