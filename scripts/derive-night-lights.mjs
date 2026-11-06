// The Christmas night's lit windows (owner, 5 November 2026: « dans la nuit il n'y a pas assez de lumière »): for each snowy
// building, habitat and Christmas decoration served under public/assets/noel/, its warm and bright pixels (lit windows and
// doors, lanterns, bulbs, the tree's star) are kept on black, softly spread so they glow, at the picture's exact size. The game
// adds them over the night shade (ADD blend) at the picture's place. A picture with almost no warm light gets no file.
// Writes public/assets/noel/nuit/<kind>/<name>.png and the list src/config/winterNightLights.json.
//   node scripts/derive-night-lights.mjs [--check]
import {existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {decodeRgbPng} from './prepare-rabbit-masters.mjs';
import {encodePng} from './derive-nursery-overlays.mjs';
process.chdir(fileURLToPath(new URL('..', import.meta.url)));

export const NIGHT_LIGHTS_FILE = 'src/config/winterNightLights.json';
const KINDS = ['buildings', 'habitats', 'decorations'];
/** A warm, bright pixel: lamplight yellow or orange, never the bluish snow nor the green of the holly. */
export const isWarmLight = (r, g, b, a) => a > 160 && r > 228 && g > 178 && b < 165 && r - b > .45 * r && r >= g;
/** The Ultra neige palace's lanterns are paler than lamplight (6 November 2026): a slightly looser test, for it only. */
export const isPaleWarmLight = (r, g, b, a) => a > 160 && r > 200 && g > 140 && b < 150 && r - b > .3 * r && r >= g;
const PALE_LIGHTS = new Set(['habitats/habitat-glace.png']);
/** Lit-looking areas that are no lamps, as ellipses in fractions of the picture: the islet of the Epics' sandy pad. */
const NOT_LAMPS = {'buildings/ilot-epique.png': [{cx: .505, cy: .59, rx: .27, ry: .1}]};
/** Fewer lit pixels than this share of the opaque ones: no lights for that picture. */
const MIN_SHARE = .0015;

/** Two box passes (horizontal then vertical), every second pixel, for a soft halo of about `radius` pixels. */
function blur(src, w, h, radius) {
  const out = new Float32Array(src.length);
  for (let pass = 0; pass < 2; pass++) {
    const a = pass ? out.slice() : src, horizontal = !pass;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let s0 = 0, s1 = 0, s2 = 0, n = 0;
      for (let d = -radius; d <= radius; d += 2) {
        const u = horizontal ? x + d : x, v = horizontal ? y : y + d; if (u < 0 || v < 0 || u >= w || v >= h) continue;
        const j = (v * w + u) * 3; s0 += a[j]; s1 += a[j + 1]; s2 += a[j + 2]; n++;
      }
      const j = (y * w + x) * 3; out[j] = s0 / n; out[j + 1] = s1 / n; out[j + 2] = s2 / n;
    }
  }
  return out;
}

/** The glow picture of one painting (same size), or null when it has almost no warm light. */
export function nightLights({width: w, height: h, pixels: p}, warm = isWarmLight, notLamps = []) {
  const glow = new Float32Array(w * h * 3); let lit = 0, opaque = 0;
  for (let i = 0; i < w * h; i++) {
    const r = p[i * 4], g = p[i * 4 + 1], b = p[i * 4 + 2], a = p[i * 4 + 3];
    if (a > 160) opaque++;
    if (!warm(r, g, b, a)) continue;
    const x = (i % w) / w, y = Math.floor(i / w) / h;
    if (notLamps.some(e => ((x - e.cx) / e.rx) ** 2 + ((y - e.cy) / e.ry) ** 2 <= 1)) continue;
    lit++; glow[i * 3] = r; glow[i * 3 + 1] = g * .92; glow[i * 3 + 2] = b * .7;
  }
  if (!opaque || lit / opaque < MIN_SHARE) return null;
  const radius = Math.max(4, Math.round(Math.max(w, h) / 70)), halo = blur(glow, w, h, radius), out = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    for (let c = 0; c < 3; c++) out[i * 4 + c] = Math.min(255, Math.round(glow[i * 3 + c] * .75 + halo[i * 3 + c] * 2.4));
    out[i * 4 + 3] = 255;
  }
  return {width: w, height: h, pixels: out};
}

export function deriveNightLights() {
  const list = [], files = [];
  for (const kind of KINDS) {
    const folder = `public/assets/noel/${kind}`; if (!existsSync(folder)) continue;
    // The debris' yellow flowers and berries are no lamps (6 November 2026).
    for (const name of readdirSync(folder).filter(f => f.endsWith('.png') && !f.startsWith('debris-')).sort()) {
      const lights = nightLights(decodeRgbPng(readFileSync(`${folder}/${name}`)), PALE_LIGHTS.has(`${kind}/${name}`) ? isPaleWarmLight : isWarmLight, NOT_LAMPS[`${kind}/${name}`]);
      if (!lights) continue;
      list.push(`${kind}/${name}`); files.push([`public/assets/noel/nuit/${kind}/${name}`, lights]);
    }
  }
  return {list, files};
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const {list, files} = deriveNightLights(), text = JSON.stringify(list, null, 1) + '\n';
  if (process.argv.includes('--check')) {
    if (!existsSync(NIGHT_LIGHTS_FILE) || readFileSync(NIGHT_LIGHTS_FILE, 'utf8').replace(/\r\n/g, '\n') !== text) { console.error(`${NIGHT_LIGHTS_FILE} is stale`); process.exit(1); }
  } else {
    for (const [path, img] of files) { mkdirSync(dirname(path), {recursive: true}); writeFileSync(path, encodePng(img)); }
    writeFileSync(NIGHT_LIGHTS_FILE, text);
  }
  console.log(`${list.length} lit pictures: ${list.join(', ')}`);
}
