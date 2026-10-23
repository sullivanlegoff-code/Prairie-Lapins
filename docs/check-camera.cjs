// Shared by the browser checks: mirrors Recentrer in a pure MeadowCamera model.
// The game frames the starting buildings using the DOM chrome (HUD, left action column,
// laboratory footer); this reads the same rectangles as MeadowScene.screenChrome, without hooks.
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
let bundled = null;
/** Pure modules compiled from src/ (unchanged production code), bundled once per process. */
exports.modules = () => {
  if (bundled) return bundled;
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'check-camera-')), 'modules.cjs');
  require('esbuild').buildSync({stdin: {contents: [
    "export {MeadowCamera} from './src/ui/gestures'; export {finePoint,gridPoint,buildingCenter,ownedRegions} from './docs/screen-points';",
    "export {visibleColumns} from './src/simulation/habitats';", "export {PARCELS} from './src/config/land';",
    "export {ISLAND} from './src/config/islandGeometry';", "export {recenterCamera} from './src/display/recenter';",
    "export {rabbitOffset} from './src/display/rabbitLayout';"].join('\n'), resolveDir: path.join(__dirname, '..'), loader: 'ts'},
    bundle: true, platform: 'node', format: 'cjs', outfile: file, define: {'import.meta.env.BASE_URL': JSON.stringify('/')}});
  return bundled = require(file);
};
exports.screenChrome = page => page.evaluate(() => {
  const visible = id => {const e = document.getElementById(id); return e && !e.hidden && getComputedStyle(e).display !== 'none' ? e.getBoundingClientRect() : null;};
  const columns = ['open-missions', 'meadow-actions'].map(visible).filter(r => r && r.width > 0), footer = visible('dev-badge');
  return {width: innerWidth, height: innerHeight, hudBottom: document.getElementById('hud')?.getBoundingClientRect().bottom ?? 0,
    column: columns.length ? {right: Math.max(...columns.map(r => r.right)), bottom: Math.max(...columns.map(r => r.bottom))} : null, footerTop: footer ? footer.top : null};
});
/** Click Recentrer in the page and put the model where the game put its camera. */
exports.recenter = async (page, model, state, recenterCamera) => {
  await page.click('#recenter-view');
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  recenterCamera(model, state, await exports.screenChrome(page));
};
/** A fresh model with the scene's columns and owned-land regions, positioned as at boot (the game
 * recentres once when it starts) without clicking Recentrer, which would also advance the tutorial. */
exports.booted = async (page, state) => {
  const m = exports.modules(), size = page.viewportSize(), model = new m.MeadowCamera(), n = m.ISLAND.parcelCells;
  model.resize(size.width, size.height); model.setColumns(m.visibleColumns(state));
  model.setVisibleRegions(m.ownedRegions(state.acquiredParcels));
  m.recenterCamera(model, state, await exports.screenChrome(page));
  return model;
};
/** A fresh model with the scene's columns and owned-land regions, after a real Recentrer. */
exports.recentered = async (page, state) => {
  const m = exports.modules(), size = page.viewportSize(), model = new m.MeadowCamera(), n = m.ISLAND.parcelCells;
  model.resize(size.width, size.height); model.setColumns(m.visibleColumns(state));
  model.setVisibleRegions(m.ownedRegions(state.acquiredParcels));
  await exports.recenter(page, model, state, m.recenterCamera);
  return model;
};
/** Screen point inside a building's front footprint (selects it), on the current model. */
exports.buildingPoint = (model, building) => {const c = exports.modules().buildingCenter(building); return model.screen({x: c.x, y: c.y + 58});};
/** Screen point on a resident's body (the scene's hit point), from its habitat slot. */
exports.rabbitPoint = (model, state, rabbitId) => {
  const m = exports.modules(), rabbit = state.rabbits.find(r => r.id === rabbitId), home = state.buildings.find(b => b.id === rabbit.enclosureId);
  const residents = state.rabbits.filter(r => r.enclosureId === home.id), offset = m.rabbitOffset(residents.indexOf(rabbit), residents.length), c = m.buildingCenter(home);
  return model.screen({x: c.x + offset.x, y: c.y + offset.y - 9.1});
};
const silenced = new WeakSet();
let silentTrack = null;
const silence = () => silentTrack ??= fs.readFileSync(path.join(__dirname, 'test-assets', 'silence-3min.mp3'));
/** Loading screen: wait for « Jouer », press it, and wait until the game is revealed (no-op on older builds). */
exports.enter = async page => {
  if (!(await page.evaluate(() => !!document.getElementById('loading-screen')))) return;
  await page.waitForFunction(() => { const s = document.getElementById('loading-screen'); return !s || s.hidden || !document.getElementById('loading-play').disabled; }, null, {timeout: 60_000});
  if (await page.evaluate(() => document.getElementById('loading-screen').hidden)) return;
  // Streaming 5-20 MB tracks would keep the network busy (networkidle never settles) and switching
  // tracks aborts requests: these checks get a real 3-minute silent MP3 served at once (test asset,
  // docs/test-assets/silence-3min.mp3). The real music is covered by docs/loading-audio-check.cjs.
  if (!silenced.has(page)) { silenced.add(page); await page.route('**/assets/audio/music/**', route => route.fulfill({status: 200, contentType: 'audio/mpeg', body: silence()})); }
  await page.locator('#loading-play').click();
  await page.waitForFunction(() => document.getElementById('loading-screen').hidden);
};
