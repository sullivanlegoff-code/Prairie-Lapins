// Real touch commands: new Paille-only course, no resource grants or controlled draws.
const enterGame=require('./check-camera.cjs').enter; // loading screen: press « Jouer » after each page load
const camera=require('./check-camera.cjs'),{chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
/** v13 nursery: the baby in the lowest slot (the only one at capacity 1), or null. */
const babyOf=b=>[...(b?.nursery?.babies??[])].sort((x,y)=>x.slot-y.slot)[0]??null;
(async()=>{
 const root=new URL(process.argv[2]),expected=process.argv[3]?.slice(0,7),out=process.env.PRAIRIE_CAPTURE_DIR||'/tmp/guided-start-proof';fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({executablePath:process.env.PRAIRIE_CHROMIUM==='playwright'?undefined:process.env.PRAIRIE_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:667,height:375},hasTouch:true});page.setDefaultTimeout(15000);
 await page.addLocatorHandler(page.locator('#player-level-dialog'),async()=>{await page.locator('#continue-level-up').tap();});
 const report={passed:false,url:root.href,browser:'Chromium tactile, pas Safari physique',checks:[],budgets:[],errors:[]};page.on('pageerror',e=>report.errors.push(e.message));page.on('dialog',d=>d.accept());
 const tap=name=>page.getByRole('button',{name,exact:true}).tap(),close=async()=>{if(await page.locator('#close-panel').isVisible())await page.locator('#close-panel').tap();};
 let lab=false;
 const read=()=>page.evaluate(lab=>JSON.parse(localStorage.getItem((lab?'prairie-lapins.development.':'')+'prairie-lapins.save.v1')),lab);
 const ready=async()=>{await page.waitForFunction(()=>new Set(performance.getEntriesByType('resource').filter(r=>r.name.includes('/assets/rabbits/')&&r.responseEnd>0).map(r=>r.name)).size>=6);await page.waitForFunction(()=>document.querySelector('#save-status')?.dataset.status==='saved');if(expected)assert.ok((await page.locator('#game-version').textContent()).endsWith(expected));};
 const guide=()=>page.locator('#tutorial').getByRole('button',{name:'Me guider',exact:true}).tap();
 const step=id=>page.waitForFunction(id=>document.querySelector('#tutorial')?.dataset.step===id,id);
 const claim=async()=>{const b=page.locator('#tutorial').getByRole('button',{name:/^(Réclamer ·|Valider l’objectif)/});if(await b.count())await b.tap();};
 const capture=name=>page.screenshot({path:out+'/'+name+'.png'});
 const time=async n=>{await page.locator('#open-settings').tap();await page.locator('#dev-time-'+n).tap();await close();};
 const free=()=>tap('Terminer gratuitement — découverte du jeu');
 const cdp=await page.context().newCDPSession(page);
 const pan=async(from,to)=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[from]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[to]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});};
 const mark=async label=>{const s=await read();report.budgets.push({label,lab,pattes:s.pattes,grass:s.grass,hearts:s.hearts,totalXp:s.progression.totalXp,level:Number(await page.locator('#player-level').innerText())});};
 try {
  for(const aided of process.env.PRAIRIE_START_NORMAL_ONLY?[true]:[true,false]){
   lab=!aided;await page.goto(lab?new URL('dev/',root).href:root.href);await enterGame(page);await ready();
   if(lab){await page.locator('#open-settings').tap();await page.locator('#dev-scenario-guidedStart').tap();await close();}
   await step('welcome');const start=await read();assert.deepEqual([start.pattes,start.grass,start.hearts],[300,10,12]);assert.equal(start.rabbits.length,1);assert.equal(start.buildings[0].habitat.type,'paille');assert.deepEqual(start.discovered,['paille']);await mark('Départ');
   await guide();await step('snowShop');await guide();assert.match(await page.locator('#panel-content').innerText(),/Jardin enneigé/);
   await tap('Placer · 200 pièces');await tap('Annuler · aucun coût');assert.equal((await read()).pattes,300);assert.match(await page.locator('#panel-content').innerText(),/Jardin enneigé/);
   await close();await page.reload();await enterGame(page);await ready();await step('snowShop');await guide();const booted=await camera.booted(page,await read());await tap('Placer · 200 pièces');assert.equal(await page.evaluate(()=>document.elementFromPoint(250,150)?.tagName),'CANVAS');
   // Neige at fine (26,24) (former 20,16), central parcel, beyond the offered Paille habitat; panned to the former tap spot.
   {const p=booted.screen(camera.modules().finePoint(26.5,24.5)),dx=249-p.x,dy=160-p.y;await pan({x:250,y:150},{x:250+dx,y:150+dy});booted.pan(dx,dy);const q=booted.screen(camera.modules().finePoint(26.5,24.5));assert.equal(await page.evaluate(q=>document.elementFromPoint(q.x,q.y)?.tagName,q),'CANVAS');await page.touchscreen.tap(q.x,q.y);}await tap('Acheter et placer · 200 pièces');await close();await claim();assert.equal((await read()).pattes,100);await step('rabbitShop');await guide();
   let card=page.locator('#panel-content .card').filter({has:page.getByRole('heading',{name:'Lapin Neige',exact:true})});await card.getByRole('button',{name:'Choisir un habitat · 80 pièces',exact:true}).tap();await tap('Annuler · aucun coût');assert.equal((await read()).pattes,100);await close();await guide();card=page.locator('#panel-content .card').filter({has:page.getByRole('heading',{name:'Lapin Neige',exact:true})});await card.getByRole('button',{name:'Choisir un habitat · 80 pièces',exact:true}).tap();
   await page.getByRole('button',{name:/· 3 places libres$/}).tap();await tap('Confirmer l’achat · 80 pièces');await tap('Bienvenue dans la prairie');await close();assert.equal((await read()).pattes,20);await step('snowReward');await claim();assert.equal((await read()).pattes,80);await mark('Neige et récompense unique');
   if(aided){await capture('neige-landscape');await page.setViewportSize({width:390,height:844});await page.locator('#continue-portrait').tap();await page.locator('#open-shop').tap();await tap('Lapins');await capture('shop-portrait');await close();await page.setViewportSize({width:667,height:375});}
   await step('paille');await guide();await tap('Nourrir · 2 herbes');await close();await claim();await step('neige');await guide();await tap('Nourrir · 2 herbes');await close();await claim();await step('recipe');await guide();assert.match(await page.locator('[data-recipe="brumelin"]').innerText(),/sans certitude/);await close();await step('breed');await guide();
   await camera.crossParents(page,'Lapin Paille','Lapin Neige',{tap:true});await close();await claim();await step('farmShop');const homes=(await read()).rabbits.map(r=>r.enclosureId);assert.equal(new Set(homes).size,2);await page.reload();await enterGame(page);await ready();await step('farmShop');
   // Pan after opening the placement: the optional guide card must keep its touch priority.
   const framed=await camera.recentered(page,await read());await guide();await tap('Placer · 60 pièces');assert.equal(await page.evaluate(()=>document.elementFromPoint(250,150)?.tagName),'CANVAS');
   // Farm between nest and nursery: fine (22,20) (former 16,12), panned to the former tap spot clear of the guide card.
   {const p=framed.screen(camera.modules().finePoint(22.5,20.5)),dx=264-p.x,dy=155-p.y;await pan({x:250,y:150},{x:250+dx,y:150+dy});framed.pan(dx,dy);const q=framed.screen(camera.modules().finePoint(22.5,20.5));assert.equal(await page.evaluate(q=>document.elementFromPoint(q.x,q.y)?.tagName,q),'CANVAS');await page.touchscreen.tap(q.x,q.y);}assert.match(await page.locator('.placement-valid').innerText(),/4 × 4/);await tap('Acheter et placer · 60 pièces');await close();await claim();await step('production');await guide();await tap('Produire · 10 pièces');await close();await step('collection');await guide();assert.match(await page.locator('#panel-content').innerText(),/À découvrir/);await close();await step('harvest');await guide();
   if(aided)await free();else {await close();await time(5);await guide();}await tap('Récolter 20 herbes');await close();await claim();await step('transfer');await mark('Ferme et récolte pendant reproduction');await guide();
   if(aided)await free();else {await close();await time(20);await guide();}
   const waiting=await read();assert.ok(waiting.buildings.find(b=>b.kind==='nest').breeding);assert.equal(babyOf(waiting.buildings.find(b=>b.kind==='nursery')),null);await page.reload();await enterGame(page);await ready();await step('transfer');await guide();await tap('Envoyer dans la nurserie');await close();await claim();await step('welcomeBirth');assert.equal((await read()).buildings.find(b=>b.kind==='nest').breeding,null);assert.deepEqual((await read()).rabbits.map(r=>r.enclosureId),homes);await guide();
   if(aided)await free();else {await close();const job=babyOf((await read()).buildings.find(b=>b.kind==='nursery'));for(let i=0;i<Math.ceil((job.readyAt-job.startedAt)/300000);i++)await time(5);await guide();}
   await page.locator('#panel-content button:not([disabled])').filter({hasText:/· 1\/3/}).first().tap();await tap('Bienvenue dans la prairie');await close();await step('free');await claim();await mark('Naissance et récompense');await guide();assert.equal(await page.locator('#panel-content [data-mission]').count(),9);await close();await tap('Terminer le guidage');await page.reload();await enterGame(page);await ready();assert.equal(await page.locator('#tutorial').isVisible(),false);
   const end=await read();assert.deepEqual([end.pattes,end.grass,end.hearts],[140,76,14]);assert.equal(end.missions.claimed.length,9);assert.ok(Number(await page.locator('#player-level').innerText())>=3);assert.deepEqual(end.levelAccessTransition.rights,[]);assert.ok(end.progression.totalXp>=305);assert.deepEqual(end.initiation.used,aided?['order','breeding','growth']:[]);report.checks.push((aided?'Normal, aides facultatives':'Laboratoire, attente normale simulée')+' : départ solo, achats annulés/confirmés, deux homes réservés, ferme pendant reproduction, transfert/accueil manuels, récompenses uniques disparues, Terre et reprise.');
  }
  assert.deepEqual(report.errors,[]);report.passed=true;
 }finally{if(!report.passed)await capture('failure');fs.writeFileSync(out+'/guided-start-public-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
