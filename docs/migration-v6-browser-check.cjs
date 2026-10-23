// Disposable browser profile; legacy fixtures never touch a player's browser storage.
const enterGame=require('./check-camera.cjs').enter; // loading screen: press « Jouer » after each page load
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const url=process.env.PRAIRIE_TEST_URL||'http://127.0.0.1:5183/Project-L/?dev=1',out=process.env.PRAIRIE_CAPTURE_DIR||'/workspace/work/migration-v6-browser';
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({executablePath:process.env.PRAIRIE_CHROMIUM==='playwright'?undefined:process.env.PRAIRIE_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:852,height:393}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const key='prairie-lapins.development.prairie-lapins.save.v1';
 try {
  await page.goto(url);await enterGame(page);await page.waitForFunction(()=>document.getElementById('save-status')?.dataset.status==='saved');
  const old=await page.evaluate(key=>{const s=JSON.parse(localStorage.getItem(key));delete s.progression;delete s.recipeBook;delete s.levelAccessTransition;delete s.presentationId;delete s.initiation;delete s.startCourse;delete s.purchaseUnlocks;delete s.acquiredParcels;s.version=5;s.expanded=false;s.secondExpanded=false;s.lastSimulatedAt=Date.now();s.nextId=9;s.buildings=s.buildings.filter(b=>b.kind==='enclosure');s.buildings[0].x=0;s.buildings[0].y=0;s.buildings.push({...structuredClone(s.buildings[0]),id:'building-4',x:1});s.decorations=['soft-cushion','ball-toys','play-tunnel','small-parasol'].map((catalogId,i)=>({id:'decoration-'+(i+5),catalogId,location:{kind:'habitat',habitatId:i<3?'building-1':'building-4',slot:i<3?i:0}}));localStorage.setItem(key,JSON.stringify(s));return s},key);
  await page.reload();await enterGame(page);await page.locator('#land-conversion-notice').waitFor();assert.match(await page.locator('#land-conversion-notice').innerText(),/4 décoration.*conservés.*extérieur/);
  const migrated=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);assert.equal(migrated.version,11);assert.deepEqual(migrated.acquiredParcels,['center']);assert.deepEqual(migrated.decorations.map(d=>d.id),old.decorations.map(d=>d.id));assert.ok(migrated.decorations.every(d=>d.location.kind==='inventory'));assert.equal(migrated.pattes,old.pattes);assert.equal(migrated.hearts,old.hearts);assert.equal(migrated.grass,old.grass);assert.deepEqual(migrated.rabbits,old.rabbits);
  await page.screenshot({path:out+'/conversion.png'});await page.getByRole('button',{name:'Compris',exact:true}).click();await page.reload();await enterGame(page);await page.waitForFunction(()=>document.getElementById('save-status')?.dataset.status==='saved');assert.equal(await page.locator('#land-conversion-notice').count(),0);assert.deepEqual((await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key)).decorations,migrated.decorations);assert.deepEqual(errors,[]);
  const report={passed:true,stored:4,idsPreserved:true,resourcesPreserved:true,oneNotice:true,reload:true,errors};fs.writeFileSync(out+'/migration-v6-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{await context.close();await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
