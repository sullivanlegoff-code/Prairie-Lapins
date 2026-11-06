// Lapin ultime art (owner's choice, 2 November 2026: crown A, card 1). Node built-ins only, plus an installed Playwright for the
// WebP encoding, like scripts/prepare-reception-frames.mjs.
//
//   PLAYWRIGHT_MODULE=<installed playwright module> node scripts/prepare-ultimate-art.mjs [--sources <folder>]
//
// The sources (default output/imagegen/affection50-production, ignored by Git):
// - couronne.png, 1254 x 1254 RGB: the golden crown with its pearls on a painted (opaque) grey and white checkerboard. The
//   checkerboard is flood-filled from the picture's edges over light, unsaturated pixels, stopped by the crown's brown outline;
//   the rim's last pixels are un-mixed and feathered over two pixels, like the reception cards. Checks: nothing removed inside the
//   band, every pearl centre kept, every pixel away from the rim untouched. The crown is cropped to its painted pixels, kept at
//   full size as assets-source/effects/couronne.png and served CROWN_WIDTH pixels wide in public/assets/effects/couronne.png.
// - fiche-ultime-cadre.png, 1536 x 1024 RGBA: the golden frame with laurels and purple ribbons, a crown in the middle of its top
//   bar, transparent inside. It becomes a stretchable nine-slice frame: the crown piece (crown, laurels and ribbons) is cut out and
//   served on its own, centred over the top bar, and its place on the frame is filled with the plain top bar copied from just
//   beside it, so stretching the top edge never deforms the crown. Both are reduced by the exact area filter to the frame's
//   FRAME_WIDTH pixels and encoded as WebP in public/assets/ui/ultimate/.
// The numbers printed at the end are the ones src/config/ultimateArt.ts declares.
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {decode, encode} from './png-rgba.mjs';
import {resizeRegion} from './resize-rgba.mjs';

process.chdir(fileURLToPath(new URL('..', import.meta.url)));
const at = process.argv.indexOf('--sources');
const SOURCES = at > 0 ? process.argv[at + 1] : 'output/imagegen/affection50-production';
const CROWN_WIDTH = 256, FRAME_WIDTH = 1200;
const checker = (r, g, b) => Math.max(r, g, b) - Math.min(r, g, b) <= 22 && Math.min(r, g, b) >= 160;
const greyish = (r, g, b) => Math.max(r, g, b) - Math.min(r, g, b) <= 48 && Math.min(r, g, b) >= 140;
const RIM = 3;
/** The crown's band, inside its outline, and the centres of its six pearls (source pixels). */
const BAND = {left: 300, right: 950, top: 830, bottom: 880};
const PEARLS = [[625, 380], [215, 505], [1040, 510], [300, 745], [625, 725], [945, 745]];

