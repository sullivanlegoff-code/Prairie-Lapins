// Main-game activity smoke check, using the project's existing camera and Pointer Events approach.
// node docs/cuisine-integration-check.cjs <local-base-url> <outside-Git-output-directory>
const {chromium, webkit} = require('playwright');
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const camera = require('./check-camera.cjs');
const {SAVE, seededSave} = require('./cuisine-seed.cjs');
(async () => {
  const [base, out] = process.argv.slice(2); fs.mkdirSync(out, {recursive: true});
  const seed = seededSave(), report = {checks: [], errors: [], limits: ['Not physical iPhone; Chromium uses CDP touch, WebKit Windows uses mouse Pointer Events.']};
  try {
    for (const [name, type] of [['Chromium', chromium], ['WebKit', webkit]].filter(([name]) => !process.env.COOKING_BROWSER || process.env.COOKING_BROWSER === name)) {
      const browser = await type.launch();
      try {
        const context = await browser.newContext({hasTouch: true, viewport: {width: 844, height: 390}});
        await context.addInitScript(([key, json]) => { try { if (!localStorage.getItem(key)) localStorage.setItem(key, json); } catch {} }, [SAVE, seed.json]);
        const page = await context.newPage(); page.setDefaultTimeout(15000);
        page.on('pageerror', error => report.errors.push(`${name}: ${error.message}`));
        const check = (value, label) => { assert.ok(value, `${name}: ${label}`); report.checks.push(`${name}: ${label}`); };
        await page.goto(base); await camera.enter(page);
        const save = () => page.evaluate(() => JSON.parse(localStorage.getItem('prairie-lapins.save.v1')));
        const before = await save(), model = await camera.recentered(page, before);
        const point = camera.buildingPoint(model, before.buildings.find(b => b.kind === 'kitchen'));
        const cdp = name === 'Chromium' ? await context.newCDPSession(page) : null;
        const item = id => page.locator(`.cuisine-root [data-item="${id}"]`);
        const zone = id => page.locator(`.cuisine-root [data-zone="${id}"]`);
        const center = async locator => { const r = await locator.boundingBox(); assert.ok(r); return {x: r.x + r.width / 2, y: r.y + r.height / 2}; };
        // As in cooking-prototype-check.cjs, wait for visual placement, not just engine location.
        const settled = (id, target) => page.waitForFunction(({id, target}) => {
          const a = document.querySelector(`.cuisine-root [data-item="${id}"]`).getBoundingClientRect();
          const b = document.querySelector(`.cuisine-root [data-zone="${target}"]`).getBoundingClientRect();
          return Math.hypot(a.x + a.width / 2 - b.x - b.width / 2, a.y + a.height / 2 - b.y - b.height / 2) < 1;
        }, {id, target});
        async function drag(id, target) {
          const from = await center(item(id)), to = await center(target);
          if (cdp) await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{id: 0, ...from}]});
          else { await page.mouse.move(from.x, from.y); await page.mouse.down(); }
          for (let n = 1; n <= 8; n++) {
            const p = {x: from.x + (to.x - from.x) * n / 8, y: from.y + (to.y - from.y) * n / 8};
            if (cdp) await cdp.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{id: 0, ...p}]});
            else await page.mouse.move(p.x, p.y);
          }
          if (cdp) await cdp.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []}); else await page.mouse.up();
          if (id === 'knife' || id === 'peeler') await settled(id, `tool-rack-${id}`);
          if (['soy', 'honey', 'olive-oil'].includes(id)) await settled(id, `fixture-${id}`);
        }
        async function drop(id, target) {
          await drag(id, zone(target));
          await page.waitForFunction(({id, target}) => document.querySelector(`.cuisine-root [data-item="${id}"]`).dataset.location === target, {id, target});
          await settled(id, target);
        }
        const open = async () => {
          if (await page.locator('#game-panel').getAttribute('data-view') !== 'building') await page.mouse.click(point.x, point.y);
          await page.getByRole('button', {name: 'Entrer dans la Cuisine'}).click();
          await page.locator('[data-cuisine-rabbit]').first().click();
          await page.locator('.cuisine-root #recipe-screen').waitFor({state: 'visible'});
        };
        await open();
        check(await page.locator('.cuisine-root').count() === 1, 'one mounted root');
        check(await page.evaluate(() => document.getElementById('app').inert && !!document.querySelector('dialog.cuisine-activity[open]')), 'background inert and modal world-input gate active');
        await page.evaluate(p => {
          const canvas = document.querySelector('#game canvas');
          for (const type of ['pointerdown', 'pointerup']) canvas.dispatchEvent(new PointerEvent(type, {bubbles: true, pointerId: 33, pointerType: 'touch', clientX: p.x, clientY: p.y, button: 0}));
          document.getElementById('open-shop').click();
        }, point);
        check(await page.locator('#game-panel').getAttribute('data-view') === 'building', 'world/HUD attempts cannot navigate behind Cuisine');
        await page.locator('.cuisine-root #recipe-salad').click();
        await drop('tomato', 'cutting-board');
        const savedAt = (await save()).lastSimulatedAt;
        await page.evaluate(() => { window.__cuisineSmokeRoot = document.querySelector('.cuisine-root'); });
        await page.waitForFunction(at => JSON.parse(localStorage.getItem('prairie-lapins.save.v1')).lastSimulatedAt > at, savedAt);
        check(await page.evaluate(() => document.querySelector('.cuisine-root') === window.__cuisineSmokeRoot), 'passive controller refresh preserves the mounted root');
        check(await item('tomato').getAttribute('data-location') === 'cutting-board', 'passive refresh preserves preparation');
        check(await item('knife').evaluate(el => getComputedStyle(el, '::before').content === 'none'), 'main stone-button skin does not decorate cooking objects');
        check(await page.locator('.cuisine-root h1').evaluate(el => getComputedStyle(el).maxWidth === 'none'), 'main heading width does not constrain Cuisine');
        for (const id of ['tomato', 'mozzarella', 'cucumber']) {
          if (id !== 'tomato') await drop(id, 'cutting-board');
          await drag('knife', item(id));
          const cut = await item(id).getAttribute('data-preparation') === 'cut';
          if (!cut) {
            report.failedCut = await page.evaluate(id => ({id, message: document.querySelector('.cuisine-root #kitchen-message').textContent,
              objects: [id, 'knife'].map(id => { const el = document.querySelector(`.cuisine-root [data-item="${id}"]`); return {id, location: el.dataset.location, preparation: el.dataset.preparation, transform: el.style.transform, rect: el.getBoundingClientRect().toJSON()}; })}), id);
            await page.screenshot({path: path.join(out, `${name}-failed-cut.png`)});
          }
          check(cut, `${id} cut in embedded activity`);
          await drop(id, 'bowl');
        }
        await item('olive-oil').tap(); check(await page.locator('.cuisine-root').getAttribute('data-recipe-phase') === 'playing', 'oil tap does not complete');
        await drag('olive-oil', zone('bowl')); await page.locator('.cuisine-root #result-screen').waitFor({state: 'visible'});
        check((await page.locator('.cuisine-root #result-title').innerText()).includes('Salade'), 'embedded Salad completes');
        await page.locator('.cuisine-root #recipe-replay').click();
        check(await item('tomato').getAttribute('data-preparation') === 'whole', 'Replay resets embedded recipe');
        await page.locator('[data-cuisine-exit]').click();
        check(await page.locator('.cuisine-root').count() === 0 && await page.locator('.cuisine-activity-host style').count() === 0, 'exit removes kitchen and styles');
        check(await page.evaluate(() => !document.getElementById('app').inert), 'exit restores background input');
        check(await page.locator('#game-panel').getAttribute('data-view') === 'building', 'exit returns to the Kitchen building panel');
        await page.locator('#close-panel').click();
        await page.mouse.click(point.x, point.y);
        check(await page.locator('#game-panel').getAttribute('data-view') === 'building', 'Prairie building responds after exit');
        await open();
        check(await page.locator('.cuisine-root').count() === 1 && await page.locator('.cuisine-root style').count() === 1, 'reopening has one fresh root and stylesheet');
        await page.locator('.cuisine-root #recipe-chicken').click();
        await drop('chicken', 'cutting-board'); await drag('knife', item('chicken'));
        await drag('soy', item('chicken')); await drag('honey', item('chicken')); await drop('chicken', 'baking-dish');
        await drop('sweet-potato', 'cutting-board'); await drag('peeler', item('sweet-potato')); await drag('knife', item('sweet-potato')); await drop('sweet-potato', 'baking-dish');
        await drop('baking-dish', 'oven');
        const exitLayout = await page.locator('[data-cuisine-exit]').evaluate(el => {
          const r = el.getBoundingClientRect(); return {top: r.top, bottom: r.bottom, dialogScrollTop: el.closest('dialog').scrollTop};
        });
        (report.exitLayouts ??= []).push({browser: name, ...exitLayout});
        check(exitLayout.top >= 0 && exitLayout.bottom <= 390, 'exit control stays within viewport during cooking');
        check(await item('baking-dish').evaluate(el => getComputedStyle(el).opacity === '1' && getComputedStyle(el, '::after').height === '5px'), 'embedded dish and progress render during cooking');
        await page.screenshot({path: path.join(out, `${name}-embedded-oven.png`)});
        await page.locator('.cuisine-root #result-screen').waitFor({state: 'visible'});
        check(await item('chicken').getAttribute('data-preparation') === 'cooked', 'embedded Chicken completes');
        await page.locator('.cuisine-root #recipe-choose').click();
        check(await page.locator('.cuisine-root #recipe-screen').isVisible(), 'Choose Recipe remains inside Cuisine');
        await page.locator('[data-cuisine-exit]').click();
        const after = await save();
        // Two completions (Salad, Chicken) by the first rabbit in one cycle: 40 (Salad) + 60 (Chicken) coins and 2 × 3 herbs, both full-reward slots, one affection, one Heart.
        check(after.pattes - before.pattes === 100 && after.grass - before.grass === 6 && after.hearts - before.hearts === 1 &&
          after.rabbits[0].affection - before.rabbits[0].affection === 1 && after.rabbits.slice(1).every((r, i) => r.affection === before.rabbits[i + 1].affection), 'two completions grant coins and herbs twice, one affection and one Heart');
        await page.screenshot({path: path.join(out, `${name}-returned-prairie.png`)});
        await context.close();
      } finally { await browser.close(); }
    }
    assert.deepEqual(report.errors, []); report.passed = true;
  } finally { fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify({passed: !!report.passed, checks: report.checks.length, errors: report.errors})); }
})().catch(error => { console.error(error); process.exitCode = 1; });
