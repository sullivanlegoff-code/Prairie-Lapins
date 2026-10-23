// HISTORIQUE (2026-10-17) : vise la prévisualisation « Décorations » v8 figée (/Project-L/preview/decorations/,
// îles 3 × 3 et sauvegardes d'avant la v11). Aucun workflow ne le lance ; non adapté aux parcelles 4 × 4.
// Conservé pour mémoire ; les comportements actuels sont couverts par les tests et les contrôles de validate-land.yml.
// Real touch/DOM flow on Vite, disposable profile. Test hooks are intercepted, never shipped.
const {chromium} = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const url = process.env.PRAIRIE_TEST_URL || 'http://127.0.0.1:5178/Project-L/preview/decorations/';
const out = process.env.PRAIRIE_CAPTURE_DIR || '/workspace/work/decorations-flow';
const prefix = 'prairie-lapins.preview.decorations.', key = prefix + 'prairie-lapins.save.v1';
async function run() {
  fs.mkdirSync(out, {recursive: true});
  const browser = await chromium.launch({executablePath: process.env.PRAIRIE_CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox']});
  try {
    const context = await browser.newContext({viewport: {width: 852, height: 393}, hasTouch: true});
    context.setDefaultTimeout(20000);
    const page = await context.newPage(), errors = [], requests = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => {if (m.type() === 'error') errors.push(m.text());});
    page.on('request', r => {if (/supabase/i.test(r.url())) requests.push(r.url());});
    page.on('dialog', d => d.accept());
    const protectedKeys = ['prairie-lapins.save.v1', 'prairie-lapins.ui.v1', 'prairie-lapins.development.clock', 'prairie-lapins.development.prairie-lapins.save.v1', 'prairie-lapins.preview.accounts.prairie-lapins.save.v1'];
    await context.addInitScript(({prefix, protectedKeys}) => {
      for (const k of protectedKeys) if (!localStorage.getItem(k)) localStorage.setItem(k, 'protected:' + k);
      localStorage.setItem(prefix + 'ui', JSON.stringify({muted: true, tutorial: false, intro: true, tutorialDone: true}));
    }, {prefix, protectedKeys});
    await page.route('**/src/main.ts*', async route => {
      const response = await route.fetch(), source = await response.text();
      await route.fulfill({response, body: source.replace('const game = new Phaser.Game', 'window.__prairieTestScene = scene; const game = new Phaser.Game')});
    });
    await page.goto(url); await page.waitForFunction(() => window.__prairieTestScene?.current?.version === 5);
    const saved = () => page.evaluate(k => JSON.parse(localStorage.getItem(k)), key);
    const close = async () => {if (await page.locator('#game-panel').isVisible()) await page.locator('#close-panel').tap();};
    const load = async id => {await page.locator('#open-preview-tools').tap(); await page.locator('#dev-scenario-' + id).tap(); await close();};
    const capture = async name => page.screenshot({path: path.join(out, name + '.png')});
    const cdp = await context.newCDPSession(page);
    const touch = async (x, y) => {
      await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x, y}]});
      await cdp.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
    };
    const destination = async (x, y) => {
      const p = await page.evaluate(({x, y}) => {
        const scene = window.__prairieTestScene, world = {x: 120 + (x + .5) * 44, y: 120 + (y + .5) * 37};
        const screen = scene.view.screen(world); scene.view.pan(screen.x - 355, screen.y - 255); scene.applyCamera();
        return scene.view.screen(world);
      }, {x, y}); await touch(p.x, p.y);
    };
    await load('decorationStart');
    assert.equal((await saved()).pattes, 300); assert.equal((await saved()).decorations.length, 0);
    await page.locator('#open-shop').tap(); await page.getByRole('button', {name: 'Décorations', exact: true}).tap();
    await page.locator('[data-catalog="wood-bench"] button').tap();
    // Two confirmation clicks dispatched together must still buy exactly one exemplar.
    await page.locator('#game-dialog').getByRole('button', {name: 'Confirmer', exact: true}).evaluate(b => {b.click(); b.click();});
    const purchased = await saved(); assert.equal(purchased.pattes, 220); assert.equal(purchased.decorations.length, 1);
    const id = purchased.decorations[0].id;
    assert.equal(await page.locator('.placement-pending').count(), 1);
    await page.getByRole('button', {name: 'Annuler le placement', exact: true}).tap();
    assert.equal((await saved()).decorations[0].location.kind, 'inventory');
    await page.locator('[data-decoration="' + id + '"]').getByRole('button', {name: 'Placer cet exemplaire', exact: true}).tap();
    await destination(1, 1); // Initial habitat occupies this cell: refusal without a payment.
    assert.equal(await page.getByRole('button', {name: 'Confirmer la pose · gratuit', exact: true}).isEnabled(), false);
    assert.equal((await saved()).pattes, 220);
    await destination(5, 4);
    await page.getByRole('button', {name: 'Tourner de 90° · orientation horizontale', exact: true}).tap();
    await capture('placement');
    await page.getByRole('button', {name: 'Confirmer la pose · gratuit', exact: true}).tap();
    const placed = (await saved()).decorations[0]; assert.deepEqual(placed.location, {kind: 'outside', x: 5, y: 4, rotation: 1});
    await page.locator('[data-placed-list] summary').tap();
    await page.getByRole('button', {name: 'Banc en bois · #' + id.split('-')[1], exact: true}).tap();
    await page.getByRole('button', {name: 'Déplacer', exact: true}).tap(); await destination(8, 4);
    await page.getByRole('button', {name: 'Annuler le placement', exact: true}).tap();
    assert.deepEqual((await saved()).decorations[0], placed);
    await page.locator('[data-placed-list] summary').tap();
    await page.getByRole('button', {name: 'Banc en bois · #' + id.split('-')[1], exact: true}).tap();
    await page.getByRole('button', {name: 'Déplacer', exact: true}).tap(); await destination(8, 4);
    await page.getByRole('button', {name: 'Confirmer la pose · gratuit', exact: true}).tap();
    assert.deepEqual((await saved()).decorations[0].location, {kind: 'outside', x: 8, y: 4, rotation: 1});
    await page.locator('[data-placed-list] summary').tap();
    await page.getByRole('button', {name: 'Banc en bois · #' + id.split('-')[1], exact: true}).tap();
    await page.getByRole('button', {name: 'Ranger dans l’inventaire', exact: true}).tap();
    assert.equal((await saved()).decorations[0].location.kind, 'inventory');
    await close(); await page.reload(); await page.waitForFunction(() => window.__prairieTestScene?.current?.version === 5);
    assert.equal((await saved()).decorations[0].id, id); assert.equal((await saved()).decorations[0].location.kind, 'inventory');
    const downloadPromise = page.waitForEvent('download'); await page.locator('#open-settings').tap(); await page.locator('#export-game').tap();
    const download = await downloadPromise; const exportPath = path.join(out, 'flow-export-v5.json'); await download.saveAs(exportPath);
    assert.match(download.suggestedFilename(), /PREVIEW-DECORATIONS-v5-MODE-TEST/);
    assert.equal(JSON.parse(fs.readFileSync(exportPath)).decorations[0].id, id); await close();
    await load('decorationDemo'); const demo = await saved();
    assert.equal(new Set(demo.decorations.map(d => d.catalogId)).size, 12); assert.equal(demo.decorations.filter(d => d.location.kind === 'inventory').length, 0);
    await capture('demo');
    await page.locator('#open-photo').tap(); await capture('photo'); await page.locator('#photo-return').tap();
    await load('decoratedHabitat'); await capture('seven');
    await load('decorationDense'); const dense = await saved();
    assert.equal(dense.decorations.length, 512); await capture('dense');
    await page.reload(); await page.waitForFunction(() => window.__prairieTestScene?.current?.decorations.length === 512);
    await page.setViewportSize({width: 667, height: 375});
    await page.locator('#open-arrange').tap(); await capture('compact-inventory');
    const layout = await page.evaluate(() => {
      const p = document.getElementById('game-panel').getBoundingClientRect(), hud = document.getElementById('open-settings').getBoundingClientRect();
      return {panelFits: p.top >= 0 && p.right <= innerWidth && p.bottom <= innerHeight, hudFits: hud.right <= innerWidth};
    }); assert.ok(layout.panelFits); assert.ok(layout.hudFits);
    const protectedState = await page.evaluate(keys => keys.every(k => localStorage.getItem(k) === 'protected:' + k), protectedKeys); assert.ok(protectedState);
    assert.deepEqual(errors, []); assert.deepEqual(requests, []);
    const report = {browser: 'Chromium, disposable touch profile; 852×393 and 667×375; not physical Safari', checks: ['single purchase on double confirmation', 'cancel purchase placement', 'invalid building footprint', 'touch placement and rotation', 'cancel move', 'commit move', 'store and reload identity', 'marked v5 export', 'four player scenarios', 'dense reload 512', 'compact panel and HUD', 'other route keys unchanged', 'no Supabase requests'], dense: {owned: 512, placed: dense.decorations.filter(d => d.location.kind !== 'inventory').length}, layout, errors};
    fs.writeFileSync(path.join(out, 'flow-report.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2));
  } finally {await browser.close();}
}
run().catch(e => {console.error(e); process.exitCode = 1;});
