// « Le vol de Benny » (owner, 6 November 2026: « je veux qu'elle utilise ses ailes »): Benny's flapping sprite for the mini-game,
// composed from her approved flight paintings (public/assets/rabbits/benny/flight, made by scripts/prepare-benny-flight.mjs),
// never repainted. For each of the 8 wing beats, the profile rig of src/config/bennyFlightFrames.json is laid out exactly as the
// meadow's BennyFlightView does: the far wing behind (darkened by FAR_WING_TINT), the body (`flightBody`), the near wing in front,
// each wing frame centred on its shoulder. The 8 frames are cropped to one common box and written side by side in one WebP strip.
//   PLAYWRIGHT_MODULE=<installed playwright module> node scripts/prepare-benny-flappy.mjs [--check]
// Writes public/assets/benny-envol/benny-vol.webp and src/config/bennyFlappyFrames.json (frame size, count, body centre).
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

process.chdir(fileURLToPath(new URL('..', import.meta.url)));
const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const rig = JSON.parse(readFileSync('src/config/bennyFlightFrames.json', 'utf8'));
const atlas = JSON.parse(readFileSync('public/assets/rabbits/benny/flight/benny-flight.json', 'utf8'));
const atlasUrl = 'data:image/webp;base64,' + readFileSync('public/assets/rabbits/benny/flight/benny-flight.webp').toString('base64');
const OUT = 'public/assets/benny-envol/benny-vol.webp', CONFIG = 'src/config/bennyFlappyFrames.json';
const FAR_WING_TINT = [0xcc, 0xc4, 0xdc];
/** Same rule as flightBody (src/display/bennyFlight.ts) for the profile view: beats 3 to 6 use the second body. */
const bodyOf = n => n >= 3 && n <= 6 ? 2 : 1;

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const result = await page.evaluate(async ({atlasUrl, atlas, rig, tint, beats}) => {
    const image = new Image(); image.src = atlasUrl; await image.decode();
    const k = rig.scale, view = rig.views.profil, bodySize = rig.body.size, wingSize = rig.wing.size;
    // One big work canvas per beat, the body square's centre at its centre.
    const W = 1000, C = W / 2;
    const draw = (ctx, name, cx, cy, size, darken) => {
      const f = atlas.frames[name], s = f.spriteSourceSize;
      const x = cx - size / 2 + s.x, y = cy - size / 2 + s.y;
      if (!darken) { ctx.drawImage(image, f.frame.x, f.frame.y, f.frame.w, f.frame.h, x, y, f.frame.w, f.frame.h); return; }
      const off = new OffscreenCanvas(f.frame.w, f.frame.h), o = off.getContext('2d');
      o.drawImage(image, f.frame.x, f.frame.y, f.frame.w, f.frame.h, 0, 0, f.frame.w, f.frame.h);
      o.globalCompositeOperation = 'multiply'; o.fillStyle = `rgb(${tint.join(',')})`; o.fillRect(0, 0, f.frame.w, f.frame.h);
      o.globalCompositeOperation = 'destination-in'; o.drawImage(image, f.frame.x, f.frame.y, f.frame.w, f.frame.h, 0, 0, f.frame.w, f.frame.h);
      ctx.drawImage(off, x, y);
    };
    const canvases = [];
    for (let n = 1; n <= beats; n++) {
      const c = new OffscreenCanvas(W, W), ctx = c.getContext('2d');
      const wing = (w) => draw(ctx, `${w.series}-${n}`, C + (w.shoulder[0] - rig.body.source / 2) * k, C + (w.shoulder[1] - rig.body.source / 2) * k, wingSize, w.darken);
      for (const w of view.wings.filter(w => w.layer === 'behind')) wing(w);
      draw(ctx, view.bodies[(n >= 3 && n <= 6 ? 2 : 1) - 1], C, C, bodySize, false);
      for (const w of view.wings.filter(w => w.layer === 'front')) wing(w);
      canvases.push(c);
    }
    // Common box of every beat's opaque pixels, plus a small margin.
    let x0 = W, y0 = W, x1 = 0, y1 = 0;
    for (const c of canvases) {
      const d = c.getContext('2d').getImageData(0, 0, W, W).data;
      for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    const m = 4; x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m); x1 = Math.min(W - 1, x1 + m); y1 = Math.min(W - 1, y1 + m);
    const fw = x1 - x0 + 1, fh = y1 - y0 + 1, strip = new OffscreenCanvas(fw * beats, fh), s = strip.getContext('2d');
    canvases.forEach((c, i) => s.drawImage(c, x0, y0, fw, fh, i * fw, 0, fw, fh));
    const blob = await strip.convertToBlob({type: 'image/webp', quality: .9});
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = ''; for (const b of bytes) binary += String.fromCharCode(b);
    return {webp: btoa(binary), frame: {width: fw, height: fh}, body: {x: C - x0, y: C - y0}, bodyWidth: bodySize};
  }, {atlasUrl, atlas, rig, tint: FAR_WING_TINT, beats: rig.beats});
  const config = JSON.stringify({frames: rig.beats, frame: result.frame, body: result.body, bodySize: result.bodyWidth}, null, 1) + '\n';
  if (process.argv.includes('--check')) {
    if (!existsSync(CONFIG) || readFileSync(CONFIG, 'utf8').replace(/\r\n/g, '\n') !== config) { console.error(`${CONFIG} is stale`); process.exit(1); }
  } else {
    writeFileSync(OUT, Buffer.from(result.webp, 'base64')); writeFileSync(CONFIG, config);
  }
  console.log(`${rig.beats} beats of ${result.frame.width} × ${result.frame.height}, body centre ${result.body.x}, ${result.body.y}`);
} finally { await browser.close(); }
