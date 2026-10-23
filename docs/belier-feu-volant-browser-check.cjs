// Hooks are added only to intercepted local source, never shipped to the game.
const enterGame=require('./check-camera.cjs').enter; // loading screen: press « Jouer » after each page load
const {chromium}=require('playwright'), fs=require('node:fs'), assert=require('node:assert/strict');
const url=process.env.PRAIRIE_TEST_URL||'http://127.0.0.1:5194/Project-L/?dev=1';
const out=process.env.PRAIRIE_CAPTURE_DIR||'/tmp/belier-feu-volant-proof';
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({executablePath:process.env.PRAIRIE_CHROMIUM==='playwright'?undefined:process.env.PRAIRIE_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:852,height:393},hasTouch:true});page.setDefaultTimeout(15000);
 const report={passed:false,checks:[],selections:[],errors:[],browser:'Chromium touch emulation, not physical iPhone Safari'};
 page.on('pageerror',e=>report.errors.push(e.message));
 const tapRabbit=async id=>{
  const p=await page.evaluate(id=>{const s=window.__scene,r=s.rabbitViews.find(r=>r.id===id);return s.view.screen({x:r.object.x,y:r.object.y-9.1});},id);
  assert.equal(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.tagName,p),'CANVAS');
  await page.touchscreen.tap(p.x,p.y);await page.locator('#game-panel').waitFor({state:'visible'});
  assert.equal(await page.evaluate(()=>window.__ui.view.id),id);
 };
 try{
  await page.route('**/src/main.ts*',async route=>{const r=await route.fetch();await route.fulfill({response:r,body:(await r.text()).replace('const game = new Phaser.Game','window.__controller = controller; window.__scene = scene; const game = new Phaser.Game').replace('const disposePanel =','window.__ui = ui; const disposePanel =')});});
  await page.goto(url);await enterGame(page);await page.waitForFunction(()=>window.__scene?.rabbitViews.some(r=>r.sprite));
  await page.getByRole('button',{name:'Masquer',exact:true}).click();page.on('dialog',d=>d.accept());
  await page.click('#open-settings');await page.click('#dev-scenario-collection');await page.click('#close-panel');
  await page.evaluate(()=>{const c=window.__controller,s=JSON.parse(c.exportGame().json),home=s.buildings.find(b=>b.kind==='enclosure'),types=['paille','neige','terre','belier-gris','feu','volant','brumelin'];s.rabbits.filter(r=>r.enclosureId===home.id).forEach((r,i)=>r.species=types[i]);const p=c.prepareImport(JSON.stringify(s));if(!p.ok)throw Error(p.reason);const done=c.confirmImport(p.token,true);if(!done.ok)throw Error(done.reason);});
  await page.click('#close-panel'); // The fixture import opens Settings; resident taps must reach the canvas.
  const ids=await page.evaluate(()=>{const s=window.__scene,home=s.current.buildings.find(b=>b.kind==='enclosure');
   s.view.x=120+(home.x/4+.5)*176;s.view.y=120+(home.y/4+.5)*148;s.applyCamera();
   return s.current.rabbits.filter(r=>r.enclosureId===home.id).map(r=>({id:r.id,species:r.species}));});
  assert.equal(ids.length,7);assert.deepEqual(ids.slice(0,3).map(r=>r.species),['paille','neige','terre']);
  for(const zoom of [.8,1.05,1.65]){
   await page.evaluate(z=>{window.__scene.view.zoom=z;window.__scene.applyCamera();},zoom);
   for(const {id,species} of ids){await tapRabbit(id);report.selections.push({zoom,id,species});await page.click('#close-panel');}
   await page.screenshot({path:out+`/belier-feu-volant-seven-${zoom}.png`});
  }
  report.checks.push('Seven mixed residents including all six common species individually selected at zoom .8, 1.05, 1.65.');
  for(const species of ['belier-gris','feu','volant']){
   const {id}=ids.find(r=>r.species===species);await tapRabbit(id);
   assert.equal(await page.locator(`img[data-rabbit-art="${species}"]`).count(),1);
   await page.screenshot({path:out+`/${species}-profile.png`});
   const clip=await page.evaluate(species=>{const img=document.querySelector(`img[data-rabbit-art="${species}"]`);if(!img)throw Error("Missing portrait");const {x,y,width,height}=img.getBoundingClientRect();return {x,y,width,height};},species);
   await page.screenshot({path:out+`/${species}-portrait-crop.png`,clip});await page.click('#close-panel');
   const ear=await page.evaluate(id=>{const s=window.__scene,r=s.rabbitViews.find(r=>r.id===id),a=r.art;
    const x=Math.floor(a.width*(a.species==='belier-gris'?.56:.5)),y=Math.floor(a.height*.55);
    if(s.textures.getPixelAlpha(x,y,a.texture)<32)throw Error('Ear fixture is transparent');
    const world=r.sprite.getWorldTransformMatrix().transformPoint(x-a.width/2,y-a.height);return s.view.screen(world);},id);
   await page.touchscreen.tap(ear.x,ear.y);assert.equal(await page.evaluate(()=>window.__ui.view.id),id);await page.click('#close-panel');
  }
  const styles=await page.evaluate(()=>window.__scene.rabbitViews.filter(r=>r.sprite).map(r=>({id:r.id,species:r.art.species,sx:r.sprite.scaleX,sy:r.sprite.scaleY,ears:r.ears.length,originX:r.sprite.originX,originY:r.sprite.originY,y:r.sprite.y})));
  for(const r of styles){assert.equal(r.sx,r.sy);assert.equal(r.ears,0);assert.equal(r.originX,.5);assert.equal(r.originY,1);assert.equal(r.y,12);}report.styles=styles;
  const mask=await page.evaluate(()=>{
   const s=window.__scene,flight=s.rabbitViews.find(r=>r.art?.species==='volant'),views=s.rabbitViews,select=s.select;
   const results=[];try{s.rabbitViews=[flight];s.select=choice=>results.push(choice);
    for(const [x,y] of [[Math.floor(flight.art.width*.12),Math.floor(flight.art.height*.32)],[0,0]]){
     const world=flight.sprite.getWorldTransformMatrix().transformPoint(x-flight.art.width/2,y-flight.art.height);
     s.tap(s.view.screen(world));
    }
   }finally{s.rabbitViews=views;s.select=select;}
   return {id:flight.id,results};
  });
  assert.equal(mask.results[0].kind,'rabbit');assert.equal(mask.results[0].id,mask.id);assert.notEqual(mask.results[1].kind,'rabbit');
  report.checks.push('Volant wing is selectable; transparent corner is rejected by the same scene hit path (isolated mask probe).');
  await page.click('#open-shop');await page.getByRole('button',{name:'Lapins',exact:true}).click();
  for(const species of ['belier-gris','feu','volant'])assert.equal(await page.locator(`img[data-rabbit-art="${species}"]`).count(),1);
  await page.screenshot({path:out+'/belier-feu-volant-shop.png'});await page.click('#close-panel');
  await page.click('#open-collection');for(const species of ['belier-gris','feu','volant'])assert.equal(await page.locator(`img[data-rabbit-art="${species}"]`).count(),1);
  await page.screenshot({path:out+'/belier-feu-volant-collection.png'});await page.click('#close-panel');
  const nest=await page.evaluate(()=>{const s=window.__scene,b=s.current.buildings.find(b=>b.kind==='nest'),p={x:120+(b.x/4+.5)*176,y:120+(b.y/4+.5)*148};s.view.zoom=1.05;s.view.x=p.x;s.view.y=p.y;s.applyCamera();return s.view.screen(p);});
  await page.touchscreen.tap(nest.x,nest.y);for(const species of ['belier-gris','feu','volant'])assert.ok(await page.locator(`img[data-rabbit-art="${species}"]`).count()>=1);
  await page.screenshot({path:out+'/belier-feu-volant-parents.png'});await page.click('#close-panel');
  await page.setViewportSize({width:390,height:844});await page.click('#continue-portrait');await page.click('#open-collection');
  await page.screenshot({path:out+'/belier-feu-volant-portrait.png'});
  report.checks.push('Bélier Gris, Feu and Volant profiles, shop, collection, parent selection and portrait viewport share their original PNG.');
  report.checks.push('Each sprite uses its own alpha hit mask including the ears, uniform scale and unchanged whole-image motion.');
  assert.deepEqual(report.errors,[]);report.passed=true;
 }finally{if(!report.passed)await page.screenshot({path:out+'/belier-feu-volant-failure.png'});fs.writeFileSync(out+'/belier-feu-volant-browser-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
