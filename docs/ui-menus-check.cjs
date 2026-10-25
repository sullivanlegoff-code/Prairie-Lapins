// Additional visual coverage. Run after ui-tour.cjs, with the same Vite server.
// PLAYWRIGHT_MODULE is a module name or a locally resolved path, never committed.
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const path = require('node:path');
const out = process.argv[2] || 'output/imagegen/menus-v2/after';
const port = process.argv[3] || '5199';
fs.mkdirSync(out, {recursive: true});
(async () => {
  const browser = await chromium.launch({headless: true, args: ['--renderer-process-limit=1']});
  const errors = [], audits = [];
  try {
    for (const [tag, width, height] of [['land', 844, 390], ['port', 390, 844]]) {
      const context = await browser.newContext({viewport: {width, height}, deviceScaleFactor: 2, hasTouch: true, isMobile: true});
      await context.addInitScript(() => localStorage.setItem('prairie-lapins.development.ui', JSON.stringify({muted: true, tutorial: false, intro: true, tutorialDone: true})));
      const page = await context.newPage();
      page.on('pageerror', e => errors.push(`${tag}: ${e.message}`));
      page.on('console', m => { if (m.type() === 'error') errors.push(`${tag}: ${m.text()}`); });
      await page.route('**/src/main.ts*', async route => {
        const response = await route.fetch();
        await route.fulfill({response, body: (await response.text())
          .replace('const game = new Phaser.Game(', 'window.__scene=scene; const game = new Phaser.Game(')
          .replace('const disposePanel =', 'window.__ui=ui; window.__controller=controller; const disposePanel =')});
      });
      await page.goto(`http://127.0.0.1:${port}/?dev=1`);
      await page.locator('#loading-play').click({timeout: 90000});
      await page.waitForFunction(() => window.__ui && window.__scene);
      if (await page.locator('#continue-portrait').isVisible()) await page.locator('#continue-portrait').click();
      const ids = await page.evaluate(async () => {
        const {scenarioState} = await import('/src/dev/scenarios.ts');
        const {emptyBuilding} = await import('/src/state/initial.ts');
        const {encodeGame} = await import('/src/persistence/json.ts');
        const s = scenarioState('collection', Date.now());
        s.pattes = 50000; s.grass = 5000; s.hearts = 100;
        for (const [index, kind] of ['agency', 'statue', 'kitchen'].entries()) s.buildings.push(emptyBuilding(`building-${s.nextId++}`, kind, 4 + index * 6, 2));
        s.travel = {welcomed: false, trip: null};
        const c = window.__controller, prepared = c.prepareImport(encodeGame(s));
        if (!prepared.ok) throw Error(`Fixture import: ${prepared.reason}`);
        if (!c.confirmImport(prepared.token, true).ok) throw Error('Fixture confirmation failed');
        window.__ui.close();
        return Object.fromEntries(s.buildings.map(b => [b.kind, b.id]).concat([['rabbit', s.rabbits[1].id]]));
      });
      const shot = async name => {
        await page.waitForTimeout(250);
        await page.evaluate(() => { document.getElementById('toast').hidden = true; });
        await page.screenshot({path: path.join(out, `${tag}-${name}.png`)});
        const issues = await page.evaluate(() => {
          const panel = document.querySelector('#game-panel');
          const content = panel.querySelector('#panel-content');
          const visible = e => {const r = e.getBoundingClientRect(); return r.width && r.height && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden';};
          const short = [...panel.querySelectorAll('button, select, summary, input')].filter(visible).filter(e => {
            const r = e.getBoundingClientRect(); return r.height < 44 || r.width < 44;
          }).map(e => ({text: e.textContent.trim().slice(0, 60), width: e.getBoundingClientRect().width, height: e.getBoundingClientRect().height}));
          return {overflow: content.scrollWidth > content.clientWidth + 1, short};
        });
        audits.push({view: `${tag}-${name}`, ...issues});
      };
      for (const tab of ['habitats', 'buildings', 'decorations', 'recipes']) {
        await page.evaluate(tab => window.__ui.open({kind: 'shop', tab}, 'root'), tab);
        await shot(`16-shop-${tab}`);
      }
      for (const kind of ['farm', 'agency', 'statue', 'kitchen']) {
        await page.evaluate(id => window.__ui.open({kind: 'building', id}, 'root'), ids[kind]);
        await shot(`17-${kind}`);
        if (kind === 'farm') {
          if (await page.locator('[data-crop]').count() !== 10) throw Error('Expected ten crops');
          await page.locator('[data-crop]').last().scrollIntoViewIfNeeded(); await shot('18-farm-last-crops');
        }
        if (kind === 'agency') {
          for (let step = 0; step < 4; step++) {
            await page.locator('.agency-bubble button').click(); await page.waitForTimeout(50);
          }
          await shot('19-agency-travellers');
          await page.locator('[data-traveller] button').first().click(); await shot('20-agency-away');
        }
      }
      await page.evaluate(id => window.__ui.open({kind: 'moveRabbit', id}, 'root'), ids.rabbit); await shot('21-move-rabbit');
      await page.evaluate(id => window.__ui.open({kind: 'rabbit', id}, 'root'), ids.rabbit);
      await page.getByRole('button', {name: 'Confier ce lapin', exact: true}).click(); await shot('25-confirm-release');
      await page.keyboard.press('Escape');
      await page.evaluate(() => window.__ui.open({kind: 'hearts'}, 'root'));
      await page.locator('[data-market]').first().scrollIntoViewIfNeeded(); await shot('22-market');
      await page.evaluate(() => window.__ui.open({kind: 'building', id: window.__controller.getSnapshot().state.buildings.find(b => b.kind === 'kitchen').id}, 'root'));
      await page.getByRole('button', {name: 'Entrer dans la Cuisine', exact: true}).click(); await shot('23-cuisine-rabbits');
      await page.locator('[data-cuisine-rabbit]:enabled').first().click(); await shot('24-cuisine-menu');
      await context.close();
    }
  } finally { await browser.close(); }
  fs.writeFileSync(path.join(out, 'additional-audit.json'), JSON.stringify({errors, audits}, null, 2));
  console.log(JSON.stringify({errors, views: audits.length, overflow: audits.filter(x => x.overflow), smallTargets: audits.filter(x => x.short.length)}, null, 2));
  if (errors.length || audits.some(x => x.overflow || x.short.length)) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
