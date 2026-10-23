// HISTORIQUE (2026-10-17) : vise la prévisualisation « Décorations » v8 figée (/Project-L/preview/decorations/,
// îles 3 × 3 et sauvegardes d'avant la v11). Aucun workflow ne le lance ; non adapté aux parcelles 4 × 4.
// Conservé pour mémoire ; les comportements actuels sont couverts par les tests et les contrôles de validate-land.yml.
// Real Phaser rendering/gestures in a disposable Chromium context. Never touches a personal browser.
// Run against Vite --mode decorations-preview (source interception is test-only, not shipped).
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const prefix = 'prairie-lapins.preview.decorations.', key = prefix + 'prairie-lapins.save.v1';
const output = process.env.PRAIRIE_CAPTURE_DIR || '/workspace/artifacts/prairie-decorations';
const url = process.env.PRAIRIE_TEST_URL || 'http://127.0.0.1:5178/Project-L/preview/decorations/';
const names = {paille: 'Lapin Paille', neige: 'Lapin Neige', terre: 'Lapin Terre', brumelin: 'Brumelin', mottelin: 'Mottelin', feu: 'Lapin Feu', 'belier-gris': 'Lapin Bélier Gris', volant: 'Lapin Volant', perroquet: 'Lapin Perroquet'};
async function run() {
  fs.mkdirSync(output, {recursive: true});
  const browser = await chromium.launch({executablePath: process.env.PRAIRIE_CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox']});
  try {
    const context = await browser.newContext({viewport: {width: 852, height: 393}, hasTouch: true});
    const page = await context.newPage(), errors = [], failedRequests = [], selections = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => {if (m.type() === 'error') errors.push(m.text());});
    page.on('requestfailed', r => failedRequests.push({url: r.url(), error: r.failure()?.errorText}));
    page.on('dialog', d => d.accept());
    await context.addInitScript(p => {if (!localStorage.getItem(p + 'ui')) localStorage.setItem(p + 'ui', JSON.stringify({muted: true, tutorial: false, intro: true, tutorialDone: true}));}, prefix);
    await page.route('**/src/main.ts*', async route => {
      const response = await route.fetch(), source = await response.text();
      assert.ok(source.includes('const game = new Phaser.Game'));
      await route.fulfill({response, body: source.replace('const game = new Phaser.Game', 'window.__prairieTestScene = scene; const game = new Phaser.Game')
        .replace('const disposePanel =', 'window.__prairieTestUI = ui; const disposePanel =')});
    });
    await page.goto(url);
    await page.waitForFunction(() => window.__prairieTestScene?.current?.version === 5);
    const screenshot = async name => {await page.waitForTimeout(120); await page.screenshot({path: path.join(output, name + '.png')});};
    const close = async () => {if (await page.locator('#game-panel').isVisible()) await page.locator('#close-panel').click();};
    const load = async id => {await page.locator('#open-preview-tools').click(); await page.locator('#dev-scenario-' + id).click(); await close();};
    const saved = () => page.evaluate(k => JSON.parse(localStorage.getItem(k)), key);
    assert.equal(await page.locator('#dev-badge').isVisible(), true);
    await load('decorationDemo');
    const demo = await saved();
    // Same progression and buildings for both comparison images; only decoration ownership differs.
    await page.evaluate(state => {
      const c = window.__prairieTestScene.controller, p = c.prepareImport(JSON.stringify({...state, decorations: []}));
      if (!p.ok || !c.confirmImport(p.token, true).ok) throw Error('Before fixture import refused');
    }, demo);
    await screenshot('before');
    await page.evaluate(state => {const c = window.__prairieTestScene.controller, p = c.prepareImport(JSON.stringify(state)); if (!p.ok || !c.confirmImport(p.token, true).ok) throw Error('Demo import refused');}, demo);
    await screenshot('after');
    await page.locator('#open-shop').click(); await page.getByRole('button', {name: 'Décorations', exact: true}).click();
    await page.locator('[data-catalog="wildflowers"]').evaluate(element => element.scrollIntoView({block: 'nearest'})); await screenshot('shop'); await close();
    await load('decoratedHabitat');
    const decorated = await saved(); assert.equal(decorated.rabbits.filter(r => r.enclosureId === 'building-1').length, 7);
    for (const zoom of [.8, 1.05, 1.65]) {
      await page.evaluate(z => {const s = window.__prairieTestScene; s.view.zoom = z; const p = s.view.screen({x: 208, y: 194}); s.view.pan(426 - p.x, 236 - p.y); s.applyCamera();}, zoom);
      await screenshot('seven-zoom-' + zoom);
      for (const rabbit of decorated.rabbits.filter(r => r.enclosureId === 'building-1')) {
        await close();
        const target = await page.evaluate(id => {const s = window.__prairieTestScene, r = s.rabbitViews.find(r => r.id === id); return s.view.screen({x: r.object.x, y: r.object.y - 9.1});}, rabbit.id);
        await page.mouse.click(target.x, target.y);
        const title = await page.locator('#panel-title').textContent();
        selections.push({zoom, id: rabbit.id, title, passed: title === names[rabbit.species]});
      }
      await close();
    }
    assert.ok(selections.every(s => s.passed), JSON.stringify(selections));
    await page.evaluate(() => {const s = window.__prairieTestScene; s.view.zoom = 1.05; s.view.recenter(); s.applyCamera();});
    await page.locator('#open-arrange').click(); await screenshot('arrangement'); await close();
    const camera = () => page.evaluate(() => {const v = window.__prairieTestScene.view; return {x: v.x, y: v.y, zoom: v.zoom};});
    const beforeDrag = await camera(), beforeObjects = (await saved()).decorations;
    await page.mouse.move(480, 300); await page.mouse.down(); await page.mouse.move(300, 300, {steps: 12}); await page.mouse.up();
    assert.notDeepEqual(await camera(), beforeDrag); assert.equal(await page.locator('#game-panel').isVisible(), false);
    assert.deepEqual((await saved()).decorations, beforeObjects);
    // Actual two-finger browser touch input; it must zoom without selecting anything.
    const cdp = await context.newCDPSession(page), beforePinch = await camera();
    await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x: 340, y: 280}, {x: 430, y: 280}]});
    await cdp.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x: 300, y: 280}, {x: 470, y: 280}]});
    await cdp.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
    assert.ok((await camera()).zoom > beforePinch.zoom); assert.equal(await page.locator('#game-panel').isVisible(), false);
    await page.locator('#open-shop').click(); const beforePanel = await camera();
    await page.locator('#panel-content').hover(); await page.mouse.wheel(0, 200); assert.deepEqual(await camera(), beforePanel); await close();
    // Exercise one purchase/ghost with real pointer input, on an otherwise empty exterior.
    await page.evaluate(state => {const c = window.__prairieTestScene.controller, p = c.prepareImport(JSON.stringify({...state, decorations: []})); if (!p.ok || !c.confirmImport(p.token, true).ok) throw Error('Placement fixture refused');}, decorated);
    await page.evaluate(() => {const s = window.__prairieTestScene; s.view.recenter(); s.applyCamera();});
    await page.locator('#open-shop').click(); await page.getByRole('button', {name: 'Décorations', exact: true}).click();
    await page.locator('[data-catalog="wildflowers"] button').click(); await page.locator('#game-dialog').getByRole('button', {name: 'Confirmer', exact: true}).click();
    const purchased = await saved(); assert.equal(purchased.decorations.length, 1); assert.equal(purchased.decorations[0].location.kind, 'inventory');
    const destination = await page.evaluate(() => window.__prairieTestScene.view.screen({x: 120 + 4.5 * 44, y: 120 + 4.5 * 37}));
    await page.mouse.click(destination.x, destination.y);
    assert.equal(await page.getByRole('button', {name: 'Confirmer la pose · gratuit'}).isEnabled(), true);
    await screenshot('placement-ghost');
    await page.getByRole('button', {name: 'Annuler le placement'}).click(); assert.equal((await saved()).decorations[0].location.kind, 'inventory'); await close();
    await load('decoratedHabitat');
    await page.locator('#open-photo').click(); assert.equal(await page.locator('#hud').isVisible(), false); assert.equal(await page.locator('#game-panel').isVisible(), false);
    assert.equal(await page.evaluate(() => window.__prairieTestScene.bubbles.visible || window.__prairieTestScene.grid.visible), false);
    const photoStart = await saved(); await screenshot('photo');
    await page.waitForFunction(({key, previous}) => JSON.parse(localStorage.getItem(key)).lastSimulatedAt > previous, {key, previous: photoStart.lastSimulatedAt}, {timeout: 7000});
    const photoEnd = await saved(); assert.ok(photoEnd.lastSimulatedAt > photoStart.lastSimulatedAt); assert.deepEqual(photoEnd.decorations, photoStart.decorations);
    await page.locator('#photo-return').click(); assert.equal(await page.locator('#hud').isVisible(), true);
    // Dense, bounded worst-case fixture, checked through the same transactional import as a player.
    const density = await page.evaluate(() => {
      const s = structuredClone(window.__prairieTestScene.current); s.expanded = true; s.secondExpanded = true;
      const occupied = (x, y) => s.buildings.some(b => b.x === Math.floor(x / 4) && b.y === Math.floor(y / 4)) || s.decorations.some(d => {
        if (d.location.kind !== 'outside') return false;
        const l = d.location, double = ['wood-bench', 'flower-arch'].includes(d.catalogId), square = ['fruit-tree', 'small-pond'].includes(d.catalogId);
        const w = square ? 2 : double && !l.rotation ? 2 : 1, h = square ? 2 : double && l.rotation ? 2 : 1;
        return x >= l.x && x < l.x + w && y >= l.y && y < l.y + h;
      });
      for (let y = 0; y < 8; y++) for (let x = 0; x < 36; x++) if (!occupied(x, y)) s.decorations.push({id: `decoration-${s.nextId++}`, catalogId: 'wildflowers', location: {kind: 'outside', x, y, rotation: 0}});
      while (s.decorations.length < 512) s.decorations.push({id: `decoration-${s.nextId++}`, catalogId: 'soft-cushion', location: {kind: 'inventory'}});
      const c = window.__prairieTestScene.controller, prepared = c.prepareImport(JSON.stringify(s));
      if (!prepared.ok || !c.confirmImport(prepared.token, true).ok) throw Error('Dense fixture refused');
      window.__decorationRefs = new Map(window.__prairieTestScene.decorationViews);
      return {owned: s.decorations.length, visible: window.__prairieTestScene.decorationViews.size, rabbits: s.rabbits.length};
    });
    await screenshot('dense-meadow');
    const performanceSample = await page.evaluate(() => new Promise(resolve => {
      const times = [], start = performance.now(); let last = start;
      const frame = now => {times.push(now - last); last = now; if (times.length < 180) requestAnimationFrame(frame); else {
        const sorted = times.slice().sort((a, b) => a - b), scene = window.__prairieTestScene;
        resolve({frames: times.length, elapsedMs: now - start, meanFps: times.length * 1000 / (now - start), p95FrameMs: sorted[Math.floor(sorted.length * .95)],
          reusedImages: [...window.__decorationRefs].every(([id, image]) => scene.decorationViews.get(id) === image), textures: scene.textures.getTextureKeys().filter(k => k.startsWith('decoration:')).length});
      }}; requestAnimationFrame(frame);
    }));
    assert.equal(performanceSample.reusedImages, true); assert.equal(performanceSample.textures, 14);
    await page.locator('#open-settings').click(); const downloadPromise = page.waitForEvent('download'); await page.locator('#export-game').click(); const download = await downloadPromise;
    assert.ok(download.suggestedFilename().includes('PREVIEW-DECORATIONS-v5-MODE-TEST')); await download.saveAs(path.join(output, 'test-export-v5.json'));
    assert.equal(JSON.parse(fs.readFileSync(path.join(output, 'test-export-v5.json'))).version, 5);
    await close(); await page.reload(); await page.waitForFunction(() => window.__prairieTestScene?.current?.decorations.length === 512);
    assert.equal(await page.evaluate(() => localStorage.getItem('prairie-lapins.save.v1')), null);
    const report = {browser: 'Chromium / WebGL, Linux, 852×393 landscape; no physical iPhone measurement', selections, gestures: {pan: true, pinch: true, noDragCommit: true, panelsDoNotPan: true},
      saves: {cancelKeepsPurchase: true, photoKeepsAutosave: true, exportV5Marked: true, reload512: true}, density, performanceSample, errors, failedRequests};
    fs.writeFileSync(path.join(output, 'browser-report.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2));
    assert.equal(errors.length, 0); assert.equal(failedRequests.length, 0);
  } finally {await browser.close();}
}
run().catch(e => {console.error(e); process.exitCode = 1;});
