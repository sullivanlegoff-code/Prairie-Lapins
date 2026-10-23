// Disposable real-browser check of BOTH routes on ONE origin, without app hooks.
const enterGame=require('./check-camera.cjs').enter; // loading screen: press « Jouer » after each page load
// node docs/laboratory-browser-check.cjs <normal-url> [expected-revision]
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const camera = require('./check-camera.cjs');
const {chromium} = require('playwright');
async function run() {
  const normal = new URL(process.argv[2]); normal.search = '';
  const laboratory = new URL('dev/', normal);
  const expected = process.argv[3]?.slice(0,7);
  const output = process.env.PRAIRIE_CAPTURE_DIR || '/workspace/artifacts/laboratory-validation'; fs.mkdirSync(output,{recursive:true});
  const report = {normal: normal.href, laboratory: laboratory.href, expected, checks: [], errors: [], failedRequests: [], cancelledCoinImages: [], httpErrors: [], passed:false};
  const browser = await chromium.launch({executablePath:process.env.PRAIRIE_CHROMIUM === 'playwright' ? undefined : process.env.PRAIRIE_CHROMIUM || '/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const context = await browser.newContext({viewport:{width:852,height:393},acceptDownloads:true});
  const page = await context.newPage(); await page.addLocatorHandler(page.locator('#player-level-dialog'),async()=>{await page.locator('#continue-level-up').click();});page.setDefaultTimeout(15000);
  page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
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
  page.on('response',r=>{if(r.status()>=400)report.httpErrors.push({url:r.url(),status:r.status()});});
  let confirm = true; page.on('dialog',d=>confirm ? d.accept() : d.dismiss());
  const saveKey='prairie-lapins.save.v1',prefix='prairie-lapins.development.';
  const raw = key => page.evaluate(key=>localStorage.getItem(key),key);
  const state = async test=>JSON.parse(await raw((test?prefix:'')+saveKey));
  const protectedData=()=>page.evaluate(prefix=>Object.fromEntries(Object.keys(localStorage).filter(k=>!k.startsWith(prefix)).sort().map(k=>[k,localStorage.getItem(k)])),prefix);
  const ready=()=>page.waitForFunction(()=>document.getElementById('save-status')?.dataset.status==='saved');
  const goto = async url=>{const response=await page.goto(url,{waitUntil:'networkidle'});await enterGame(page);assert.equal(response.status(),200);await ready();await page.locator('#game canvas').waitFor({state:'visible'});};
  const settings=()=>page.click('#open-settings');
  const progress=s=>({version:s.version,acquiredParcels:s.acquiredParcels,decorations:s.decorations,pattes:s.pattes,grass:s.grass,hearts:s.hearts,rabbits:s.rabbits,discovered:s.discovered,nextId:s.nextId,nextHeartGiftAt:s.nextHeartGiftAt});
  const screenshot=async name=>{await iconsReady();return page.screenshot({path:path.join(output,name+'.png')});};
  async function exportFile(button,name,test) {
    const promise=page.waitForEvent('download');await page.click(button);const download=await promise;assert.equal(await download.failure(),null);await download.saveAs(path.join(output,name));
    assert.equal(download.suggestedFilename().includes('MODE-TEST'),test);return fs.readFileSync(path.join(output,name),'utf8');
  }
  async function importFile(json,name) {
    await page.setInputFiles('#import-file',{name,mimeType:'application/json',buffer:Buffer.from(json)});await page.locator('#import-dialog[open]').waitFor();
  }
  try {
    await goto(normal.href);assert.equal(await page.locator('#dev-badge').isVisible(),false);assert.equal(await page.locator('#devtools button').count(),0);
    {const state=JSON.parse(await raw('prairie-lapins.save.v1')),model=await camera.booted(page,state),p=camera.rabbitPoint(model,state,'rabbit-2');await page.mouse.click(p.x,p.y);}await page.getByRole('button',{name:'Nourrir · 2 herbes',exact:true}).click();await page.waitForFunction(()=>document.getElementById('grass').textContent==='8');
    await settings();const normalExport=await exportFile('#export-game','normal-export.json',false);
    const normalProgress=progress(JSON.parse(normalExport));assert.equal(normalProgress.grass,8);
    assert.equal(await page.locator('#environment-link').getAttribute('href'), laboratory.pathname);
    await page.click('#environment-link');await page.waitForURL(laboratory.href);await enterGame(page);await ready();
    const baseline=await protectedData();
    assert.equal((await state(true)).grass,10);assert.equal((await state(true)).rabbits[0].affection,1);
    assert.ok((await raw(prefix+saveKey)));assert.ok(!Object.keys(baseline).some(k=>k.startsWith(prefix)));
    assert.equal(await page.locator('#dev-badge').isVisible(),true);assert.match(await page.locator('#dev-badge').textContent(),/MODE TEST — PARTIE SÉPARÉE/);
    report.checks.push('Normal link opens an independent fresh laboratory; normal feed/export remains intact.');
    await settings();const version=await page.locator('#game-version').textContent();if(expected)assert.ok(version.endsWith(expected));report.version=version;
    for(const minutes of [5,20,60,360,1440])await page.click('#dev-time-'+minutes);
    assert.equal(await raw(prefix+'clock'),String(1885*60000));
    for(const [resource,amounts] of Object.entries({pattes:[1000,10000],grass:[100,1000],hearts:[10,100]}))for(const amount of amounts)await page.click(`#dev-grant-${resource}-${amount}`);
    const rich=await state(true);assert.equal(rich.pattes,11300);assert.equal(rich.grass,1110);assert.equal(rich.hearts,122);assert.deepEqual(await protectedData(),baseline);
    report.checks.push('All five clock advances and six resource grants leave every normal-origin key byte-for-byte unchanged.');
    const labExport=await exportFile('#dev-export','laboratory-export.json',true);assert.equal(JSON.parse(labExport).version,11);
    await importFile(normalExport,'normal-copy.json');await page.click('#cancel-import');assert.deepEqual(progress(await state(true)),progress(rich));
    await importFile(normalExport,'normal-copy.json');await page.click('#confirm-import');assert.deepEqual(progress(await state(true)),normalProgress);assert.deepEqual(await protectedData(),baseline);
    report.checks.push('MODE-TEST JSON export; cancelled and confirmed normal-copy imports leave the source unchanged.');
    await page.reload({waitUntil:'networkidle'});await enterGame(page);await ready();assert.deepEqual(progress(await state(true)),normalProgress);assert.equal(await raw(prefix+'clock'),String(1885*60000));await settings();
    confirm=false;const beforeReset=await raw(prefix+saveKey);await page.click('#dev-reset');assert.equal((await state(true)).pattes,JSON.parse(beforeReset).pattes);
    confirm=true;await page.click('#dev-reset');assert.equal((await state(true)).grass,10);assert.equal((await state(true)).hearts,12);assert.deepEqual(await protectedData(),baseline);
    report.checks.push('Laboratory reload restores its save/clock; cancelled and confirmed reset preserve normal storage.');
    for(const id of ['fineBuildings','collection','reproduction','missions','habitats','islandStart','islandExpanded','islandFull','islandDiagonal','islandL','parcelEdges','decorationStart','decorationDemo','decoratedHabitat','decorationDense','recipeShop']) {
      await page.click('#dev-scenario-'+id);const fixture=await state(true);assert.equal(fixture.version,11);
      if(id==='collection') {
        assert.equal(fixture.discovered.length,15);
        await page.click('#open-collection');
        assert.equal(await page.locator('#panel-content article').count(),15);
        await page.getByRole('button',{name:'Carnet de reproduction',exact:true}).click();
        const dragon=page.locator('#panel-content article').filter({has:page.getByRole('heading',{name:'Lapin Dragon',exact:true})});
        assert.match(await dragon.innerText(),/Lapin Perroquet × Lapin Feu/);
        assert.match(await dragon.innerText(),/2 %/);
        await settings();
      }
      if(id==='missions')assert.equal(fixture.missions.completed.length,14);
      if(id==='habitats')for(const home of fixture.buildings)assert.equal(fixture.rabbits.filter(r=>r.enclosureId===home.id).length,7);
      assert.deepEqual(await protectedData(),baseline);
    }
    report.checks.push('Confirmed scenario loads produce valid saved v8 states without writing normal keys.');
    await page.click('#close-panel');await screenshot('laboratory-habitats');
    await settings(); await page.click('#dev-scenario-habitats'); await page.click('#close-panel'); await page.reload({waitUntil:'networkidle'});await enterGame(page);await ready();assert.equal((await state(true)).rabbits.length,49);assert.deepEqual(await protectedData(),baseline);
    await page.setViewportSize({width:390,height:844});
    if(await page.locator('#portrait-notice').isVisible())await page.click('#continue-portrait');
    await settings();await page.click('#dev-grant-grass-100');assert.deepEqual(await protectedData(),baseline);
    const panelBounds=await page.locator('#game-panel').boundingBox(),badgeBounds=await page.locator('#dev-badge').boundingBox();
    assert.ok(panelBounds.y+panelBounds.height<=badgeBounds.y,'Portrait panel stays above test banner.');
    await screenshot('laboratory-portrait');await page.click('#close-panel');await page.setViewportSize({width:852,height:393});
    report.checks.push('Portrait mobile viewport: test resource control remains accessible, banner visible and panel unobscured.');
    const lastTest=await state(true);
    await page.locator('#dev-badge a').click();await page.waitForURL(normal.href);await enterGame(page);await ready();
    assert.deepEqual(progress(await state(false)),normalProgress);assert.ok((await state(false)).lastSimulatedAt < lastTest.lastSimulatedAt-24*3600000);
    assert.equal(await page.locator('#dev-badge').isVisible(),false);assert.equal(await page.locator('#devtools button').count(),0);
    await page.reload({waitUntil:'networkidle'});await enterGame(page);await ready();assert.deepEqual(progress(await state(false)),normalProgress);
    await goto(normal.href+'?dev=1');assert.equal(await page.locator('#dev-badge').isVisible(),false);assert.equal(await page.locator('#devtools button').count(),0);assert.deepEqual(progress(await state(false)),normalProgress);
    report.checks.push('Return/reload normal game retains its fed rabbit and resources, uses real time, and ?dev=1 cannot activate tools.');
    await settings();const finalVersion=await page.locator('#game-version').textContent();assert.equal(finalVersion,version);await screenshot('normal-final');
    assert.deepEqual(report.errors,[]);assert.deepEqual(report.failedRequests,[]);assert.deepEqual(report.httpErrors,[]);report.passed=true;
  } catch(e){report.failure=e.stack;await screenshot('failure').catch(()=>{});throw e;}
  finally {fs.writeFileSync(path.join(output,'laboratory-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await context.close();await browser.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
