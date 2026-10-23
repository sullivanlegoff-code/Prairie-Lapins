// Usage: node docs/main-layout-check.cjs [local URL]; Chromium is not physical iPhone Safari.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch(); let checks=0;
 try {
  for(const [width,height] of [[390,844],[844,390],[1440,900]]) {
   const page=await browser.newPage({viewport:{width,height}});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(process.argv[2]||'http://localhost:5173/');
   await page.waitForFunction(()=>document.querySelector('#save-status')?.dataset.status==='saved');
   await page.locator('#game canvas').waitFor();
   if(await page.locator('#continue-portrait').isVisible())await page.click('#continue-portrait');
   const result=await page.evaluate(()=>{
    const ids=['player-progress','pattes','grass','open-hearts','recenter-view','open-photo','open-settings'];
    const rect=id=>{const r=document.getElementById(id).getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom};};
    return {rects:ids.map(rect),hud:rect('hud'),scroll:document.getElementById('hud').scrollWidth,client:document.getElementById('hud').clientWidth,
     nav:[...document.querySelectorAll('#hud nav button')].map(b=>b.id),
     left:['open-missions',...[...document.querySelectorAll('#meadow-actions > button:not([hidden])')].map(b=>b.id)],
     gear:!!document.querySelector('#open-settings svg'),gearText:document.querySelector('#open-settings').textContent.trim(),gearLabel:document.querySelector('#open-settings').getAttribute('aria-label'),
     resources:[...document.querySelectorAll('#hud .resource')].map(el=>({iconLast:el.lastElementChild.matches('img,span,svg'),label:el.getAttribute('aria-label')})),
     removed:!!document.querySelector('#hud h1,#open-expand,#overview-view')};
   });
   assert.deepEqual(result.nav,['recenter-view','open-photo','open-settings']);checks++;
   assert.deepEqual(result.left,['open-missions','open-shop','open-arrange','open-collection']);checks++;
   assert.equal(result.gear,true);assert.equal(result.gearText,'');assert.equal(result.gearLabel,'Paramètres');checks+=3;
   assert.equal(result.removed,false);checks++;
   assert.ok(result.resources.every(r=>r.iconLast&&r.label));checks++;
   for(let i=0;i<result.rects.length;i++){
    const r=result.rects[i];assert.ok(r.y>=result.hud.y&&r.bottom<=result.hud.bottom&&r.right<=width,JSON.stringify(result));
    if(i)assert.ok(r.x>=result.rects[i-1].right,JSON.stringify(result));
    checks++;
   }
   assert.ok(result.scroll<=result.client,'Normal balances fit without horizontal scrolling');checks++;
   // The new-start guide still advances and opens its existing habitat shop.
   await page.locator('#tutorial').getByRole('button',{name:'Me guider',exact:true}).click();
   await page.waitForFunction(()=>document.querySelector('#tutorial').dataset.step==='snowShop');
   await page.locator('#tutorial').getByRole('button',{name:'Me guider',exact:true}).click();
   assert.equal(await page.locator('#panel-title').textContent(),'Boutique');checks++;
   assert.ok(await page.getByRole('button',{name:'Placer · 200 pièces',exact:true}).count());checks++;
   await page.click('#close-panel');await page.click('#open-shop');
   await page.getByRole('button',{name:'Île',exact:true}).click();
   assert.equal(await page.locator('#panel-title').textContent(),'Agrandir l’île');checks++;
   assert.equal(await page.getByRole('button',{name:/^Voir /}).count(),8);checks++;
   assert.deepEqual(errors,[]);checks++;
   console.log(JSON.stringify({width,height,passed:true}));await page.close();
  }
  console.log(`${checks} assertions passed (Chromium, no physical iPhone).`);
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
