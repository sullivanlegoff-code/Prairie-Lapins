// Nursery v2 cushion overlays on the source laboratory (Vite dev server): real UI for purchase, move and time, real commands
// for welcome/transfer, fixtures only for states that are slow to reach. Source-only scene hook (window.__scene), intercepted in a
// disposable profile and never shipped. usage: node docs/nursery-overlays-browser-check.cjs [url]   (PRAIRIE_CAPTURE_DIR for captures)
const enterGame = require('./check-camera.cjs').enter, camera = require('./check-camera.cjs');
const {chromium} = require('playwright'), fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict');
const url = process.argv[2] || process.env.PRAIRIE_TEST_URL || 'http://127.0.0.1:5183/Project-L/?dev=1', out = process.env.PRAIRIE_CAPTURE_DIR || path.join(os.tmpdir(), 'nursery-overlays-proof');
const KEY = 'prairie-lapins.development.prairie-lapins.save.v1';
(async () => {
  fs.mkdirSync(out, {recursive: true});
  // The production placement model (pure), bundled from src/ unchanged.
  const bundle = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'overlay-model-')), 'model.cjs');
  require('esbuild').buildSync({stdin: {contents: "export {slotPlacement, baseToWorld, slotOverlays, BASE_PIXEL} from './src/display/nurseryOverlayModel'; export {NURSERY_ART, NURSERY_SLOT_ANCHORS, NURSERY_OVERLAY_ART} from './src/config/nurseryArt';", resolveDir: process.cwd(), loader: 'ts'},
    bundle: true, platform: 'node', format: 'cjs', outfile: bundle, define: {'import.meta.env.BASE_URL': JSON.stringify('/')}});
  const model = require(bundle), M = camera.modules();
  const browser = await chromium.launch({executablePath: process.env.PRAIRIE_CHROMIUM && process.env.PRAIRIE_CHROMIUM !== 'playwright' ? process.env.PRAIRIE_CHROMIUM : undefined, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
  const report = {passed: false, url, browser: 'Chromium touch emulation; not a physical iPhone', checks: [], captures: [], errors: []};
  const page = await browser.newPage({viewport: {width: 844, height: 390}, hasTouch: true}); page.setDefaultTimeout(20000);
  page.on('pageerror', e => report.errors.push('pageerror: ' + e.message)); page.on('console', m => { if (m.type() === 'error') report.errors.push('console: ' + m.text()); });
  await page.addLocatorHandler(page.locator('#player-level-dialog'), () => page.locator('#continue-level-up').tap());
  await page.route('**/src/main.ts*', async route => { const r = await route.fetch(), s = await r.text();
    await route.fulfill({response: r, body: s.replace('const game = new Phaser.Game', 'window.__scene=scene;window.__getUi=()=>ui;const game = new Phaser.Game')}); });
  const cdp = await page.context().newCDPSession(page);
  const settle = () => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  const read = () => page.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
  const nurseryOf = s => s.buildings.find(b => b.kind === 'nursery');
  const shot = async name => { await settle(); const f = name + '.png'; await page.screenshot({path: path.join(out, f)}); report.captures.push(f); };
  const ready = async () => { await enterGame(page); await page.locator('#game canvas').waitFor(); await page.waitForLoadState('networkidle'); await settle();
    await page.waitForFunction(() => document.querySelector('#save-status')?.dataset.status === 'saved' && window.__scene?.nurseryOverlays);
    const hide = page.getByRole('button', {name: 'Masquer', exact: true}); if (await hide.isVisible()) await hide.tap(); await settle(); };
  const rewrite = async edit => { const s = await read(); edit(s); await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, JSON.stringify(s)]); await page.reload(); await ready(); };
  const close = async () => { if (await page.locator('#game-panel').isVisible()) await page.locator('#close-panel').tap(); await settle(); };
  const act = command => page.evaluate(c => { const r = window.__scene.controller.perform(c); return r.ok ? {ok: true, value: r.value} : {ok: false, reason: r.reason}; }, command);
  /** Snapshot of every overlay object of the nursery, from the live scene. */
  const overlays = () => page.evaluate(() => {
    const sc = window.__scene, s = sc.current, n = s.buildings.find(b => b.kind === 'nursery'), v = n && sc.nurseryOverlays.real.get(n.id), base = n && sc.buildingViews.get(n.id);
    const objects = sc.buildingsLayer.list.filter(o => o.texture && /^nursery-v2-(baby|veil|lock|halo)$/.test(o.texture.key));
    const pick = (i, o) => ({visible: o.visible, x: o.x, y: o.y, sx: o.scaleX, sy: o.scaleY, angle: o.angle, depth: o.depth, alpha: o.alpha, tint: o.isTinted ? o.tintTopLeft : null, texture: o.texture.key, w: o.displayWidth, h: o.displayHeight});
    return {objectsInLayer: objects.length, ids: [...sc.nurseryOverlays.real.keys()], now: s.lastSimulatedAt,
      base: base && {x: base.x, y: base.y, depth: base.depth, scale: base.scaleX, texture: base.texture.key},
      slots: v ? v.slots.map((q, i) => ({halo: pick(i, q.halo), baby: pick(i, q.baby), veil: pick(i, q.veil), lock: pick(i, q.lock)})) : null};
  });
  const visibleKinds = o => o.slots.map(s => ['halo', 'baby', 'veil', 'lock'].filter(k => s[k].visible).join('+') || 'empty');
  const babyId = i => 'birth-' + (800 + i);
  const FIXED = 0.02;
  /** Every overlay sits where the production model puts it, relative to the base, at this moment (any pan/zoom/move). */
  /** Every overlay of `slots` sits where the production model puts it relative to `base`, in the same layer order. */
  const assertSlots = (slots, base, label, look) => {
    slots.forEach((s, i) => { const p = model.slotPlacement(i);
      for (const k of ['baby', 'veil', 'lock']) { assert.ok(Math.abs(s[k].x - (base.x + p[k].x)) < FIXED && Math.abs(s[k].y - (base.y + p[k].y)) < FIXED, `${label}: slot ${i} ${k} position`); assert.ok(Math.abs(s[k].sx - p[k].scale) < 1e-6, `${label}: slot ${i} ${k} scale`); assert.ok(s[k].depth > base.depth, `${label}: ${k} in front of the base`); }
      assert.ok(Math.abs(s.halo.x - (base.x + p.halo.x)) < FIXED && Math.abs(s.halo.w - p.halo.width) < FIXED, `${label}: slot ${i} halo`);
      assert.ok(s.halo.depth < s.baby.depth && s.baby.depth < s.veil.depth && s.veil.depth < s.lock.depth, `${label}: layer order halo < baby < veil < lock`);
      assert.equal(s.baby.angle, model.NURSERY_OVERLAY_ART.baby.angle, `${label}: upright base, baby lying at the configured angle`);
      for (const k of ['halo', 'baby', 'veil', 'lock']) { assert.equal(s[k].alpha, look.alpha, `${label}: slot ${i} ${k} opacity`); assert.equal(s[k].tint, look.tint, `${label}: slot ${i} ${k} tint`); } });
  };
  const OPAQUE = {alpha: 1, tint: null};
  const assertAligned = (o, label) => { assert.ok(o.base, label + ': base present'); assertSlots(o.slots, o.base, label, OPAQUE); assert.equal(o.objectsInLayer, 16, label + ': exactly sixteen overlay objects for the one nursery (no duplicate, no orphan)'); };
  /** The move preview's overlays (root objects, hidden when idle) and its ghost base, from the live scene. */
  const ghost = () => page.evaluate(() => {
    const sc = window.__scene, set = sc.nurseryOverlays.ghostSet, g = sc.buildingGhost;
    const pick = o => ({visible: o.visible, x: o.x, y: o.y, sx: o.scaleX, angle: o.angle, depth: o.depth, alpha: o.alpha, tint: o.isTinted ? o.tintTopLeft : null, texture: o.texture.key, w: o.displayWidth});
    return {rootObjects: sc.children.list.filter(o => o.texture && /^nursery-v2-(baby|veil|lock|halo)$/.test(o.texture.key)).length,
      base: g && {visible: g.visible, x: g.x, y: g.y, alpha: g.alpha, tint: g.isTinted ? g.tintTopLeft : null, depth: g.depth, scale: g.scaleX, texture: g.texture.key},
      slots: set ? set.slots.map(q => ({halo: pick(q.halo), baby: pick(q.baby), veil: pick(q.veil), lock: pick(q.lock)})) : null};
  });
  const VALID = 0xe4ffb5, INVALID = 0xf3a6a1;
  /** A shown preview: same four states as the real nursery, anchored on the ghost base, sharing its opacity and valid/invalid tint. */
  const assertGhost = (g, kinds, valid, label) => {
    assert.ok(g.base && g.base.visible, label + ': ghost base shown'); assert.equal(g.base.alpha, .55, label + ': ghost opacity'); assert.equal(g.base.tint, valid ? VALID : INVALID, label + ': ghost tint');
    assert.deepEqual(visibleKinds(g), kinds, label + ': ghost states = real states'); assertSlots(g.slots, {x: g.base.x, y: g.base.y, depth: g.base.depth}, label, {alpha: g.base.alpha, tint: g.base.tint});
    assert.equal(g.rootObjects, 16, label + ': sixteen preview objects, reused');
  };
  const assertGhostHidden = (g, label) => { assert.ok(!g.base || !g.base.visible, label + ': ghost base hidden'); assert.ok(!g.slots || g.slots.every(s => ['halo', 'baby', 'veil', 'lock'].every(k => !s[k].visible)), label + ': every preview overlay hidden'); };
  const mkBaby = (slot, L, ready, id) => ({slot, birth: {id: id ?? babyId(slot), species: 'paille', guaranteed: false, reservedDiscovery: false}, startedAt: ready ? L - 300000 : L, readyAt: ready ? L : L + 300000}); // a Paille grows for exactly 5 minutes
  const check = (name, fn) => fn().then(() => report.checks.push(name));
  // Camera helpers (the page's real camera, driven by real touch).
  let cam = new M.MeadowCamera();
  const fresh = async () => { cam = await camera.recentered(page, await read()); };
  const safe = () => page.evaluate(() => { for (const fy of [.65, .75, .5, .85]) for (const fx of [.5, .25, .35, .65, .75]) { const p = {x: innerWidth * fx, y: innerHeight * fy}; if (p.x > 65 && p.x < innerWidth - 65 && p.y > 65 && p.y < innerHeight - 65 && document.elementFromPoint(p.x, p.y)?.tagName === 'CANVAS') return p; } throw Error('no canvas point'); });
  const pan = async (dx, dy) => { const from = await safe(), to = {x: from.x + dx, y: from.y + dy};
    await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [from]}); await cdp.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [to]});
    await cdp.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []}); cam.pan(dx, dy); await settle(); };
  const zoom = async z => { const at = await safe(), factor = z / cam.zoom; await page.mouse.move(at.x, at.y); await page.mouse.wheel(0, -Math.log(factor) * 1000); cam.scale(factor, at); await settle(); };
  const focus = async (world, desired) => { const r = Object.assign(new M.MeadowCamera(), cam), cur = cam.screen(world); r.pan(desired.x - cur.x, desired.y - cur.y); desired = r.screen(world);
    for (let i = 0; i < 40; i++) { const p = cam.screen(world), dx = desired.x - p.x, dy = desired.y - p.y; if (Math.hypot(dx, dy) < 9) return; await pan(Math.max(-55, Math.min(55, dx)), Math.max(-55, Math.min(55, dy))); } throw Error('cannot frame'); };
  const worldTap = async world => { const p = cam.screen(world); assert.equal(await page.evaluate(p => document.elementFromPoint(p.x, p.y)?.tagName, p), 'CANVAS', 'target exposed'); await page.touchscreen.tap(p.x, p.y); await settle(); };
  const frameNursery = async (z = 1.05) => { await close(); await fresh(); if (z !== cam.zoom) await zoom(z); const n = nurseryOf(await read()); await focus(M.buildingCenter(n), {x: 422, y: 205}); };

  try {
    // ---- 1. New game: one empty cushion, three locked.
    await page.goto(url); await ready();
    let s = await read(), o = await overlays();
    assert.deepEqual(nurseryOf(s).nursery, {capacity: 1, babies: []});
    await check('new game: slot 0 empty, slots 1-3 veiled with a lock, no baby or halo', async () => { assert.deepEqual(visibleKinds(o), ['empty', 'veil+lock', 'veil+lock', 'veil+lock']); assertAligned(o, 'new game'); });
    // The game loads the reduced copies, with the configured sizes; the 1254² sources are never requested for these overlays.
    const loaded = await page.evaluate(() => ({sizes: Object.fromEntries(['baby', 'veil', 'lock'].map(k => [k, window.__scene.textures.get('nursery-v2-' + k).getSourceImage().width])),
      requested: performance.getEntriesByType('resource').map(e => e.name).filter(u => /nursery-v2-(baby|veil|lock)/.test(u))}));
    await check('overlay textures: configured reduced sizes loaded, original 1254² sources never requested', async () => {
      assert.deepEqual(loaded.sizes, Object.fromEntries(['baby', 'veil', 'lock'].map(k => [k, model.NURSERY_OVERLAY_ART[k].width])));
      assert.ok(loaded.requested.length >= 3 && loaded.requested.every(u => /nursery-v2-(baby|veil)-192\.png|nursery-v2-lock-96\.png/.test(u)), 'only reduced copies requested: ' + loaded.requested.join(', ')); });
    await frameNursery(1.65); await shot('overlays-new-game-close');
    // ---- 2. Real purchase of a cushion: only the new cushion's veil and lock disappear.
    await rewrite(x => { x.hearts = 500; });
    const before = await overlays(); await close();
    await page.evaluate(id => window.__getUi().open({kind: 'building', id}), nurseryOf(await read()).id); await settle();
    const price = Number((await page.locator('#panel-content button', {hasText: /^Débloquer/}).first().innerText()).match(/(\d+) c/)[1]);
    await page.locator('#panel-content button', {hasText: /^Débloquer/}).first().tap();
    await page.locator('#game-dialog').getByRole('button', {name: 'Confirmer', exact: true}).tap();
    await page.waitForFunction(() => window.__scene.current.buildings.find(b => b.kind === 'nursery').nursery.capacity === 2);
    await close(); s = await read(); o = await overlays();
    await check('real purchase: only slot 1 loses its veil and lock; the others are untouched', async () => {
      assert.equal(s.hearts, 500 - price); assert.deepEqual(visibleKinds(o), ['empty', 'empty', 'veil+lock', 'veil+lock']);
      for (const i of [0, 2, 3]) assert.deepEqual(o.slots[i], before.slots[i], 'slot ' + i + ' untouched'); assertAligned(o, 'after purchase'); });
    // ---- 3. Coexistence of the four states.
    await rewrite(x => { const n = nurseryOf(x), L = x.lastSimulatedAt; n.nursery = {capacity: 3, babies: [mkBaby(0, L, true), mkBaby(1, L, false)]}; x.nextId = 900; x.hearts = 500; });
    o = await overlays();
    await check('coexistence: ready / growing / empty / locked', async () => { assert.deepEqual(visibleKinds(o), ['halo+baby', 'baby', 'empty', 'veil+lock']); assertAligned(o, 'mixed'); });
    await frameNursery(1.65); await shot('overlays-mixed-close'); await frameNursery(1.05); await shot('overlays-mixed-normal');
    // ---- 4. Time passes through the lab clock (real button): the halo appears, the baby does not change.
    const growingBefore = o.slots[1].baby; assert.equal(o.slots[1].halo.visible, false);
    await page.locator('#open-settings').tap(); await page.locator('#dev-time-5').tap(); await close(); await page.waitForFunction(() => window.__scene.current.buildings.find(b => b.kind === 'nursery').nursery.babies.every(b => b.readyAt <= window.__scene.current.lastSimulatedAt)); await settle();
    const after = await overlays();
    await check('time passing: the halo appears at readyAt and the baby sprite is unchanged', async () => {
      assert.equal(after.slots[1].halo.visible, true); assert.deepEqual(after.slots[1].baby, growingBefore); assert.deepEqual(visibleKinds(after), ['halo+baby', 'halo+baby', 'empty', 'veil+lock']); assertAligned(after, 'after time'); });
    // ---- 5. Welcome one exact baby; holes keep the others in place.
    await rewrite(x => { const n = nurseryOf(x), L = x.lastSimulatedAt; n.nursery = {capacity: 4, babies: [mkBaby(0, L, true), mkBaby(1, L, true), mkBaby(2, L, false)]}; x.nextId = 900; });
    const full = await overlays(); const home = (await read()).buildings.find(b => b.kind === 'enclosure').id;
    assert.deepEqual((await act({type: 'welcome', enclosureId: home, birthId: babyId(1)})).ok, true); await settle();
    const hole = await overlays();
    await check('welcome of one precise baby: only its slot becomes empty; the other babies stay exactly in place', async () => {
      assert.deepEqual(visibleKinds(hole), ['halo+baby', 'empty', 'baby', 'empty']); for (const i of [0, 2, 3]) assert.deepEqual(hole.slots[i], full.slots[i], 'slot ' + i + ' unchanged'); assertAligned(hole, 'hole'); });
    // ---- 6. The next arrival takes the lowest free slot (the hole).
    await rewrite(x => { const n = nurseryOf(x), nest = x.buildings.find(b => b.kind === 'nest'), L = x.lastSimulatedAt;
      n.nursery = {capacity: 4, babies: [mkBaby(0, L, true), mkBaby(2, L, false)]}; x.nextId = 900;
      nest.breeding = {parents: ['rabbit-2', 'rabbit-3'], startedAt: L - 1200000, endsAt: L, birth: {id: babyId(7), species: 'neige', guaranteed: false, reservedDiscovery: false}}; });
    const nest = (await read()).buildings.find(b => b.kind === 'nest'); const pre = await overlays();
    assert.equal((await act({type: 'transferBirth', id: nest.id, birthId: babyId(7)})).ok, true); await settle(); const arrived = await overlays(), sa = await read();
    await check('next arrival takes the lowest free slot and nobody moves', async () => {
      assert.deepEqual(nurseryOf(sa).nursery.babies.map(b => [b.slot, b.birth.id]).sort(), [[0, babyId(0)], [1, babyId(7)], [2, babyId(2)]]);
      assert.deepEqual(visibleKinds(arrived), ['halo+baby', 'baby', 'baby', 'empty']); for (const i of [0, 2]) assert.deepEqual(arrived.slots[i], pre.slots[i], 'slot ' + i + ' unchanged'); assertAligned(arrived, 'arrival'); });
    // ---- 7. Save / reload: same slots, same states.
    const saved = visibleKinds(arrived), placed = arrived.slots.map(q => [q.baby.x, q.baby.y, q.veil.x, q.lock.x]); await page.reload(); await ready(); const reloaded = await overlays();
    await check('reload: same slots and states, same positions', async () => { assert.deepEqual(visibleKinds(reloaded), saved); assert.deepEqual(reloaded.slots.map(q => [q.baby.x, q.baby.y, q.veil.x, q.lock.x]), placed); assertAligned(reloaded, 'reload'); });
    // ---- 8. Pan, zoom, selection, Recentrer: overlays stay glued to the base.
    await frameNursery(1.05); await pan(60, -30); await zoom(1.4); await pan(-40, 25); let moved = await overlays(); assertAligned(moved, 'pan/zoom');
    await fresh(); const nn = nurseryOf(await read()); await focus({x: M.buildingCenter(nn).x, y: M.buildingCenter(nn).y + 58}, {x: 300, y: 215}); await worldTap({x: M.buildingCenter(nn).x, y: M.buildingCenter(nn).y + 58});
    assert.equal(await page.locator('#panel-title').textContent(), 'Nurserie'); assertAligned(await overlays(), 'selected'); await shot('overlays-selected'); await close();
    await page.locator('#recenter-view').tap(); await settle(); assertAligned(await overlays(), 'recentre');
    report.checks.push('pan, zoom, selection and Recentrer: every overlay keeps its model position and scale relative to the base');
    // ---- 9. Move preview: the ghost carries the four real states; valid and invalid; pan/zoom; transition; photo; cancel; confirm; cycles.
    await rewrite(x => { const n = nurseryOf(x), L = x.lastSimulatedAt; n.nursery = {capacity: 3, babies: [mkBaby(0, L, true, 'birth-870'), {...mkBaby(1, L, false), birth: {id: 'birth-871', species: 'dragon', guaranteed: false, reservedDiscovery: false}, startedAt: L, readyAt: L + 7200000}]}; x.nextId = 900; }); // ids unused by any rabbit welcomed above
    const stateAt = await read(), realKinds = ['halo+baby', 'baby', 'empty', 'veil+lock'];
    const placementBundle = path.join(os.tmpdir(), 'overlay-placement-' + process.pid + '.cjs');
    require('esbuild').buildSync({stdin: {contents: "export {buildingPlacementReason} from './src/simulation/placement';", resolveDir: process.cwd(), loader: 'ts'}, bundle: true, platform: 'node', format: 'cjs', outfile: placementBundle, define: {'import.meta.env.BASE_URL': '"/"'}});
    const {buildingPlacementReason} = require(placementBundle);
    /** The nearest legal free cell at least six fine cells from the nursery, by the real placement rule. */
    const legalCell = (st, here) => { let best = null; for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) { const d = Math.hypot(x - here.x, y - here.y); if (d >= 6 && !buildingPlacementReason(st, x, y, here.id) && (!best || d < best.d)) best = {x, y, d}; } assert.ok(best, 'a legal destination exists'); return best; };
    const beginMove = async () => { const here = nurseryOf(await read()); await close(); await fresh(); const t = {x: M.buildingCenter(here).x, y: M.buildingCenter(here).y + 58}; await focus(t, {x: 300, y: 215}); await worldTap(t);
      assert.equal(await page.locator('#panel-title').textContent(), 'Nurserie'); await page.getByRole('button', {name: 'Déplacer ce bâtiment', exact: true}).tap(); return here; };
    const chooseValid = async here => { const cell = legalCell(await read(), here), dest = M.finePoint(cell.x + .5, cell.y + .5); await focus(dest, {x: 250, y: 200}); await worldTap(dest); assert.match(await page.locator('.placement-valid').innerText(), /4 × 4/); return cell; };
    const beforeMove = await overlays(); let here = await beginMove(); let cell = await chooseValid(here);
    // 9a. Valid destination: the ghost shows the same four states; the real nursery and its overlays stay together where they are.
    let g1 = await ghost(), realNow = await overlays();
    assertGhost(g1, realKinds, true, 'valid preview'); assert.deepEqual(realNow.slots, beforeMove.slots, 'real overlays stay in place during the preview'); assertAligned(realNow, 'real during preview');
    assert.deepEqual(nurseryOf(await read()).nursery, nurseryOf(stateAt).nursery, 'no business data changed by the preview'); await shot('overlays-move-preview-valid');
    // 9b. Pan and zoom during the preview: the ghost stays glued to its cell, unchanged in states, scale and tint.
    await pan(-45, 20); await zoom(1.3); await pan(30, -15); const g2 = await ghost();
    assertGhost(g2, realKinds, true, 'preview after pan/zoom'); assert.deepEqual([g2.base.x, g2.base.y], [g1.base.x, g1.base.y], 'the ghost stays on its candidate cell');
    // 9c. Invalid destination (the nest's cell): same composition, refusal tint.
    const nestB = (await read()).buildings.find(b => b.kind === 'nest'), nc = M.buildingCenter(nestB); await focus(nc, {x: 250, y: 200}); await worldTap(nc);
    assert.equal(await page.locator('.placement-invalid').count(), 1, 'the nest cell is refused');
    const g3 = await ghost(); assertGhost(g3, realKinds, false, 'invalid preview'); assert.notDeepEqual([g3.base.x, g3.base.y], [g1.base.x, g1.base.y], 'the invalid preview moved to the nest cell'); await shot('overlays-move-preview-invalid');
    cell = await chooseValid(here); const g4 = await ghost(); assertGhost(g4, realKinds, true, 'valid again after an invalid cell'); assert.deepEqual([g4.base.x, g4.base.y], [g1.base.x, g1.base.y]);
    // 9d. Photo mode (scene level: the interface's own photo button closes the panel and cancels the move): hidden, then restored exactly.
    await page.evaluate(() => window.__scene.setPhoto(true)); await settle(); assertGhostHidden(await ghost(), 'photo mode');
    assert.equal((await overlays()).slots.length, 4, 'the real overlays are untouched by the ghost in photo mode');
    await page.evaluate(() => window.__scene.setPhoto(false)); await settle(); const g5 = await ghost(); assertGhost(g5, realKinds, true, 'after photo mode'); assert.deepEqual(g5.slots, g4.slots, 'restored exactly');
    // 9e. Cancel: every preview object hidden, the real nursery and its overlays intact; the objects are kept for reuse.
    await page.getByRole('button', {name: 'Annuler · aucun coût', exact: true}).tap(); await close(); await settle();
    const gCancel = await ghost(), realCancel = await overlays(); assertGhostHidden(gCancel, 'after cancel'); assert.equal(gCancel.rootObjects, 16, 'objects kept, not recreated');
    assert.deepEqual(realCancel.slots, beforeMove.slots, 'real overlays intact after cancel'); assert.deepEqual([nurseryOf(await read()).x, nurseryOf(await read()).y], [here.x, here.y]); await shot('overlays-move-after-cancel');
    // 9f. Reopen, then confirm: the whole real nursery joins the destination; the preview disappears.
    here = await beginMove(); cell = await chooseValid(here); const gConfirm = await ghost(); assertGhost(gConfirm, realKinds, true, 'reopened preview');
    await page.getByRole('button', {name: 'Confirmer le déplacement · gratuit', exact: true}).tap(); await close(); await settle();
    const movedNow = await overlays(), gAfter = await ghost(), nm = nurseryOf(await read());
    await check('move preview: ghost with the four real states, valid/invalid tint, pan/zoom, photo, cancel and confirm', async () => {
      assert.deepEqual([nm.x, nm.y], [cell.x, cell.y]); assertGhostHidden(gAfter, 'after confirm'); assert.equal(gAfter.rootObjects, 16);
      assert.deepEqual(visibleKinds(movedNow), realKinds); assertAligned(movedNow, 'moved');
      assert.deepEqual([movedNow.base.x, movedNow.base.y], [gConfirm.base.x, gConfirm.base.y], 'the real base lands where the ghost was');
      movedNow.slots.forEach((q, i) => { for (const k of ['halo', 'baby', 'veil', 'lock']) assert.deepEqual([q[k].x, q[k].y, q[k].sx], [gConfirm.slots[i][k].x, gConfirm.slots[i][k].y, gConfirm.slots[i][k].sx], `slot ${i} ${k} lands where its ghost was`); }); });
    await fresh(); assertAligned(await overlays(), 'recentre after move'); await shot('overlays-move-after-confirm');
    // 9g. A real change of state during the preview: the growing baby becomes ready, the ghost follows and its baby sprite is unchanged.
    const clockNow = await page.evaluate(() => window.__scene.controller.clock()), readyAtMs = clockNow + 40000;
    await rewrite(x => { const n = nurseryOf(x), L = x.lastSimulatedAt; n.nursery = {capacity: 3, babies: [mkBaby(0, L, true, 'birth-872'), {slot: 1, birth: {id: 'birth-873', species: 'paille', guaranteed: false, reservedDiscovery: false}, startedAt: readyAtMs - 300000, readyAt: readyAtMs}]}; x.nextId = 900; });
    here = await beginMove(); cell = await chooseValid(here);
    const gBefore = await ghost(); assertGhost(gBefore, ['halo+baby', 'baby', 'empty', 'veil+lock'], true, 'preview, baby still growing');
    await page.waitForFunction(r => window.__scene.controller.clock() >= r, readyAtMs, {timeout: 90000}); await page.evaluate(() => window.__scene.controller.refresh()); await settle();
    const gReady = await ghost(), realReady = await overlays();
    await check('state change during the preview: the baby becomes ready on the real nursery and on its ghost; sprites unchanged', async () => {
      assertGhost(gReady, ['halo+baby', 'halo+baby', 'empty', 'veil+lock'], true, 'preview, baby ready'); assert.deepEqual(gReady.slots[1].baby, gBefore.slots[1].baby, 'the ghost baby sprite is unchanged');
      assert.deepEqual(visibleKinds(realReady), ['halo+baby', 'halo+baby', 'empty', 'veil+lock']); assertAligned(realReady, 'real after the change'); });
    // 9h. Several cycles (open, choose, cancel / confirm): no accumulation, no orphan, no page error.
    await page.getByRole('button', {name: 'Annuler · aucun coût', exact: true}).tap(); await close();
    for (let i = 0; i < 3; i++) { here = await beginMove(); await chooseValid(here); assertGhost(await ghost(), ['halo+baby', 'halo+baby', 'empty', 'veil+lock'], true, 'cycle ' + i);
      if (i < 2) await page.getByRole('button', {name: 'Annuler · aucun coût', exact: true}).tap(); else await page.getByRole('button', {name: 'Confirmer le déplacement · gratuit', exact: true}).tap(); await close(); await settle();
      const gc = await ghost(), rc = await overlays(); assertGhostHidden(gc, 'cycle ' + i + ' end'); assert.equal(gc.rootObjects, 16); assertAligned(rc, 'cycle ' + i + ' real'); }
    report.checks.push('three move cycles (cancel, cancel, confirm): sixteen real and sixteen preview objects every time, none orphaned');
    await shot('overlays-after-cycles');
    // ---- 10. No duplicate after many refreshes; state replacement and removal leave no orphan.
    for (let i = 0; i < 6; i++) await page.evaluate(() => window.__scene.controller.refresh()); await settle();
    assertAligned(await overlays(), 'many refreshes');
    const json = await page.evaluate(k => localStorage.getItem(k), KEY), without = JSON.parse(json); without.buildings = without.buildings.filter(b => b.kind !== 'nursery');
    const imported = await page.evaluate(j => { const c = window.__scene.controller, p = c.prepareImport(j); if (!p.ok) return p.reason; const r = c.confirmImport(p.token, true); return r.ok ? 'ok' : r.reason; }, JSON.stringify(without)); await settle();
    const gone = await page.evaluate(() => ({views: window.__scene.nurseryOverlays.real.size, objects: window.__scene.buildingsLayer.list.filter(o => o.texture && /^nursery-v2-(baby|veil|lock|halo)$/.test(o.texture.key)).length}));
    const back = await page.evaluate(j => { const c = window.__scene.controller, p = c.prepareImport(j); if (!p.ok) return p.reason; return c.confirmImport(p.token, true).ok ? 'ok' : 'fail'; }, json); await settle(); const restored = await overlays();
    await check('no duplicate after refreshes; import without a nursery removes every overlay, import back restores exactly sixteen', async () => {
      assert.equal(imported, 'ok'); assert.deepEqual(gone, {views: 0, objects: 0}); assert.equal(back, 'ok'); assertAligned(restored, 'restored'); });
    // ---- 11. One "Prêt !" bubble for the one nursery, however many babies are ready.
    await rewrite(x => { const n = nurseryOf(x), L = x.lastSimulatedAt; n.nursery = {capacity: 4, babies: [0, 1, 2, 3].map(i => mkBaby(i, L, true, 'birth-' + (850 + i)))}; x.nextId = 900; }); // ids unused by any rabbit welcomed above
    const bubbles = await page.evaluate(() => window.__scene.bubbles.list.filter(o => o.text === 'Prêt !').length);
    await check('four ready babies: a single "Prêt !" bubble and four halos', async () => { assert.equal(bubbles, 1); const q = await overlays(); assert.deepEqual(visibleKinds(q), Array(4).fill('halo+baby')); });
    await frameNursery(1.65); await shot('overlays-four-ready-close');
    assert.deepEqual(report.errors, []); report.passed = true;
  } catch (e) { report.failure = String(e.stack || e); await shot('overlays-failure').catch(() => {}); throw e; }
  finally { fs.writeFileSync(path.join(out, 'nursery-overlays-report.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2)); await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
