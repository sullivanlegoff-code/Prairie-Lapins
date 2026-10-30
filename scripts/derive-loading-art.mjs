// Approved loading landscape: encode with the same existing Chromium facility as painted island stages.
// Usage: PLAYWRIGHT_MODULE=<installed playwright module> node scripts/derive-loading-art.mjs
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

process.chdir(fileURLToPath(new URL('..', import.meta.url)));
const source = 'assets-source/loading/morning-path.png', target = 'public/assets/loading/morning-path.webp';
const {chromium} = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const bytes = readFileSync(source), browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const result = await page.evaluate(async data => {
    const bytes = Uint8Array.from(atob(data), char => char.charCodeAt(0));
    const image = await createImageBitmap(new Blob([bytes], {type: 'image/png'}));
    const canvas = new OffscreenCanvas(image.width, image.height);
    canvas.getContext('2d').drawImage(image, 0, 0);
    let blob, quality;
    for (quality of [.82, .78, .74, .7]) {
      blob = await canvas.convertToBlob({type: 'image/webp', quality});
      if (blob.size <= 350_000) break;
    }
    const buffer = new Uint8Array(await blob.arrayBuffer()); let text = '';
    for (let i = 0; i < buffer.length; i += 0x8000) text += String.fromCharCode(...buffer.subarray(i, i + 0x8000));
    return {width: image.width, height: image.height, quality, data: btoa(text)};
  }, bytes.toString('base64'));
  const webp = Buffer.from(result.data, 'base64');
  if (webp.length > 350_000) throw Error(`Loading landscape exceeds 350 kB: ${webp.length}`);
  mkdirSync('public/assets/loading', {recursive: true});
  writeFileSync(target, webp);
  const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
  const manifest = {source, target, width: result.width, height: result.height, quality: result.quality, sourceSha256: sha256(bytes), derivedSha256: sha256(webp), bytes: webp.length};
  writeFileSync('assets-source/loading/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify(manifest, null, 2));
} finally { await browser.close(); }
