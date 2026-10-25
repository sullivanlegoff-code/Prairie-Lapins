// Compiled game only. Real controls, existing laboratory fixture and read-only saves.
const enterGame=require('./check-camera.cjs').enter; // loading screen: press « Jouer » after each page load
// The camera model is bundled from the unchanged pure production module; no app hooks.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
(async()=>{
 const root=new URL(process.argv[2]),expected=process.argv[3]?.slice(0,7),out=process.env.PRAIRIE_CAPTURE_DIR||'/tmp/farm-proof';fs.mkdirSync(out,{recursive:true});
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'farm-model-')),bundle=path.join(temp,'model.cjs');
 require('esbuild').buildSync({stdin:{contents:"export {MeadowCamera} from './src/ui/gestures'; export {buildingCenter,finePoint} from './docs/screen-points'; export {visibleColumns} from './src/simulation/habitats'; export {VISUAL} from './src/config/visual'; export {FARM_ART} from './src/config/farmArt'; export {recenterCamera} from './src/display/recenter';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',outfile:bundle,define:{'import.meta.env.BASE_URL':JSON.stringify('/Project-L/')}});
 const {MeadowCamera,buildingCenter,finePoint,visibleColumns,VISUAL,FARM_ART,recenterCamera}=require(bundle),camera=require('./check-camera.cjs');
 // Selected palette file (src/config/farmArt.ts), e.g. /assets/buildings/farm-windmill-nest.png.
 const farmFile=FARM_ART.url.slice(FARM_ART.url.indexOf('/assets/'));
 const browser=await chromium.launch({args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:852,height:393},hasTouch:true});page.setDefaultTimeout(15000);
 const report={passed:false,url:root.href,browser:'Chromium mobile touch simulation; not physical Safari',checks:[],captures:[],errors:[]};
 page.on('pageerror',e=>report.errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.addLocatorHandler(page.locator('#player-level-dialog'),()=>page.locator('#continue-level-up').tap());
 const cdp=await page.context().newCDPSession(page);let lab=false,model=new MeadowCamera();
 const read=()=>page.evaluate(lab=>JSON.parse(localStorage.getItem((lab?'prairie-lapins.development.':'')+'prairie-lapins.save.v1')),lab);
 const stable=s=>{const {lastSimulatedAt,...rest}=s;return {...rest,buildings:s.buildings.map(({incomeUnits,...b})=>b)};};
 const settle=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const tap=name=>page.getByRole('button',{name,exact:true}).tap();
 const close=async()=>{if(await page.locator('#game-panel').isVisible())await page.locator('#close-panel').tap();};
 const ready=async()=>{
  await page.locator('#game canvas').waitFor();await page.waitForFunction(()=>document.querySelector('#save-status')?.dataset.status==='saved');
  await page.waitForFunction(file=>performance.getEntriesByType('resource').some(e=>e.name.includes(file)&&e.responseEnd>0),farmFile);
  if(expected)assert.ok((await page.locator('#game-version').textContent()).endsWith(expected));
  if(await page.locator('#portrait-notice').isVisible())await page.locator('#continue-portrait').tap();
  if(await page.getByRole('button',{name:'Masquer',exact:true}).isVisible())await tap('Masquer');await settle();
 };
 const shot=async name=>{await page.locator('#toast').waitFor({state:'hidden'});await page.screenshot({path:path.join(out,name+'.png')});report.captures.push(name+'.png');};
 const safe=()=>page.evaluate(()=>{
  for(const fy of [.65,.75,.5,.85])for(const fx of [.5,.25,.35,.65,.75]){
   const p={x:innerWidth*fx,y:innerHeight*fy};
   if(p.x>65&&p.x<innerWidth-65&&p.y>65&&p.y<innerHeight-65&&document.elementFromPoint(p.x,p.y)?.tagName==='CANVAS')return p;
  }throw Error('No exposed canvas gesture point');
 });
 const pan=async(dx,dy)=>{const from=await safe(),to={x:from.x+dx,y:from.y+dy};
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[from]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[to]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});model.pan(dx,dy);await settle();
 };
 const focus=async(world,desired)=>{
  // Ask the unchanged camera model for a legal target: at far zoom the island
  // may be narrower than the viewport, so an arbitrary pan target is impossible.
  const reachable=Object.assign(new MeadowCamera(),model),current=model.screen(world);
  reachable.pan(desired.x-current.x,desired.y-current.y);desired=reachable.screen(world);
  for(let i=0;i<40;i++){const p=model.screen(world),dx=desired.x-p.x,dy=desired.y-p.y;if(Math.hypot(dx,dy)<9)return;await pan(Math.max(-55,Math.min(55,dx)),Math.max(-55,Math.min(55,dy)));}
  throw Error('Camera could not frame the farm');
 };
 const zoom=async z=>{const at=await safe(),factor=z/model.zoom;await page.mouse.move(at.x,at.y);await page.mouse.wheel(0,-Math.log(factor)*1000);model.scale(factor,at);await settle();};
 const reset=async(world,z=VISUAL.camera.initialZoom,desired)=>{
  await close();const size=page.viewportSize();model=new MeadowCamera();model.resize(size.width,size.height);model.setColumns(visibleColumns(await read()));await camera.recenter(page,model,await read(),recenterCamera);
  if(z!==model.zoom)await zoom(z);await focus(world,desired||{x:size.width/2,y:size.height*.64});
 };
 const worldTap=async world=>{const p=model.screen(world);assert.equal(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.tagName,p),'CANVAS','farm target must be exposed');await page.touchscreen.tap(p.x,p.y);await settle();};
 const destination=async(x,y)=>{const world=finePoint(x+.5,y+.5);await focus(world,{x:220,y:275});await worldTap(world);assert.match(await page.locator('.placement-valid').innerText(),/4 × 4/);};
 const place=async()=>{await page.locator('#open-shop').tap();await tap('Bâtiments et décorations');await tap('Placer · 60 pièces');};
 const farm=id=>read().then(s=>s.buildings.find(b=>b.id===id));
 try{
  await page.goto(root.href);await enterGame(page);await ready();const normal=await read();
  report.alpha=await page.evaluate(async url=>{
   const res=await fetch(url);if(!res.ok)throw Error('Farm PNG unavailable');const bitmap=await createImageBitmap(await res.blob());
   const c=document.createElement('canvas');c.width=bitmap.width;c.height=bitmap.height;const g=c.getContext('2d');g.drawImage(bitmap,0,0);const d=g.getImageData(0,0,c.width,c.height).data;
   let clear=0,borderOpaque=0,left=c.width,right=0,top=c.height,bottom=0;
   for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const a=d[(y*c.width+x)*4+3];if(a===0)clear++;if(a>16){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);if(!x||!y||x===c.width-1||y===c.height-1)borderOpaque++;}}
   return {width:c.width,height:c.height,transparent:clear/(c.width*c.height),borderOpaque,bounds:{left,right,top,bottom}};
  },new URL(farmFile.slice(1),root).href);
  assert.deepEqual([report.alpha.width,report.alpha.height],[FARM_ART.width,FARM_ART.height]);assert.ok(report.alpha.transparent>.2);assert.equal(report.alpha.borderOpaque,0,'no cropped opaque edge or background');
  await reset(finePoint(22.5,20.5));await place();await destination(22,20);await shot('farm-normal-placement');await tap('Annuler · aucun coût');await close();assert.deepEqual(stable(await read()),stable(normal));
  lab=true;await page.goto(new URL('dev/',root).href);await enterGame(page);await ready();await page.locator('#open-settings').tap();await page.locator('#dev-scenario-fineBuildings').tap();await close();await settle();
  let s=await read();const first=s.buildings.find(b=>b.kind==='farm'),firstId=first.id,before=stable(s);
  await reset(buildingCenter(first),1.05,{x:220,y:275});await worldTap(buildingCenter(first));assert.equal(await page.locator('#panel-title').innerText(),'Ferme');await tap('Déplacer ce bâtiment');await destination(30,27);await shot('farm-moving-preview');await tap('Annuler · aucun coût');await close();assert.deepEqual(stable(await read()),before);
  await reset(buildingCenter(first),1.05,{x:220,y:275});await worldTap(buildingCenter(first));await tap('Déplacer ce bâtiment');await destination(30,27);await tap('Confirmer le déplacement · gratuit');await close();
  assert.deepEqual(await farm(firstId),{...first,x:30,y:27});assert.equal((await read()).pattes,s.pattes);
  await reset(finePoint(34.5,27.5));await place();await destination(34,27);const preBuy=await read();await tap('Acheter et placer · 60 pièces');await close();
  s=await read();assert.equal(s.buildings.filter(b=>b.kind==='farm').length,2);assert.equal(s.pattes,preBuy.pattes-60);assert.equal(s.progression.totalXp,preBuy.progression.totalXp+20);
  const second=s.buildings.filter(b=>b.kind==='farm').find(b=>b.id!==firstId),secondId=second.id;assert.deepEqual([second.x,second.y],[34,27]);assert.equal(second.order,null);
  await reset(buildingCenter(second),1.05,{x:220,y:275});await worldTap(buildingCenter(second));assert.equal(await page.locator('.work-state[data-state=free]').count(),1);await page.locator('#panel-content').evaluate(e=>{e.scrollTop=0;});await settle();await shot('farm-free-landscape');
  const beforeOrder=await read();await tap('Cultiver · 10 pièces');const running=await read(),order=(await farm(secondId)).order;
  assert.equal(running.pattes,beforeOrder.pattes-10);assert.equal(order.endsAt-order.startedAt,300000);assert.equal(running.progression.totalXp,beforeOrder.progression.totalXp);
  assert.equal(await page.locator('.work-state[data-state=running]').count(),1);assert.ok(await page.locator('#panel-content progress').isVisible());await page.locator('#panel-content').evaluate(e=>{e.scrollTop=0;});await settle();
  assert.ok(await page.locator('#panel-content progress').evaluate(e=>{const r=e.getBoundingClientRect(),p=e.closest('.panel-scroll').getBoundingClientRect();return r.top>=p.top&&r.bottom<=p.bottom;}),'production progress stays inside the visible panel');
  await shot('farm-running-landscape');await close();
  await page.locator('#open-settings').tap();await page.locator('#dev-time-5').tap();await close();
  await reset(buildingCenter(await farm(secondId)),1.05,{x:220,y:275});await worldTap(buildingCenter(await farm(secondId)));assert.equal(await page.locator('.work-state[data-state=ready]').count(),1);await page.locator('#panel-content').evaluate(e=>{e.scrollTop=0;});await settle();await shot('farm-ready-landscape');
  const readyState=await read();await tap('Récolter 20 herbes');const collected=await read();assert.equal(collected.grass,readyState.grass+20);assert.equal(collected.progression.totalXp,readyState.progression.totalXp);await close();
  const a=await farm(firstId),b=await farm(secondId),mid={x:(buildingCenter(a).x+buildingCenter(b).x)/2,y:buildingCenter(a).y};
  for(const size of [{width:852,height:393},{width:390,height:844}]){
   await page.setViewportSize(size);await ready();
   for(const [name,z] of [['far',VISUAL.camera.minZoom],['normal',VISUAL.camera.initialZoom],['close',VISUAL.camera.maxZoom]]){
    await reset(name==='normal'?mid:buildingCenter(b),z);await shot('farm-'+size.width+'-'+name);
   }
   for(const [id,state] of [[firstId,'ready'],[secondId,'free']]){
    const f=await farm(id);await reset(buildingCenter(f),1.05);await worldTap(buildingCenter(f));assert.equal(await page.locator('#panel-title').innerText(),'Ferme');assert.equal(await page.locator('.work-state[data-state='+state+']').count(),1);await close();
   }
  }
  const textureLoads=()=>page.evaluate(file=>performance.getEntriesByType('resource').filter(e=>e.name.includes(file)).length,farmFile);
  assert.equal(await textureLoads(),1,'one texture request throughout placement, movement and neighbour rendering');
  // A ready badge must not intercept the front edge of a farm immediately north.
  await page.setViewportSize({width:852,height:393});await ready();
  const free=await farm(secondId);await reset(buildingCenter(free),1.05,{x:220,y:275});await worldTap(buildingCenter(free));
  await tap('Déplacer ce bâtiment');await destination(30,23);await tap('Confirmer le déplacement · gratuit');await close();
  assert.ok(FARM_ART.harvestY-25>=-VISUAL.grid.depth/2&&FARM_ART.harvestY+25<=VISUAL.grid.depth/2,'farm badge hit area stays inside its own footprint');
  const north=await farm(secondId),south=await farm(firstId),northFront={x:buildingCenter(north).x,y:buildingCenter(north).y+40};
  await reset(northFront,.75);await worldTap(northFront);assert.equal(await page.locator('.work-state[data-state=free]').count(),1,'north front edge selects its own farm, not the ready neighbour badge');await close();
  assert.ok((await farm(firstId)).order,'neighbour selection must not harvest the ready farm');
  const verticalMid={x:buildingCenter(north).x,y:(buildingCenter(north).y+buildingCenter(south).y)/2};await reset(verticalMid,.75,{x:426,y:220});await shot('farm-vertical-neighbours');
  const persisted=stable(await read());await page.reload();await enterGame(page);await ready();assert.deepEqual(stable(await read()),persisted);
  assert.deepEqual(await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('prairie-lapins.save.v1'));const {lastSimulatedAt,...r}=s;return {...r,buildings:s.buildings.map(({incomeUnits,...b})=>b)};}),stable(normal));
  const requests=await textureLoads();assert.equal(requests,1,'one cached texture load for both farms');
  report.checks.push('Transparent PNG, normal placement cancellation, laboratory work-preserving move cancelled/confirmed, second adjacent farm bought through real controls, free/running/ready states, exact price/time/XP/harvest, three zooms in landscape/portrait, each horizontal neighbour selected by its own state, north-front-edge selection next to a ready south farm, reload and normal/laboratory isolation, single texture image load.');
  const comparison=await browser.newPage({viewport:{width:1100,height:700}});
  const original=fs.readFileSync(path.join(__dirname,'references/farm/Ferme-original.png')).toString('base64'),adapted=fs.readFileSync('public/assets/buildings/farm-windmill.png').toString('base64');
  await comparison.setContent('<style>body{margin:0;padding:24px;font:18px Arial;background:#fffaf0;color:#35472f}main{display:flex;gap:24px}figure{margin:0;width:514px}figcaption{height:50px;font-weight:bold}.frame{height:540px;display:flex;align-items:center;justify-content:center;background:repeating-conic-gradient(#edf0e6 0% 25%,#fffaf0 0% 50%) 50%/24px 24px;border-radius:18px}img{max-width:100%;max-height:100%;object-fit:contain}p{font-size:15px}</style><h2>Ferme — référence et adaptation intégrée</h2><main><figure><figcaption>Original conservé · Ferme.png</figcaption><div class=frame><img src="data:image/png;base64,'+original+'"></div></figure><figure><figcaption>Adaptation · texture transparente, moulin statique</figcaption><div class=frame><img src="data:image/png;base64,'+adapted+'"></div></figure></main>');
  await comparison.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));await comparison.screenshot({path:path.join(out,'farm-reference-comparison.png')});await comparison.close();report.captures.push('farm-reference-comparison.png');
  assert.deepEqual(report.errors,[]);report.passed=true;
 }catch(e){report.failure=String(e.stack||e);await shot('farm-failure');throw e;}
 finally{fs.writeFileSync(path.join(out,'farm-art-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();fs.rmSync(temp,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
