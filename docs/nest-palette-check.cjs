// Local compiled game. Only the nest texture response is replaced for comparison.
const enterGame=require('./check-camera.cjs').enter; // loading screen: press « Jouer » after each page load
// No changes to saved state, artwork geometry, parents or application code.
// node docs/nest-palette-check.cjs http://localhost:5174/ <outside-Git-directory>
const {chromium,webkit}=require('playwright'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
(async()=>{
 const [url,directory]=process.argv.slice(2),out=path.resolve(directory);fs.mkdirSync(out,{recursive:true});
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'nest-palette-model-')),bundle=path.join(temp,'model.cjs');
 require('esbuild').buildSync({stdin:{contents:"export {MeadowCamera} from './src/ui/gestures'; export {buildingCenter,gridPoint,ownedRegions} from './docs/screen-points'; export {visibleColumns} from './src/simulation/habitats'; export {PARCELS} from './src/config/land'; export {ISLAND} from './src/config/islandGeometry'; export {recenterCamera} from './src/display/recenter'; export {NEST_ART} from './src/config/nestArt';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',outfile:bundle,define:{'import.meta.env.BASE_URL':JSON.stringify('/')}});
 const {MeadowCamera,buildingCenter,gridPoint,visibleColumns,PARCELS,NEST_ART,ISLAND,recenterCamera,ownedRegions}=require(bundle),camera=require('./check-camera.cjs');
 const {decode}=await import('../scripts/png-rgba.mjs');
 const source=decode(fs.readFileSync('public/assets/buildings/nest-garden-v2.png'));
 const variants={current:'v2',light:'light',medium:'medium',strong:'strong'};
 const report={url,checks:0,captures:[],views:[],errors:[],browser:'Chromium PC; PNG decoding also WebKit Windows, not iPhone'};
 const check=(condition,message)=>{assert.ok(condition,message);report.checks++;};
 for(const [variant,suffix] of Object.entries(variants)){
  const decoded=decode(fs.readFileSync(`public/assets/buildings/nest-garden-${suffix}.png`));
  check(decoded.width===704&&decoded.height===810,variant+' dimensions unchanged');
  let different=0;for(let p=3;p<source.rgba.length;p+=4)if(source.rgba[p]!==decoded.rgba[p])different++;
  check(different===0,variant+' exact alpha preservation');
 }
 assert.deepEqual(NEST_ART.parentOffsets,[{x:-27,y:-16},{x:43,y:-16}]);report.checks++;
 check(NEST_ART.worldWidth===176&&NEST_ART.originY===514/810,'registration unchanged');
 const browser=await chromium.launch();
 try{
  for(const [variant,suffix] of Object.entries(variants)){
   const folder=path.join(out,variant);fs.mkdirSync(folder,{recursive:true});
   const texture=fs.readFileSync(`public/assets/buildings/nest-garden-${suffix}.png`);
   for(const [width,height] of [[390,844],[844,390]]){
    const page=await browser.newPage({viewport:{width,height},hasTouch:true});page.on('pageerror',e=>report.errors.push(e.message));page.on('dialog',d=>d.accept());
    let textureRequests=0;
    await page.route('**/assets/buildings/nest-garden-*.png',async route=>{textureRequests++;await route.fulfill({contentType:'image/png',body:texture});});
    await page.addLocatorHandler(page.locator('#player-level-dialog'),()=>page.click('#continue-level-up'));
    await page.goto(new URL('dev/',url).href);await enterGame(page);await page.waitForFunction(()=>document.querySelector('#save-status')?.dataset.status==='saved');await page.waitForLoadState('networkidle');
    if(await page.locator('#continue-portrait').isVisible())await page.click('#continue-portrait');
    if(await page.getByRole('button',{name:'Masquer',exact:true}).isVisible())await page.getByRole('button',{name:'Masquer',exact:true}).click();
    await page.click('#open-settings');await page.click('#dev-scenario-fineBuildings');await page.click('#close-panel');
    const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('prairie-lapins.development.prairie-lapins.save.v1')));
    const initial=await read(),nest=initial.buildings.find(b=>b.kind==='nest'),center=buildingCenter(nest);
    check(initial.buildings.some(b=>b.kind==='farm')&&initial.buildings.some(b=>b.kind==='nursery'),'three building types in comparison');
    const settle=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));let model;
    const close=async()=>{if(await page.locator('#game-panel').isVisible())await page.click('#close-panel');await settle();};
    const safe=()=>page.evaluate(()=>{for(const fy of [.65,.5,.75,.85])for(const fx of [.6,.45,.75,.3]){const p={x:innerWidth*fx,y:innerHeight*fy};if(document.elementFromPoint(p.x,p.y)?.tagName==='CANVAS')return p;}throw Error('No exposed canvas');});
    // The game ignores drags under 8 px (a tap); a short correction is two real drags (out and back).
    const drag=async(dx,dy)=>{const p=await safe();await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+dx,p.y+dy);await page.mouse.up();model.pan(dx,dy);await settle();};
    const pan=async(dx,dy)=>{if(Math.hypot(dx,dy)>=12)return drag(dx,dy);const s=dx>=0?1:-1;await drag(dx+40*s,dy);await drag(-40*s,0);};
    const focus=async(world,target)=>{for(let n=0;n<45;n++){const p=model.screen(world),dx=target.x-p.x,dy=target.y-p.y;if(Math.hypot(dx,dy)<.5)return;await pan(Math.max(-65,Math.min(65,dx)),Math.max(-65,Math.min(65,dy)));}throw Error('Framing did not converge');};
    const reset=async(zoom=1.05,target=center,screen={x:width/2,y:height>width?height*.60:height*.595})=>{
     await close();model=new MeadowCamera();model.resize(width,height);model.setColumns(visibleColumns(initial));
     model.setVisibleRegions(ownedRegions(initial.acquiredParcels));await camera.recenter(page,model,await read(),recenterCamera);
     const at=await safe(),factor=zoom/model.zoom;await page.mouse.move(at.x,at.y);await page.mouse.wheel(0,-Math.log(factor)*1000);model.scale(factor,at);await page.waitForTimeout(100);await focus(target,screen);
    };
    const capture=async name=>{await page.locator('#toast').waitFor({state:'hidden'});const file=path.join(folder,`${width}x${height}-${name}.png`);await page.screenshot({path:file});report.captures.push(file);report.views.push({variant,width,height,name,zoom:model.zoom,nestCenter:model.screen(center)});};
    const parcels=initial.acquiredParcels.map(id=>PARCELS[id]),bounds={left:Math.min(...parcels.map(p=>gridPoint(p.x,0).x)),right:Math.max(...parcels.map(p=>gridPoint(p.x+ISLAND.parcelCells,0).x)),top:Math.min(...parcels.map(p=>gridPoint(0,p.y).y)),bottom:Math.max(...parcels.map(p=>gridPoint(0,p.y+ISLAND.parcelCells).y))};
    const overviewZoom=Math.min((width-40)/(bounds.right-bounds.left+100),(height-135)/(bounds.bottom-bounds.top+100));
    await reset(overviewZoom,{x:(bounds.left+bounds.right)/2,y:(bounds.top+bounds.bottom)/2},{x:width/2,y:(height+65)/2});await capture('island');
    await reset();const target=model.screen({x:center.x,y:center.y+58});await page.touchscreen.tap(target.x,target.y);check(await page.locator('#panel-title').innerText()==='Nid','measured nest remains selectable');
    for(const [species,slot] of [['Lapin Bélier Gris','Parent A'],['Lapin Volant','Parent B']])await page.locator('article').filter({has:page.getByRole('heading',{name:species,exact:true})}).getByRole('button',{name:slot,exact:true}).click();
    await page.getByRole('button',{name:'Lancer la reproduction · gratuit',exact:true}).click();await close();
    const state=await read();assert.deepEqual(state.rabbits,initial.rabbits);report.checks++;check(state.buildings.find(b=>b.id===nest.id).breeding.parents.length===2,'two real parents');
    await reset(height>width?1.65:1.2);await capture('parents');
    for(const [index,name] of ['Lapin Bélier Gris','Lapin Volant'].entries()){
     await reset();const offset=NEST_ART.parentOffsets[index],p=model.screen({x:center.x+offset.x,y:center.y+offset.y-9.1});await page.touchscreen.tap(p.x,p.y);
     const title=await page.locator('#panel-title').innerText();check(title===name,'independent parent '+name+' (panel: '+title+')');await close();
    }
    check(textureRequests===1,'one texture replacement per isolated page');check(await page.evaluate(()=>localStorage.getItem('prairie-lapins.save.v1'))===null,'normal save untouched');await page.close();
   }
   console.log(variant+' captured at both orientations');
  }
  // Browser decoding is checked independently of our own PNG decoder.
  const wk=await webkit.launch();try{const page=await wk.newPage();await page.goto(url);await enterGame(page);for(const suffix of Object.values(variants)){
   const data=fs.readFileSync(`public/assets/buildings/nest-garden-${suffix}.png`).toString('base64');
   const size=await page.evaluate(async data=>{const i=new Image();i.src='data:image/png;base64,'+data;await i.decode();return [i.naturalWidth,i.naturalHeight];},data);
   assert.deepEqual(size,[704,810]);report.checks++;
  }}finally{await wk.close();}
  for(const name of ['island','parents'])for(const width of [390,844]){const rows=report.views.filter(v=>v.name===name&&v.width===width);for(const row of rows.slice(1)){assert.equal(row.zoom,rows[0].zoom);assert.deepEqual(row.nestCenter,rows[0].nestCenter);report.checks+=2;}}
  assert.deepEqual(report.errors,[]);report.checks++;report.passed=true;
 }finally{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,checks:report.checks,captures:report.captures.length,out}));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
