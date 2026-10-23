import assert from 'node:assert/strict';
import {readFileSync, readdirSync, statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve, relative, join} from 'node:path';

const root = resolve(process.argv[2]);
const base = process.argv[3] || '/Project-L/';
const laboratory = process.argv[4] === 'laboratory';
assert.ok(base.startsWith('/') && base.endsWith('/'), 'Base must be an absolute URL path');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const manifestLink = html.match(/<link rel="manifest" href="([^"]+)"/);
if (laboratory) {
  assert.equal(manifestLink, null, 'Laboratory must not advertise the game manifest');
  assert.ok(!html.includes('apple-mobile-web-app-capable'), 'Laboratory must not advertise standalone capability');
  assert.ok(!html.includes('apple-touch-icon'), 'Laboratory must not use the game home-screen icon');
} else {
  assert.equal(manifestLink?.[1], base + 'assets/app/manifest.webmanifest');
  const manifest = JSON.parse(readFileSync(join(root, 'assets/app/manifest.webmanifest'), 'utf8'));
  const manifestUrl = new URL(manifestLink[1], 'https://example.test');
  assert.equal(manifest.name, 'Prairie de lapins');
  assert.equal(manifest.short_name, 'Prairie');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.orientation, undefined, 'No orientation lock');
  for (const key of ['id', 'start_url', 'scope']) {
    assert.ok(manifest[key].startsWith('.'), `${key} must remain relative`);
    assert.equal(new URL(manifest[key], manifestUrl).pathname, base);
  }
  for (const [name, content] of Object.entries({
    'apple-mobile-web-app-capable': 'yes', 'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-title': 'Prairie de lapins', 'apple-mobile-web-app-status-bar-style': 'default',
  })) assert.ok(html.includes(`<meta name="${name}" content="${content}">`), `Missing ${name}`);
  assert.ok(html.includes('viewport-fit=cover'));
  assert.equal(manifest.icons.length, 2);
  for (const size of [180, 192, 512]) {
    const name = size === 180 ? 'apple-touch-icon.png' : `icon-${size}.png`;
    const png = readFileSync(join(root, 'assets/app', name));
    assert.equal(png.subarray(0,8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(png.readUInt32BE(16), size); assert.equal(png.readUInt32BE(20), size);
    assert.equal(png[25], 2, 'App icons must be opaque RGB PNGs');
    if (size !== 180) {
      const entry = manifest.icons.find(icon => icon.sizes === `${size}x${size}`);
      assert.equal(entry?.type, 'image/png');
      assert.equal(new URL(entry.src, manifestUrl).pathname, base + 'assets/app/' + name);
    } else assert.ok(html.includes(`href="${base}assets/app/${name}"`));
  }
}
const files = [];
function walk(directory) {
  for (const name of readdirSync(directory)) {
    // Separate entries are checked independently; never scan them as the normal game's bundle.
    if (!laboratory && directory === root && ['dev', 'cooktap-prototype'].includes(name)) continue;
    const path = join(directory, name);
    if (statSync(path).isDirectory()) walk(path); else files.push(path);
  }
}
walk(root);
assert.ok(files.some(path => path.endsWith('.js')), 'No production JavaScript found');
for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  const url = match[1];
  if (url === 'data:,') continue;
  assert.ok(url.startsWith(base + 'assets/'), `Unexpected entry resource: ${url}`);
  assert.ok(statSync(join(root, url.slice(base.length))).isFile(), `Missing entry resource: ${url}`);
}
let scripts = '';
for (const path of files) {
  const name = relative(root, path).replaceAll('\\', '/');
  assert.ok(name === 'index.html' || name === 'build-revision.txt' || name === '.nojekyll' || name.startsWith('assets/'), `Unexpected published file: ${name}`);
  if (!/\.(html|js|css)$/.test(path)) continue;
  const text = readFileSync(path, 'utf8');
  assert.ok(!/http:\/\/(localhost|127\.0\.0\.1|192\.168\.)/.test(text), 'Local-server URL found in build');
  if (path.endsWith('.js')) {
    scripts += text;
    if (!laboratory) for (const marker of ['prairie-lapins.development.', 'developmentEnvironment', 'dev-time-', 'dev-grant-', 'dev-scenario-', 'dev-xp-', 'dev-add-rabbit', 'Lapins de test', 'nurseryUnlocks', 'nurseryStates']) {
      assert.ok(!text.includes(marker), `Development tool found in normal build: ${marker}`);
    }
  }
}
if (laboratory) for (const marker of ['prairie-lapins.development.', 'dev-time-', 'dev-grant-', 'dev-scenario-', 'dev-xp-', 'dev-add-rabbit', 'Lapins de test']) assert.ok(scripts.includes(marker), `Missing laboratory tool: ${marker}`);
if (laboratory) for (const marker of ['islandStart', 'islandExpanded', 'islandFull', 'decorationStart', 'decorationDemo', 'decoratedHabitat', 'decorationDense', 'Collection — toutes les espèces et recettes', 'nurseryUnlocks', 'nurseryStates', 'Nurserie — déblocages', 'Nurserie — quatre états']) assert.ok(scripts.includes(marker), `Missing laboratory scenario: ${marker}`);
const farm = readFileSync(join(root, 'assets/buildings/farm-windmill.png'));
assert.equal(farm.subarray(0,8).toString('hex'), '89504e470d0a1a0a', 'Farm must be a PNG');
assert.equal(farm.readUInt32BE(16), 1254); assert.equal(farm.readUInt32BE(20), 1254);
assert.equal(farm[25], 6, 'Farm texture must contain alpha');
assert.equal(createHash('sha1').update('blob '+farm.length+'\0').update(farm).digest('hex'), '7d327382bf7714b8f32fc50ee08ebb7eb4b94ff5', 'Unexpected farm artwork');
const nest = readFileSync(join(root, 'assets/buildings/nest-heart-cave.png'));
assert.equal(nest.subarray(0,8).toString('hex'), '89504e470d0a1a0a', 'Nest must be a PNG');
assert.equal(nest.readUInt32BE(16), 1254); assert.equal(nest.readUInt32BE(20), 1254);
assert.equal(nest[25], 6, 'Nest texture must contain alpha');
assert.equal(createHash('sha1').update('blob '+nest.length+'\0').update(nest).digest('hex'), 'b5b09bdaa4f774f71f1a52ffcb8507430f480ebd', 'Unexpected nest artwork');
const nursery = readFileSync(join(root, 'assets/buildings/nursery-bunny-house.png'));
assert.equal(nursery.subarray(0,8).toString('hex'), '89504e470d0a1a0a', 'Nursery must be a PNG');
assert.equal(nursery.readUInt32BE(16), 1254); assert.equal(nursery.readUInt32BE(20), 1254);
assert.equal(nursery[25], 6, 'Nursery texture must contain alpha');
assert.equal(createHash('sha1').update('blob '+nursery.length+'\0').update(nursery).digest('hex'), '468b2e7244f26f2a264539a696bac9f8afca0d01', 'Unexpected nursery artwork');
// Approved Nursery v2 base (src/config/nurseryArt.ts). The expected blob SHA-1 was computed from the approved source
// image (generated_images/…/exec-6fb74ffc-8b11-4e97-94cc-f26086135ed5.png), never from a build output.
const nurseryBase = readFileSync(join(root, 'assets/buildings/nursery-v2-base.png'));
assert.equal(nurseryBase.subarray(0,8).toString('hex'), '89504e470d0a1a0a', 'Nursery v2 base must be a PNG');
assert.equal(nurseryBase.readUInt32BE(16), 1254); assert.equal(nurseryBase.readUInt32BE(20), 1254);
assert.equal(nurseryBase[25], 6, 'Nursery v2 base must contain alpha');
assert.equal(createHash('sha1').update('blob '+nurseryBase.length+'\0').update(nurseryBase).digest('hex'), 'ae79e79783d92c4db88b095f437ee6169d36bff1', 'Unexpected nursery v2 base artwork');
// Approved Nursery v2 overlay sprites (src/config/nurseryArt.ts). Blob SHA-1s computed from the approved source images in
// generated_images/…/ (exec-21c238fc… baby, exec-fc97721d… veil, exec-cfa215fc… lock), never from a build output.
for (const [name, sha1] of [['baby', '345a98f9efc3ef73c27306c7d1d319f3bdc84dd0'], ['veil', '9b463845a2097e47ec0f26864571013b93258ad8'], ['lock', 'e4b25a0a4e24003e2302abc01893f21b76515dd3']]) {
  const overlay = readFileSync(join(root, `assets/buildings/nursery-v2-${name}.png`));
  assert.equal(overlay.subarray(0,8).toString('hex'), '89504e470d0a1a0a', `Nursery v2 ${name} must be a PNG`);
  assert.equal(overlay.readUInt32BE(16), 1254); assert.equal(overlay.readUInt32BE(20), 1254);
  assert.equal(overlay[25], 6, `Nursery v2 ${name} must contain alpha`);
  assert.equal(createHash('sha1').update('blob '+overlay.length+'\0').update(overlay).digest('hex'), sha1, `Unexpected nursery v2 ${name} artwork`);
}
// Reduced Nursery v2 overlay textures actually loaded by the game (scripts/derive-nursery-overlays.mjs derives them from the approved
// sources above; `--check` re-derives and compares pixels). Exact size, alpha and committed blob SHA-1 of each.
for (const [name, size, sha1] of [['baby', 192, '79e1bf89fe3b4a8ddc60fa2d58525582dc776268'], ['veil', 192, 'dba575f70a8cba6724299f62f8702cef3e364f75'], ['lock', 96, '15dde54abac573c0bee6b01390646290c95cb8d0']]) {
  const reduced = readFileSync(join(root, `assets/buildings/nursery-v2-${name}-${size}.png`));
  assert.equal(reduced.subarray(0,8).toString('hex'), '89504e470d0a1a0a', `Reduced nursery v2 ${name} must be a PNG`);
  assert.equal(reduced.readUInt32BE(16), size); assert.equal(reduced.readUInt32BE(20), size);
  assert.equal(reduced[25], 6, `Reduced nursery v2 ${name} must contain alpha`);
  assert.equal(createHash('sha1').update('blob '+reduced.length+'\0').update(reduced).digest('hex'), sha1, `Unexpected reduced nursery v2 ${name} texture`);
}
console.log(`${laboratory ? 'Laboratory' : 'Normal production'} checked: ${files.length} files; base ${base}; isolated tools and no local-server URLs.`);
