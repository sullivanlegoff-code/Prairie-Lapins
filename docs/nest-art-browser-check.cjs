// HISTORIQUE (2026-10-17) : vérifie l'ancienne illustration du nid en grotte (nest-heart-cave.png,
// 1254 × 1254), remplacée par le jardin (nest-garden-*.png). Contrôles actuels : nest-design-check.cjs
// et nest-palette-check.cjs. Conservé pour mémoire ; il échoue volontairement sur le build actuel.
// Compiled game only. Real controls, existing laboratory fixture and read-only saves.
// The camera model is bundled from the unchanged pure production module; no app hooks.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
(async()=>{
 const root=new URL(process.argv[2]),expected=process.argv[3]?.slice(0,7),out=process.env.PRAIRIE_CAPTURE_DIR||'/tmp/nest-proof';fs.mkdirSync(out,{recursive:true});
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'nest-model-')),bundle=path.join(temp,'model.cjs');
 require('esbuild').buildSync({stdin:{contents:"export {MeadowCamera} from './src/ui/gestures'; export {buildingCenter,finePoint} from './docs/screen-points'; export {visibleColumns} from './src/simulation/habitats'; export {VISUAL} from './src/config/visual'; export {NEST_ART} from './src/config/nestArt';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',outfile:bundle,define:{'import.meta.env.BASE_URL':JSON.stringify('/Project-L/')}});
 const {MeadowCamera,buildingCenter,finePoint,visibleColumns,VISUAL,NEST_ART}=require(bundle);
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
  throw Error('Camera could not frame the nest');
 };
 const zoom=async z=>{const at=await safe(),factor=z/model.zoom;await page.mouse.move(at.x,at.y);await page.mouse.wheel(0,-Math.log(factor)*1000);model.scale(factor,at);await settle();};
 const reset=async(world,z=VISUAL.camera.initialZoom,desired)=>{
  await close();await page.locator('#recenter-view').tap();await settle();const size=page.viewportSize();model=new MeadowCamera();model.resize(size.width,size.height);model.setColumns(visibleColumns(await read()));model.setInsets(null);model.recenter();
  if(z!==model.zoom)await zoom(z);await focus(world,desired||{x:size.width/2,y:size.width>size.height?215:size.height*.61});
 };
 const worldTap=async world=>{const p=model.screen(world);assert.equal(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.tagName,p),'CANVAS','nest target must be exposed');await page.touchscreen.tap(p.x,p.y);await settle();};
 const destination=async(x,y)=>{const world=finePoint(x+.5,y+.5);await focus(world,{x:220,y:210});await worldTap(world);assert.match(await page.locator('.placement-valid').innerText(),/4 × 4/);};

 const nest=()=>read().then(s=>s.buildings.find(b=>b.kind==='nest'));
 const homeMap=s=>s.rabbits.map(r=>[r.id,r.enclosureId]);
 const openNest=async()=>{const b=await nest(),target={x:buildingCenter(b).x,y:buildingCenter(b).y+58};await reset(target,1.05,{x:220,y:245});await worldTap(target);assert.equal(await page.locator('#panel-title').innerText(),'Nid');};
 const choose=async(species,slot)=>page.locator('article').filter({has:page.getByRole('heading',{name:species,exact:true})}).getByRole('button',{name:slot,exact:true}).tap();
 const parentTap=async(index,name)=>{
  const n=await nest(),p=buildingCenter(n),offset=NEST_ART.parentOffsets[index];
  await worldTap({x:p.x+offset.x,y:p.y+offset.y-7*VISUAL.rabbit.scale});
  assert.equal(await page.locator('#panel-title').innerText(),name);
  assert.match(await page.locator('#panel-content').innerText(),/Au nid/);
  assert.equal(await page.getByRole('button',{name:'Changer d’habitat',exact:true}).isDisabled(),true);
  await close();
 };
 try{
  await page.goto(root.href);await ready();const normal=stable(await read());
  report.alpha=await page.evaluate(async url=>{
   const res=await fetch(url);if(!res.ok)throw Error('Nest PNG unavailable');const bitmap=await createImageBitmap(await res.blob());
   const c=document.createElement('canvas');c.width=bitmap.width;c.height=bitmap.height;const g=c.getContext('2d');g.drawImage(bitmap,0,0);const d=g.getImageData(0,0,c.width,c.height).data;
   let clear=0,borderOpaque=0,left=c.width,right=0,top=c.height,bottom=0;
   for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const a=d[(y*c.width+x)*4+3];if(a===0)clear++;if(a>16){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);if(!x||!y||x===c.width-1||y===c.height-1)borderOpaque++;}}
   return {width:c.width,height:c.height,transparent:clear/(c.width*c.height),borderOpaque,bounds:{left,right,top,bottom}};
  },new URL('assets/buildings/nest-heart-cave.png',root).href);
  assert.deepEqual([report.alpha.width,report.alpha.height],[NEST_ART.width,NEST_ART.height]);assert.ok(report.alpha.transparent>.2);assert.equal(report.alpha.borderOpaque,0);
  lab=true;await page.goto(new URL('dev/',root).href);await ready();await page.locator('#open-settings').tap();await page.locator('#dev-scenario-fineBuildings').tap();await close();await settle();
  const initial=await read(),initialNest=await nest(),farm=initial.buildings.find(b=>b.kind==='farm'),parents=['belier-gris','volant'].map(species=>initial.rabbits.find(r=>r.species===species));
  assert.ok(parents.every(Boolean));assert.equal(initialNest.breeding,null);
  for(const size of [{width:852,height:393},{width:390,height:844}]){
   await page.setViewportSize(size);await ready();
   for(const [name,z] of [['far',.4],['normal',1.05],['close',1.65]]){await reset(buildingCenter(await nest()),z);await shot('nest-empty-'+size.width+'-'+name);}
  }
  await page.setViewportSize({width:852,height:393});await ready();await openNest();assert.equal(await page.locator('.work-state[data-state=free]').count(),1);
  await choose('Lapin Bélier Gris','Parent A');await choose('Lapin Volant','Parent B');
  const preBreed=await read();await tap('Lancer la reproduction · gratuit');let s=await read(),job=(await nest()).breeding;
  assert.deepEqual(job.parents,parents.map(r=>r.id));assert.deepEqual(homeMap(s),homeMap(initial));assert.deepEqual(s.rabbits,initial.rabbits);
  assert.equal(job.endsAt-job.startedAt,1200000);assert.equal(s.pattes,preBreed.pattes);assert.equal(s.hearts,preBreed.hearts);
  const xp=s.progression.totalXp;
  assert.equal(await page.locator('.work-state[data-state=running]').count(),1);assert.ok(await page.locator('#panel-content progress').count());
  await page.locator('#panel-content').evaluate(e=>{e.scrollTop=0;});await shot('nest-running-panel');await close();
  await parentTap(0,'Lapin Bélier Gris');await parentTap(1,'Lapin Volant');
  const beforeMove=stable(await read());await openNest();await tap('Déplacer ce bâtiment');await destination(18,6);await shot('nest-moving-preview');await tap('Annuler · aucun coût');await close();assert.deepEqual(stable(await read()),beforeMove);
  await openNest();await tap('Déplacer ce bâtiment');await destination(18,6);await tap('Confirmer le déplacement · gratuit');await close();
  assert.deepEqual(await nest(),{...initialNest,x:18,y:6,breeding:job});assert.equal((await read()).progression.totalXp,xp);
  await reset(buildingCenter(await nest()),1.05);await parentTap(0,'Lapin Bélier Gris');await parentTap(1,'Lapin Volant');
  assert.equal(await page.evaluate(()=>performance.getEntriesByType('resource').filter(e=>e.name.includes('/assets/buildings/nest-heart-cave.png')).length),1,'one cached nest texture through selection and movement');
  const moved=stable(await read());await page.reload();await ready();assert.deepEqual(stable(await read()),moved);assert.deepEqual((await nest()).breeding,job);
  for(const size of [{width:852,height:393},{width:390,height:844}]){
   await page.setViewportSize(size);await ready();
   for(const [name,z] of [['far',.4],['normal',1.05],['close',1.65]]){await reset(buildingCenter(await nest()),z);await shot('nest-occupied-'+size.width+'-'+name);}
   await reset(buildingCenter(await nest()),1.05);await parentTap(0,'Lapin Bélier Gris');await parentTap(1,'Lapin Volant');
   await openNest();assert.equal(await page.locator('.work-state[data-state=running]').count(),1);await close();
  }
  await page.setViewportSize({width:852,height:393});await ready();await page.locator('#open-settings').tap();await page.locator('#dev-time-60').tap();await close();
  assert.deepEqual((await nest()).breeding.birth,job.birth);assert.equal((await read()).buildings.find(b=>b.kind==='nursery').baby,null);
  await reset(buildingCenter(await nest()),1.05);await shot('nest-ready-landscape');await parentTap(0,'Lapin Bélier Gris');await parentTap(1,'Lapin Volant');
  await openNest();assert.equal(await page.locator('.work-state[data-state=ready]').count(),1);assert.equal(await page.getByRole('button',{name:'Envoyer dans la nurserie',exact:true}).isEnabled(),true);
  await page.locator('#panel-content').evaluate(e=>{e.scrollTop=0;});await shot('nest-ready-panel');await close();
  const waiting=stable(await read());await page.reload();await ready();assert.deepEqual(stable(await read()),waiting);
  await reset(buildingCenter(await nest()),1.05);await parentTap(0,'Lapin Bélier Gris');await parentTap(1,'Lapin Volant');
  const p=buildingCenter(await nest());assert.ok(NEST_ART.actionY+25<=VISUAL.grid.depth/2,'transfer hit remains inside own footprint');
  await worldTap({x:p.x,y:p.y+NEST_ART.actionY});assert.equal(await page.locator('#panel-title').innerText(),'Nid');
  await page.getByRole('button',{name:'Envoyer dans la nurserie',exact:true}).evaluate(e=>{e.click();e.click();});
  s=await read();assert.equal((await nest()).breeding,null);assert.deepEqual(s.buildings.find(b=>b.kind==='nursery').baby.birth,job.birth);
  assert.deepEqual(s.rabbits,initial.rabbits);assert.deepEqual(homeMap(s),homeMap(initial));assert.equal(s.progression.totalXp,xp);
  const withNoIncome=building=>{const {incomeUnits,...b}=building;return b;};assert.deepEqual(withNoIncome(s.buildings.find(b=>b.id===farm.id)),withNoIncome(farm),'farm production and visual delivery preserved');
  await close();await reset(buildingCenter(await nest()),1.05);await shot('nest-empty-after-transfer');
  const home=s.buildings.find(b=>b.id===parents[0].enclosureId),offsets=VISUAL.rabbit.crowdedOffsets;
  await reset(buildingCenter(home),1.05);
  for(const parent of parents){const index=s.rabbits.filter(r=>r.enclosureId===home.id).findIndex(r=>r.id===parent.id),offset=offsets[index],center=buildingCenter(home);await worldTap({x:center.x+offset.x,y:center.y+offset.y-7*VISUAL.rabbit.scale});assert.equal(await page.locator('#panel-title').innerText(),parent.species==='volant'?'Lapin Volant':'Lapin Bélier Gris');assert.doesNotMatch(await page.locator('#panel-content').innerText(),/Au nid/);await close();}
  const final=stable(await read());await page.reload();await ready();assert.deepEqual(stable(await read()),final);assert.equal((await nest()).breeding,null);
  assert.equal(await page.evaluate(()=>performance.getEntriesByType('resource').filter(e=>e.name.includes('/assets/buildings/nest-heart-cave.png')).length),1,'single shared nest texture request after reload');
  const normalAgain=await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('prairie-lapins.save.v1'));const {lastSimulatedAt,...rest}=s;return {...rest,buildings:s.buildings.map(({incomeUnits,...b})=>b)};});assert.deepEqual(normalAgain,normal);
  report.checks.push('Empty/running/ready/manual-transfer/empty, Volant and Bélier Gris separately selectable and locked until transfer then returned to original habitat, unchanged exact parents/birth/time/cost/XP and farm production, 4 × 4 move cancelled/confirmed preserving work, reload before and after transfer, three zooms in landscape/portrait, transfer bubble within own parcel, normal/lab isolation and one texture request.');
  const comparison=await browser.newPage({viewport:{width:1100,height:700}});
  const original=fs.readFileSync(path.join(__dirname,'references/nest/Nid-original.png')).toString('base64'),adapted=fs.readFileSync('public/assets/buildings/nest-heart-cave.png').toString('base64');
  await comparison.setContent('<style>body{margin:0;padding:24px;font:18px Arial;background:#fffaf0;color:#35472f}main{display:flex;gap:24px}figure{margin:0;width:514px}figcaption{height:50px;font-weight:bold}.frame{height:540px;display:flex;align-items:center;justify-content:center;background:repeating-conic-gradient(#edf0e6 0% 25%,#fffaf0 0% 50%) 50%/24px 24px;border-radius:18px}img{max-width:100%;max-height:100%;object-fit:contain}</style><h2>Nid — référence et adaptation intégrée</h2><main><figure><figcaption>Original conservé · Nid.png</figcaption><div class=frame><img src="data:image/png;base64,'+original+'"></div></figure><figure><figcaption>Adaptation · texture transparente, parents séparés</figcaption><div class=frame><img src="data:image/png;base64,'+adapted+'"></div></figure></main>');
  await comparison.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));await comparison.screenshot({path:path.join(out,'nest-reference-comparison.png')});await comparison.close();report.captures.push('nest-reference-comparison.png');
  assert.deepEqual(report.errors,[]);report.passed=true;
 }catch(e){report.failure=String(e.stack||e);await shot('nest-failure');throw e;}
 finally{fs.writeFileSync(path.join(out,'nest-art-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();fs.rmSync(temp,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
