// Tests the four compiled routes on ONE origin in a disposable browser, without authentication/emails.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const {chromium} = require('playwright');
const origin = process.env.PRAIRIE_ORIGIN || 'http://127.0.0.1:4186';
const out = process.env.PRAIRIE_CAPTURE_DIR || '/workspace/artifacts/decorations-four-routes-local';
const normal = 'prairie-lapins.save.v1', lab = 'prairie-lapins.development.', accounts = 'prairie-lapins.preview.accounts.', preview = 'prairie-lapins.preview.decorations.';
async function run() {
  fs.mkdirSync(out, {recursive: true});
  const browser = await chromium.launch({executablePath: process.env.PRAIRIE_CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox']});
  try {
    const context = await browser.newContext({viewport: {width: 852, height: 393}, hasTouch: true}), page = await context.newPage();
    const errors = [], failedRequests = [], badResponses = [], previewOnlineRequests = [], versions = {};
    let watchingPreview = false;
    page.on('pageerror', e => errors.push(e.message)); page.on('console', m => {if (m.type() === 'error') errors.push(m.text());});
    page.on('requestfailed', r => failedRequests.push({url: r.url(), error: r.failure()?.errorText}));
    page.on('response', r => {if (r.status() >= 400) badResponses.push({url: r.url(), status: r.status()});});
    page.on('request', r => {if (watchingPreview && /supabase|\/auth\/v1|\/rest\/v1/.test(r.url())) previewOnlineRequests.push(r.url());});
    page.on('dialog', d => d.accept());
    const goto = async route => {const response = await page.goto(origin + '/Project-L/' + route); assert.equal(response.status(), 200); await page.waitForFunction(() => document.querySelector('#pattes').textContent !== '—' && !!document.querySelector('canvas'));};
    const saved = key => page.evaluate(k => JSON.parse(localStorage.getItem(k)), key);
    const close = async () => {if (await page.locator('#game-panel').isVisible()) await page.locator('#close-panel').click();};
    const version = async id => {await page.locator('#open-settings').click(); versions[id] = await page.locator('#game-version').textContent(); await close();};
    await goto(''); assert.equal((await saved(normal)).version, 4); assert.equal(await page.locator('#open-arrange').count(), 0);
    // Existing ordinary canvas selection + controller command, in our synthetic normal party.
    await page.mouse.click(202, 136); await page.locator('#panel-title').filter({hasText: 'Lapin Paille'}).waitFor();
    await page.getByRole('button', {name: 'Nourrir · 2 herbes', exact: true}).click(); await close();
    const sourceV4 = await page.evaluate(k => localStorage.getItem(k), normal);
    assert.equal((await saved(normal)).grass, 8); await version('normal'); await page.screenshot({path: path.join(out, 'normal-v4.png')});
    await goto('dev/'); assert.equal((await saved(lab + normal)).version, 4); await page.locator('#open-settings').click();
    await page.locator('#dev-grant-pattes-1000').click(); await page.locator('#dev-time-5').click(); await close(); await version('laboratory');
    const laboratoryPattes = (await saved(lab + normal)).pattes; assert.equal(laboratoryPattes, 1300);
    await goto('preview/accounts/'); assert.equal((await saved(accounts + normal)).version, 4); assert.equal(await page.locator('#preview-badge').isVisible(), true); await version('accounts');
    // Synthetic unrelated backup/owner cache markers. No auth token is fabricated or sent.
    await page.evaluate(p => {localStorage.setItem(p + 'prairie-lapins.backup.before-v4', 'account-backup-marker'); localStorage.setItem(p + 'prairie-lapins.account.11111111-1111-4111-8111-111111111111.backup', 'owner-cache-marker'); localStorage.setItem('unrelated-player-marker', 'preserve');}, accounts);
    await goto('preview/decorations/'); watchingPreview = true; assert.equal((await saved(preview + normal)).version, 5);
    assert.equal(await page.locator('#dev-badge').isVisible(), true); assert.match(await page.locator('#dev-badge').textContent(), /PRÉVISUALISATION DÉCORATIONS v5/);
    assert.equal(await page.locator('#account-content').count(), 0); await version('decorations');
    const foreignKeys = () => page.evaluate(p => Object.fromEntries(Object.keys(localStorage).filter(k => !k.startsWith(p)).sort().map(k => [k, localStorage.getItem(k)])), preview);
    const protectedBefore = await foreignKeys(); const assertProtected = async () => assert.deepEqual(await foreignKeys(), protectedBefore);
    await page.locator('#open-preview-tools').click(); await page.locator('#dev-grant-pattes-1000').click(); await page.locator('#dev-time-20').click(); await page.locator('#sound-toggle').click(); await assertProtected();
    assert.equal(await page.evaluate(p => localStorage.getItem(p + 'clock'), preview), '1200000');
    assert.equal(await page.evaluate(p => localStorage.getItem(p + 'clock'), lab), '300000');
    await page.locator('#dev-scenario-decoratedHabitat').click(); await assertProtected();
    assert.equal((await saved(preview + normal)).rabbits.filter(r => r.enclosureId === 'building-1').length, 7);
    assert.equal((await saved(preview + normal)).decorations.length, 14);
    await close(); await page.screenshot({path: path.join(out, 'published-seven.png')});
    await page.locator('#open-shop').click(); await page.getByRole('button', {name: 'Décorations', exact: true}).click();
    assert.equal(await page.locator('[data-catalog]').count(), 12);
    await page.locator('[data-catalog="wildflowers"] button').click(); await page.locator('#game-dialog').getByRole('button', {name: 'Confirmer', exact: true}).click();
    await page.getByRole('button', {name: 'Annuler le placement', exact: true}).click(); assert.equal((await saved(preview + normal)).decorations.at(-1).location.kind, 'inventory'); await close(); await assertProtected();
    await page.reload(); await page.waitForFunction(p => JSON.parse(localStorage.getItem(p + 'prairie-lapins.save.v1')).decorations.length === 15, preview); await assertProtected();
    await page.locator('#open-settings').click();
    const beforeInvalid = (await saved(preview + normal)).decorations;
    await page.locator('#import-file').setInputFiles({name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{"version":5}')});
    await page.waitForFunction(() => document.querySelector('#save-notice').textContent.includes('incohérente'));
    assert.deepEqual((await saved(preview + normal)).decorations, beforeInvalid); await assertProtected();
    await page.locator('#import-file').setInputFiles({name: 'copy-normal-v4.json', mimeType: 'application/json', buffer: Buffer.from(sourceV4)});
    await page.locator('#import-dialog').waitFor({state: 'visible'}); await page.locator('#confirm-import').click();
    await page.waitForFunction(p => JSON.parse(localStorage.getItem(p + 'prairie-lapins.save.v1')).decorations.length === 0, preview);
    assert.equal((await saved(preview + normal)).version, 5); assert.equal((await saved(preview + normal)).grass, 8);
    assert.equal(await page.evaluate(p => localStorage.getItem(p + 'prairie-lapins.backup.before-v5'), preview), sourceV4); await assertProtected();
    const downloadPromise = page.waitForEvent('download'); await page.locator('#export-game').click(); const download = await downloadPromise;
    assert.match(download.suggestedFilename(), /PREVIEW-DECORATIONS-v5-MODE-TEST/); await download.saveAs(path.join(out, 'copy-migrated-v5.json'));
    assert.equal(JSON.parse(fs.readFileSync(path.join(out, 'copy-migrated-v5.json'))).version, 5);
    await page.locator('#dev-reset').click(); assert.equal((await saved(preview + normal)).decorations.length, 0); assert.equal((await saved(preview + normal)).grass, 10); await assertProtected();
    await close(); await page.locator('#open-photo').click(); assert.equal(await page.locator('#hud').isVisible(), false); await page.screenshot({path: path.join(out, 'published-photo.png')}); await page.locator('#photo-return').click(); await assertProtected();
    await page.locator('#open-settings').click(); assert.equal(await page.locator('#environment-link').getAttribute('href'), '/Project-L/preview/decorations/../../'); await close();
    watchingPreview = false; await goto('?dev=1'); assert.equal(await page.locator('#dev-badge').isVisible(), false); assert.equal((await saved(normal)).version, 4); assert.equal((await saved(normal)).grass, 8);
    assert.equal((await saved(normal)).rabbits[0].affection, 2);
    await goto('dev/'); assert.equal((await saved(lab + normal)).pattes, laboratoryPattes);
    await goto('preview/accounts/'); assert.equal((await saved(accounts + normal)).pattes, 300); assert.equal((await saved(accounts + normal)).version, 4);
    const report = {origin, browser: 'Chromium, disposable shared-origin profile, 852×393 landscape', versions,
      checks: ['four routes HTTP 200, canvas and correct versions', 'normal ordinary selection/feed preserved', 'normal ?dev=1 excludes tools', 'independent reloads', 'all non-decoration keys byte-for-byte preserved during grants/clock/prefs/scenario/buy/import/reset/photo/reload', 'v4 copy import with local backup and no source write', 'marked v5 export', 'account preview preserved; no authentication or emails requested'],
      errors, failedRequests, badResponses, previewOnlineRequests};
    fs.writeFileSync(path.join(out, 'four-routes-report.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2));
    assert.equal(errors.length, 0); assert.equal(failedRequests.length, 0); assert.equal(badResponses.length, 0); assert.equal(previewOnlineRequests.length, 0);
  } finally {await browser.close();}
}
run().catch(e => {console.error(e); process.exitCode = 1;});
