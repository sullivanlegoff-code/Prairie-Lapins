// HISTORIQUE (2026-10-17) : vise la prévisualisation « Décorations » v8 figée (/Project-L/preview/decorations/,
// îles 3 × 3 et sauvegardes d'avant la v11). Aucun workflow ne le lance ; non adapté aux parcelles 4 × 4.
// Conservé pour mémoire ; les comportements actuels sont couverts par les tests et les contrôles de validate-land.yml.
// Original island artwork: real renderer, disposable touch profile, test-only source hooks.
const {chromium} = require('playwright');
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const url = process.env.PRAIRIE_TEST_URL || 'http://127.0.0.1:5178/Project-L/preview/decorations/';
const beforeUrl = process.env.PRAIRIE_BEFORE_URL;
const out = process.env.PRAIRIE_CAPTURE_DIR || '/workspace/work/island-captures';
const prefix = 'prairie-lapins.preview.decorations.', key = prefix + 'prairie-lapins.save.v1';
const protectedKeys = ['prairie-lapins.save.v1', 'prairie-lapins.ui.v1', 'prairie-lapins.development.clock', 'prairie-lapins.development.prairie-lapins.save.v1', 'prairie-lapins.preview.accounts.prairie-lapins.save.v1'];
async function run() {
  fs.mkdirSync(out, {recursive: true});
  const browser = await chromium.launch({executablePath: process.env.PRAIRIE_CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox']});
  const errors = [], requests = [], sizes = [], corners = [];
  try {
    async function boot(address) {
      const c = await browser.newContext({viewport: {width: 852, height: 393}, hasTouch: true});
      c.setDefaultTimeout(20000);
      await c.addInitScript(({prefix, protectedKeys}) => {
        for (const k of protectedKeys) if (!localStorage.getItem(k)) localStorage.setItem(k, 'protected:' + k);
        localStorage.setItem(prefix + 'ui', JSON.stringify({muted: true, tutorial: false, intro: true, tutorialDone: true}));
      }, {prefix, protectedKeys});
      const p = await c.newPage();
      p.on('pageerror', e => errors.push(e.message));
      p.on('console', m => {if (m.type() === 'error') errors.push(m.text());});
      p.on('request', r => {if (/supabase/i.test(r.url())) requests.push(r.url());});
      p.on('dialog', d => d.accept());
      await p.route('**/src/main.ts*', async r => {
        const response = await r.fetch(), source = await response.text();
        await r.fulfill({response, body: source.replace('const game = new Phaser.Game', 'window.__scene = scene; const game = new Phaser.Game').replace('const disposePanel =', 'window.__ui = ui; const disposePanel =')});
      });
      await p.goto(address); await p.waitForFunction(() => window.__scene?.current?.version === 5);
      return {c, p};
    }
    const saved = p => p.evaluate(k => JSON.parse(localStorage.getItem(k)), key);
    const close = async p => {if (await p.locator('#game-panel').isVisible()) await p.locator('#close-panel').click();};
    const load = async (p, id) => {await close(p); await p.locator('#open-preview-tools').click(); await p.locator('#dev-scenario-' + id).click(); await close(p);};
    const screenshot = async (p, name) => {await p.waitForTimeout(150); await p.screenshot({path: path.join(out, name + '.png')});};
    async function comparisons(p, name) {
      await load(p, 'decorationStart'); assert.equal((await saved(p)).decorations.length, 0);
      await p.evaluate(() => window.__scene.recenter()); await screenshot(p, name + '-mobile');
      await load(p, 'decorationDemo'); assert.equal((await saved(p)).decorations.length, 14);
      await p.evaluate(() => window.__scene.recenter()); await screenshot(p, name + '-furnished-mobile');
      await p.setViewportSize({width: 1500, height: 740}); await p.evaluate(() => window.__scene.recenter());
      await screenshot(p, name + '-furnished-wide');
    }
    if (beforeUrl) {const before = await boot(beforeUrl); await comparisons(before.p, 'before'); await before.c.close();}
    const {c, p} = await boot(url); await comparisons(p, 'after');
    for (const [scenario, columns] of [['islandStart', 3], ['islandExpanded', 6], ['islandFull', 9]]) {
      await load(p, scenario);
      const state = await saved(p); assert.equal(state.expanded, columns > 3); assert.equal(state.secondExpanded, columns === 9);
      assert.equal(state.buildings.length, 1); assert.equal(state.rabbits.length, 2); assert.equal(state.decorations.length, 0);
      await p.setViewportSize({width: 1500, height: 740});
      for (const zoom of [.8, 1.05, 1.65]) {
        await p.evaluate(({zoom, columns}) => {
          const s = window.__scene; s.view.zoom = zoom; s.view.x = 120 + columns * 176 / 2; s.view.y = 260; s.view.clamp(); s.applyCamera();
        }, {zoom, columns});
        await screenshot(p, 'island-' + columns + '-zoom-' + zoom);
        sizes.push({columns, zoom, placements: state.buildings.map(b => ({id: b.id, x: b.x, y: b.y}))});
      }
      await p.setViewportSize({width: 852, height: 393}); await p.evaluate(() => window.__scene.recenter());
      // All four extremities remain placeable, including cells beside the new rim.
      const ids = await p.evaluate(columns => {
        const c = window.__scene.controller;
        const run = command => {const r = c.perform(command); if (!r.ok) throw Error(r.reason); return r;};
        run({type: 'moveBuilding', id: 'building-1', x: 1, y: 0});
        return [[0, 0], [columns * 4 - 1, 0], [0, 7], [columns * 4 - 1, 7]].map(([x, y]) => {
          const id = run({type: 'buyDecoration', catalogId: 'bush'}).value;
          run({type: 'placeDecoration', id, location: {kind: 'outside', x, y, rotation: 0}}); return id;
        });
      }, columns);
      const cdp = await c.newCDPSession(p);
      const tap = async point => {
        assert.equal(await p.evaluate(point => document.elementFromPoint(point.x, point.y)?.tagName, point), 'CANVAS', JSON.stringify(point));
        await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [point]});
        await cdp.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
      };
      const focus = async (id, zoom = 1.05) => p.evaluate(({id, zoom}) => {
        const s = window.__scene, image = s.decorationViews.get(id);
        const world = image.getWorldTransformMatrix().transformPoint(58 - image.displayOriginX, 77 - image.displayOriginY);
        s.view.zoom = zoom; s.view.x = world.x - (350 - s.view.width / 2) / zoom; s.view.y = world.y - (230 - s.view.height / 2) / zoom; s.view.clamp(); s.applyCamera();
        return s.view.screen(world);
      }, {id, zoom});
      for (const id of ids) {
        await close(p); await tap(await focus(id));
        assert.equal(await p.evaluate(() => window.__scene.selectedDecorationId), id);
        assert.equal(await p.evaluate(() => window.__scene.decorationSelection.visible), true);
        await screenshot(p, 'edge-' + columns + '-' + ids.indexOf(id)); corners.push({columns, id, selected: true});
      }
      await close(p); await tap(await focus(ids[0]));
      const original = (await saved(p)).decorations.find(d => d.id === ids[0]);
      await p.getByRole('button', {name: 'Déplacer', exact: true}).click();
      const destination = async (x, y) => {
        const point = await p.evaluate(({x, y}) => {
          const s = window.__scene, world = {x: 120 + (x + .5) * 44, y: 120 + (y + .5) * 37};
          s.view.x = world.x - (350 - s.view.width / 2) / s.view.zoom; s.view.y = world.y - (230 - s.view.height / 2) / s.view.zoom; s.view.clamp(); s.applyCamera(); return s.view.screen(world);
        }, {x, y}); await tap(point);
      };
      await destination(5, 5); assert.equal(await p.getByRole('button', {name: 'Confirmer la pose · gratuit', exact: true}).isEnabled(), true);
      assert.deepEqual((await saved(p)).decorations.find(d => d.id === ids[0]), original);
      await p.getByRole('button', {name: 'Annuler le placement', exact: true}).click();
      assert.deepEqual((await saved(p)).decorations.find(d => d.id === ids[0]), original);
      await close(p); await tap(await focus(ids[0])); await p.getByRole('button', {name: 'Déplacer', exact: true}).click(); await destination(5, 5);
      await p.getByRole('button', {name: 'Confirmer la pose · gratuit', exact: true}).click();
      assert.deepEqual((await saved(p)).decorations.find(d => d.id === ids[0]).location, {kind: 'outside', x: 5, y: 5, rotation: 0});
      await close(p); await tap(await focus(ids[3]));
      const beforeSale = await saved(p);
      await p.getByRole('button', {name: 'Vendre · 10 pattes', exact: true}).click(); await p.locator('#game-dialog').getByRole('button', {name: 'Annuler', exact: true}).click();
      assert.deepEqual((await saved(p)).decorations, beforeSale.decorations);
      await p.getByRole('button', {name: 'Vendre · 10 pattes', exact: true}).click(); await p.locator('#game-dialog').getByRole('button', {name: 'Confirmer', exact: true}).evaluate(b => {b.click(); b.click();});
      assert.equal((await saved(p)).pattes, beforeSale.pattes + 10); assert.equal((await saved(p)).decorations.length, 3);
      await tap(await focus(ids[2])); const beforeStore = (await saved(p)).pattes;
      await p.getByRole('button', {name: 'Ranger dans l’inventaire', exact: true}).click(); assert.equal((await saved(p)).pattes, beforeStore);
      assert.equal((await saved(p)).decorations.find(d => d.id === ids[2]).location.kind, 'inventory');
      const placements = (await saved(p)).decorations;
      await p.reload(); await p.waitForFunction(() => window.__scene?.current?.decorations.length === 3);
      assert.deepEqual((await saved(p)).decorations, placements);
      // A building can occupy the freed far corner; the coast/path do not alter simulation.
      await p.evaluate(columns => {const r = window.__scene.controller.perform({type: 'buyBuilding', kind: 'farm', x: columns - 1, y: 1}); if (!r.ok) throw Error(r.reason);}, columns);
      await p.evaluate(() => window.__scene.recenter()); await screenshot(p, 'edges-and-building-' + columns);
      await cdp.detach();
    }
    await load(p, 'decoratedHabitat'); await p.evaluate(() => window.__scene.recenter()); await screenshot(p, 'seven-mobile');
    // Ready harvest bubble and mode photo remain ordinary interactions above the ground.
    const harvest = await p.evaluate(() => {
      const scene = window.__scene, s = structuredClone(scene.current); s.buildings[0].incomeUnits = 10 * 3600000;
      const c = scene.controller, prepared = c.prepareImport(JSON.stringify(s)); if (!prepared.ok || !c.confirmImport(prepared.token, true).ok) throw Error('Harvest fixture');
      const point = scene.bubbleHits.find(b => b.selection.kind === 'income').point;
      const screen = scene.view.screen(point); return {screen, pattes: scene.current.pattes};
    });
    await p.mouse.click(harvest.screen.x, harvest.screen.y); assert.equal((await saved(p)).pattes, harvest.pattes + 10);
    await p.locator('#open-photo').click(); assert.equal(await p.locator('#game-panel').isVisible(), false);
    await screenshot(p, 'photo-mobile'); await p.mouse.click(370, 270); assert.equal(await p.locator('#game-panel').isVisible(), false);
    await p.locator('#photo-return').click(); assert.equal(await p.locator('#hud').isVisible(), true);
    await p.setViewportSize({width: 667, height: 375}); await p.evaluate(() => window.__scene.recenter()); await screenshot(p, 'compact-mobile');
    assert.ok(await p.evaluate(keys => keys.every(k => localStorage.getItem(k) === 'protected:' + k), protectedKeys));
    assert.deepEqual(errors, []); assert.deepEqual(requests, []);
    const report = {browser: 'Chromium / real touch profile; not physical Safari', beforeComparison: !!beforeUrl, sizes, corners,
      actions: {placeEdges: true, selectEdges: true, movePreviewKeepsOriginal: true, cancelMove: true, commitMove: true, sellCancel: true, sellDoubleConfirmation: true, storeFree: true, reloadPlacements: true, buildingFarCorner: true, harvest: true, photo: true},
      otherRouteKeysUnchanged: true, errors, supabaseRequests: requests};
    fs.writeFileSync(path.join(out, 'island-report.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2));
  } finally {await browser.close();}
}
run().catch(e => {console.error(e); process.exitCode = 1;});
