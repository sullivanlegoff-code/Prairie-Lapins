// Real cross-tab storage events, production UI and isolated lab; no game hooks or save injection.
const enterGame=require('./check-camera.cjs').enter; // loading screen: press « Jouer » after each page load
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
(async()=>{
 const url=process.argv[2], expected=process.argv[3]?.slice(0,7);
 const output=process.env.PRAIRIE_CAPTURE_DIR||'/tmp/foundations-proof'; fs.mkdirSync(output,{recursive:true});
 const report={url,expected,browser:'Chromium mobile viewport; not physical Safari',checks:[],errors:[],passed:false};
 const browser=await chromium.launch({executablePath:process.env.PRAIRIE_CHROMIUM==='playwright'?undefined:process.env.PRAIRIE_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:852,height:393},acceptDownloads:true});
 const ready=async page=>{await page.locator('#game canvas').waitFor();await page.waitForFunction(()=>document.querySelector('#save-status')?.dataset.status==='saved');if(expected)assert.match(await page.locator('#game-version').textContent(),new RegExp(expected));};
 const save=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('prairie-lapins.save.v1')));
 const settings=async page=>{if(await page.locator('#game-panel.shop-fullscreen').isVisible())await page.click('#close-panel');await page.click('#open-settings');};
 try{
  const winner=await context.newPage();winner.on('pageerror',e=>report.errors.push(e.message));await winner.goto(url);await enterGame(winner);await ready(winner);
  const stale=await context.newPage();stale.on('pageerror',e=>report.errors.push(e.message));await stale.goto(url);await enterGame(stale);await ready(stale);
  // The second tab startup saves elapsed time and immediately makes the first stale.
  await winner.waitForFunction(()=>document.querySelector('#save-status')?.dataset.status==='conflict');
  await stale.click('#open-shop');await stale.getByRole('button',{name:'Bâtiments et décorations',exact:true}).click();await stale.getByRole('button',{name:'Décorations',exact:true}).click();
  const card=stale.locator('[data-catalog="bush"]');await card.getByRole('button',{name:'Acheter pour l’inventaire · 20 pièces',exact:true}).click();await stale.locator('#game-dialog').getByRole('button',{name:'Confirmer',exact:true}).click();
  const bought=await save(stale);assert.equal(bought.decorations.length,1);assert.equal(bought.pattes,280);
  await winner.click('#open-shop');await winner.getByRole('button',{name:'Bâtiments et décorations',exact:true}).click();await winner.getByRole('button',{name:'Décorations',exact:true}).click();await winner.locator('[data-catalog="bush"]').getByRole('button',{name:'Acheter pour l’inventaire · 20 pièces',exact:true}).click();await winner.locator('#game-dialog').getByRole('button',{name:'Confirmer',exact:true}).click();
  assert.equal((await save(stale)).decorations.length,1);assert.equal((await save(stale)).pattes,280);
  await settings(winner);const download=winner.waitForEvent('download');await winner.click('#export-game');const file=await download;
  const exported=JSON.parse(fs.readFileSync(await file.path(),'utf8'));assert.equal(exported.decorations.length,0);assert.equal(exported.pattes,300);
  report.checks.push('External storage event exposes the conflict immediately; obsolete tab refuses purchase and exports its intact memory copy.');
  await winner.close();await stale.reload();await enterGame(stale);await ready(stale);
  for(let i=0;i<20;i++){await stale.click('#open-collection');await stale.click('#close-panel');await settings(stale);await stale.click('#close-panel');}
  await stale.setViewportSize({width:390,height:844});if(await stale.locator('#portrait-notice').isVisible())await stale.click('#continue-portrait');await settings(stale);await stale.click('#close-panel');await stale.setViewportSize({width:852,height:393});
  await stale.evaluate(()=>{window.dispatchEvent(new PageTransitionEvent('pagehide'));window.dispatchEvent(new PageTransitionEvent('pageshow'));document.dispatchEvent(new Event('visibilitychange'));});
  assert.equal((await save(stale)).decorations.length,1);assert.equal((await save(stale)).pattes,280);
  report.checks.push('Repeated panels, viewport rotation and lifecycle events preserve ownership and resources.');
  const lab=await context.newPage();await lab.goto(new URL('dev/',url).href);await enterGame(lab);await ready(lab);await settings(lab);await lab.click('#dev-grant-pattes-1000');
  assert.equal(await stale.locator('#save-status').getAttribute('data-status'),'saved');assert.equal((await save(stale)).pattes,280);
  report.checks.push('Laboratory storage notifications cannot mark the normal session conflicted.');
  assert.deepEqual(report.errors,[]);report.passed=true;
 }finally{fs.writeFileSync(path.join(output,'foundations-browser-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
