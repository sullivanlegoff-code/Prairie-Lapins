// Seam check on the maximal island (laboratory "islandFull"), compiled build only.
const enterGame=require('./check-camera.cjs').enter; // loading screen: press « Jouer » after each page load
// Frames the corner where Centre, Est, Sud and Sud-est meet at the minimum, reference (1.05)
// and maximum zooms, in 390 × 844 and 844 × 390, and measures the colour profile across both
// parcel edges. A seam is a narrow line whose colour leaves the grass towards the water.
// node docs/island-seam-check.cjs http://localhost:5174/ <outside-Git-directory> [label]
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
(async()=>{
 const [url,directory,label='current']=process.argv.slice(2),out=path.resolve(directory,label);fs.mkdirSync(out,{recursive:true});
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'seam-model-')),bundle=path.join(temp,'model.cjs');
 require('esbuild').buildSync({stdin:{contents:"export {MeadowCamera} from './src/ui/gestures'; export {gridPoint,ownedRegions} from './docs/screen-points'; export {visibleColumns} from './src/simulation/habitats'; export {VISUAL} from './src/config/visual'; export {PARCELS} from './src/config/land'; export {recenterCamera} from './src/display/recenter';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',outfile:bundle,define:{'import.meta.env.BASE_URL':JSON.stringify('/')}});
 const {MeadowCamera,gridPoint,visibleColumns,VISUAL,PARCELS,recenterCamera,ownedRegions}=require(bundle),camera=require('./check-camera.cjs');
 const {decode}=await import('../scripts/png-rgba.mjs');
 const junction=gridPoint(PARCELS.east.x,PARCELS.south.y);
 const report={url,label,junction,views:[],errors:[]};
 const browser=await chromium.launch();
 try{
  for(const [width,height] of [[390,844],[844,390]]){
   const page=await browser.newPage({viewport:{width,height},hasTouch:true});page.on('pageerror',e=>report.errors.push(e.message));page.on('dialog',d=>d.accept());
   await page.addLocatorHandler(page.locator('#player-level-dialog'),()=>page.click('#continue-level-up'));
   await page.goto(new URL('dev/',url).href);await enterGame(page);await page.waitForFunction(()=>document.querySelector('#save-status')?.dataset.status==='saved');await page.waitForLoadState('networkidle');
   if(await page.locator('#continue-portrait').isVisible())await page.click('#continue-portrait');
   if(await page.getByRole('button',{name:'Masquer',exact:true}).isVisible())await page.getByRole('button',{name:'Masquer',exact:true}).click();
   await page.click('#open-settings');await page.click('#dev-scenario-islandFull');await page.click('#close-panel');
   const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('prairie-lapins.development.prairie-lapins.save.v1')));
   const settle=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));let model;
   const safe=()=>page.evaluate(()=>{for(const fy of [.62,.5,.75,.85])for(const fx of [.6,.45,.75,.3]){const p={x:innerWidth*fx,y:innerHeight*fy};if(document.elementFromPoint(p.x,p.y)?.tagName==='CANVAS')return p;}throw Error('No exposed canvas');});
   // The game ignores drags under 8 px (a tap); a short correction is two real drags (out and back).
   const drag=async(dx,dy)=>{const p=await safe();await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+dx,p.y+dy);await page.mouse.up();model.pan(dx,dy);await settle();};
   const pan=async(dx,dy)=>{if(Math.hypot(dx,dy)>=12)return drag(dx,dy);const s=dx>=0?1:-1;await drag(dx+40*s,dy);await drag(-40*s,0);};
   for(const [name,zoom] of [['min',null],['reference',VISUAL.camera.initialZoom],['max',VISUAL.camera.maxZoom]]){
    model=new MeadowCamera();model.resize(width,height);model.setColumns(visibleColumns(state));
    const regions=ownedRegions(state.acquiredParcels);
    model.setVisibleRegions(regions);
    // PRAIRIE_LEGACY_RECENTER=1 measures a build older than the start-building framing (fixed focus).
    if(process.env.PRAIRIE_LEGACY_RECENTER==='1'){await page.click('#recenter-view');await settle();model.setInsets(null);model.recenter();}else await camera.recenter(page,model,state,recenterCamera);
    const target=zoom??model.minimumZoom,at=await safe(),factor=target/model.zoom;await page.mouse.move(at.x,at.y);await page.mouse.wheel(0,-Math.log(factor)*1000);model.scale(factor,at);await page.waitForTimeout(120);
    const goal={x:width/2,y:height>width?height*.6:height*.62};
    for(let n=0;n<60;n++){const p=model.screen(junction),dx=goal.x-p.x,dy=goal.y-p.y;if(Math.hypot(dx,dy)<.5)break;await pan(Math.max(-70,Math.min(70,dx)),Math.max(-70,Math.min(70,dy)));}
    // Sub-pixel phases: the seam depended on them, so 5 positions one screen pixel apart are scanned.
    const sweep=[];for(let k=1;k<=5;k++){await pan(k%2?1:-1,1);await page.waitForTimeout(80);const shot=decode(await page.screenshot());sweep.push(shot);}
    await page.waitForTimeout(150);const file=path.join(out,`${width}x${height}-${name}.png`);await page.screenshot({path:file});
    const img=decode(fs.readFileSync(file)),p=model.screen(junction),cx=Math.round(p.x),cy=Math.round(p.y);
    const px=(x,y)=>{const i=(y*img.width+x)*4;return [img.rgba[i],img.rgba[i+1],img.rgba[i+2]];};
    // Greenness g−b: grass ≈ +80, water ≈ −5. Profile across each edge, averaged along it, away from the corner.
    const across=(vertical)=>{const values=[];for(let d=-6;d<=6;d++){let sum=0,n=0;for(let t=12;t<=40;t++)for(const s of [-1,1]){const [x,y]=vertical?[cx+d,cy+s*t]:[cx+s*t,cy+d];if(x<0||y<0||x>=img.width||y>=img.height)continue;const c=px(x,y);sum+=c[1]-c[2];n++;}values.push(n?+(sum/n).toFixed(1):null);}return values;};
    const v=across(true),h=across(false),dip=a=>{const vals=a.filter(x=>x!==null),base=Math.max(...vals);return +(base-Math.min(...vals)).toFixed(1);};
    // Whole-island scan, independent of the corner position: mean greenness of every column and row
    // over grass pixels (g−b ≥ 40, below the HUD), compared with the median of its 6 neighbours.
    const grass=(x,y)=>{const c=px(x,y),g=c[1]-c[2];return g>=40&&g<=110&&c[0]>=150&&c[0]<=235?g:null;};
    // Only strictly inside the island: 8 px away from the first/last grass column or row.
    const scan=(count,other,at)=>{const means=[];for(let i=0;i<count;i++){let sum=0,n=0;for(let j=0;j<other;j++){const g=at(i,j);if(g!==null){sum+=g;n++;}}means.push(n>40?sum/n:null);}
     const inside=means.map((m,i)=>m===null?-1:i).filter(i=>i>=0),first=Math.min(...inside)+8,last=Math.max(...inside)-8;
     let worst=0,where=null;for(let i=Math.max(3,first);i<Math.min(count-3,last);i++){if(means[i]===null)continue;const around=[-3,-2,-1,1,2,3].map(d=>means[i+d]).filter(m=>m!==null).sort((a,b)=>a-b);if(around.length<4)continue;const d=around[Math.floor(around.length/2)]-means[i];if(d>worst){worst=d;where=i;}}return {worst:+worst.toFixed(1),at:where};};
    const top=height>width?130:70,columns=scan(img.width,img.height-top,(x,j)=>grass(x,j+top)),rows=scan(img.height-top,img.width,(y,i)=>grass(i,y+top));
    let sweepWorst=0;for(const shot of sweep){const at=(x,y)=>{const i=(y*shot.width+x)*4,g=shot.rgba[i+1]-shot.rgba[i+2],r=shot.rgba[i];return g>=40&&g<=110&&r>=150&&r<=235?g:null;};
     sweepWorst=Math.max(sweepWorst,scan(shot.width,shot.height-top,(x,j)=>at(x,j+top)).worst,scan(shot.height-top,shot.width,(y,i)=>at(i,y+top)).worst);}
    report.views.push({width,height,name,zoom:+model.zoom.toFixed(4),screen:{x:cx,y:cy},vertical:v,horizontal:h,verticalDip:dip(v),horizontalDip:dip(h),scanColumns:columns,scanRows:{...rows,at:rows.at===null?null:rows.at+top},sweepWorst:+sweepWorst.toFixed(1)});
   }
   await page.close();
  }
  assert.deepEqual(report.errors,[]);
 }finally{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,1));await browser.close();}
 for(const v of report.views)console.log(`${v.width}x${v.height} ${v.name.padEnd(9)} zoom ${v.zoom} dip vertical ${v.verticalDip} horizontal ${v.horizontalDip} | scan column ${v.scanColumns.worst}@${v.scanColumns.at} row ${v.scanRows.worst}@${v.scanRows.at} | sweep worst ${v.sweepWorst}`);
})().catch(e=>{console.error(e);process.exitCode=1;});
