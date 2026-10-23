// Loading screen and background music on the compiled build (Chromium; not an iPhone).
// Test-only interception: HTMLMediaElement.play/pause are recorded, document.hidden is simulated,
// network failures are produced with page.route. No application hook.
// node docs/loading-audio-check.cjs http://127.0.0.1:5174/ <outside-Git-directory>
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const [url,directory]=process.argv.slice(2),out=path.resolve(directory);fs.mkdirSync(out,{recursive:true});
 const report={url,checks:[],errors:[]},check=(ok,message)=>{assert.ok(ok,message);report.checks.push(message);};
 const browser=await chromium.launch();
 const open=async(route,{width=844,height=390,prepare}={})=>{
  const page=await browser.newPage({viewport:{width,height},hasTouch:true});page.on('pageerror',e=>report.errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.addInitScript(()=>{
   window.__media=[];let hidden=false;
   Object.defineProperty(Document.prototype,'hidden',{configurable:true,get(){return hidden;}});
   window.__setHidden=value=>{hidden=value;document.dispatchEvent(new Event('visibilitychange'));};
   const play=HTMLMediaElement.prototype.play,pause=HTMLMediaElement.prototype.pause;
   HTMLMediaElement.prototype.play=function(){window.__media.push(['play',this.src.split('/').pop()]);return play.call(this);};
   HTMLMediaElement.prototype.pause=function(){window.__media.push(['pause',this.src.split('/').pop()]);return pause.call(this);};
  });
  if(prepare)await prepare(page);
  await page.goto(new URL(route,url).href);return page;
 };
 const media=page=>page.evaluate(()=>window.__media);
 const playing=page=>page.evaluate(()=>window.__media.filter(([kind])=>kind==='play').map(([,src])=>src));
 const ready=page=>page.waitForFunction(()=>!document.getElementById('loading-play').disabled,null,{timeout:60_000});
 try{
  for(const [route,label] of [['','jeu'],['dev/','laboratoire']]){
   const requests=[],responses=[];
   const page=await open(route,{prepare:async p=>{
    p.on('request',r=>{if(/\.mp3(?:\?|$)/.test(r.url()))requests.push({url:r.url(),range:r.headers().range});});
    p.on('response',r=>{if(/\.mp3(?:\?|$)/.test(r.url()))responses.push({url:r.url(),status:r.status()});});
   }});
   const early=await page.evaluate(()=>({shown:!document.getElementById('loading-screen').hidden,covers:document.elementFromPoint(innerWidth/2,innerHeight/2)?.closest('#loading-screen')!==null,inert:document.getElementById('app').inert}));
   check(early.shown&&early.covers&&early.inert,`${label}: loading screen covers the game, which is inert`);
   await ready(page);
   await page.waitForFunction(()=>[...document.querySelectorAll('#loading-steps li')].every(li=>li.dataset.state==='done'));
   const view=await page.evaluate(()=>({steps:[...document.querySelectorAll('#loading-steps li')].map(li=>li.dataset.step+':'+li.dataset.state),bar:document.querySelector('.loading-bar').getAttribute('aria-valuenow'),tutorial:getComputedStyle(document.getElementById('tutorial')).display!=='none'&&!document.getElementById('tutorial').hidden}));
   check(view.steps.join()==='save:done,fonts:done,textures:done,scene:done,music:done'&&view.bar==='100',`${label}: five real steps done, progress 100 %`);
   check((await media(page)).length===0&&!view.tutorial,`${label}: no sound or tutorial before « Jouer »`);
   await page.screenshot({path:path.join(out,`${label}-ready.png`)});
   await page.click('#loading-play');await page.waitForFunction(()=>document.getElementById('loading-screen').hidden);await page.waitForTimeout(400);
   const first=await playing(page);check(first.length===1,`${label}: exactly one track starts on « Jouer » (${first[0]})`);
   check(await page.evaluate(()=>!document.getElementById('app').inert),`${label}: game interactive after « Jouer »`);
   if(label==='jeu')check(await page.evaluate(()=>!document.getElementById('tutorial').hidden&&/Bienvenue/.test(document.getElementById('tutorial').innerText)),'jeu: tutorial and welcome message appear after « Jouer »');
   await page.evaluate(()=>window.__setHidden(true));await page.waitForTimeout(150);
   const paused=(await media(page)).at(-1);check(paused[0]==='pause'&&paused[1]===first[0],`${label}: background pauses the playing track`);
   await page.evaluate(()=>window.__setHidden(false));await page.waitForTimeout(300);
   const resumed=await playing(page);check(resumed.length===2&&resumed[1]===first[0],`${label}: returning resumes the same track, no second one`);
   // Settings: Musique off pauses it, on resumes it; Bruitages is independent.
   await page.click('#open-settings');await page.click('#music-toggle');
   check(await page.evaluate(()=>document.getElementById('music-toggle').getAttribute('aria-pressed'))==='false'&&(await media(page)).at(-1)[0]==='pause',`${label}: Musique off pauses the music`);
   check(await page.evaluate(()=>document.getElementById('effects-toggle').getAttribute('aria-pressed'))==='true',`${label}: Bruitages unchanged`);
   await page.click('#music-toggle');await page.waitForTimeout(200);check((await playing(page)).length===3,`${label}: Musique on resumes`);
   await page.screenshot({path:path.join(out,`${label}-settings.png`)});
   const key=route?'prairie-lapins.development.ui':'prairie-lapins.ui.v1';
   check(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).music===true,key),`${label}: settings stored under ${key}`);
   const shared=new URL('assets/audio/music/',url).pathname;
   check(requests.length>0&&requests.every(r=>new URL(r.url).pathname.startsWith(shared)),`${label}: all music requests use shared ${shared}`);
   check(requests.some(r=>r.range==='bytes=0-65535'),`${label}: initial ranged probe retained`);
   check(responses.length>0&&responses.every(r=>r.status===200||r.status===206),`${label}: music accessible without HTTP errors`);
   await page.close();
  }
  // Music unavailable: « Jouer » still enters, with a clear note; nothing tries to play a missing file forever.
  {const page=await open('',{prepare:p=>p.route('**/assets/audio/music/*.mp3',r=>r.fulfill({status:404,body:''}))});await ready(page);
   await page.waitForFunction(()=>document.querySelector('[data-step="music"]')?.dataset.state==='warning');
   const note=await page.locator('#loading-message').innerText();check(/Musique indisponible/.test(note),'missing music: clear note, « Jouer » available');
   await page.click('#loading-play');await page.waitForFunction(()=>document.getElementById('loading-screen').hidden);await page.waitForTimeout(800);
   check(await page.evaluate(()=>!document.getElementById('app').inert),'missing music: game entered');await page.close();}
  // A game image failing: message and « Réessayer », never « Jouer ».
  {const page=await open('',{prepare:p=>p.route('**/assets/buildings/farm-windmill*.png',r=>r.abort())});
   await page.waitForFunction(()=>document.getElementById('loading-screen').dataset.state==='failed',null,{timeout:60_000});
   const state=await page.evaluate(()=>({play:document.getElementById('loading-play').disabled,retry:!document.getElementById('loading-retry').hidden,message:document.getElementById('loading-message').textContent}));
   check(state.play&&state.retry&&/image du jeu/.test(state.message),'image failure: message and « Réessayer », « Jouer » disabled');
   await page.screenshot({path:path.join(out,'failure.png')});await page.close();}
  // Portrait, safe areas: the card fits the screen.
  {const page=await open('',{width:390,height:844});await ready(page);const box=await page.locator('.loading-card').boundingBox();
   check(box.x>=0&&box.y>=0&&box.x+box.width<=390&&box.y+box.height<=844,'portrait: loading card inside the screen');await page.screenshot({path:path.join(out,'portrait-ready.png')});await page.close();}
  assert.deepEqual(report.errors,[]);report.passed=true;
 }finally{fs.writeFileSync(path.join(out,'loading-audio-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:!!report.passed,checks:report.checks.length,errors:report.errors}));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
