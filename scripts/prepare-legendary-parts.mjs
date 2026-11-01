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
];
function inside([x, y], polygon) {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i], [xj, yj] = polygon[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}
const runtimeName = (species, frame) => frame === 'sprite' ? `${species}-v1` : `${species}-${frame}`;
const report = {};
for (const {species, part, pivot, frames, polygon, keep} of PARTS) {
  const runtime = decode(readFileSync(`public/assets/rabbits/${species}/${species}-v1.png`)), master = decode(readFileSync(`assets-source/rabbits/${species}/sprite.png`));
  const scale = runtime.width / master.width;
  for (const frame of frames) {
    const source = decode(readFileSync(`assets-source/rabbits/${species}/${frame}.png`)), body = Buffer.from(source.rgba), piece = Buffer.alloc(source.rgba.length);
    for (let y = 0; y < source.height; y++) for (let x = 0; x < source.width; x++) if (inside([x + .5, y + .5], polygon)) {
      const i = (y * source.width + x) * 4; source.rgba.copy(piece, i, i, i + 4); if (!keep || !inside([x + .5, y + .5], keep)) body.fill(0, i, i + 4);
    }
    const size = [Math.round(source.width * scale), Math.round(source.height * scale)];
    const write = (pixels, name) => {
      const small = resizeRegion({width: source.width, height: source.height, pixels}, source.width, source.height, ...size);
      writeFileSync(`public/assets/rabbits/${species}/${name}.png`, encode({width: small.width, height: small.height, rgba: small.pixels}));
    };
    write(body, `${runtimeName(species, frame)}-body`);
    if (frame === 'sprite') write(piece, `${species}-${part}`);
  }
  report[species] = {part, pivot: pivot.map(v => +(v * scale).toFixed(1)), scale: +scale.toFixed(4)};
}
console.log(JSON.stringify(report));
