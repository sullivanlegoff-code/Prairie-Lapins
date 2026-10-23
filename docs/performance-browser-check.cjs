// Disposable real renderer. Passive RAF runs have no screenshots or method instrumentation.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const label=process.argv[2]||'before',out=process.env.PRAIRIE_CAPTURE_DIR||'/workspace/work/performance';
const url=process.env.PRAIRIE_TEST_URL||'http://127.0.0.1:5178/Project-L/preview/decorations/';
async function main(){
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({executablePath:process.env.PRAIRIE_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox']});
 const errors=[],network=[]; const result={label,conditions:{browser:'Chromium/Linux software renderer; not physical Safari',viewport:'852×393',zoom:1.05,animation:'normal',autosave:'unchanged 5 seconds',passiveMs:12000,repeats:2,captureDuringSamples:false},scenarios:[]};
 try{
  const context=await browser.newContext({viewport:{width:852,height:393},hasTouch:true});
  await context.addInitScript(()=>localStorage.setItem('prairie-lapins.preview.decorations.ui',JSON.stringify({muted:true,tutorial:false,intro:true,tutorialDone:true})));
  const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/supabase/i.test(r.url()))network.push(r.url())});p.on('dialog',d=>d.accept());
  await p.route('**/src/main.ts*',async route=>{const r=await route.fetch(),s=await r.text();await route.fulfill({response:r,body:s.replace('const game = new Phaser.Game','window.__scene = scene; const game = new Phaser.Game').replace('const disposePanel =','window.__ui = ui; const disposePanel =')})});
  await p.goto(url);await p.waitForFunction(()=>window.__scene?.current?.version===5);
  const measure=async(ms)=>p.evaluate(ms=>new Promise(resolve=>{
   const deltas=[];let first,last;const frame=t=>{if(first===undefined){first=last=t;requestAnimationFrame(frame);return}deltas.push(t-last);last=t;if(t-first<ms){requestAnimationFrame(frame);return}
    const a=deltas.slice().sort((a,b)=>a-b),q=n=>a[Math.floor((a.length-1)*n)];resolve({frames:a.length,elapsedMs:t-first,fps:a.length*1000/(t-first),p50:q(.5),p95:q(.95),p99:q(.99),max:a.at(-1)})};requestAnimationFrame(frame)
  }),ms);
  for(const id of ['decorationStart','decorationDemo','decorationDense']){
   await p.evaluate(async id=>{const {scenarioState}=await import('/Project-L/preview/decorations/src/dev/scenarios.ts');const c=window.__scene.controller,prepared=c.prepareImport(JSON.stringify(scenarioState(id,Date.now())));if(!prepared.ok||!c.confirmImport(prepared.token,true).ok)throw Error('Fixture');window.__ui.close();window.__scene.recenter()},id);
   await p.waitForTimeout(1200);
   const counts=await p.evaluate(()=>{const s=window.__scene;const count=o=>1+(o.list?.reduce((n,c)=>n+count(c),0)||0);return{owned:s.current.decorations.length,placed:s.decorationViews.size,rabbits:s.rabbitViews.length,phaserObjects:s.children.list.reduce((n,o)=>n+count(o),0),textures:s.textures.getTextureKeys().length,groundCommands:s.ground.list.filter(o=>o.commandBuffer).reduce((n,o)=>n+o.commandBuffer.length,0),activeTimers:s.time._active.length,controllerListeners:s.controller.listeners.size,panel:!document.querySelector('#game-panel').hidden}});
   const passive=[];for(let n=0;n<2;n++)passive.push(await measure(12000));
   // Diagnostic ablation, separate from ordinary results: does hiding static graphics help?
   await p.evaluate(()=>{window.__scene.ground.visible=false;window.__scene.labels.visible=false});
   const withoutStaticGround=await measure(4000);await p.evaluate(()=>{window.__scene.ground.visible=true;window.__scene.labels.visible=true});
   await p.evaluate(()=>{
    window.__costs={};window.__restore=[];
    const wrap=(owner,key,name)=>{const original=owner[key];if(typeof original!=='function')return;const m={calls:0,totalMs:0,maxMs:0};window.__costs[name]=m;owner[key]=function(...args){const t=performance.now();try{return original.apply(this,args)}finally{const dt=performance.now()-t;m.calls++;m.totalMs+=dt;m.maxMs=Math.max(dt,m.maxMs)}};window.__restore.push(()=>owner[key]=original)};
    const s=window.__scene;for(const key of ['renderState','drawGround','drawAnimals','drawDecorations','drawBubbles','drawGrid','drawGhost','decorationAt'])wrap(s,key,'scene.'+key);
    wrap(s.sys,'sceneUpdate','scene.update');wrap(s.game.renderer,'render','renderer.render CPU submission');wrap(s.controller,'refresh','controller.refresh');wrap(s.controller,'write','controller.write');wrap(window.__ui,'render','ui.render');wrap(Storage.prototype,'setItem','storage.setItem');
   });
   const instrumented=await measure(6500);const costs=await p.evaluate(()=>{window.__restore.forEach(f=>f());return window.__costs});
   await p.locator('#open-arrange').click();const panel=await measure(4000);await p.locator('#close-panel').click();
   const cdp=await context.newCDPSession(p);
   const point=await p.evaluate(()=>{const s=window.__scene,r=s.rabbitViews[0].object;window.__tapSample=null;const original=s.tap;s.tap=function(...args){const t=performance.now();const v=original.apply(this,args);const handlerMs=performance.now()-t;requestAnimationFrame(()=>window.__tapSample={handlerMs,nextFrameMs:performance.now()-t,panel:!document.querySelector('#game-panel').hidden});s.tap=original;return v};return s.view.screen({x:r.x,y:r.y-9.1})});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForFunction(()=>window.__tapSample);const interaction=await p.evaluate(()=>window.__tapSample);assert.equal(interaction.panel,true);await p.locator('#close-panel').click();await cdp.detach();
   await p.screenshot({path:path.join(out,label+'-'+id+'.png')});
   const entry={id,counts,passive,withoutStaticGround,instrumented,costs,arrangementPanel:panel,interaction};result.scenarios.push(entry);console.log(JSON.stringify({label,id,counts,passive,withoutStaticGround,costs,interaction}));
  }
  assert.deepEqual(errors,[]);assert.deepEqual(network,[]);result.errors=errors;result.supabaseRequests=network;
  fs.writeFileSync(path.join(out,label+'-report.json'),JSON.stringify(result,null,2));
 }finally{await browser.close()}
}
main().catch(e=>{console.error(e);process.exitCode=1});
