// Derives the loading copies of the approved habitat illustrations: each 1254 × 1254 source is cropped to its visible
// part (transparent margins only, plus a few pixels of air) and reduced to exactly half size. Nothing is redrawn, recoloured or
// stretched: a crop, then an exact 2 × 2 area average on alpha-premultiplied colour, in integer arithmetic (identical on every
// machine, no dark fringe from transparent neighbours). Built-in Node modules only.
//
//   node scripts/derive-habitat-art.mjs             write every registered derivative in public/assets/habitats/
//   node scripts/derive-habitat-art.mjs --check     re-derive and compare the decoded pixels with the committed files
//   node scripts/derive-habitat-art.mjs --measure   print the visible bounds of every source (alpha > 8)
//
// The approved sources are committed in assets-source/habitats/level1/, level2/ and level3/ (never shipped); byte-identical copies of
// the originals generated in output/imagegen/habitats-level*-v1/, which stay untouched and untracked. Their blob SHA-1 must match
// before anything is derived, and a missing source or derived file is an error in every mode. `--sources=<dir>` and `--target=<dir>`
// point the script at another source root (containing the registered level folders) and target folder. The crops below are the single source of the numbers in src/config/habitatArt.ts.
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join, resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {decodePng, encodePng} from './derive-nursery-overlays.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const option = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
export const SOURCE_DIR = resolve(option('sources') ?? join(root, 'assets-source/habitats')), TARGET_DIR = resolve(option('target') ?? join(root, 'public/assets/habitats'));
export const REDUCTION = 2;
/** Crop (source pixels, even-aligned) around the visible part of each approved source, and the source's blob SHA-1. */
export const HABITAT_SOURCES = {
  paille: {sha1: '7c2da19e7221ff77db1c9fafc66b8d2678a69795', crop: {x: 26, y: 164, width: 1210, height: 872}},
  neige: {sha1: 'd33d55d14bd00ebd2592380af875760ad942253e', crop: {x: 14, y: 214, width: 1226, height: 786}},
  feu: {sha1: 'd28ca60b2b24ddfcebda97e93d1ed057ee9d6927', crop: {x: 4, y: 214, width: 1246, height: 792}},
  metal: {sha1: 'e5924a3ee0e45b1270878a9f9ef562066e8a9e41', crop: {x: 4, y: 168, width: 1246, height: 876}},
  vol: {sha1: '76eb2d85ae72691aec3cedde7049df353faf3de9', crop: {x: 14, y: 138, width: 1230, height: 876}},
  universal: {sha1: '9c93ccd61487d80e9de67e889af0cd0d8e63cd4d', crop: {x: 10, y: 190, width: 1236, height: 832}},
  neigeLevel2: {sha1: '4bbefb4c98d497d60c9a47cc7dcfac917f3132a2', crop: {x: 4, y: 80, width: 1246, height: 1048},
    source: 'level2/habitat-neige-level2-jardin-des-flocons-v1.png', derived: 'habitat-neige-level2.png'},
  feuLevel2: {sha1: 'ac7d771016484b832048a73ebb44e9e72bee22c1', crop: {x: 6, y: 62, width: 1244, height: 994},
    source: 'level2/habitat-feu-level2-orangerie-des-braises-v1.png', derived: 'habitat-feu-level2.png'},
  metalLevel2: {sha1: '5534fdb251cc4e1dd2c73038d4f9db6b2def6f6b', crop: {x: 0, y: 138, width: 1254, height: 908},
    source: 'level2/habitat-metal-level2-cour-horloger-v1.png', derived: 'habitat-metal-level2.png'},
  volLevel2: {sha1: 'c94d0a971f8643b390ce7620a8182855b34c01a2', crop: {x: 0, y: 144, width: 1254, height: 920},
    source: 'level2/habitat-vol-level2-escale-des-vents-v1.png', derived: 'habitat-vol-level2.png'},
  pailleLevel2: {sha1: 'e095fd58be42cba52044981239cdb737339c5681', crop: {x: 0, y: 174, width: 1254, height: 942},
    source: 'level2/habitat-paille-level2-transparent-v2.png', derived: 'habitat-paille-level2.png'},
  universalLevel2: {sha1: 'cf9a769911e2d48f518aabfeabb65293c1580870', crop: {x: 0, y: 118, width: 1254, height: 978},
    source: 'level2/habitat-universal-level2-v1.png', derived: 'habitat-universal-level2.png'},
  neigeLevel3: {sha1: '2848638fea1d2ba8dc00e487084eb7be4132e494', crop: {x: 0, y: 128, width: 1254, height: 974},
    source: 'level3/habitat-neige-level3-grand-jardin-hiver-v1.png', derived: 'habitat-neige-level3.png'},
  feuLevel3: {sha1: '8fa22d323f6abe2b6fba8ab11fc18dcdd234b56c', crop: {x: 2, y: 110, width: 1248, height: 926},
    source: 'level3/habitat-feu-level3-grande-orangerie-des-braises-v1.png', derived: 'habitat-feu-level3.png'},
  metalLevel3: {sha1: '4e21cba09a84ba3a5d9076cb6a16b4955d3d422c', crop: {x: 0, y: 150, width: 1254, height: 902},
    source: 'level3/habitat-metal-level3-domaine-des-rouages-v1.png', derived: 'habitat-metal-level3.png'},
  volLevel3: {sha1: '3e75978731e3961a409985c315d646c003ae9b11', crop: {x: 0, y: 184, width: 1254, height: 852},
    source: 'level3/habitat-vol-level3-grand-port-des-alizes-v1.png', derived: 'habitat-vol-level3.png'},
  pailleLevel3: {sha1: '02f3918b9f99b7cf5d7f2a6b41623dbd407fa343', crop: {x: 0, y: 108, width: 1254, height: 954},
    source: 'level3/habitat-paille-level3-domaine-des-moissons-v1.png', derived: 'habitat-paille-level3.png'},
  universalLevel3: {sha1: '10ee83c110e0f4b04faa13cca97065545e1aa9e4', crop: {x: 0, y: 136, width: 1254, height: 994},
    source: 'level3/habitat-universal-level3-v1.png', derived: 'habitat-universal-level3.png'},
};
export const sourceName = (type) => HABITAT_SOURCES[type].source ?? `level1/habitat-${type}-level1-v1.png`,
  derivedName = (type) => HABITAT_SOURCES[type].derived ?? `habitat-${type}-level1.png`;
