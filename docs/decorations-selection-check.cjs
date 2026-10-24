// Real browser touch regression. Hooks exist only in intercepted Vite sources.
const enterGame=require('./check-camera.cjs').enter; // loading screen: press « Jouer » after each page load
const {chromium} = require('playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const url = process.env.PRAIRIE_TEST_URL || 'http://127.0.0.1:5183/Project-L/?dev=1';
const out = process.env.PRAIRIE_CAPTURE_DIR || '/tmp/prairie-selection';
const key = 'prairie-lapins.development.prairie-lapins.save.v1';
const art = {
  bush: [58, 77], 'bush': [60, 60], 'hay-bale': [60, 77],
  'hay-bale': [60, 54], 'large-bookcase': [60, 76], 'large-bookcase': [60, 21],
  'tree': [60, 35], 'coconut-palm': [60, 83], 'bunny-slippers': [60, 87],
  'hay-bale': [49, 80], 'birthday-candle': [39, 88], 'hanukkah-menorah': [60, 50],
};
async function run() {
  fs.mkdirSync(out, {recursive: true});
  const browser = await chromium.launch({executablePath: process.env.PRAIRIE_CHROMIUM, args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try {
    const context = await browser.newContext({viewport: {width: 852, height: 393}, hasTouch: true});
    context.setDefaultTimeout(20000);
    const page = await context.newPage(), errors = [], requests = [], selections = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('request', r => {if (/supabase/i.test(r.url())) requests.push(r.url());});
    await context.addInitScript(() => localStorage.setItem('prairie-lapins.development.ui', JSON.stringify({muted: true, tutorial: false, intro: true, tutorialDone: true})));
    await page.route('**/src/main.ts*', async route => {
      const response = await route.fetch(), source = await response.text();
      await route.fulfill({response, body: source.replace('const game = new Phaser.Game', 'window.__scene = scene; const game = new Phaser.Game').replace('const disposePanel =', 'window.__ui = ui; const disposePanel =')});
    });
    await page.goto(url);await enterGame(page); await page.waitForFunction(() => window.__scene?.current?.version===11);
    const cdp = await context.newCDPSession(page);
    const touch = async p => {
      assert.equal(await page.evaluate(p => document.elementFromPoint(p.x, p.y)?.tagName, p), 'CANVAS', 'Touch must reach canvas: ' + JSON.stringify(p));
      await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [p]});
      await cdp.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
    };
    const close = async () => {if (await page.locator('#game-panel').isVisible()) await page.locator('#close-panel').tap();};
    const state = () => page.evaluate(k => JSON.parse(localStorage.getItem(k)), key);
    const base = await state();
    const fixture = async catalogId => {
      await close();
      await page.evaluate(({base, catalogId}) => {
        const s = structuredClone(base); s.pattes = 1000; s.nextId = Math.max(s.nextId, 102);
        s.decorations = [
          {id: 'decoration-100', catalogId, location: {kind: 'outside', x: 26, y: 28, rotation: 0}},
          {id: 'decoration-101', catalogId, location: {kind: 'inventory'}},
        ];
        const c = window.__scene.controller, p = c.prepareImport(JSON.stringify(s));
        if (!p.ok || !c.confirmImport(p.token, true).ok) throw Error('Fixture import refused');
        window.__ui.onReplacement(); window.__ui.close();
        // Isolated artwork test: residents continue to be tested below with deliberate overlap.
        for (const r of window.__scene.rabbitViews) r.base = {x: 700, y: 350};
      }, {base, catalogId});
    };
    const target = async (catalogId, zoom = 1.35) => page.evaluate(({pixel, zoom}) => {
      const s = window.__scene, image = s.decorationViews.get('decoration-100');
      const world = image.getWorldTransformMatrix().transformPoint(pixel[0] - image.displayOriginX, pixel[1] - image.displayOriginY);
      s.view.zoom = zoom; s.view.x = world.x - (350 - s.view.width / 2) / zoom; s.view.y = world.y - (245 - s.view.height / 2) / zoom;
      s.view.clamp(); s.applyCamera(); return s.view.screen(world);
    }, {pixel: art[catalogId], zoom});
    const selected = () => page.evaluate(() => ({id: window.__scene.selectedDecorationId, visible: window.__scene.decorationSelection.visible, commands: window.__scene.decorationSelection.commandBuffer.length}));
    for (const catalogId of Object.keys(art)) {
      await fixture(catalogId); let p = await target(catalogId); await touch(p);
      assert.equal((await selected()).id, 'decoration-100', catalogId + ' normal direct selection');
      assert.ok((await selected()).visible && (await selected()).commands > 0, 'Visible outline');
      assert.equal(await page.getByRole('button', {name: 'Déplacer', exact: true}).isVisible(), true);
      if (catalogId === 'tree') await page.screenshot({path: path.join(out, 'tree-selected.png')});
      if (catalogId === 'bunny-slippers') await page.screenshot({path: path.join(out, 'converted-object-selected.png')});
      await close(); await page.locator('#open-arrange').tap(); await close();
      // Closing exits arrangement; enter then clear the panel through an empty canvas tap.
      await page.locator('#open-arrange').tap();
      await page.evaluate(() => {window.__ui.select({kind: 'empty'});});
      p = await target(catalogId); await touch(p);
      assert.equal((await selected()).id, 'decoration-100', catalogId + ' arrangement selection');
      selections.push({catalogId, normal: true, arrangement: true, outline: true});
    }
    // Tree crown is well above its logical ground footprint at every supported test zoom.
    for (const zoom of [.8, 1.05, 1.65]) {
      await fixture('tree'); const p = await target('tree', zoom); await touch(p);
      assert.equal((await selected()).id, 'decoration-100', 'Crown selection at zoom ' + zoom);
    }
    // A real empty touch clears the object; photo never selects it.
    await fixture('large-bookcase'); let p = await target('large-bookcase'); await touch(p);
    const empty = await page.evaluate(() => ({x: 140, y: 300}));
    await touch(empty); assert.equal((await selected()).id, null); assert.equal(await page.locator('#game-panel').isVisible(), false);
    await page.locator('#open-photo').tap(); p = await target('large-bookcase'); await touch(p);
    assert.equal((await selected()).id, null); assert.equal(await page.locator('#game-panel').isVisible(), false);
    await page.locator('#photo-return').tap();
    // Drag and pinch begin over the artwork without opening an object panel.
    p = await target('large-bookcase');
    await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [p]});
    await cdp.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x: p.x + 70, y: p.y}]});
    await cdp.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
    assert.equal((await selected()).id, null); assert.equal(await page.locator('#game-panel').isVisible(), false);
    p = await target('large-bookcase');
    await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x: p.x - 20, y: p.y, id: 0}, {x: p.x + 20, y: p.y, id: 1}]});
    await cdp.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x: p.x - 55, y: p.y, id: 0}, {x: p.x + 55, y: p.y, id: 1}]});
    await cdp.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
    assert.equal((await selected()).id, null); assert.equal(await page.locator('#game-panel').isVisible(), false);
    // Deliberate overlap: normal play chooses a rabbit; arrangement chooses the decoration.
    await fixture('bunny-slippers'); p = await target('bunny-slippers');
    const rabbitName = await page.evaluate(p => {
      const s = window.__scene, world = s.view.world(p), r = s.rabbitViews[0];
      r.base = {x: world.x, y: world.y + 9.1}; r.object.setPosition(r.base.x, r.base.y);
      return s.current.rabbits.find(x => x.id === r.id).species;
    }, p);
    await touch(p); assert.notEqual(await page.locator('#panel-title').textContent(), 'Chaussons lapins'); assert.equal((await selected()).id, null);
    await close(); await page.locator('#open-arrange').tap(); await page.evaluate(() => window.__ui.select({kind: 'empty'}));
    p = await target('bunny-slippers'); await touch(p); assert.equal((await selected()).id, 'decoration-100');
    // Harvest bubble priority, even with artwork deliberately drawn underneath the bubble.
    await fixture('tree');
    const harvest = await page.evaluate(() => {
      const s = window.__scene, state = structuredClone(s.current); state.buildings[0].incomeUnits = 10 * 3600000;
      const c = s.controller, p = c.prepareImport(JSON.stringify(state)); if (!p.ok || !c.confirmImport(p.token, true).ok) throw Error('Income fixture');
      const point = s.bubbleHits[0].point, image = s.decorationViews.get('decoration-100');
      image.setPosition(point.x, point.y + 46); s.view.zoom = 1.35; s.view.x = point.x - (350 - s.view.width / 2) / s.view.zoom; s.view.y = point.y - (230 - s.view.height / 2) / s.view.zoom;
      s.view.clamp(); s.applyCamera(); return {screen: s.view.screen(point), pattes: s.current.pattes};
    });
    await close(); // The fixture import opens Settings; close it before a real canvas touch.
    await touch(harvest.screen); assert.equal((await selected()).id, null); assert.equal((await state()).pattes, harvest.pattes + 10);
    // Sale cancellation, double confirmation, only one copy, save/reload and inventory sale.
    await fixture('large-bookcase'); p = await target('large-bookcase'); await touch(p);
    const before = await state(); await page.getByRole('button', {name: 'Vendre · 40 pièces', exact: true}).tap();
    assert.equal(await page.locator('#game-dialog h2').textContent(), 'Vendre Grande bibliothèque pour 40 pièces ?');
    await page.screenshot({path: path.join(out, 'sale-confirmation.png')});
    await page.locator('#game-dialog').getByRole('button', {name: 'Annuler', exact: true}).tap();
    assert.deepEqual((await state()).decorations, before.decorations); assert.equal((await state()).pattes, before.pattes);
    await page.getByRole('button', {name: 'Vendre · 40 pièces', exact: true}).tap();
    await page.locator('#game-dialog').getByRole('button', {name: 'Confirmer', exact: true}).evaluate(b => {b.click(); b.click();});
    assert.equal((await state()).pattes, before.pattes + 40); assert.equal((await state()).decorations.length, 1);
    assert.equal((await selected()).id, null); await page.reload();await enterGame(page); await page.waitForFunction(() => window.__scene?.current?.decorations.length === 1);
    assert.equal((await state()).pattes, before.pattes + 40);
    await page.locator('#open-arrange').tap(); await page.locator('[data-decoration="decoration-101"]').getByRole('button', {name: 'Actions de cet exemplaire', exact: true}).tap();
    await page.getByRole('button', {name: 'Vendre · 40 pièces', exact: true}).tap();
    await page.locator('#game-dialog').getByRole('button', {name: 'Confirmer', exact: true}).tap();
    assert.equal((await state()).decorations.length, 0); assert.equal((await state()).pattes, before.pattes + 80);
    assert.equal((await state()).hearts, before.hearts);
    assert.deepEqual(errors, []); assert.deepEqual(requests, []);
    const report = {browser: 'Chromium with real dispatched touch; not physical Safari', selections, treeZooms: [.8, 1.05, 1.65], empty: true, photo: true, pan: true, pinch: true, rabbitPriority: rabbitName, decorationPriorityInArrangement: true, harvestPriority: true, cancelSale: true, doubleSale: true, reload: true, inventorySale: true, errors};
    fs.writeFileSync(path.join(out, 'selection-report.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2));
  } finally {await browser.close();}
}
run().catch(e => {console.error(e); process.exitCode = 1;});
