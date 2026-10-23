// Built/public routes only: no intercepted source, injected saves, or app hooks.
const enterGame=require('./check-camera.cjs').enter; // loading screen: press « Jouer » after each page load
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const root=new URL(process.argv[2]),expected=process.argv[3]?.slice(0,7),out=process.env.PRAIRIE_CAPTURE_DIR||'/tmp/snow-public';fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({executablePath:process.env.PRAIRIE_CHROMIUM==='playwright'?undefined:process.env.PRAIRIE_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const context=await browser.newContext({viewport:{width:852,height:393}});const page=await context.newPage();page.setDefaultTimeout(15000);
 const report={url:root.href,expected,checks:[],errors:[],passed:false};page.on('pageerror',e=>report.errors.push(e.message));
 try{
 for(const route of ['', 'dev/']){
  await page.goto(new URL(route,root).href);await enterGame(page);await page.locator('#game canvas').waitFor();await page.waitForFunction(()=>document.querySelector('#save-status')?.dataset.status==='saved');
  if(await page.getByRole('button',{name:'Masquer',exact:true}).isVisible())await page.getByRole('button',{name:'Masquer',exact:true}).click();
  if(expected)assert.match(await page.locator('#game-version').textContent(),new RegExp(expected));
  await page.screenshot({path:path.join(out,route?'snow-lab-world.png':'snow-normal-world.png')});
  await page.click('#open-shop');await page.getByRole('button',{name:'Lapins',exact:true}).click();
  const img=page.locator('img[data-rabbit-art="neige"]');await img.waitFor();
  const info=await img.evaluate(async img=>{await img.decode();const bytes=await (await fetch(img.src,{cache:'no-store'})).arrayBuffer();const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const g=c.getContext('2d');g.drawImage(img,0,0);return{hash,width:c.width,height:c.height,fit:getComputedStyle(img).objectFit,corner:[...g.getImageData(0,0,1,1).data],fur:[...g.getImageData(200,200,1,1).data]};});
  assert.equal(info.hash,'b85337b3d3b3079644fb3df3e7f13f50e4226a0389a5b1a1c95fabf3f348276a');assert.equal(info.width,518);assert.equal(info.height,473);assert.equal(info.fit,'contain');assert.equal(info.corner[3],0);assert.deepEqual(info.fur,[254,243,249,255]);
  await page.screenshot({path:path.join(out,route?'snow-lab-shop.png':'snow-normal-shop.png')});await page.click('#close-panel');
  await page.click('#open-collection');assert.equal(await page.locator('img[data-rabbit-art="neige"]').count(),0);await page.screenshot({path:path.join(out,route?'snow-lab-collection.png':'snow-normal-collection.png')});await page.click('#close-panel');
  await page.setViewportSize({width:390,height:844});if(await page.locator('#portrait-notice').isVisible())await page.click('#continue-portrait');await page.click('#open-shop');await page.getByRole('button',{name:'Lapins',exact:true}).click();assert.equal(await page.locator('img[data-rabbit-art="neige"]').count(),1);await page.screenshot({path:path.join(out,route?'snow-lab-portrait.png':'snow-normal-portrait.png')});await page.click('#close-panel');await page.setViewportSize({width:852,height:393});
  report.checks.push({route:route||'normal',asset:info,portraits:'shop, collection, portrait viewport',world:'canvas screenshot; no app hooks'});
 }
 assert.deepEqual(report.errors,[]);report.passed=true;
 }finally{fs.writeFileSync(path.join(out,'snow-public-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
