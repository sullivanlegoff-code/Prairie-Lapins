// Moving parts of the legendaries, cut from their approved masters without repainting (owner's requests of 31 October and 1 November 2026):
// the Lapin Dragon's wing, the Lapin Requin's fin and the Ankylosaure's club tail become separate layers, drawn behind the body, that the game can turn.
// Each body keeps every other pixel of its master; at rest, body + part give back the original picture exactly.
// Usage: node scripts/prepare-legendary-parts.mjs (after scripts/prepare-dragon-mouth.mjs)
import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {decode, encode} from './png-rgba.mjs';
import {resizeRegion} from './resize-rgba.mjs';

process.chdir(fileURLToPath(new URL('..', import.meta.url)));
/**
 * Polygons in master pixels around the part, kept off the body and the ear in front of it; `pivot` is the hidden root it turns about.
 * `keep`: pixels of the polygon that also stay in the body (the tail's root), so lifting the part never opens a hole.
 */
export const PARTS = [
  {species: 'dragon', part: 'wing', pivot: [215, 200], frames: ['sprite', 'mouth-open'],
    polygon: [[0, 230], [40, 190], [100, 165], [150, 140], [215, 135], [228, 150], [226, 190], [216, 232], [204, 255], [198, 264], [182, 269], [160, 274], [146, 284], [138, 290], [100, 296], [60, 300], [0, 300]]},
  {species: 'requin', part: 'fin', pivot: [410, 462], frames: ['sprite'],
    polygon: [[210, 262], [300, 236], [400, 236], [488, 245], [480, 288], [452, 380], [440, 455], [400, 456], [350, 476], [330, 488], [305, 400], [262, 308]]},
  {species: 'ankylosaure', part: 'tail', pivot: [240, 810], frames: ['sprite'],
    polygon: [[0, 560], [200, 560], [268, 610], [268, 720], [262, 770], [262, 880], [150, 880], [60, 860], [0, 820]], keep: [[215, 730], [268, 730], [268, 885], [215, 885]]},
  {species: 'dragon', part: 'wing', pivot: [560, 370], frames: ['evolution-sprite'], evolved: true,
    polygon: [[0, 445], [0, 0], [300, 0], [300, 110], [405, 90], [470, 112], [490, 155], [478, 220], [452, 300], [425, 390], [388, 475], [340, 530], [260, 540], [160, 520], [70, 490]]},
  {species: 'requin', part: 'fin', pivot: [330, 520], frames: ['evolution-sprite'], evolved: true,
    polygon: [[200, 360], [250, 337], [318, 316], [395, 310], [470, 322], [525, 350], [500, 382], [452, 413], [400, 448], [350, 482], [318, 515], [300, 470], [260, 420]]},
  {species: 'ankylosaure', part: 'tail', pivot: [283, 735], frames: ['evolution-sprite'], evolved: true,
    polygon: [[0, 380], [115, 382], [206, 425], [280, 500], [298, 575], [270, 650], [236, 730], [188, 800], [124, 850], [42, 850], [0, 825]], keep: [[100, 705], [151, 705], [151, 825], [100, 825]]},
];
function inside([x, y], polygon) {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i], [xj, yj] = polygon[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}
const runtimeName = (species, frame, evolved) => evolved ? `${species}-v2` : frame === 'sprite' ? `${species}-v1` : `${species}-${frame}`;
const report = {};
for (const {species, part, pivot, frames, polygon, keep, evolved} of PARTS) {
  const runtime = decode(readFileSync(`public/assets/rabbits/${species}/${species}-${evolved ? 'v2' : 'v1'}.png`)), master = decode(readFileSync(`assets-source/rabbits/${species}/${evolved ? `${species}-evolution-sprite` : 'sprite'}.png`));
  const scale = runtime.width / master.width;
  for (const frame of frames) {
    const source = evolved ? runtime : decode(readFileSync(`assets-source/rabbits/${species}/${frame}.png`)), body = Buffer.from(source.rgba), piece = Buffer.alloc(source.rgba.length);
    for (let y = 0; y < source.height; y++) for (let x = 0; x < source.width; x++) {
      const point = evolved ? [(x + .5) / scale, (y + .5) / scale] : [x + .5, y + .5];
      if (!inside(point, polygon)) continue;
      const i = (y * source.width + x) * 4; source.rgba.copy(piece, i, i, i + 4); if (!keep || !inside(point, keep)) body.fill(0, i, i + 4);
    }
    // Any detached contour fragments inside the part outline move with the part.
    if (evolved) {
      const seen = new Uint8Array(source.width * source.height), queue = new Int32Array(source.width * source.height);
      const components = [];
      for (let start = 0; start < seen.length; start++) {
        if (seen[start]) continue;
        const si = start * 4;
        if (body[si + 3] <= 24) { seen[start] = 1; continue; }
        let head = 0, tail = 0; queue[tail++] = start; seen[start] = 1;
        const component = []; let touchesPart = false;
        while (head < tail) {
          const at = queue[head++], x = at % source.width, y = Math.floor(at / source.width), i = at * 4;
          component.push(at);
          for (let dy = -4; dy <= 4 && !touchesPart; dy++) for (let dx = -4; dx <= 4; dx++) {
            if (inside([(x + dx + .5) / scale, (y + dy + .5) / scale], polygon)) { touchesPart = true; break; }
          }
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, ny = y + dy; if ((dx === 0 && dy === 0) || nx < 0 || ny < 0 || nx >= source.width || ny >= source.height) continue;
            const next = ny * source.width + nx, ni = next * 4;
            if (!seen[next] && body[ni + 3] > 24) { seen[next] = 1; queue[tail++] = next; }
          }
        }
        components.push({component, touchesPart});
      }
      const main = components.reduce((best, current) => current.component.length > best.component.length ? current : best, {component: []}).component;
      const mainSet = new Set(main);
      for (const {component, touchesPart} of components) {
        if (!mainSet.has(component[0]) && touchesPart) for (const at of component) {
          const i = at * 4;
          source.rgba.copy(piece, i, i, i + 4); body.fill(0, i, i + 4);
        }
      }
    }
    const size = [Math.round(source.width * scale), Math.round(source.height * scale)];
    const write = (pixels, name) => {
      const small = evolved ? {width: source.width, height: source.height, pixels} : resizeRegion({width: source.width, height: source.height, pixels}, source.width, source.height, ...size);
      writeFileSync(`public/assets/rabbits/${species}/${name}.png`, encode({width: small.width, height: small.height, rgba: small.pixels}));
    };
    write(body, `${runtimeName(species, frame, evolved)}-body`);
    if (evolved) write(piece, `${runtimeName(species, frame, evolved)}-${part}`);
    else if (frame === 'sprite') write(piece, `${species}-${part}`);
  }
  report[species] = {part, pivot: pivot.map(v => +(v * scale).toFixed(1)), scale: +scale.toFixed(4)};
}
// The opened dragon body is the resting body with only changed snout pixels,
// and excludes the separately animated wing just like its resting counterpart.
{
  const path = 'public/assets/rabbits/dragon/dragon-v2',
    original = decode(readFileSync(`${path}.png`)), body = decode(readFileSync(`${path}-body.png`)),
    opened = decode(readFileSync(`${path}-mouth-open-body.png`)), wing = PARTS.find(p => p.species === 'dragon' && p.evolved).polygon;
    const master = decode(readFileSync('assets-source/rabbits/dragon/dragon-evolution-sprite.png')),
      mouthMaster = decode(readFileSync('assets-source/rabbits/dragon/mouth-open-evolution.png')),
      scale = original.width / master.width;
  for (let y = 0; y < original.height; y++) for (let x = 0; x < original.width; x++) {
    const i = (y * original.width + x) * 4, point = [(x + .5) / scale, (y + .5) / scale];
    if (inside(point, wing)) { opened.rgba.fill(0, i, i + 4); continue; }
    const mx = Math.min(master.width - 1, Math.floor((x + .5) / scale)), my = Math.min(master.height - 1, Math.floor((y + .5) / scale)), mi = (my * master.width + mx) * 4;
    const edited = mouthMaster.rgba[mi + 3] !== master.rgba[mi + 3] || mouthMaster.rgba[mi] !== master.rgba[mi] || mouthMaster.rgba[mi + 1] !== master.rgba[mi + 1] || mouthMaster.rgba[mi + 2] !== master.rgba[mi + 2];
    if (!edited) body.rgba.copy(opened.rgba, i, i, i + 4);
  }
  writeFileSync(`${path}-mouth-open-body.png`, encode(opened));
}
console.log(JSON.stringify(report));
