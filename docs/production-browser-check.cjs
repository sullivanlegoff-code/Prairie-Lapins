// Real production UI validation in a disposable Chromium context.
const enterGame=require('./check-camera.cjs').enter; // loading screen: press « Jouer » after each page load
// Usage: node docs/production-browser-check.cjs <URL> [expected-build-revision]
// Requires Playwright and Chromium; optional PRAIRIE_CHROMIUM/PRAIRIE_CAPTURE_DIR.
// No seeded save, application hook, network interception, or development tools.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const camera = require('./check-camera.cjs');
const {chromium} = require('playwright');

async function run() {
  assert.ok(process.argv[2], 'Supply the deployed game URL.');
  const target = new URL(process.argv[2]);
  assert.ok(['http:', 'https:'].includes(target.protocol), 'Use an HTTP or HTTPS URL.');
  target.searchParams.delete('dev');
  const expectedRevision = process.argv[3]?.slice(0, 7);
  const output = process.env.PRAIRIE_CAPTURE_DIR || '/workspace/artifacts/prairie-production';
  fs.mkdirSync(output, {recursive: true});
  const report = {
    url: target.href, browser: 'Chromium, 852 × 393 landscape; not physical iPhone Safari',
    expectedRevision: expectedRevision || null, checks: [], screenshots: [], downloads: [],
    errors: [], failedRequests: [], cancelledCoinImages: [], httpErrors: [], passed: false,
  };
  const browser = await chromium.launch({
    executablePath: process.env.PRAIRIE_CHROMIUM === 'playwright' ? undefined : process.env.PRAIRIE_CHROMIUM || '/usr/bin/chromium',
    args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'],
  });
  const context = await browser.newContext({viewport: {width: 852, height: 393}, acceptDownloads: true});
  const page = await context.newPage();
  await page.addLocatorHandler(page.locator('#player-level-dialog'),async()=>{await page.locator('#continue-level-up').click();});page.setDefaultTimeout(15_000);
  page.on('pageerror', error => report.errors.push({kind: 'pageerror', message: error.message}));
  page.on('console', message => {
    if (message.type() === 'error') report.errors.push({kind: 'console', message: message.text(), location: message.location()});
  });
  // Removing/replacing a menu or navigating cancels outstanding decorative IMG requests.
  // Keep these cancellations in the report; still require every visible icon to load at captures.
  page.on('requestfailed', request => {
    const item={url:request.url(),error:request.failure()?.errorText};
    if(request.resourceType()==='image'&&item.error==='net::ERR_ABORTED'&&new URL(item.url).pathname.endsWith('/assets/currency/coin.png'))report.cancelledCoinImages.push(item);
    // Background music streams by ranges: Chromium cancels these media requests on seek, pause or navigation.
    // Only ERR_ABORTED on music files is exempt; a missing music file (404) or any other failure still counts.
    else if(item.error==='net::ERR_ABORTED'&&new URL(item.url).pathname.includes('/assets/audio/music/'))(report.cancelledMusicRequests??=[]).push(item);
    else report.failedRequests.push(item);
  });
  const iconsReady=()=>page.waitForFunction(()=>[...document.querySelectorAll('img.coin-icon')].filter(i=>i.getBoundingClientRect().width).every(i=>i.complete&&i.naturalWidth>0));
  page.on('response', response => {
    if (response.status() >= 400) report.httpErrors.push({url: response.url(), status: response.status(), type: response.request().resourceType()});
  });
  const save = () => page.evaluate(() => JSON.parse(localStorage.getItem('prairie-lapins.save.v1')));
  const progress = state => ({
    version: state.version, pattes: state.pattes, grass: state.grass, hearts: state.hearts,
    rabbits: state.rabbits, discovered: state.discovered, acquiredParcels: state.acquiredParcels, decorations: state.decorations, nextId: state.nextId, pityFailures: state.pityFailures,
    missions: state.missions, nextHeartGiftAt: state.nextHeartGiftAt,
    buildings: state.buildings.map(({incomeUnits, ...building}) => building),
  });
  async function ready() {
    await page.waitForFunction(() => document.getElementById('save-status')?.dataset.status === 'saved');
    await page.locator('#game canvas').waitFor({state: 'visible'});
    const bounds = await page.locator('#game canvas').boundingBox();
    assert.ok(bounds && bounds.width >= 851 && bounds.height >= 392, 'Canvas fills the landscape viewport.');
  }
  async function screenshot(name) {
    await iconsReady();
    const filename = path.join(output, `${name}.png`);
    await page.screenshot({path: filename});
    report.screenshots.push(filename);
  }
  async function closePanel() {
    if (await page.locator('#game-panel').isVisible()) await page.click('#close-panel');
  }
  async function settings() {
    await page.click('#open-settings');
    assert.equal(await page.locator('#panel-title').textContent(), 'Paramètres');
  }
  async function exportSave(name) {
    const downloadPromise = page.waitForEvent('download');
    await page.click('#export-game');
    const download = await downloadPromise;
    const filename = path.join(output, name);
    await download.saveAs(filename);
    assert.equal(await download.failure(), null);
    const state = JSON.parse(fs.readFileSync(filename, 'utf8'));
    assert.equal(state.version, 11);
    assert.match(download.suggestedFilename(), /^prairie-lapins-.*\.json$/);
    report.downloads.push({path: filename, suggestedFilename: download.suggestedFilename()});
    return state;
  }
  async function importFile(json, name = 'roundtrip.json') {
    await page.setInputFiles('#import-file', {name, mimeType: 'application/json', buffer: Buffer.from(json)});
  }
  async function noDevelopment() {
    assert.equal(await page.locator('#dev-badge').isVisible(), false);
    assert.equal(await page.locator('#devtools').isVisible(), false);
    assert.equal(await page.locator('#devtools button').count(), 0);
    assert.deepEqual(await page.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith('prairie-lapins.development.'))), []);
  }
  try {
    const response = await page.goto(target.href, {waitUntil: 'networkidle'});await enterGame(page);
    assert.equal(response?.status(), 200);
    await ready();
    assert.equal(await page.locator('#pattes').textContent(), '300');
    assert.equal(await page.locator('#grass').textContent(), '10');
    assert.equal(await page.locator('#hearts').textContent(), '12');
    const initial = await save();
    assert.equal(initial.version, 11);
    assert.equal(initial.rabbits.length, 1);
    assert.equal(initial.buildings.length, 3);
    await noDevelopment();
    report.checks.push('Normal new game: canvas, 300 pièces, 10 grass, 12 hearts, 1 rabbit, save v10.');
    await screenshot('production-initial');

    for (const [button, title] of [['#open-shop', /^Boutique$/], ['#open-collection', /^Collection · 1\/15$/], ['#open-missions', /^Missions$/]]) {
      await page.click(button);
      assert.match(await page.locator('#panel-title').textContent(), title);
      assert.equal(await page.locator('#game-panel').isVisible(), true);
      await closePanel();
    }
    await settings();
    await page.locator('#game-version').scrollIntoViewIfNeeded();
    report.version = await page.locator('#game-version').textContent();
    assert.match(report.version, /^Version : Prairie de lapins · île à neuf parcelles · v10 · build /);
    if (expectedRevision) assert.equal(report.version, `Version : Prairie de lapins · île à neuf parcelles · v10 · build ${expectedRevision}`);
    await noDevelopment();
    report.checks.push('Shop, collection, missions, settings and release identifier.');
    await screenshot('production-version');
    await closePanel();

    // Paille's body on the recentred view (Recentrer frames the starting buildings). Motion stays within ±3 px.
    {const state = await save(), model = await camera.recentered(page, state), p = camera.rabbitPoint(model, state, 'rabbit-2');
    await page.mouse.click(p.x, p.y);}
    await page.waitForFunction(() => document.getElementById('panel-title')?.textContent === 'Lapin Paille');
    await page.getByRole('button', {name: 'Nourrir · 2 herbes', exact: true}).click();
    await page.waitForFunction(() => document.getElementById('grass')?.textContent === '8');
    const fed = await save();
    assert.equal(fed.rabbits.find(rabbit => rabbit.species === 'paille').affection, 2);
    assert.equal(fed.pattes, 300);
    assert.equal(fed.hearts, 12);
    report.checks.push('Real canvas selection and feed button: Paille affection 1→2, grass 10→8.');
    await screenshot('production-fed');
    await settings();

    const exported = await exportSave('production-export.json');
    assert.deepEqual(progress(exported), progress(fed));
    const imported = {...exported, pattes: 317};
    const importJson = JSON.stringify(imported);
    const beforeImport = progress(await save());
    await importFile(importJson);
    await page.locator('#import-dialog[open]').waitFor();
    assert.match(await page.locator('#import-summary').textContent(), /^317 pièces · 8 herbes · 12 cœurs · 1 lapin\./);
    await page.click('#cancel-import');
    assert.equal(await page.locator('#import-dialog').isVisible(), false);
    assert.deepEqual(progress(await save()), beforeImport);
    report.checks.push('Export downloads valid v10 JSON; cancelling import preserves current progression.');

    await importFile(importJson);
    await page.locator('#import-dialog[open]').waitFor();
    await page.click('#confirm-import');
    await page.waitForFunction(() => document.getElementById('save-notice')?.textContent === 'Partie importée et enregistrée.');
    assert.deepEqual(progress(await save()), progress(imported));
    assert.equal(await page.locator('#pattes').textContent(), '317');
    const roundtrip = await exportSave('production-roundtrip.json');
    assert.deepEqual(progress(roundtrip), progress(imported));
    report.checks.push('Confirmed import writes 317 pièces and retains rabbits, grass, hearts, habitats; export roundtrip matches.');
    await screenshot('production-imported');

    const beforeInvalid = progress(await save());
    await importFile('this is not JSON', 'invalid.json');
    await page.waitForFunction(() => document.getElementById('save-notice')?.textContent === 'Ce fichier ne contient pas un JSON lisible.');
    assert.equal(await page.locator('#import-dialog').isVisible(), false);
    assert.deepEqual(progress(await save()), beforeInvalid);
    report.checks.push('Invalid JSON is rejected without replacing the game.');

    await page.reload({waitUntil: 'networkidle'});await enterGame(page);
    await ready();
    assert.deepEqual(progress(await save()), progress(imported));
    assert.equal(await page.locator('#grass').textContent(), '8');
    assert.equal(await page.locator('#pattes').textContent(), '317');
    report.checks.push('Reload preserves imported progression and fed affection.');

    const query = new URL(target.href);
    query.searchParams.set('dev', '1');
    const queryResponse = await page.goto(query.href, {waitUntil: 'networkidle'});await enterGame(page);
    assert.equal(queryResponse?.status(), 200);
    await ready();
    await settings();
    await noDevelopment();
    assert.deepEqual(progress(await save()), progress(imported));
    await page.locator('#game-version').scrollIntoViewIfNeeded();
    assert.equal(await page.locator('#game-version').textContent(), report.version);
    report.checks.push('Production ?dev=1 keeps normal save, hides tools/badge and creates no development storage.');
    await screenshot('production-final');

    await closePanel();
    const beforeSale = await save();
    await page.click('#open-shop');
    await page.getByRole('button',{name:'Bâtiments et décorations',exact:true}).click();await page.getByRole('button', {name: 'Décorations', exact: true}).click();
    await page.locator('[data-catalog="bush"]').getByRole('button',{name:'Acheter pour l’inventaire · 20 pièces',exact:true}).click();
    await page.locator('#game-dialog').getByRole('button', {name: 'Confirmer', exact: true}).click();
    await closePanel(); await page.click('#open-arrange');
    const bought = await save();
    assert.equal(bought.pattes, beforeSale.pattes - 20);
    assert.equal(bought.decorations.length, beforeSale.decorations.length + 1);
    const copy = bought.decorations.at(-1);
    await page.locator(`[data-decoration="${copy.id}"]`).getByRole('button', {name: 'Actions de cet exemplaire', exact: true}).click();
    await page.getByRole('button', {name: 'Vendre · 10 pièces', exact: true}).click();
    assert.equal(await page.locator('#game-dialog h2').textContent(), 'Vendre Buisson pour 10 pièces ?');
    await page.locator('#game-dialog').getByRole('button', {name: 'Annuler', exact: true}).click();
    assert.equal((await save()).decorations.length, bought.decorations.length);
    await page.getByRole('button', {name: 'Vendre · 10 pièces', exact: true}).click();
    await page.locator('#game-dialog').getByRole('button', {name: 'Confirmer', exact: true}).evaluate(button => {button.click(); button.click();});
    assert.equal((await save()).pattes, beforeSale.pattes - 10);
    assert.equal((await save()).decorations.length, beforeSale.decorations.length);
    await page.reload({waitUntil: 'networkidle'});await enterGame(page); await ready();
    assert.equal((await save()).pattes, beforeSale.pattes - 10);
    report.checks.push('Real normal decoration purchase, cancelled placement, cancelled sale, double-confirmed atomic 50% sale and persisted reload.');

    assert.deepEqual(report.errors, [], 'No browser or console errors.');
    assert.deepEqual(report.failedRequests, [], 'No failed network requests.');
    assert.deepEqual(report.httpErrors, [], 'No HTTP error responses.');
    report.passed = true;
  } catch (error) {
    report.failure = error.stack || String(error);
    await screenshot('production-failure').catch(() => {});
    throw error;
  } finally {
    fs.writeFileSync(path.join(output, 'production-report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    await context.close();
    await browser.close();
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
