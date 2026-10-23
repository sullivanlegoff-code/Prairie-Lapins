// Source-only hooks for precise zoom/occupant checks; built/public portraits checked separately.
const enterGame=require('./check-camera.cjs').enter; // loading screen: press « Jouer » after each page load
const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const url=process.env.PRAIRIE_TEST_URL||'http://127.0.0.1:5190/Project-L/?dev=1';
const out=process.env.PRAIRIE_CAPTURE_DIR||'/tmp/snow-proof';
(async()=>{
 fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({executablePath:process.env.PRAIRIE_CHROMIUM==='playwright'?undefined:process.env.PRAIRIE_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:852,height:393},hasTouch:true});const page=await context.newPage();page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const report={passed:false,errors,checks:[],selections:[],browser:'Chromium touch emulation; not physical iPhone Safari'};
 try{
 await page.route('**/src/main.ts*',async route=>{const r=await route.fetch();await route.fulfill({response:r,body:(await r.text()).replace('const game = new Phaser.Game','window.__scene = scene; const game = new Phaser.Game').replace('const disposePanel =','window.__ui = ui; const disposePanel =')});});
 await page.goto(url);await enterGame(page);await page.waitForFunction(()=>window.__scene?.rabbitViews.some(r=>r.sprite));
 await page.getByRole('button',{name:'Masquer',exact:true}).click();
 await page.click('#open-settings');page.on('dialog',d=>d.accept());await page.click('#dev-scenario-habitats');await page.click('#close-panel');
 await page.evaluate(()=>{const s=window.__scene,home=s.current.buildings.find(b=>b.habitat.type==='neige');const p={x:120+(home.x/4+.5)*176,y:120+(home.y/4+.5)*148};s.view.x=p.x;s.view.y=p.y;s.applyCamera();});
 const ids=await page.evaluate(()=>{const s=window.__scene,home=s.current.buildings.find(b=>b.habitat.type==='neige');return s.current.rabbits.filter(r=>r.enclosureId===home.id).map(r=>({id:r.id,species:r.species}));});assert.equal(ids.length,7);
 for(const zoom of [.8,1.05,1.65]){
  await page.evaluate(z=>{window.__scene.view.zoom=z;window.__scene.applyCamera();},zoom);
  for(const {id,species} of ids){const p=await page.evaluate(id=>{const s=window.__scene,r=s.rabbitViews.find(r=>r.id===id);return s.view.screen({x:r.object.x,y:r.object.y-9.1});},id);
   assert.equal(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.tagName,p),'CANVAS',JSON.stringify(p));await page.touchscreen.tap(p.x,p.y);await page.locator('#game-panel').waitFor({state:'visible'});assert.equal(await page.locator('#panel-title').innerText(),{neige:'Lapin Neige',brumelin:'Brumelin','feu-glace':'Lapin Feu Glacé'}[species]);
   assert.equal(await page.evaluate(()=>window.__ui.view.id),id);
   report.selections.push({zoom,id,species});await page.click('#close-panel');
  }
  await page.screenshot({path:out+`/snow-seven-${zoom}.png`});
 }
 report.checks.push('All seven mixed residents of the snow habitat individually selected at zoom .8, 1.05 and 1.65.');
 const first=ids[0].id,p=await page.evaluate(id=>{const s=window.__scene,r=s.rabbitViews.find(r=>r.id===id);return s.view.screen({x:r.object.x,y:r.object.y-9.1});},first);await page.touchscreen.tap(p.x,p.y);
 assert.equal(await page.locator('img[data-rabbit-art="neige"]').count(),1);await page.screenshot({path:out+'/snow-profile.png'});await page.click('#close-panel');
 await page.click('#open-shop');await page.getByRole('button',{name:'Lapins',exact:true}).click();assert.equal(await page.locator('img[data-rabbit-art="neige"]').count(),1);await page.screenshot({path:out+'/snow-shop.png'});await page.click('#close-panel');
 await page.click('#open-collection');assert.equal(await page.locator('img[data-rabbit-art="neige"]').count(),1);await page.screenshot({path:out+'/snow-collection.png'});await page.click('#close-panel');
 await page.click('#open-settings');await page.click('#dev-scenario-reproduction');await page.click('#close-panel');
 const nest=await page.evaluate(()=>{const s=window.__scene,b=s.current.buildings.find(b=>b.kind==='nest'),p={x:120+(b.x/4+.5)*176,y:120+(b.y/4+.5)*148};s.view.zoom=1.05;s.view.x=p.x;s.view.y=p.y;s.applyCamera();return s.view.screen(p);});await page.touchscreen.tap(nest.x,nest.y);assert.equal(await page.locator('img[data-rabbit-art="neige"]').count(),1);await page.screenshot({path:out+'/snow-parents.png'});
 report.checks.push('Shared original PNG in profile, shop, collection and parent selection.');
 const stable=await page.evaluate(()=>{const r=window.__scene.rabbitViews.find(r=>r.sprite);return {sx:r.sprite.scaleX,sy:r.sprite.scaleY,ears:r.ears.length};});assert.equal(stable.sx,stable.sy);assert.equal(stable.ears,0);
 await page.setViewportSize({width:390,height:844});await page.click('#continue-portrait');await page.click('#close-panel');await page.click('#open-collection');await page.screenshot({path:out+'/snow-portrait.png'});
 report.checks.push('Uniform image scale and whole-image motion; portrait viewport fits the shared artwork.');assert.deepEqual(errors,[]);report.passed=true;
 }finally{if(!report.passed)await page.screenshot({path:out+'/snow-failure.png'});fs.writeFileSync(out+'/snow-browser-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
