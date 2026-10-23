// HISTORIQUE (2026-10-17) : contrôle visuel de l'époque v4 (8 octobre), qui injecte habitats-ready-v4.json
// dans le laboratoire et vise des points écran de l'ancienne caméra. Aucun workflow ne le lance ; non adapté
// aux parcelles 4 × 4. Conservé pour mémoire ; le rendu actuel est vérifié par les contrôles de validate-land.yml.
// Browser validation helper. Requires Playwright and a local Chromium installation.
// It seeds only the separate development save in a new, disposable browser context.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {chromium} = require('playwright');

async function run() {
  const phase = process.argv[2] || 'after';
  const output = process.env.PRAIRIE_CAPTURE_DIR || '/workspace/artifacts/prairie-visual';
  fs.mkdirSync(output, {recursive: true});
  const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'test-saves/habitats-ready-v4.json')));
  const universal = fixture.buildings.find(b => b.id === 'building-1');
  universal.x = 2; universal.y = 1; universal.habitat.level = 3;
  for (const [index, species] of ['neige', 'terre', 'feu', 'belier-gris', 'volant', 'perroquet'].entries()) {
    fixture.rabbits.push({id: `rabbit-${21 + index}`, species, affection: 4, enclosureId: universal.id});
    if (!fixture.discovered.includes(species)) fixture.discovered.push(species);
  }
  fixture.nextId = 27;
  const browser = await chromium.launch({executablePath: process.env.PRAIRIE_CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox']});
  try {
    const context = await browser.newContext({viewport: {width: 1500, height: 700}});
    await context.addInitScript(state => {
      if (!localStorage.getItem('prairie-lapins.development.prairie-lapins.save.v1')) {
        localStorage.setItem('prairie-lapins.development.prairie-lapins.save.v1', JSON.stringify(state));
        localStorage.setItem('prairie-lapins.development.ui', JSON.stringify({muted: true, tutorial: false, intro: true, tutorialDone: true}));
      }
    }, fixture);
    const page = await context.newPage();
    // Observe the scene in this test tab without shipping a debug global in the game.
    await page.route('**/src/main.ts*', async route => {
      const response = await route.fetch();
      const code = await response.text();
      assert.ok(code.includes('const game = new Phaser.Game'));
      await route.fulfill({response, body: code.replace('const game = new Phaser.Game', 'window.__prairieTestScene = scene; const game = new Phaser.Game')});
    });
    const errors = [], failedRequests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('requestfailed', request => failedRequests.push({url: request.url(), error: request.failure()?.errorText}));
    await page.goto(process.env.PRAIRIE_TEST_URL || 'http://127.0.0.1:5174/?dev=1');
    await page.waitForFunction(() => window.__prairieTestScene?.rabbitViews.length === 15).catch(async error => {
      console.error({errors, failedRequests, diagnostic: await page.evaluate(() => ({
        scene: !!window.__prairieTestScene, views: window.__prairieTestScene?.rabbitViews.length,
        state: window.__prairieTestScene?.current, status: document.querySelector('#save-status')?.textContent,
      }))}); throw error;
    });
    await page.evaluate(() => {
      const scene = window.__prairieTestScene;
      scene.view.pan(-250, 0); scene.applyCamera();
      scene.scene.pause();
    });
    assert.equal(await page.locator('#dev-badge').isVisible(), true);
    const expected = await page.evaluate(() => {
      const s = window.__prairieTestScene;
      return {version: s.current.version, types: s.current.buildings.filter(b => b.habitat).map(b => b.habitat.type),
        level: s.current.buildings.find(b => b.id === 'building-1').habitat.level,
        occupants: s.current.rabbits.filter(r => r.enclosureId === 'building-1').length};
    });
    assert.equal(expected.version, 4); assert.equal(expected.level, 3); assert.equal(expected.occupants, 7);
    await page.screenshot({path: path.join(output, `${phase}-desktop.png`)});
    await page.setViewportSize({width: 852, height: 393});
    await page.getByRole('button', {name: 'Recentrer la vue'}).click();
    await page.evaluate(() => {
      const s = window.__prairieTestScene, p = s.view.screen({x: 560, y: 342});
      s.view.pan(426 - p.x, 232 - p.y); s.applyCamera();
    });
    await page.screenshot({path: path.join(output, `${phase}-mobile-seven.png`)});
    const selectionChecks = [];
    for (const zoom of [0.8, 1.05, 1.65]) {
      await page.evaluate(z => {
        const s = window.__prairieTestScene; s.view.zoom = z;
        const p = s.view.screen({x: 560, y: 342});
        s.view.pan(426 - p.x, 232 - p.y); s.applyCamera();
      }, zoom);
      const targets = await page.evaluate(() => {
        const s = window.__prairieTestScene;
        return s.rabbitViews.filter(r => s.current.rabbits.find(a => a.id === r.id).enclosureId === 'building-1')
          .map(r => ({id: r.id, point: s.view.screen({x: r.object.x, y: r.object.y - 9.1})}));
      });
      for (const target of targets) {
        if (await page.locator('#game-panel').isVisible()) await page.getByRole('button', {name: 'Fermer le panneau'}).click();
        await page.mouse.click(target.point.x, target.point.y);
        // UI view gives the identity selected through the real canvas pointer handler.
        const title = await page.locator('#panel-title').textContent();
        const species = fixture.rabbits.find(r => r.id === target.id).species;
        const names = {paille: 'Paille', neige: 'Neige', terre: 'Terre', feu: 'Feu', 'belier-gris': 'Bélier Gris', volant: 'Volant', perroquet: 'Perroquet'};
        selectionChecks.push({zoom, id: target.id, passed: title.includes(names[species]), title});
      }
    }
    if (await page.locator('#game-panel').isVisible()) await page.getByRole('button', {name: 'Fermer le panneau'}).click();
    await page.getByRole('button', {name: 'Recentrer la vue'}).click();
    await page.evaluate(() => { const s = window.__prairieTestScene; s.view.pan(-520, 0); s.applyCamera(); });
    await page.screenshot({path: path.join(output, `${phase}-mobile-habitats.png`)});
    await page.getByRole('button', {name: 'Boutique', exact: true}).click();
    await page.screenshot({path: path.join(output, `${phase}-mobile-shop.png`)});
    const panelBounds = await page.locator('#game-panel').boundingBox();
    assert.ok(panelBounds.x >= 0 && panelBounds.y >= 0 && panelBounds.y + panelBounds.height <= 393);
    await page.getByRole('button', {name: 'Fermer le panneau'}).click();
    await page.getByRole('button', {name: 'Missions', exact: false}).click();
    assert.equal(await page.locator('#game-panel').isVisible(), true);
    const fed = await page.evaluate(() => {
      const s = window.__prairieTestScene, before = s.current.rabbits.find(r => r.id === 'rabbit-2').affection;
      const result = s.controller.perform({type: 'feed', id: 'rabbit-2'});
      const saved = JSON.parse(localStorage.getItem('prairie-lapins.development.prairie-lapins.save.v1'));
      return {ok: result.ok, before, savedAffection: saved.rabbits.find(r => r.id === 'rabbit-2').affection};
    });
    assert.equal(fed.ok, true); assert.equal(fed.savedAffection, fed.before + 1);
    await page.reload();
    await page.waitForFunction(() => window.__prairieTestScene?.current?.version === 4);
    assert.equal(await page.evaluate(() => window.__prairieTestScene.current.rabbits.length), 15);
    assert.equal(await page.evaluate(() => window.__prairieTestScene.current.rabbits.find(r => r.id === 'rabbit-2').affection), fed.savedAffection);
    assert.equal(await page.evaluate(() => localStorage.getItem('prairie-lapins.save.v1')), null);
    const report = {phase, browser: 'Chromium desktop with landscape viewport (not physical iPhone Safari)', expected, selectionChecks, persistence: fed, errors, failedRequests};
    fs.writeFileSync(path.join(output, `${phase}-report.json`), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    assert.equal(errors.length, 0); assert.equal(failedRequests.length, 0);
    assert.ok(selectionChecks.every(c => c.passed));
  } finally { await browser.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
