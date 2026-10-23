// Compiled game only. Real controls, existing laboratory fixture and read-only saves.
const enterGame=require('./check-camera.cjs').enter; // loading screen: press « Jouer » after each page load
// The camera model is bundled from the unchanged pure production module; no app hooks.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
/** v13 nursery: the baby in the lowest slot (the only one at capacity 1), or null. */
const babyOf=b=>[...(b?.nursery?.babies??[])].sort((x,y)=>x.slot-y.slot)[0]??null;
(async()=>{
 const root=new URL(process.argv[2]),expected=process.argv[3]?.slice(0,7),out=process.env.PRAIRIE_CAPTURE_DIR||'/tmp/nursery-proof';fs.mkdirSync(out,{recursive:true});
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'nursery-model-')),bundle=path.join(temp,'model.cjs');
 require('esbuild').buildSync({stdin:{contents:"export {MeadowCamera} from './src/ui/gestures'; export {buildingCenter,finePoint} from './docs/screen-points'; export {visibleColumns} from './src/simulation/habitats'; export {VISUAL} from './src/config/visual'; export {NURSERY_ART} from './src/config/nurseryArt'; export {recenterCamera} from './src/display/recenter';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',outfile:bundle,define:{'import.meta.env.BASE_URL':JSON.stringify('/Project-L/')}});
 const {MeadowCamera,buildingCenter,finePoint,visibleColumns,VISUAL,NURSERY_ART,recenterCamera}=require(bundle),camera=require('./check-camera.cjs');
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
  await page.waitForLoadState('networkidle');
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
  throw Error('Camera could not frame the nursery');
 };
 const zoom=async z=>{const at=await safe(),factor=z/model.zoom;await page.mouse.move(at.x,at.y);await page.mouse.wheel(0,-Math.log(factor)*1000);model.scale(factor,at);await settle();};
 const reset=async(world,z=VISUAL.camera.initialZoom,desired)=>{
  await close();const size=page.viewportSize();model=new MeadowCamera();model.resize(size.width,size.height);model.setColumns(visibleColumns(await read()));await camera.recenter(page,model,await read(),recenterCamera);
  if(z!==model.zoom)await zoom(z);await focus(world,desired||{x:size.width/2,y:size.width>size.height?215:size.height*.61});
 };
 const worldTap=async world=>{const p=model.screen(world);assert.equal(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.tagName,p),'CANVAS','nursery target must be exposed');await page.touchscreen.tap(p.x,p.y);await settle();};
 const destination=async(x,y)=>{const world=finePoint(x+.5,y+.5);await focus(world,{x:220,y:210});await worldTap(world);assert.match(await page.locator('.placement-valid').innerText(),/4 × 4/);};


 const building=kind=>read().then(s=>s.buildings.find(b=>b.kind===kind));
 const open=async kind=>{const b=await building(kind),center=buildingCenter(b),target={x:center.x,y:center.y+58};await reset(target,1.05,{x:220,y:245});await worldTap(target);assert.equal(await page.locator('#panel-title').innerText(),kind==='nest'?'Nid':'Nurserie');};
 const choose=async(name,slot)=>page.locator('article').filter({has:page.getByRole('heading',{name,exact:true})}).getByRole('button',{name:slot,exact:true}).tap();
 const advance=async()=>{await page.locator('#open-settings').tap();await page.locator('#dev-time-60').tap();await close();};
 const views=async state=>{
  for(const size of [{width:852,height:393},{width:390,height:844}]){
   await page.setViewportSize(size);await ready();
   for(const [name,z] of [['far',.4],['normal',1.05],['close',1.65]]){await reset(buildingCenter(await building('nursery')),z);await shot('nursery-'+state+'-'+size.width+'-'+name);}
   await open('nursery');await close();
  }
  await page.setViewportSize({width:852,height:393});await ready();
 };
 const panelShot=async name=>{await page.locator('#panel-content').evaluate(e=>{e.scrollTop=0;});await settle();await shot(name);};
 const secret=async()=>{
  assert.equal(await page.locator('.work-state[data-state=running]').count(),1);
  assert.match(await page.locator('#panel-content').innerText(),/Son espèce reste secrète/);
  assert.equal(await page.locator('#panel-content [data-rabbit-art]').count(),0);
  assert.equal(await page.locator('#panel-content h3').count(),0);
  assert.equal(await page.locator('#panel-content svg').filter({hasText:'?'}).count(),1,'unknown portrait retained');
  assert.ok(await page.locator('#panel-content progress').count());
  await page.locator('#panel-content').evaluate(e=>{e.scrollTop=0;});await settle();
  for(const selector of ['#panel-content progress','#panel-content .timer'])assert.ok(await page.locator(selector).evaluate(e=>{const r=e.getBoundingClientRect(),p=e.closest('.panel-scroll').getBoundingClientRect();return r.top>=p.top&&r.bottom<=p.bottom;}),'growth timer and progress must be visible without scrolling');
 };
 // The art file comes from the production config, never a hard-coded name: public/<ART_FILE> and <root>/<ART_FILE>.
 const ART_FILE='assets/'+NURSERY_ART.url.split('/assets/').pop();
 const textureLoads=()=>page.evaluate(file=>performance.getEntriesByType('resource').filter(e=>e.name.includes('/'+file)).length,ART_FILE);
 const unchangedWork=b=>{const {incomeUnits,...rest}=b;return rest;};
 try{
  await page.goto(root.href);await enterGame(page);await ready();const normal=stable(await read());
  report.alpha=await page.evaluate(async url=>{
   const res=await fetch(url);if(!res.ok)throw Error('Nursery PNG unavailable');const bitmap=await createImageBitmap(await res.blob());
   const c=document.createElement('canvas');c.width=bitmap.width;c.height=bitmap.height;const g=c.getContext('2d');g.drawImage(bitmap,0,0);const d=g.getImageData(0,0,c.width,c.height).data;
   let clear=0,borderOpaque=0,left=c.width,right=0,top=c.height,bottom=0;
   for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const a=d[(y*c.width+x)*4+3];if(a===0)clear++;if(a>16){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);if(!x||!y||x===c.width-1||y===c.height-1)borderOpaque++;}}
   return {width:c.width,height:c.height,transparent:clear/(c.width*c.height),borderOpaque,bounds:{left,right,top,bottom}};
  },new URL(ART_FILE,root).href);
  assert.deepEqual([report.alpha.width,report.alpha.height],[NURSERY_ART.width,NURSERY_ART.height]);assert.ok(report.alpha.transparent>.2);assert.equal(report.alpha.borderOpaque,0);
  lab=true;await page.goto(new URL('dev/',root).href);await enterGame(page);await ready();await page.locator('#open-settings').tap();await page.locator('#dev-scenario-fineBuildings').tap();await close();await settle();
  const initial=await read(),first=await building('nursery'),farm=await building('farm'),originalNest=await building('nest');
  assert.equal(babyOf(first),null);await views('free');await open('nursery');assert.equal(await page.locator('.work-state[data-state=free]').count(),1);await panelShot('nursery-free-panel');await close();
  await open('nest');await choose('Lapin Paille','Parent A');await choose('Lapin Neige','Parent B');await tap('Lancer la reproduction · gratuit');await close();
  const breeding=(await building('nest')).breeding;assert.ok(breeding);await advance();
  assert.equal(babyOf((await building('nursery'))),null,'deadline never transfers automatically');await open('nest');await tap('Envoyer dans la nurserie');await close();
  let s=await read(),baby=babyOf((await building('nursery')));assert.deepEqual(baby.birth,breeding.birth);assert.equal((await building('nest')).breeding,null);
  assert.equal(baby.readyAt-baby.startedAt,baby.birth.species==='brumelin'?900000:300000);assert.deepEqual(s.rabbits,initial.rabbits);
  const startedXp=s.progression.totalXp;await open('nursery');await secret();await panelShot('nursery-growing-panel');await close();
  const beforeMove=stable(await read());await open('nursery');await tap('Déplacer ce bâtiment');await destination(36,27);await shot('nursery-moving-preview');await tap('Annuler · aucun coût');await close();assert.deepEqual(stable(await read()),beforeMove);
  await open('nursery');await tap('Déplacer ce bâtiment');await destination(36,27);await tap('Confirmer le déplacement · gratuit');await close();
  assert.deepEqual(await building('nursery'),{...first,x:36,y:27,nursery:{...first.nursery,babies:[baby]}});assert.equal((await read()).progression.totalXp,startedXp);
  assert.equal(await textureLoads(),1,'one shared texture through movement and redraws');
  const moving=stable(await read());await page.reload();await enterGame(page);await ready();assert.deepEqual(stable(await read()),moving);await open('nursery');await secret();await close();
  await views('growing');await open('nursery');await secret();await close();await advance();
  assert.deepEqual(babyOf((await building('nursery'))),baby);await open('nursery');assert.equal(await page.locator('.work-state[data-state=blocked]').count(),1);assert.match(await page.locator('#panel-content').innerText(),/Le lapereau reste en sécurité/);
  const full=page.getByRole('button',{name:'Enclos 1 · 7/7',exact:true});assert.equal(await full.isDisabled(),true);
  const blocked=stable(await read());await full.evaluate(e=>e.scrollIntoView({block:'nearest'}));await settle();const box=await full.boundingBox();await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);assert.deepEqual(stable(await read()),blocked);await panelShot('nursery-full-panel');await close();
  await views('ready');const waiting=stable(await read());await page.reload();await enterGame(page);await ready();assert.deepEqual(stable(await read()),waiting);assert.deepEqual(babyOf((await building('nursery'))),baby);
  // Free one real place without entrusting or creating a rabbit: move Volant to the existing flight habitat.
  s=await read();const flyer=s.rabbits.find(r=>r.species==='volant'),home=s.buildings.find(b=>b.id===flyer.enclosureId),flight=s.buildings.find(b=>b.kind==='enclosure'&&b.habitat.type==='vol');
  const residents=s.rabbits.filter(r=>r.enclosureId===home.id),offset=VISUAL.rabbit.crowdedOffsets[residents.findIndex(r=>r.id===flyer.id)],center=buildingCenter(home);
  await reset(center,1.05);await worldTap({x:center.x+offset.x,y:center.y+offset.y-7*VISUAL.rabbit.scale});assert.equal(await page.locator('#panel-title').innerText(),'Lapin Volant');await tap('Changer d’habitat');await page.getByRole('button',{name:/ 2 · 0\/3$/}).tap();await close();
  assert.equal((await read()).rabbits.find(r=>r.id===flyer.id).enclosureId,flight.id);assert.deepEqual(babyOf((await building('nursery'))),baby);
  await reset(buildingCenter(await building('nursery')),1.05);await shot('nursery-ready-landscape');
  const target=buildingCenter(await building('nursery'));assert.ok(NURSERY_ART.actionY+25<=VISUAL.grid.depth/2);
  await worldTap({x:target.x,y:target.y+NURSERY_ART.actionY});assert.equal(await page.locator('#panel-title').innerText(),'Nurserie');assert.equal(await page.locator('.work-state[data-state=ready]').count(),1);await close();await open('nursery');await panelShot('nursery-ready-panel');
  await page.getByRole('button',{name:'Enclos 1 · 6/7',exact:true}).evaluate(e=>e.scrollIntoView({block:'nearest'}));await settle();await shot('nursery-welcome-action');
  const beforeWelcome=await read();await page.getByRole('button',{name:'Enclos 1 · 6/7',exact:true}).evaluate(e=>{e.click();e.click();});s=await read();
  assert.equal(babyOf((await building('nursery'))),null);assert.equal(s.rabbits.length,initial.rabbits.length+1);assert.equal(new Set(s.rabbits.map(r=>r.id)).size,s.rabbits.length);
  const newborn=s.rabbits.find(r=>!initial.rabbits.some(old=>old.id===r.id));assert.equal(newborn.species,baby.birth.species);assert.equal(newborn.enclosureId,home.id);assert.ok(s.progression.totalXp>beforeWelcome.progression.totalXp);
  assert.deepEqual(unchangedWork(await building('farm')),unchangedWork(farm));assert.deepEqual({...await building('nest'),breeding:null},originalNest);
  await close();await reset(buildingCenter(await building('nursery')),1.05);await shot('nursery-free-after-welcome');await open('nursery');assert.equal(await page.locator('.work-state[data-state=free]').count(),1);await close();
  const final=stable(await read());await page.reload();await enterGame(page);await ready();assert.deepEqual(stable(await read()),final);assert.equal(await textureLoads(),1);
  const normalAgain=await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('prairie-lapins.save.v1'));const {lastSimulatedAt,...rest}=s;return {...rest,buildings:s.buildings.map(({incomeUnits,...b})=>b)};});assert.deepEqual(normalAgain,normal);
  report.checks.push('Free nursery, manual transfer from nest, secret unknown portrait and unchanged original birth/growth deadline, growing move cancelled/confirmed, reload while growing and ready, full habitat disabled under real touch without baby loss, real Volant move frees a place, welcome once under double pressure then free nursery, exact newborn, XP awarded once, farm/nest preserved, three zooms and two mobile orientations, normal/lab isolation, shared texture.');
  const comparison=await browser.newPage({viewport:{width:1100,height:700}}),original=fs.readFileSync(path.join(__dirname,'references/nursery/Nurserie-original.png')).toString('base64'),adapted=fs.readFileSync(path.join('public',ART_FILE)).toString('base64');
  await comparison.setContent('<style>body{margin:0;padding:24px;font:18px Arial;background:#fffaf0;color:#35472f}main{display:flex;gap:24px}figure{margin:0;width:514px}figcaption{height:50px;font-weight:bold}.frame{height:540px;display:flex;align-items:center;justify-content:center;background:repeating-conic-gradient(#edf0e6 0% 25%,#fffaf0 0% 50%) 50%/24px 24px;border-radius:18px}img{max-width:100%;max-height:100%;object-fit:contain}</style><h2>Nurserie — ancienne référence et base v2 intégrée</h2><main><figure><figcaption>Ancienne nurserie (v1) · Nurserie.png</figcaption><div class=frame><img src="data:image/png;base64,'+original+'"></div></figure><figure><figcaption>Base v2 · architecture fixe, quatre couchages vides</figcaption><div class=frame><img src="data:image/png;base64,'+adapted+'"></div></figure></main>');
  await comparison.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));await comparison.screenshot({path:path.join(out,'nursery-reference-comparison.png')});await comparison.close();report.captures.push('nursery-reference-comparison.png');assert.deepEqual(report.errors,[]);report.passed=true;
 }catch(e){report.failure=String(e.stack||e);await shot('nursery-failure');throw e;}
 finally{fs.writeFileSync(path.join(out,'nursery-art-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();fs.rmSync(temp,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
