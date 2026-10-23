// Full Prairie → Cuisine building → rabbit → recipes → rewards → exit/reload check (Chromium + WebKit).
// node docs/cuisine-reward-flow-check.cjs <local-base-url> <outside-Git-output-directory>
const {chromium, webkit} = require('playwright');
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const camera = require('./check-camera.cjs');
const {SAVE, seededSave} = require('./cuisine-seed.cjs');
(async () => {
  const [base, out] = process.argv.slice(2); fs.mkdirSync(out, {recursive: true});
  const report = {checks: [], errors: [], rewards: []};
  const seed = seededSave();
  try {
    for (const [name, type] of [['Chromium', chromium], ['WebKit', webkit]].filter(([n]) => !process.env.COOKING_BROWSER || process.env.COOKING_BROWSER === n)) {
      const browser = await type.launch();
      try {
        const context = await browser.newContext({hasTouch: true, viewport: {width: 844, height: 390}});
        await context.addInitScript(([key, json]) => { try { if (!localStorage.getItem(key)) localStorage.setItem(key, json); } catch {} }, [SAVE, seed.json]);
        const page = await context.newPage(); page.setDefaultTimeout(20000);
        page.on('pageerror', e => report.errors.push(`${name} pageerror: ${e.message}`));
        page.on('console', m => { if (m.type() === 'error') report.errors.push(`${name} console: ${m.text()}`); });
        const check = (value, label) => { assert.ok(value, `${name}: ${label}`); report.checks.push(`${name}: ${label}`); };
        const save = () => page.evaluate(k => JSON.parse(localStorage.getItem(k)), SAVE);
        const cdp = name === 'Chromium' ? await context.newCDPSession(page) : null;
        const item = id => page.locator(`.cuisine-root [data-item="${id}"]`), zone = id => page.locator(`.cuisine-root [data-zone="${id}"]`);
        const center = async l => { const r = await l.boundingBox(); assert.ok(r); return {x: r.x + r.width / 2, y: r.y + r.height / 2}; };
        const settled = (id, target) => page.waitForFunction(({id, target}) => {
          const a = document.querySelector(`.cuisine-root [data-item="${id}"]`).getBoundingClientRect(), b = document.querySelector(`.cuisine-root [data-zone="${target}"]`).getBoundingClientRect();
          return Math.hypot(a.x + a.width / 2 - b.x - b.width / 2, a.y + a.height / 2 - b.y - b.height / 2) < 1;
        }, {id, target});
        async function drag(id, target) {
          const from = await center(item(id)), to = await center(target);
          if (cdp) await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{id: 0, ...from}]}); else { await page.mouse.move(from.x, from.y); await page.mouse.down(); }
          for (let n = 1; n <= 8; n++) {
            const p = {x: from.x + (to.x - from.x) * n / 8, y: from.y + (to.y - from.y) * n / 8};
            if (cdp) await cdp.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{id: 0, ...p}]}); else await page.mouse.move(p.x, p.y);
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
        const reaction = () => page.locator('.cuisine-companion').getAttribute('data-reaction');
        const idle = () => page.waitForFunction(() => document.querySelector('.cuisine-companion').dataset.reaction === 'idle');
        const resultShown = () => page.locator('.cuisine-root #result-screen').waitFor({state: 'visible'});
        const feedback = async () => (await page.locator('.cuisine-root .cuisine-reward-feedback').innerText()).replace(/\s+/g, ' ');
        const salad = async () => {
          for (const id of ['tomato', 'mozzarella', 'cucumber']) { await drop(id, 'cutting-board'); await drag('knife', item(id)); await drop(id, 'bowl'); }
          await drag('olive-oil', zone('bowl')); await resultShown();
        };
        let model, point;
        const prairie = async () => {
          await camera.enter(page); const s = await save(); const kitchen = s.buildings.find(b => b.kind === 'kitchen');
          model = await camera.recentered(page, s); point = camera.buildingPoint(model, kitchen);
          check(point.x > 0 && point.x < 844 && point.y > 0 && point.y < 390, 'Kitchen is on screen in the Prairie');
        };
        const enter = async rabbitIndex => {
          // Exiting Cuisine restores the building panel behind it; only click the Prairie when it is not already open.
          if (await page.locator('#game-panel').getAttribute('data-view') !== 'building') await page.mouse.click(point.x, point.y);
          await page.locator('#game-panel[data-view="building"]').waitFor();
          await page.getByRole('button', {name: 'Entrer dans la Cuisine'}).click();
          const cards = page.locator('[data-cuisine-rabbit]');
          check(await cards.count() === (await save()).rabbits.length, 'chooser lists every owned rabbit');
          const id = await cards.nth(rabbitIndex).getAttribute('data-cuisine-rabbit'); await cards.nth(rabbitIndex).click();
          await page.locator('.cuisine-root #recipe-screen').waitFor({state: 'visible'});
          return id;
        };
        const snapshot = async () => { const s = await save(); return {pattes: s.pattes, grass: s.grass, hearts: s.hearts, aff: Object.fromEntries(s.rabbits.map(r => [r.id, r.affection])), cuisine: s.cuisine}; };
        async function expectReward(label, before, rabbitId, {affection, heart, coins}) {
          await page.waitForFunction(([k, p]) => JSON.parse(localStorage.getItem(k)).pattes !== p, [SAVE, before.pattes]);
          const after = await snapshot(), text = await feedback();
          const got = {coins: after.pattes - before.pattes, herbs: after.grass - before.grass, hearts: after.hearts - before.hearts, affection: after.aff[rabbitId] - before.aff[rabbitId]};
          assert.deepEqual(got, {coins, herbs: 3, hearts: heart ? 1 : 0, affection: affection ? 1 : 0}, `${name}: ${label} ${JSON.stringify(got)}`);
          check(text.includes('+1 Cœur') === heart && text.includes('+1 Affection') === affection, `${label}: feedback matches (${text})`);
          report.rewards.push({browser: name, label, got, feedback: text});
          return after;
        }

        await page.goto(base); await prairie();
        const s0 = await save(); check(s0.version === 12 && s0.cuisine.heartCycle === null, 'seeded v12 save with an unclaimed Heart');
        const [rA, rB] = s0.rabbits.map(r => r.id);
        // 1. Building -> chooser -> rabbit A, companion, reactions.
        const chosen = await enter(0); check(chosen === rA, 'first owned rabbit chosen');
        check(await page.locator('.cuisine-companion').isVisible() && (await page.locator('.cuisine-companion').innerText()).length > 0, 'selected rabbit shown in Cuisine');
        check(await reaction() === 'idle', 'reaction starts idle');
        await page.locator('.cuisine-root #recipe-salad').click();
        await drop('tomato', 'cutting-board'); await drag('knife', item('tomato'));
        check(await reaction() === 'positive', 'positive reaction after a valid preparation'); await idle();
        await drag('olive-oil', zone('bowl'));
        check(await reaction() === 'mistake', 'mistake reaction after an invalid action'); await idle();
        await drop('tomato', 'bowl'); await drop('mozzarella', 'cutting-board'); await drag('knife', item('mozzarella')); await drop('mozzarella', 'bowl');
        await drop('cucumber', 'cutting-board'); await drag('knife', item('cucumber')); await drop('cucumber', 'bowl');
        let before = await snapshot(); await drag('olive-oil', zone('bowl')); await resultShown();
        check(await reaction() === 'celebrate', 'celebrate reaction on the result');
        check((await page.locator('.cuisine-root #result-title').innerText()).includes('Salade'), 'Salad completes (oil drag-and-drop)');
        let after = await expectReward('Salad #1, rabbit A', before, rA, {affection: true, heart: true, coins: 40});
        check(after.cuisine.heartCycle === 0 && after.cuisine.affectionCycles[rA] === 0, 'markers persisted after first completion');
        // 2. Replay: coins and herbs only.
        before = after; await page.locator('.cuisine-root #recipe-replay').click(); await salad();
        after = await expectReward('Salad replay, rabbit A', before, rA, {affection: false, heart: false, coins: 40});
        // 3. Chicken: soy, honey, oven.
        before = after; await page.locator('.cuisine-root #recipe-choose').click(); await page.locator('.cuisine-root #recipe-chicken').click();
        await drop('chicken', 'cutting-board'); await drag('knife', item('chicken')); await drag('soy', item('chicken')); await drag('honey', item('chicken')); await drop('chicken', 'baking-dish');
        await drop('sweet-potato', 'cutting-board'); await drag('peeler', item('sweet-potato')); await drag('knife', item('sweet-potato')); await drop('sweet-potato', 'baking-dish');
        await drop('baking-dish', 'oven');
        check(await item('baking-dish').evaluate(el => getComputedStyle(el).opacity === '1' && getComputedStyle(el, '::after').height === '5px'), 'dish and progress visible during cooking');
        await resultShown(); check(await item('chicken').getAttribute('data-preparation') === 'cooked', 'Chicken completes');
        after = await expectReward('Chicken, rabbit A', before, rA, {affection: false, heart: false, coins: 60});
        await page.screenshot({path: path.join(out, `${name}-result.png`)});
        // 4. Exit, reopen, another rabbit: own affection, no second Heart.
        await page.locator('[data-cuisine-exit]').click();
        check(await page.locator('.cuisine-root').count() === 0 && await page.evaluate(() => !document.getElementById('app').inert), 'exit removes Cuisine and restores the Prairie');
        const idB = await enter(1); check(idB === rB && rA !== rB, 'second rabbit chosen after reopening');
        before = after; await page.locator('.cuisine-root #recipe-salad').click(); await salad();
        after = await expectReward('Salad, rabbit B', before, rB, {affection: true, heart: false, coins: 40});
        await page.locator('[data-cuisine-exit]').click();
        // 5. Reload: markers and balances survive; nothing is granted again in the same cycle.
        const persisted = await save();
        check(persisted.cuisine.heartCycle === 0 && persisted.cuisine.affectionCycles[rA] === 0 && persisted.cuisine.affectionCycles[rB] === 0, 'cuisine markers saved');
        await page.reload(); await prairie();
        const reloaded = await snapshot(); assert.deepEqual(reloaded.aff, after.aff);
        check(reloaded.hearts === after.hearts && reloaded.cuisine.heartCycle === 0 && reloaded.grass >= after.grass, 'balances and markers survive reload');
        await enter(0); before = await snapshot(); await page.locator('.cuisine-root #recipe-salad').click(); await salad();
        await expectReward('Salad after reload, rabbit A', before, rA, {affection: false, heart: false, coins: 40});
        await page.locator('[data-cuisine-exit]').click();
        await page.screenshot({path: path.join(out, `${name}-returned-prairie.png`)});
        await context.close();
      } finally { await browser.close(); }
    }
    assert.deepEqual(report.errors, []); report.passed = true;
  } finally { fs.writeFileSync(path.join(out, 'reward-flow-report.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify({passed: !!report.passed, checks: report.checks.length, errors: report.errors, rewards: report.rewards.length})); }
})().catch(error => { console.error(error); process.exitCode = 1; });
