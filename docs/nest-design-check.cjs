// Local compiled build, isolated browser storage, existing lab fixture and real controls.
const enterGame=require('./check-camera.cjs').enter; // loading screen: press « Jouer » after each page load
// node docs/nest-design-check.cjs http://localhost:5174/ <outside-Git-directory> before|after
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
(async()=>{
 const [url,directory,phase]=process.argv.slice(2),out=path.resolve(directory);assert.ok(['before','after'].includes(phase));fs.mkdirSync(out,{recursive:true});
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'nest-design-model-')),bundle=path.join(temp,'model.cjs');
 require('esbuild').buildSync({stdin:{contents:"export {MeadowCamera} from './src/ui/gestures'; export {buildingCenter,finePoint,gridPoint,ownedRegions} from './docs/screen-points'; export {visibleColumns} from './src/simulation/habitats'; export {PARCELS} from './src/config/land'; export {ISLAND} from './src/config/islandGeometry'; export {recenterCamera} from './src/display/recenter'; export {NEST_ART} from './src/config/nestArt'; export {FARM_ART} from './src/config/farmArt'; export {NURSERY_ART} from './src/config/nurseryArt';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',outfile:bundle,define:{'import.meta.env.BASE_URL':JSON.stringify('/')}});
 const {MeadowCamera,buildingCenter,finePoint,gridPoint,visibleColumns,PARCELS,NEST_ART,FARM_ART,NURSERY_ART,ISLAND,recenterCamera,ownedRegions}=require(bundle),camera=require('./check-camera.cjs');
 const report={phase,url,checks:0,captures:[],views:[],textures:{},errors:[]};
 const check=(condition,message)=>{assert.ok(condition,message);report.checks++;};
 const browser=await chromium.launch();
 try{
  for(const [width,height] of [[390,844],[844,390]]){
   const page=await browser.newPage({viewport:{width,height},hasTouch:true});page.on('pageerror',e=>report.errors.push(e.message));page.on('dialog',d=>d.accept());
   await page.addLocatorHandler(page.locator('#player-level-dialog'),()=>page.click('#continue-level-up'));
   await page.goto(new URL('dev/',url).href);await enterGame(page);await page.waitForFunction(()=>document.querySelector('#save-status')?.dataset.status==='saved');await page.waitForLoadState('networkidle');
   if(await page.locator('#continue-portrait').isVisible())await page.click('#continue-portrait');
   if(await page.getByRole('button',{name:'Masquer',exact:true}).isVisible())await page.getByRole('button',{name:'Masquer',exact:true}).click();
   await page.click('#open-settings');await page.click('#dev-scenario-fineBuildings');await page.click('#close-panel');
   const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('prairie-lapins.development.prairie-lapins.save.v1')));
   const initial=await read(),nest=initial.buildings.find(b=>b.kind==='nest'),center=buildingCenter(nest);
   check(nest.x===24&&nest.y===14&&!nest.breeding,'known empty nest fixture at its v11 fine coordinates');
   const settle=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   let model;
   const close=async()=>{if(await page.locator('#game-panel').isVisible())await page.click('#close-panel');await settle();};
   const safe=()=>page.evaluate(()=>{
    for(const fy of [.65,.5,.75,.85])for(const fx of [.6,.45,.75,.3]){const p={x:innerWidth*fx,y:innerHeight*fy};if(document.elementFromPoint(p.x,p.y)?.tagName==='CANVAS')return p;}throw Error('No canvas gesture point');
   });
   // The game ignores drags under 8 px (a tap); a short correction is two real drags (out and back).
   const drag=async(dx,dy)=>{const p=await safe();await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+dx,p.y+dy);await page.mouse.up();model.pan(dx,dy);await settle();};
   const pan=async(dx,dy)=>{if(Math.hypot(dx,dy)>=12)return drag(dx,dy);const s=dx>=0?1:-1;await drag(dx+40*s,dy);await drag(-40*s,0);};
   const focus=async(world,target)=>{for(let n=0;n<45;n++){const p=model.screen(world),dx=target.x-p.x,dy=target.y-p.y;if(Math.hypot(dx,dy)<.5)return;await pan(Math.max(-65,Math.min(65,dx)),Math.max(-65,Math.min(65,dy)));}throw Error('Framing did not converge');};
   const reset=async(zoom=1.05,target=center,screen={x:width/2,y:height>width?height*.60:height*.615})=>{
    await close();model=new MeadowCamera();model.resize(width,height);model.setColumns(visibleColumns(initial));
    model.setVisibleRegions(ownedRegions(initial.acquiredParcels));await camera.recenter(page,model,await read(),recenterCamera);
    const at=await safe(),factor=zoom/model.zoom;await page.mouse.move(at.x,at.y);await page.mouse.wheel(0,-Math.log(factor)*1000);model.scale(factor,at);await page.waitForTimeout(100);await focus(target,screen);
   };
   const capture=async(name)=>{await page.locator('#toast').waitFor({state:'hidden'});const file=`${phase}-${width}x${height}-${name}.png`;await page.screenshot({path:path.join(out,file)});report.captures.push(file);
    report.views.push({file,zoom:model.zoom,nestFine:{x:nest.x,y:nest.y,width:4,height:4},centerWorld:center,centerScreen:model.screen(center),footprintScreen:{topLeft:model.screen(finePoint(nest.x,nest.y)),width:176*model.zoom,height:148*model.zoom}});};
   const tapWorld=async p=>{const s=model.screen(p);check(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.tagName,s)==='CANVAS','world target exposed');await page.touchscreen.tap(s.x,s.y);await settle();};
   if(width===390)for(const [kind,art] of [['nest',NEST_ART],['farm',FARM_ART],['nursery',NURSERY_ART]]){
    const data=await page.evaluate(async ({url,checkGround})=>{const res=await fetch(url);if(!res.ok)throw Error('texture missing');const bitmap=await createImageBitmap(await res.blob());const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;const g=canvas.getContext('2d');g.drawImage(bitmap,0,0);const a=g.getImageData(0,0,canvas.width,canvas.height).data;let left=canvas.width,top=canvas.height,right=-1,bottom=-1,clear=0,groundNonOpaque=0;
     for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){const alpha=a[(y*canvas.width+x)*4+3];if(!alpha)clear++;if(alpha>16){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}}
     if(checkGround)for(let y=218;y<810;y++)for(let x=0;x<704;x++)if(a[(y*canvas.width+x)*4+3]!==255)groundNonOpaque++;
     return {width:canvas.width,height:canvas.height,bounds:{left,top,right:right+1,bottom:bottom+1},clearFraction:clear/(canvas.width*canvas.height),...(checkGround?{groundNonOpaque}:{})};
    },{url:new URL(art.url.replace(/^\//,''),url).href,checkGround:phase==='after'&&kind==='nest'});
    check(data.width===art.width&&data.height===art.height,kind+' declared texture size');check(data.clearFraction>0,kind+' transparent exterior');
    const scale=art.worldWidth/art.width;data.worldBounds={left:(data.bounds.left-art.width/2)*scale,right:(data.bounds.right-art.width/2)*scale,top:(data.bounds.top-art.height*art.originY)*scale,bottom:(data.bounds.bottom-art.height*art.originY)*scale};report.textures[kind]={...data,art};
   }
   const parcels=initial.acquiredParcels.map(id=>PARCELS[id]);const bounds={left:Math.min(...parcels.map(p=>gridPoint(p.x,0).x)),right:Math.max(...parcels.map(p=>gridPoint(p.x+ISLAND.parcelCells,0).x)),top:Math.min(...parcels.map(p=>gridPoint(0,p.y).y)),bottom:Math.max(...parcels.map(p=>gridPoint(0,p.y+ISLAND.parcelCells).y))};
   const overviewZoom=Math.min((width-40)/(bounds.right-bounds.left+100),(height-135)/(bounds.bottom-bounds.top+100));
   await reset(overviewZoom,{x:(bounds.left+bounds.right)/2,y:(bounds.top+bounds.bottom)/2},{x:width/2,y:(height+65)/2});await capture('island-empty');
   await reset(1.05);await capture('reference-zoom');
   const closeZoom=height>width?1.65:1.2;
   const closeCenter={x:width/2,y:height>width?height*.60:height*.595};
   await reset(closeZoom,center,closeCenter);await capture('nest-empty');
   // Transparent test-only overlay: computed from the same unchanged fine-grid world projection.
   const topLeft=model.screen(finePoint(nest.x,nest.y)),bottomRight=model.screen(finePoint(nest.x+4,nest.y+4));
   await page.evaluate(({a,b})=>{const c=document.createElement('canvas');c.id='nest-proof-grid';c.width=innerWidth;c.height=innerHeight;c.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:9999';document.body.append(c);const g=c.getContext('2d');g.strokeStyle='#ff326a';g.lineWidth=2;g.strokeRect(a.x,a.y,b.x-a.x,b.y-a.y);g.lineWidth=1;g.strokeStyle='#173e55';g.setLineDash([4,4]);for(let i=1;i<4;i++){g.beginPath();g.moveTo(a.x+(b.x-a.x)*i/4,a.y);g.lineTo(a.x+(b.x-a.x)*i/4,b.y);g.moveTo(a.x,a.y+(b.y-a.y)*i/4);g.lineTo(b.x,a.y+(b.y-a.y)*i/4);g.stroke();}g.fillStyle='#fffbea';g.fillRect(8,innerHeight-36,330,30);g.fillStyle='#243b39';g.font='12px Arial';g.fillText('Contrôle : contour rose = 4 × 4 cases du nid',14,innerHeight-17);},{a:topLeft,b:bottomRight});
   await capture('grid');await page.locator('#nest-proof-grid').evaluate(e=>e.remove());
   await reset(1.05);await tapWorld({x:center.x,y:center.y+58});check(await page.locator('#panel-title').innerText()==='Nid','nest selectable at measured location');
   for(const [species,slot] of [['Lapin Bélier Gris','Parent A'],['Lapin Volant','Parent B']])await page.locator('article').filter({has:page.getByRole('heading',{name:species,exact:true})}).getByRole('button',{name:slot,exact:true}).click();
   const preBreed=await read();await page.getByRole('button',{name:'Lancer la reproduction · gratuit',exact:true}).click();await close();
   const occupied=await read(),job=occupied.buildings.find(b=>b.id===nest.id).breeding;
   check(job.parents.length===2&&job.endsAt-job.startedAt===1200000,'real breeding duration and two parents');
   assert.deepEqual(occupied.rabbits,initial.rabbits);report.checks++;check(occupied.pattes===preBreed.pattes&&occupied.hearts===preBreed.hearts,'unchanged free breeding cost');
   await reset(closeZoom,center,closeCenter);await capture('nest-parents');
   for(const [index,name] of ['Lapin Bélier Gris','Lapin Volant'].entries()){
    await reset(1.05);const offset=NEST_ART.parentOffsets[index];await tapWorld({x:center.x+offset.x,y:center.y+offset.y-9.1});
    check(await page.locator('#panel-title').innerText()===name,'independent parent selection '+name);check(/Au nid/.test(await page.locator('#panel-content').innerText()),'parent still at nest');await close();
   }
   check((await page.evaluate(()=>performance.getEntriesByType('resource').filter(e=>e.initiatorType==='xmlhttprequest'&&e.name.includes('/assets/buildings/')&&e.name.includes('nest-')).length))===1,'single shared Phaser nest texture request (excluding the explicit alpha-analysis fetch)');
   check(await page.evaluate(()=>localStorage.getItem('prairie-lapins.save.v1'))===null,'normal save untouched by lab');
   await page.close();
  }
  if(phase==='after'){
   const baseline=JSON.parse(fs.readFileSync(path.join(out,'before-report.json'),'utf8'));
   for(const kind of ['farm','nursery']){assert.deepEqual(report.textures[kind],baseline.textures[kind]);report.checks++;}
   const b=report.textures.nest.worldBounds;check(b.left===-88&&b.right===88,'art fills exact footprint width');check(b.bottom===74,'art front flush with footprint');
   check(report.textures.nest.groundNonOpaque===0,'all 416768 ground pixels opaque: no empty margin or gap inside the 4 × 4 footprint');
  }
  assert.deepEqual(report.errors,[]);report.checks++;report.passed=true;
 }finally{fs.writeFileSync(path.join(out,phase+'-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({phase,passed:report.passed,checks:report.checks,captures:report.captures.length,out}));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