const blobSha1 = (file) => createHash('sha1').update('blob ' + file.length + '\0').update(file).digest('hex');

/** Visible bounds (alpha > 8), inclusive. */
export function visibleBounds({width, height, pixels}) {
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (pixels[(y * width + x) * 4 + 3] > 8) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return {x0, y0, x1, y1};
}

/** Crop, then exact 2 × 2 area average of premultiplied colour. */
export function cropAndHalve(image, {x, y, width, height}) {
  if (width % REDUCTION || height % REDUCTION) throw new Error('The crop must be even');
  const w = width / REDUCTION, h = height / REDUCTION, out = Buffer.alloc(w * h * 4);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    let a = 0, r = 0, g = 0, b = 0;
    for (let dy = 0; dy < REDUCTION; dy++) for (let dx = 0; dx < REDUCTION; dx++) {
      const k = ((y + j * REDUCTION + dy) * image.width + x + i * REDUCTION + dx) * 4, alpha = image.pixels[k + 3];
      a += alpha; r += alpha * image.pixels[k]; g += alpha * image.pixels[k + 1]; b += alpha * image.pixels[k + 2];
    }
    const k = (j * w + i) * 4, n = REDUCTION * REDUCTION; out[k + 3] = Math.floor((2 * a + n) / (2 * n));
    if (a > 0) { out[k] = Math.floor((2 * r + a) / (2 * a)); out[k + 1] = Math.floor((2 * g + a) / (2 * a)); out[k + 2] = Math.floor((2 * b + a) / (2 * a)); }
  }
  return {width: w, height: h, pixels: out};
}

function source(type) {
  const file = readFileSync(join(SOURCE_DIR, sourceName(type)));
  if (blobSha1(file) !== HABITAT_SOURCES[type].sha1) throw new Error(`${sourceName(type)} is not the approved source`);
  const image = decodePng(file);
  if (image.width !== 1254 || image.height !== 1254) throw new Error(`${sourceName(type)} is not 1254 × 1254`);
  return image;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const mode = process.argv.includes('--check') ? 'check' : process.argv.includes('--measure') ? 'measure' : 'write';
  let failed = false;
  if (mode === 'write') mkdirSync(TARGET_DIR, {recursive: true});
  for (const type of Object.keys(HABITAT_SOURCES)) {
    if (!existsSync(join(SOURCE_DIR, sourceName(type)))) { console.log(`MISSING source ${sourceName(type)}`); failed = true; continue; }
    if (mode === 'check' && !existsSync(join(TARGET_DIR, derivedName(type)))) { console.log(`MISSING derived ${derivedName(type)}`); failed = true; continue; }
    let image; try { image = source(type); } catch (error) { console.log(`INVALID ${error.message}`); failed = true; continue; }
    const {crop} = HABITAT_SOURCES[type];
    if (mode === 'measure') { const b = visibleBounds(image); console.log(type, JSON.stringify(b), `margins l${b.x0 - crop.x} t${b.y0 - crop.y} r${crop.x + crop.width - 1 - b.x1} b${crop.y + crop.height - 1 - b.y1}`); continue; }
    const derived = cropAndHalve(image, crop), target = join(TARGET_DIR, derivedName(type));
    if (mode === 'check') {
      const stored = decodePng(readFileSync(target)), same = stored.width === derived.width && stored.height === derived.height && stored.pixels.equals(derived.pixels);
      console.log(`${same ? 'ok     ' : 'DIFFERS'} ${derivedName(type)} ${derived.width}×${derived.height}`); if (!same) failed = true;
    } else { const png = encodePng(derived); writeFileSync(target, png); console.log(`wrote ${derivedName(type)} ${derived.width}×${derived.height} ${png.length} bytes`); }
  }
  if (failed) process.exitCode = 1;
}
