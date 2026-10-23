// Built/public routes only. Real controls, read-only save inspection and screenshot pixels.
const enterGame=require('./check-camera.cjs').enter; // loading screen: press « Jouer » after each page load
const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
const root=new URL(process.argv[2]),expected=process.argv[3]?.slice(0,7),out=process.env.PRAIRIE_CAPTURE_DIR||'/tmp/overview-public';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.PRAIRIE_CHROMIUM==='playwright'?undefined:process.env.PRAIRIE_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const page=await browser.newPage({viewport:{width:852,height:393},hasTouch:true});page.on('dialog',d=>d.accept());const report={passed:false,url:root.href,checks:[],waterSamples:[],errors:[]};page.on('pageerror',e=>report.errors.push(e.message));
// A saved model precedes Phaser preload completion on the public CDN. Wait for
// textures to finish transferring and two render frames before camera controls.
const ready=async()=>{await page.locator('#game canvas').waitFor();await page.waitForLoadState('networkidle');await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.waitForFunction(()=>document.querySelector('#save-status')?.dataset.status==='saved');if(expected)assert.match(await page.locator('#game-version').textContent(),new RegExp(expected));if(await page.locator('#portrait-notice').isVisible())await page.click('#continue-portrait');if(await page.getByRole('button',{name:'Masquer',exact:true}).isVisible())await page.getByRole('button',{name:'Masquer',exact:true}).click();};
const read=lab=>page.evaluate(lab=>{const s=JSON.parse(localStorage.getItem((lab?'prairie-lapins.development.':'')+'prairie-lapins.save.v1'));const {lastSimulatedAt,...stable}=s;return {...stable,buildings:s.buildings.map(({incomeUnits,...b})=>b)};},lab);
const zoomOut=async()=>{await page.mouse.move(250,200);await page.mouse.wheel(0,10000);await page.waitForTimeout(200);};
const shot=async name=>{const png=await page.screenshot({path:out+'/'+name+'.png'});const samples=await page.evaluate(async data=>{const img=new Image();img.src='data:image/png;base64,'+data;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const g=c.getContext('2d');g.drawImage(img,0,0);const footer=document.getElementById('dev-badge');const y=footer&&!footer.hidden?Math.min(img.height-4,footer.getBoundingClientRect().top-4):img.height-4;return [[4,y],[img.width-4,y]].map(([x,y])=>[...g.getImageData(x,y,1,1).data]);},png.toString('base64'));for(const x of samples)assert.deepEqual(x,[145,211,206,255]);report.waterSamples.push({name,samples});};
try{
 await page.goto(root.href);await enterGame(page);await ready();const initial=await read(false);assert.equal(initial.version,11);const button=await page.locator('#recenter-view').boundingBox();await zoomOut();await shot('normal-overview');assert.equal((await page.locator('#recenter-view').boundingBox()).width,button.width);assert.deepEqual(await read(false),initial);
 await page.click('#open-shop');await page.getByRole('button',{name:'Bâtiments et décorations',exact:true}).click();await page.getByRole('button',{name:'Placer · 60 pièces',exact:true}).click();// Zoom gestures retain their anchor, so find a free fine-cell preview through real canvas taps.
 let found=false;
 for(let y=100;y<310&&!found;y+=12)for(let x=150;x<460&&!found;x+=12){
  if(await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.tagName==='CANVAS',{x,y})){
   await page.touchscreen.tap(x,y);await page.waitForTimeout(20);
   found=await page.locator('.placement-valid').isVisible();
  }
 }
 assert.equal(found,true,'A free 4 x 4 preview is reachable after the real zoom gesture');assert.match(await page.locator('.placement-valid').innerText(),/4 × 4/);await page.screenshot({path:out+'/normal-overview-placement.png'});await page.getByRole('button',{name:'Annuler · aucun coût',exact:true}).click();assert.deepEqual(await read(false),initial);await page.click('#close-panel');await page.click('#recenter-view');report.checks.push('Normal overview, constant-size UI and v8 save; fine 4 × 4 preview after zooming out, cancellation preserves every object/resource; Recenter via real control.');
 await page.goto(new URL('dev/',root).href);await enterGame(page);await ready();const cdp=await page.context().newCDPSession(page);
 for(const [width,height] of [[852,393],[390,844]]){
  await page.setViewportSize({width,height});await ready();
  for(const id of ['islandStart','islandL','islandFull']){
   await page.click('#open-settings');await page.click('#dev-scenario-'+id);await page.click('#close-panel');const before=await read(true);await zoomOut();await shot(`${id}-${width}-public-overview`);
   const x=width>height?350:250,y=height>width?520:280;await page.mouse.move(x,y);await page.mouse.wheel(0,-250);await page.waitForTimeout(150);await page.mouse.wheel(0,250);await page.waitForTimeout(150);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+20,y:y+15}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x-15,y,id:0},{x:x+15,y,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-45,y,id:0},{x:x+45,y,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal(await page.locator('#game-panel').isVisible(),false);assert.deepEqual(await read(true),before);await page.click('#recenter-view');
  }
 }
 report.checks.push('Six public laboratory centre/partial/full × landscape/portrait configurations: overview, wheel, real touch pan/pinch, return to close view, unchanged saves and water covering bottom corners.');
 await page.setViewportSize({width:852,height:393});await page.click('#open-settings');await page.click('#dev-scenario-islandStart');await page.click('#close-panel');await page.click('#open-shop');await page.getByRole('button',{name:'Île',exact:true}).click();assert.equal(await page.getByRole('button',{name:/^Voir /}).count(),8);await page.screenshot({path:out+'/potential-nine-public.png'});await zoomOut();await page.click('#close-panel');await page.click('#recenter-view');report.checks.push('Expansion overview exposes the nine potential parcel positions, including eight unowned choices, without purchases.');
 assert.deepEqual(await read(false),initial);await page.reload();await enterGame(page);await ready();assert.equal((await read(true)).version,11);report.checks.push('Normal/laboratory saves remain isolated; overview state never enters the v8 game save and reload remains valid.');assert.deepEqual(report.errors,[]);report.passed=true;
}finally{if(!report.passed)await page.screenshot({path:out+'/overview-public-failure.png'});fs.writeFileSync(out+'/camera-overview-public-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
