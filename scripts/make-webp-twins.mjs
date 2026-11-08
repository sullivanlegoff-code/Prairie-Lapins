// Light WebP twins of the game's PNG pictures (audit before the Christmas update, 8 November 2026): a player's iPhone downloads
// each picture as a WebP about five times lighter, painted art looking the same. The PNG stays the source of truth and the
// fallback: `src/config/webpTwins.json` lists the pictures that have a twin, and the game loads the twin only for those
// (src/display/webpTwins.ts); `scripts/webp-twin-hashes.json` keeps the SHA-256 of the PNG each twin was made from. A PNG changed
// since (its hash differs) stops the site build (scripts/verify-webp-twins.mjs) and `tests/webp-twins.test.ts` until this
// script is run again.
// A twin is kept only if its alpha is the PNG's (within 1/255: hit areas and outlines unchanged) and it is at least 20 % lighter.
// Usage: PLAYWRIGHT_MODULE=<installed playwright module> node scripts/make-webp-twins.mjs
import {readFileSync, writeFileSync, readdirSync, statSync, existsSync, unlinkSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

process.chdir(fileURLToPath(new URL('..', import.meta.url)));
const QUALITY = .9, ROOT = 'public/', MANIFEST = 'src/config/webpTwins.json', HASHES = 'scripts/webp-twin-hashes.json';
const {chromium} = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const walk = dir => readdirSync(dir).flatMap(name => { const path = `${dir}/${name}`; return statSync(path).isDirectory() ? walk(path) : [path]; });
const previous = existsSync(HASHES) ? JSON.parse(readFileSync(HASHES, 'utf8')) : {};
const pngs = walk('public/assets').filter(path => path.endsWith('.png')).sort();
const browser = await chromium.launch(), manifest = {};
let before = 0, after = 0, made = 0, kept = 0, refused = [];
try {
  const page = await browser.newPage();
  for (const png of pngs) {
    const key = png.slice(ROOT.length), twin = png.replace(/\.png$/, '.webp'), bytes = readFileSync(png), hash = sha256(bytes);
    if (existsSync(twin) && !previous[key]) { refused.push(`${key} : un WebP du même nom existe déjà`); continue; }
    if (previous[key] === hash && existsSync(twin)) { manifest[key] = hash; before += bytes.length; after += statSync(twin).size; kept++; continue; }
    const result = await page.evaluate(async ({data, quality}) => {
      const pixels = async blob => {
        const image = await createImageBitmap(blob, {premultiplyAlpha: 'none', colorSpaceConversion: 'none'});
        const canvas = new OffscreenCanvas(image.width, image.height), context = canvas.getContext('2d', {willReadFrequently: true});
        context.drawImage(image, 0, 0); return {canvas, data: context.getImageData(0, 0, image.width, image.height).data};
      };
      const source = await pixels(new Blob([Uint8Array.from(atob(data), char => char.charCodeAt(0))], {type: 'image/png'}));
      const blob = await source.canvas.convertToBlob({type: 'image/webp', quality}), decoded = await pixels(blob);
      let alpha = 0;
      for (let i = 3; i < source.data.length; i += 4) alpha = Math.max(alpha, Math.abs(source.data[i] - decoded.data[i]));
      const buffer = new Uint8Array(await blob.arrayBuffer()); let text = '';
      for (let i = 0; i < buffer.length; i += 0x8000) text += String.fromCharCode(...buffer.subarray(i, i + 0x8000));
      return {webp: btoa(text), alpha};
    }, {data: bytes.toString('base64'), quality: QUALITY});
    const webp = Buffer.from(result.webp, 'base64');
    if (result.alpha > 1 || webp.length > bytes.length * .8) {
      if (previous[key] && existsSync(twin)) unlinkSync(twin);
      refused.push(`${key} : ${result.alpha > 1 ? `alpha décalé de ${result.alpha}` : 'pas assez de gain'}`); continue;
    }
    writeFileSync(twin, webp); manifest[key] = hash; before += bytes.length; after += webp.length; made++;
  }
} finally { await browser.close(); }
for (const key of Object.keys(previous)) if (!manifest[key] && existsSync(ROOT + key.replace(/\.png$/, '.webp')) && !existsSync(ROOT + key)) unlinkSync(ROOT + key.replace(/\.png$/, '.webp'));
writeFileSync(HASHES, JSON.stringify(manifest, null, 1) + '\n');
writeFileSync(MANIFEST, JSON.stringify(Object.keys(manifest).sort(), null, 0) + '\n');
const mb = n => (n / 1e6).toFixed(1) + ' Mo';
console.log(`${made} WebP créés, ${kept} gardés tels quels, ${refused.length} PNG gardés seuls ; ${mb(before)} de PNG → ${mb(after)} de WebP`);
if (refused.length) console.log(refused.join('\n'));
