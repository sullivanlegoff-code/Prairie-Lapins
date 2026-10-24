// Mobile WebKit regression on built/public routes. Real taps and native controls only.
const enterGame=require('./check-camera.cjs').enter; // loading screen: press « Jouer » after each page load
// Linux WebKit emulation does not reproduce the iOS browser UI or OS app switching.
// Multi-touch Phaser regressions remain covered by camera-overview-public-check (Chromium).
const camera=require('./check-camera.cjs'),{webkit,devices}=require('playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const root=new URL(process.argv[2]),expected=process.argv[3]?.slice(0,7);
 const out=process.env.PRAIRIE_CAPTURE_DIR||'/tmp/touch-policy-proof';fs.mkdirSync(out,{recursive:true});
 const browser=await webkit.launch();
 const context=await browser.newContext({...devices['iPhone 13'],viewport:{width:852,height:393}});
 const page=await context.newPage();page.setDefaultTimeout(15000);
 const report={passed:false,url:root.href,browser:'Playwright WebKit, iPhone 13 emulation on Linux; not physical iPhone Safari',checks:[],scales:[],errors:[],limits:['Native iOS smart zoom, two-finger gestures and OS app switching require physical Safari verification.']};
 page.on('pageerror',e=>report.errors.push(e.message));page.on('dialog',d=>d.accept());
 const read=lab=>page.evaluate(lab=>JSON.parse(localStorage.getItem((lab?'prairie-lapins.development.':'')+'prairie-lapins.save.v1')),lab);
 const tap=name=>page.getByRole('button',{name,exact:true}).tap();
 const close=async()=>{if(await page.locator('#game-panel').isVisible())await page.locator('#close-panel').tap();};
 const ready=async()=>{
  await page.locator('#game canvas').waitFor();
  await page.waitForFunction(()=>document.querySelector('#save-status')?.dataset.status==='saved');
  if(expected)assert.ok((await page.locator('#game-version').textContent()).endsWith(expected));
  if(await page.locator('#portrait-notice').isVisible())await page.locator('#continue-portrait').tap();
 };
 const scale=()=>page.evaluate(()=>({scale:visualViewport.scale,width:visualViewport.width,height:visualViewport.height}));
 const double=async(label,p,selected)=>{
  const before=await scale();await page.touchscreen.tap(p.x,p.y);
  if(selected)assert.match(await page.locator('#panel-title').innerText(),selected);
  await page.touchscreen.tap(p.x,p.y);
  // Allow the native double-tap recognition window to finish; this is not an app loading timeout.
  await page.waitForTimeout(350);
  const after=await scale();assert.equal(after.scale,before.scale,label+' changed page scale');
  assert.ok(Math.abs(after.width-before.width)<1,label+' changed visual viewport width');
  report.scales.push({label,before,after});
 };
 const doubleControl=async(locator,label)=>{
  await locator.scrollIntoViewIfNeeded();const b=await locator.boundingBox();assert.ok(b);
  await double(label,{x:b.x+b.width/2,y:b.y+b.height/2});
 };
 // Playwright intentionally rejects wheel events in mobile WebKit. Audit native
 // wheel scrolling in a separate desktop WebKit context; mobile still uses real taps.
 const nativeScroll=async selector=>{
  assert.ok(await page.locator(selector).evaluate(e=>e.scrollHeight>e.clientHeight),'mobile menu must have scrollable content');
  const desktop=await browser.newContext({viewport:{width:852,height:393}});
  try{
   const p=await desktop.newPage();p.setDefaultTimeout(15000);p.on('pageerror',e=>report.errors.push(e.message));
   await p.goto(root.href);await enterGame(p);await p.waitForFunction(()=>document.querySelector('#save-status')?.dataset.status==='saved');
   if(selector==='#panel-content'){
    await p.locator('#open-shop').click();
    await p.getByRole('button',{name:'Bâtiments et décorations',exact:true}).click();
    await p.getByRole('button',{name:'Décorations',exact:true}).click();
   }else await p.locator('#open-settings').click();
   const el=p.locator(selector);assert.ok(await el.evaluate(e=>e.scrollHeight>e.clientHeight));
   const b=await el.boundingBox();await p.mouse.move(b.x+b.width/2,b.y+b.height/2);await p.mouse.wheel(0,180);
   await p.waitForFunction(s=>document.querySelector(s).scrollTop>0,selector);
   report.checks.push('Desktop WebKit native wheel scroll: '+selector+'; mobile touch scroll remains covered by Chromium and physical Safari checks.');
  }finally{await desktop.close();}
 };
 try{
  await page.goto(root.href);await enterGame(page);await ready();
  const viewport=await page.locator('meta[name=viewport]').getAttribute('content');
  assert.ok(!/user-scalable\s*=\s*no|maximum-scale\s*=\s*1(?:\D|$)/i.test(viewport),'native accessibility zoom remains enabled');
  const policy=await page.evaluate(()=>Object.fromEntries(['html','body','#app','#game','#game canvas','#game-panel','.panel-scroll','button','dialog'].map(s=>[s,getComputedStyle(document.querySelector(s)).touchAction])));
  for(const s of ['html','body','#app','#game-panel','button'])assert.equal(policy[s],'manipulation',s);
  for(const s of ['#game','#game canvas'])assert.equal(policy[s],'none',s);
  assert.equal(policy['.panel-scroll'],'pan-y');assert.equal(policy.dialog,'pan-y');
  report.checks.push({name:'Computed touch policy and accessible viewport',policy,viewport});
  await double('prairie',{x:400,y:300});await close();
  const initial=await read(false);assert.equal(initial.version,11);assert.equal(initial.pattes,300);
  await page.locator('#open-shop').tap();await tap('Bâtiments et décorations');await tap('Décorations');
  await nativeScroll('#panel-content');
  const card=page.locator('#panel-content [data-catalog=hay-bale]');
  await card.getByRole('button',{name:'Acheter pour l’inventaire · 40 pièces',exact:true}).tap();
  await doubleControl(page.locator('#game-dialog').getByRole('button',{name:'Confirmer',exact:true}),'confirmation d’achat');
  const owned=await read(false);assert.equal(owned.pattes,260);assert.equal(owned.decorations.length,1);assert.equal(owned.decorations[0].location.kind,'inventory');
  await close();report.checks.push('Real double tap on purchase confirmation: one 40-coin transaction and one inventory object.');
  await page.locator('#open-collection').tap();
  await page.getByLabel('Type',{exact:true}).selectOption('neige');assert.equal(await page.getByLabel('Type',{exact:true}).inputValue(),'neige');
  await close();await page.locator('#open-settings').tap();await nativeScroll('#settings-content');
  const chooserPromise=page.waitForEvent('filechooser');await page.locator('#import-game').tap();const chooser=await chooserPromise;await chooser.setFiles([]);
  await close();report.checks.push('Desktop WebKit wheel scrolling; mobile WebKit native select editing, import file chooser and panel close. No text input exists in the current game.');
  await page.goto(new URL('dev/',root).href);await enterGame(page);await ready();await page.locator('#open-settings').tap();await page.locator('#dev-scenario-reproduction').tap();await close();
  if(await page.getByRole('button',{name:'Masquer',exact:true}).isVisible())await tap('Masquer');
  // Targets on the recentred view (Recentrer frames the starting buildings), from the unchanged layout code.
  {const s=await read(true),home=s.buildings.find(b=>b.kind==='enclosure'),rabbit=s.rabbits.find(r=>r.enclosureId===home.id);
  await double('lapin Paille',camera.rabbitPoint(await camera.recentered(page,s),s,rabbit.id),/Paille/);await close();
  await double('habitat',camera.buildingPoint(await camera.recentered(page,s),home),/Enclos/);await close();}
  for(const size of [{width:390,height:844},{width:852,height:393}]){
   await page.setViewportSize(size);await ready();await double('prairie '+size.width,{x:size.width/2,y:size.height-110});await close();
   await page.locator('#open-settings').tap();await doubleControl(page.locator('#close-panel'),'fermeture '+size.width);
   await page.screenshot({path:out+'/touch-webkit-'+size.width+'.png'});
  }
  await page.reload();await enterGame(page);await ready();assert.equal((await read(true)).version,11);const stable=s=>({version:s.version,pattes:s.pattes,grass:s.grass,hearts:s.hearts,rabbits:s.rabbits,decorations:s.decorations,progression:s.progression});assert.deepEqual(stable(await read(false)),stable(owned));
  report.checks.push('Rabbit/building selection across double taps, portrait/landscape, panel close, reload and v10 normal/laboratory isolation.');
  assert.deepEqual(report.errors,[]);report.passed=true;
 }finally{
  if(!report.passed)await page.screenshot({path:out+'/touch-webkit-failure.png'}).catch(()=>{});
  fs.writeFileSync(out+'/touch-webkit-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