function removeChecker({width, height, rgba}) {
  const removed = new Uint8Array(width * height), queue = new Int32Array(width * height); let head = 0, tail = 0;
  const seed = i => { if (removed[i]) return; const k = i * 4; if (!checker(rgba[k], rgba[k + 1], rgba[k + 2])) return; removed[i] = 1; queue[tail++] = i; };
  for (let x = 0; x < width; x++) { seed(x); seed((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { seed(y * width); seed(y * width + width - 1); }
  while (head < tail) { const i = queue[head++], x = i % width, y = (i - x) / width;
    if (x > 0) seed(i - 1); if (x < width - 1) seed(i + 1); if (y > 0) seed(i - width); if (y < height - 1) seed(i + width); }
  for (let step = 0; step < 2; step++) {
    const grow = [];
    for (let i = 0; i < width * height; i++) { if (removed[i]) continue; const x = i % width, k = i * 4;
      const touches = (x > 0 && removed[i - 1]) || (x < width - 1 && removed[i + 1]) || removed[i - width] || removed[i + width];
      if (touches && greyish(rgba[k], rgba[k + 1], rgba[k + 2])) grow.push(i); }
    for (const i of grow) removed[i] = 1;
  }
  const depth = new Uint8Array(width * height).fill(255);
  let front = [];
  for (let i = 0; i < width * height; i++) if (removed[i]) { depth[i] = 0; front.push(i); }
  for (let d = 1; d <= RIM; d++) { const next = [];
    for (const i of front) { const x = i % width;
      for (const j of [x > 0 ? i - 1 : -1, x < width - 1 ? i + 1 : -1, i - width, i + width]) if (j >= 0 && j < width * height && depth[j] === 255) { depth[j] = d; next.push(j); } }
    front = next; }
  const before = Buffer.from(rgba);
  for (let d = RIM - 1; d >= 1; d--) for (let i = 0; i < width * height; i++) if (depth[i] === d) {
    const x = i % width; let r = 0, g = 0, b = 0, n = 0;
    for (const j of [x > 0 ? i - 1 : -1, x < width - 1 ? i + 1 : -1, i - width, i + width]) if (j >= 0 && j < width * height && depth[j] === d + 1) { r += rgba[j * 4]; g += rgba[j * 4 + 1]; b += rgba[j * 4 + 2]; n++; }
    if (n) { rgba[i * 4] = Math.round(r / n); rgba[i * 4 + 1] = Math.round(g / n); rgba[i * 4 + 2] = Math.round(b / n); }
  }
  const FEATHER = [0, 110, 210];
  for (let i = 0; i < width * height; i++) { if (depth[i] === 0) rgba.fill(0, i * 4, i * 4 + 4); else if (depth[i] < RIM) rgba[i * 4 + 3] = FEATHER[depth[i]]; }
  // Checks: the band and the pearls are whole, and every pixel at RIM or more from the background is the source's, byte for byte.
  let changed = 0, band = 0;
  for (let i = 0; i < width * height; i++) { const x = i % width, y = (i - x) / width;
    if (depth[i] < RIM && x >= BAND.left && x <= BAND.right && y >= BAND.top && y <= BAND.bottom) band++;
    if (depth[i] >= RIM && depth[i] !== 0) for (let c = 0; c < 4; c++) if (rgba[i * 4 + c] !== before[i * 4 + c]) { changed++; break; } }
  if (band) throw Error(`${band} pixels removed inside the crown's band`);
  if (changed) throw Error(`${changed} pixels of the crown changed`);
  for (const [x, y] of PEARLS) for (let dy = -12; dy <= 12; dy++) for (let dx = -12; dx <= 12; dx++)
    if (depth[(y + dy) * width + x + dx] < RIM) throw Error(`pearl at (${x}, ${y}) eaten`);
  // No checkerboard left around the crown: a kept, fully opaque light grey pixel touching the removed background would be a halo.
  let halo = 0;
  for (let i = 0; i < width * height; i++) if (depth[i] === RIM && checker(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2])) halo++;
  if (halo > 40) throw Error(`${halo} checkerboard pixels left on the crown's rim`);
  return {removed: removed.reduce((sum, v) => sum + v, 0), halo};
}

function bounds({width, rgba}, area = {left: 0, top: 0, right: width - 1, bottom: rgba.length / 4 / width - 1}, threshold = 8) {
  let left = Infinity, right = -1, top = Infinity, bottom = -1;
  for (let y = area.top; y <= area.bottom; y++) for (let x = area.left; x <= area.right; x++) if (rgba[(y * width + x) * 4 + 3] > threshold) {
    if (x < left) left = x; if (x > right) right = x; if (y < top) top = y; if (y > bottom) bottom = y; }
  return {left, top, width: right - left + 1, height: bottom - top + 1};
}
function crop(image, box) {
  const pixels = Buffer.alloc(box.width * box.height * 4);
  for (let y = 0; y < box.height; y++) image.rgba.copy(pixels, y * box.width * 4, ((box.top + y) * image.width + box.left) * 4, ((box.top + y) * image.width + box.left + box.width) * 4);
  return {width: box.width, height: box.height, rgba: pixels};
}
const reduce = (image, width) => { const height = Math.round(image.height * width / image.width);
  const small = resizeRegion({width: image.width, height: image.height, pixels: image.rgba}, image.width, image.height, width, height);
  return {width: small.width, height: small.height, rgba: small.pixels}; };

// The crown.
const crownSource = decode(readFileSync(`${SOURCES}/couronne.png`));
if (crownSource.rgba[3] !== 255) throw Error('couronne.png was expected opaque, with a painted checkerboard');
const crownCheck = removeChecker(crownSource);
const crownBox = bounds(crownSource), crownMaster = crop(crownSource, crownBox), crown = reduce(crownMaster, CROWN_WIDTH);
mkdirSync('assets-source/effects', {recursive: true}); mkdirSync('public/assets/effects', {recursive: true});
writeFileSync('assets-source/effects/couronne.png', encode(crownMaster));
const crownPng = encode(crown); writeFileSync('public/assets/effects/couronne.png', crownPng);
console.log(`couronne: crown ${crownBox.width}x${crownBox.height} at (${crownBox.left}, ${crownBox.top}), checkerboard ${crownCheck.removed} px, halo ${crownCheck.halo} px, served ${crown.width}x${crown.height}, ${crownPng.length} bytes`);

// The frame.
const frame = decode(readFileSync(`${SOURCES}/fiche-ultime-cadre.png`));
const {width: W, height: H, rgba} = frame, alpha = (x, y) => rgba[(y * W + x) * 4 + 3];
for (let i = 3; i < rgba.length; i += 4) if (rgba[i] >= 240) rgba[i] = 255; else if (rgba[i] < 8) rgba.fill(0, i - 3, i + 1);
/** First and last opaque pixel of a run starting from one end of a row or a column. */
const run = (along, fixed, from, step, vertical) => { let a = from; const get = v => vertical ? alpha(fixed, v) : alpha(v, fixed);
  while (get(a) <= 128) a += step; let b = a; while (get(b + step) > 128) b += step; return [Math.min(a, b), Math.max(a, b)]; };
const mid = {x: W >> 1, y: H >> 1};
const barLeft = run(null, mid.y, 0, 1, false), barRight = run(null, mid.y, W - 1, -1, false), barBottom = run(null, mid.x, H - 1, -1, true);
// The crown piece: what stands above the top bar between the two corner ornaments, with what it overlaps below the bar.
const barTop = run(null, 400, 0, 1, true);
const over = bounds(frame, {left: 340, top: 0, right: W - 341, bottom: barTop[0] - 3}), under = bounds(frame, {left: 340, top: barTop[1] + 3, right: W - 341, bottom: barTop[1] + 120});
const pieceLeft = Math.min(over.left, under.left) - 6, pieceRight = Math.max(over.left + over.width, under.left + under.width) + 5;
const piece = {left: pieceLeft, top: 0, width: pieceRight - pieceLeft + 1, height: Math.max(under.top + under.height, barTop[1] + 1) + 3};
// The bar beside the piece is the plain bar (one run only): copied over the piece's place on the frame.
const plainX = piece.left - 12, column = []; for (let y = 0; y < piece.top + piece.height; y++) column.push(alpha(plainX, y) > 8 ? 1 : 0);
if (column.join('').replace(/0+/g, '0').replace(/1+/g, '1').replace(/^0|0$/g, '') !== '1') throw Error(`column ${plainX} is not the plain top bar`);
const crownPiece = crop(frame, piece), plain = {width: W, height: H, rgba: Buffer.from(rgba)};
for (let y = 0; y < piece.top + piece.height; y++) for (let x = piece.left; x < piece.left + piece.width; x++) rgba.copy(plain.rgba, (y * W + x) * 4, (y * W + plainX) * 4, (y * W + plainX) * 4 + 4);
// Nine-slice edges: from the middle of each side, the first row or column holding anything but the bar.
const onlyBar = (x0, x1, y, keep) => { for (let x = x0; x <= x1; x++) if (plain.rgba[(y * W + x) * 4 + 3] > 8 && (x < keep[0] - 2 || x > keep[1] + 2)) return false; return true; };
const onlyBarColumn = (y0, y1, x, keep) => { for (let y = y0; y <= y1; y++) if (plain.rgba[(y * W + x) * 4 + 3] > 8 && (y < keep[0] - 2 || y > keep[1] + 2)) return false; return true; };
let top = mid.y; while (onlyBar(0, 420, top, barLeft) && onlyBar(W - 421, W - 1, top, barRight)) top--;
let bottom = mid.y; while (onlyBar(0, 420, bottom, barLeft) && onlyBar(W - 421, W - 1, bottom, barRight)) bottom++;
let left = mid.x; while (onlyBarColumn(0, 300, left, barTop) && onlyBarColumn(H - 301, H - 1, left, barBottom)) left--;
let right = mid.x; while (onlyBarColumn(0, 300, right, barTop) && onlyBarColumn(H - 301, H - 1, right, barBottom)) right++;
const slice = {top: top + 1 + 4, right: W - right + 4, bottom: H - bottom + 4, left: left + 1 + 4};
const k = FRAME_WIDTH / W, servedFrame = reduce(plain, FRAME_WIDTH), servedPiece = reduce(crownPiece, Math.round(crownPiece.width * k));
const s = v => Math.round(v * k);
console.log(`frame: bars left ${barLeft} right ${barRight} top ${barTop} bottom ${barBottom}; crown piece ${piece.width}x${piece.height} at (${piece.left}, ${piece.top}); slices ${JSON.stringify(slice)}`);
console.log(`served (x${k}): frame ${servedFrame.width}x${servedFrame.height}, slices top ${s(slice.top)} right ${s(slice.right)} bottom ${s(slice.bottom)} left ${s(slice.left)}, bar outer edges left ${s(barLeft[0])} top ${s(barTop[0])} right ${s(W - 1 - barRight[1])} bottom ${s(H - 1 - barBottom[1])}; piece ${servedPiece.width}x${servedPiece.height} at (${s(piece.left)}, ${s(piece.top)})`);

const {chromium} = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch();
try {
  const page = await browser.newPage(); mkdirSync('public/assets/ui/ultimate', {recursive: true});
  for (const [name, image] of [['cadre', servedFrame], ['couronne-cadre', servedPiece]]) {
    const data = await page.evaluate(async ({png}) => {
      const bytes = Uint8Array.from(atob(png), char => char.charCodeAt(0)), bitmap = await createImageBitmap(new Blob([bytes], {type: 'image/png'}));
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height); canvas.getContext('2d').drawImage(bitmap, 0, 0);
      const blob = await canvas.convertToBlob({type: 'image/webp', quality: .86}), buffer = new Uint8Array(await blob.arrayBuffer()); let text = '';
      for (let i = 0; i < buffer.length; i += 0x8000) text += String.fromCharCode(...buffer.subarray(i, i + 0x8000));
      return btoa(text);
    }, {png: encode(image).toString('base64')});
    const webp = Buffer.from(data, 'base64'); writeFileSync(`public/assets/ui/ultimate/${name}.webp`, webp);
    console.log(`${name}: served ${image.width}x${image.height}, ${webp.length} bytes`);
  }
} finally { await browser.close(); }
