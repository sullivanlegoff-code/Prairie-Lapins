// The two Nursery laboratory scenarios, loaded through the real laboratory selector and played with the real interface, on the source
// laboratory (Vite dev server). Source-only scene hook (window.__scene), intercepted in a disposable profile and never shipped.
// usage: node docs/nursery-scenarios-browser-check.cjs [normal-url] [lab-url]   (PRAIRIE_VIEWPORT=667x375, PRAIRIE_CAPTURE_DIR)
const enterGame = require('./check-camera.cjs').enter;
const {chromium} = require('playwright'), fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict');
const normalUrl = process.argv[2] || 'http://127.0.0.1:5183/Project-L/', labUrl = process.argv[3] || normalUrl + '?dev=1', out = process.env.PRAIRIE_CAPTURE_DIR || path.join(os.tmpdir(), 'nursery-scenarios-proof');
const [vw, vh] = (process.env.PRAIRIE_VIEWPORT || '844x390').split('x').map(Number), NORMAL_KEY = 'prairie-lapins.save.v1', LAB_KEY = 'prairie-lapins.development.prairie-lapins.save.v1';
(async () => {
  fs.mkdirSync(out, {recursive: true});
  const bundle = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'scenario-model-')), 'model.cjs');
  require('esbuild').buildSync({stdin: {contents: "export {NURSERY} from './src/config/balance';", resolveDir: process.cwd(), loader: 'ts'}, bundle: true, platform: 'node', format: 'cjs', outfile: bundle, define: {'import.meta.env.BASE_URL': JSON.stringify('/')}});
  const {NURSERY} = require(bundle), PRICES = NURSERY.unlockHearts;
  const browser = await chromium.launch({executablePath: process.env.PRAIRIE_CHROMIUM && process.env.PRAIRIE_CHROMIUM !== 'playwright' ? process.env.PRAIRIE_CHROMIUM : undefined, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
  const report = {passed: false, viewport: `${vw}x${vh}`, browser: 'Chromium touch emulation; not a physical iPhone', checks: [], captures: [], errors: []};
  const page = await browser.newPage({viewport: {width: vw, height: vh}, hasTouch: true}); page.setDefaultTimeout(20000);
  page.on('pageerror', e => report.errors.push('pageerror: ' + e.message)); page.on('console', m => { if (m.type() === 'error') report.errors.push('console: ' + m.text()); }); page.on('dialog', d => d.accept());
  await page.addLocatorHandler(page.locator('#player-level-dialog'), () => page.locator('#continue-level-up').tap());
  await page.route('**/src/main.ts*', async route => { const r = await route.fetch(), s = await r.text(); await route.fulfill({response: r, body: s.replace('const game = new Phaser.Game', 'window.__scene=scene;window.__getUi=()=>ui;const game = new Phaser.Game')}); });
  const settle = () => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  const store = key => page.evaluate(k => localStorage.getItem(k), key), labState = async () => JSON.parse(await store(LAB_KEY));
  const nurseryOf = s => s.buildings.find(b => b.kind === 'nursery');
  const shot = async name => { await page.locator('#toast').waitFor({state: 'hidden'}).catch(() => {}); await settle(); const f = `nursery-scenarios-${vw}x${vh}-${name}.png`; await page.screenshot({path: path.join(out, f)}); report.captures.push(f); };
  const ready = async () => { await enterGame(page); await page.locator('#game canvas').waitFor(); await page.waitForLoadState('networkidle'); await settle();
    await page.waitForFunction(() => document.querySelector('#save-status')?.dataset.status === 'saved' && window.__scene?.nurseryOverlays);
    const hide = page.getByRole('button', {name: 'Masquer', exact: true}); if (await hide.isVisible()) await hide.tap(); await settle(); };
  const close = async () => { if (await page.locator('#game-panel').isVisible()) await page.locator('#close-panel').tap(); await settle(); };
  const kinds = () => page.evaluate(() => { const sc = window.__scene, n = sc.current.buildings.find(b => b.kind === 'nursery'), v = sc.nurseryOverlays.real.get(n.id);
    return v.slots.map(q => ['halo', 'baby', 'veil', 'lock'].filter(k => q[k].visible).join('+') || 'empty'); });
  const open = (kind, id) => page.evaluate(([k, i]) => window.__getUi().open({kind: k, id: i}), [kind, id]).then(settle);
  const openNursery = async () => { await close(); await open('building', nurseryOf(await labState()).id); assert.equal(await page.locator('#panel-title').textContent(), 'Nurserie'); };
  const loadScenario = async id => { await close(); await page.locator('#open-settings').tap(); await page.locator('#dev-scenario-' + id).tap(); await page.waitForFunction(i => window.__scene.current && document.querySelector('#save-status')?.dataset.status === 'saved', id); await close(); await settle(); };
  const confirm = () => page.locator('#game-dialog').getByRole('button', {name: 'Confirmer', exact: true}).tap().then(settle);
  const capacity = async () => nurseryOf(await labState()).nursery.capacity;
  const hearts = async () => (await labState()).hearts;
  const check = (name, fn) => fn().then(() => report.checks.push(name));
  try {
    // ---- Isolation: the normal game's save is created first, then left byte-for-byte untouched by everything below.
    await page.goto(normalUrl); await ready(); assert.ok(await store(NORMAL_KEY), 'a normal save exists');
    // The normal game saves itself when its page is left: the reference is taken after that, before any laboratory action.
    await page.goto(labUrl); await ready(); const normalBefore = await store(NORMAL_KEY); assert.ok(normalBefore);
    // ---- Scenario 1: three real purchases through the real panel.
    await loadScenario('nurseryUnlocks'); let s = await labState();
    await check('« Nurserie — déblocages »: capacity 1, empty, exactly the Hearts of the three unlocks, four cushions: one empty and three veiled', async () => {
      assert.deepEqual(nurseryOf(s).nursery, {capacity: 1, babies: []}); assert.equal(s.hearts, PRICES[1] + PRICES[2] + PRICES[3]); assert.deepEqual(await kinds(), ['empty', 'veil+lock', 'veil+lock', 'veil+lock']); });
    await close(); await page.locator('#recenter-view').tap(); await settle(); await shot('1-unlocks-start');
    for (const [from, price] of [[1, PRICES[1]], [2, PRICES[2]], [3, PRICES[3]]]) {
      await openNursery(); const before = await hearts(), button = page.locator('#panel-content button', {hasText: /^Débloquer/}).first();
      assert.match(await button.innerText(), new RegExp(`${price} c`)); await button.tap(); assert.match(await page.locator('#game-dialog').innerText(), new RegExp(`de ${from} à ${from + 1} couchages`)); await confirm();
      await page.waitForFunction(c => window.__scene.current.buildings.find(b => b.kind === 'nursery').nursery.capacity === c, from + 1);
      assert.equal(await hearts(), before - price, `purchase ${from} → ${from + 1} spends exactly its price`); assert.equal((await kinds()).filter(k => k === 'veil+lock').length, 3 - from, 'one veil disappears per purchase');
    }
    await openNursery(); await check('three real purchases: confirmations, veils disappear one by one, ceiling at four, no more unlock', async () => {
      assert.equal(await capacity(), 4); assert.equal(await hearts(), 0); assert.deepEqual(await kinds(), ['empty', 'empty', 'empty', 'empty']);
      assert.match(await page.locator('#panel-content').innerText(), /Capacité maximale/); assert.equal(await page.locator('#panel-content button', {hasText: /^Débloquer/}).count(), 0); });
    await shot('2-unlocks-maximum'); await close();
    // ---- Scenario 2: the four states, played with the real interface.
    await loadScenario('nurseryStates'); s = await labState();
    await check('« Nurserie — quatre états »: ready baby, baby in incubation, empty and locked cushions', async () => {
      assert.equal(nurseryOf(s).nursery.capacity, 3); assert.deepEqual(await kinds(), ['halo+baby', 'baby', 'empty', 'veil+lock']);
      const growing = nurseryOf(s).nursery.babies.find(b => b.slot === 1); assert.ok(growing.readyAt - s.lastSimulatedAt > 60000 && growing.readyAt - s.lastSimulatedAt <= 120000, 'about two minutes left'); });
    await page.locator('#recenter-view').tap(); await settle(); await shot('3-states-normal');
    await page.evaluate(() => { const sc = window.__scene, n = sc.current.buildings.find(b => b.kind === 'nursery'), b = sc.buildingViews.get(n.id); sc.cameras.main.setZoom(1.65).centerOn(b.x, b.y - 4); }); await settle(); await shot('4-states-closeup');
    await page.locator('#recenter-view').tap(); await settle();
    // Welcome the ready baby from the real panel (the first enabled destination of the first section).
    await openNursery(); const readyId = nurseryOf(await labState()).nursery.babies.find(b => b.slot === 0).birth.id;
    const destinations = page.locator('#panel-content button', {hasText: /· \d+\/\d+$/}); let chosen = null;
    for (let i = 0; i < await destinations.count(); i++) if (await destinations.nth(i).isEnabled()) { chosen = destinations.nth(i); break; }
    assert.ok(chosen, 'a compatible destination with room'); await chosen.tap(); await page.waitForFunction(id => !window.__scene.current.buildings.find(b => b.kind === 'nursery').nursery.babies.some(x => x.birth.id === id), readyId); await close();
    await check('welcome the ready baby from the real panel: only slot 0 becomes empty', async () => { assert.deepEqual(await kinds(), ['empty', 'baby', 'empty', 'veil+lock']); assert.deepEqual(nurseryOf(await labState()).nursery.babies.map(b => b.slot), [1]); });
    // Transfer the nest's finished birth with the real button: it fills the hole at slot 0.
    await open('building', (await labState()).buildings.find(b => b.kind === 'nest').id); await page.getByRole('button', {name: 'Envoyer dans la nurserie', exact: true}).tap(); await settle(); await close();
    await check('transfer from the nest with the real button: the birth fills the lowest free slot (the hole at slot 0)', async () => { assert.deepEqual(await kinds(), ['baby', 'baby', 'empty', 'veil+lock']); assert.deepEqual(nurseryOf(await labState()).nursery.babies.map(b => b.slot).sort(), [0, 1]); });
    // Unlock the last cushion, then accelerate and welcome the second baby, all with the real panel.
    await openNursery(); const heartsBefore = await hearts(); await page.locator('#panel-content button', {hasText: /^Débloquer/}).first().tap(); await confirm(); await page.waitForFunction(() => window.__scene.current.buildings.find(b => b.kind === 'nursery').nursery.capacity === 4);
    assert.equal(await hearts(), heartsBefore - PRICES[3]); assert.deepEqual(await kinds(), ['baby', 'baby', 'empty', 'empty']);
    const second = nurseryOf(await labState()).nursery.babies.find(b => b.slot === 1), secondId = second.birth.id, spent = await hearts();
    // Two babies are growing: the acceleration of the right one is the host whose end is this baby's readyAt.
    await openNursery(); await page.locator(`.paid-acceleration[data-accelerate-end="${second.readyAt}"] button`).first().tap(); await confirm(); await page.waitForFunction(id => { const b = window.__scene.current.buildings.find(x => x.kind === 'nursery').nursery.babies.find(x => x.birth.id === id); return b.readyAt <= window.__scene.current.lastSimulatedAt; }, secondId);
    assert.ok(await hearts() < spent, 'the acceleration spent Hearts'); await openNursery();
    const dests = page.locator('#panel-content button', {hasText: /· \d+\/\d+$/}); let pick = null; for (let i = 0; i < await dests.count(); i++) if (await dests.nth(i).isEnabled()) { pick = dests.nth(i); break; }
    assert.ok(pick, 'a destination for the second baby'); await pick.tap(); await page.waitForFunction(id => !window.__scene.current.buildings.find(b => b.kind === 'nursery').nursery.babies.some(x => x.birth.id === id), secondId); await close();
    await check('unlock the last cushion, accelerate and welcome the second baby with the real panel; Hearts spent as announced', async () => { assert.deepEqual(await kinds(), ['baby', 'empty', 'empty', 'empty']); assert.equal(await capacity(), 4); });
    await shot('5-states-after-play');
    // ---- Isolation, at the end: the normal save never changed.
    await check('isolation: the normal game save is byte-for-byte unchanged after every laboratory action', async () => { assert.equal(await store(NORMAL_KEY), normalBefore); });
    assert.deepEqual(report.errors, []); report.passed = true;
  } catch (e) { report.failure = String(e.stack || e); await shot('failure').catch(() => {}); throw e; }
  finally { fs.writeFileSync(path.join(out, `nursery-scenarios-report-${vw}x${vh}.json`), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2)); await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
