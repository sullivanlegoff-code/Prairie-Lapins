// HISTORIQUE (2026-10-17) : vise la prévisualisation « Décorations » v8 figée (/Project-L/preview/decorations/,
// îles 3 × 3 et sauvegardes d'avant la v11). Aucun workflow ne le lance ; non adapté aux parcelles 4 × 4.
// Conservé pour mémoire ; les comportements actuels sont couverts par les tests et les contrôles de validate-land.yml.
// Repeated real UI and scene checks, isolated localStorage; no shipped test hooks.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const url=process.env.PRAIRIE_TEST_URL||'http://127.0.0.1:5178/Project-L/preview/decorations/',out=process.env.PRAIRIE_CAPTURE_DIR||'/workspace/work/stability-check';
async function main(){fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({executablePath:process.env.PRAIRIE_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox']});const started=Date.now(),errors=[],samples=[];
 try{const c=await browser.newContext({viewport:{width:852,height:393},hasTouch:true}),p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
 await c.addInitScript(()=>localStorage.setItem('prairie-lapins.preview.decorations.ui',JSON.stringify({muted:true,tutorial:false,intro:true,tutorialDone:true})));
 await p.route('**/src/main.ts*',async route=>{const r=await route.fetch(),s=await r.text();await route.fulfill({response:r,body:s.replace('const game = new Phaser.Game','window.__scene=scene;const game = new Phaser.Game').replace('const disposePanel =','window.__ui=ui;const disposePanel =')})});await p.goto(url);await p.waitForFunction(()=>window.__scene?.current?.version===5);
 const load=id=>p.evaluate(async id=>{const {scenarioState}=await import('/Project-L/preview/decorations/src/dev/scenarios.ts');const s=window.__scene,prepared=s.controller.prepareImport(JSON.stringify(scenarioState(id,Date.now())));if(!prepared.ok||!s.controller.confirmImport(prepared.token,true).ok)throw Error('Fixture');window.__ui.onReplacement();window.__ui.close();s.recenter()},id);
 const count=()=>p.evaluate(()=>{const s=window.__scene,walk=o=>1+(o.list?.reduce((n,c)=>n+walk(c),0)||0);return{objects:s.children.list.reduce((n,o)=>n+walk(o),0),textureCount:s.textures.getTextureKeys().length,textures:s.textures.getTextureKeys().filter(k=>k.startsWith('decoration:')||k==='meadow-static-ground').sort(),listeners:s.controller.listeners.size,timers:s.time._active.length,owned:s.current.decorations.length,placed:s.decorationViews.size,sceneCount:s.game.scene.getScenes(true).length,resizeListeners:s.scale.listenerCount('resize')}});
 await load('decorationDemo');const initial=await count();
 await p.evaluate(()=>{window.__cachedGround=window.__scene.ground.list[0];window.__cachedTexture=window.__scene.textures.get('meadow-static-ground')});
 for(let i=0;i<12;i++){
  for(const button of ['#open-shop','#open-collection','#open-settings']){await p.locator(button).click();await p.locator('#close-panel').click()}
  await p.locator('#open-arrange').click();await p.locator('#close-panel').click();await p.locator('#open-photo').click();await p.locator('#photo-return').click();
  await p.evaluate(i=>{const s=window.__scene;s.view.zoom=[.8,1.05,1.65][i%3];s.view.x+=70;s.view.clamp();s.applyCamera();s.recenter();s.controller.refresh()},i);
  const cached=await p.evaluate(()=>window.__scene.ground.list[0]===window.__cachedGround&&window.__scene.textures.get('meadow-static-ground')===window.__cachedTexture);assert.equal(cached,true);
  const now=await count();assert.deepEqual(now,initial);samples.push(now);
 }
 // Direct selections/moves are additionally covered by the full touch suite. Here
 // repeated controller commits check static-cache ownership across layout rebuilds.
 for(let n=0;n<9;n++){
  await load(['islandStart','islandExpanded','islandFull'][n%3]);assert.equal((await count()).textures.filter(k=>k==='meadow-static-ground').length,1);
  await load('decorationDemo');assert.deepEqual(await count(),initial);
  await p.evaluate(n=>{const c=window.__scene.controller,id=window.__scene.current.decorations.filter(d=>d.location.kind==='outside')[n%3].id;const r=c.perform({type:'placeDecoration',id,location:{kind:'outside',x:0,y:7,rotation:0}});if(!r.ok)throw Error(r.reason)},n);
 }
 await load('decorationDemo');await p.reload();await p.waitForFunction(()=>window.__scene?.current?.version===5);assert.deepEqual(await count(),initial);
 // Import a copied v4, then export the exact raw pre-migration source from settings.
 const raw=await p.evaluate(()=>{const s=window.__scene,source=structuredClone(s.current);delete source.initiation;delete source.decorations;source.version=4;const raw=JSON.stringify(source,null,1),prepared=s.controller.prepareImport(raw);if(!prepared.ok||!s.controller.confirmImport(prepared.token,true).ok)throw Error('Migration import');return raw});
 await p.locator('#open-settings').click();const dl=p.waitForEvent('download');await p.locator('#export-migration-source').click();const download=await dl;assert.ok(download.suggestedFilename().includes('source-avant-migration'));await download.saveAs(path.join(out,'raw-v4-recovery.json'));assert.equal(fs.readFileSync(path.join(out,'raw-v4-recovery.json'),'utf8'),raw);
 await p.reload();await p.waitForFunction(()=>window.__scene?.current?.version===5);assert.equal(await p.evaluate(()=>window.__scene.controller.migrationBackup()),raw);assert.deepEqual(errors,[]);
 const report={browser:'Chromium/Linux touch; not physical Safari',elapsedMs:Date.now()-started,panelCycles:36,arrangePhotoCycles:12,scenarioLoads:20,moveCommits:9,stable:initial,cacheIdentityStable:true,oneGroundTextureAcrossExtensions:true,recoveryExportExact:true,recoveryAfterReload:true,errors,samples};fs.writeFileSync(path.join(out,'stability-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{await browser.close()}}
 main().catch(e=>{console.error(e);process.exitCode=1});
