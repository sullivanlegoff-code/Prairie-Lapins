// Built recipe check: Chromium native touch via CDP; WebKit Windows uses native mouse Pointer Events.
// node docs/cooking-prototype-check.cjs http://127.0.0.1:5185/ <outside-Git-output-directory>
const {chromium,webkit}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const [base,out]=process.argv.slice(2);fs.mkdirSync(out,{recursive:true});
 const report={checks:[],errors:[],limits:['Not physical iPhone. Chromium uses native touch via CDP. WebKit Windows uses trusted mouse Pointer Events; Playwright does not expose native touchmove for WebKit.']};
 const check=(value,label)=>{assert.ok(value,label);report.checks.push(label);};
 try{
  for(const [browserName,type] of [['Chromium',chromium],['WebKit',webkit]].filter(([name])=>!process.env.COOKING_BROWSER||name===process.env.COOKING_BROWSER)){
   const browser=await type.launch();
   try{
    const context=await browser.newContext({hasTouch:true,viewport:{width:844,height:390}}),page=await context.newPage();page.setDefaultTimeout(15000);
    page.on('pageerror',error=>report.errors.push(`${browserName}: ${error.message}`));
    for(const route of ['', 'dev/']){
     await page.goto(new URL(route,base).href);await page.waitForFunction(()=>!document.getElementById('loading-play').disabled);await page.locator('#loading-play').click();await page.waitForFunction(()=>document.getElementById('loading-screen').hidden);
     check(await page.locator('#game canvas').count()===1,`${browserName}: ${route||'/'} normal entry still starts`);
    }
    const cdp=browserName==='Chromium'?await context.newCDPSession(page):null;
    const item=id=>page.locator(`[data-item="${id}"]`),zone=id=>page.locator(`[data-zone="${id}"]`);
    const center=async locator=>{const box=await locator.boundingBox();assert.ok(box);return{x:box.x+box.width/2,y:box.y+box.height/2};};
    const settled=async(id,target)=>page.waitForFunction(({id,target})=>{const a=document.querySelector(`[data-item="${id}"]`).getBoundingClientRect(),b=document.querySelector(`[data-zone="${target}"]`).getBoundingClientRect();return Math.hypot(a.x+a.width/2-b.x-b.width/2,a.y+a.height/2-b.y-b.height/2)<1;},{id,target});
    async function start(id){const p=await center(item(id));if(cdp)await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:0,...p}]});else{await page.mouse.move(p.x,p.y);await page.mouse.down();}return p;}
    async function move(from,to){for(let n=1;n<=8;n++){const p={x:from.x+(to.x-from.x)*n/8,y:from.y+(to.y-from.y)*n/8};if(cdp)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:0,...p}]});else await page.mouse.move(p.x,p.y);}}
    async function end(){if(cdp)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await page.mouse.up();}
    async function drag(id,target){const from=await start(id);await move(from,await center(target));await end();}
    async function dragZone(id,target){await drag(id,zone(target));try{await settled(id,target);}catch(error){report.diagnostic=await page.evaluate(({id,target})=>({item:document.querySelector(`[data-item="${id}"]`).outerHTML,items:[...document.querySelectorAll('[data-item]')].map(x=>[x.dataset.item,x.dataset.location,x.dataset.preparation]),zone:document.querySelector(`[data-zone="${target}"]`).getBoundingClientRect().toJSON(),message:document.querySelector('#kitchen-message').textContent,portrait:document.querySelector('.cuisine-root').dataset.portrait,overlay:document.querySelector('#result-screen').hidden,pointers:window.__pointerLog?.slice(-30)}),{id,target});await page.screenshot({path:path.join(out,`drag-failure-${id}-${target}.png`)});throw error;}}
    async function applyBottle(id,target){
     const state=()=>page.evaluate(()=>({phase:document.querySelector('.cuisine-root').dataset.recipePhase,flags:[...document.querySelectorAll('[data-item]')].map(el=>el.dataset.flags)}));
     const before=await state();await item(id).tap();check(JSON.stringify(await state())===JSON.stringify(before),browserName+': '+id+' tap does not apply');
     const home=await center(item(id)),from=await start(id),to=await center(target);
     await move(from,{x:(from.x+to.x)/2,y:(from.y+to.y)/2});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
     const moving=await center(item(id));check(Math.hypot(moving.x-home.x,moving.y-home.y)>8,browserName+': '+id+' follows pointer');
     check(JSON.stringify(await state())===JSON.stringify(before),browserName+': '+id+' waits for drop');
     await move(from,to);await end();await settled(id,'fixture-'+id);check(await item(id).getAttribute('data-location')==='reserve',browserName+': '+id+' returns home');
    }
    async function startSalad(label){
     await page.goto(new URL('cooktap-prototype/',base).href);
     await page.locator('#recipe-salad').click();await page.waitForFunction(()=>document.getElementById('recipe-screen').hidden);
     await page.evaluate(()=>{window.__pointerLog=[];for(const t of ['pointerdown','pointermove','pointerup','pointercancel'])document.addEventListener(t,e=>window.__pointerLog.push({t,id:e.pointerId,item:e.target.closest?.('[data-item]')?.dataset.item,x:e.clientX,y:e.clientY}),true)});
     check(await item('chicken').evaluate(el=>el.hidden),`${label}: chicken objects hidden`);
     check(await item('soy').evaluate(el=>el.hidden)&&await item('honey').evaluate(el=>el.hidden)&&await item('oven').evaluate(el=>el.hidden),`${label}: future recipe equipment hidden`);
     check((await page.locator('#recipe-guide').getAttribute('aria-label')).includes('couper'),`${label}: persistent recipe guide shown`);
     check(await page.locator('#kitchen-surface').evaluate(el=>getComputedStyle(el).touchAction)==='pinch-zoom',`${label}: scoped pinch-zoom retained`);
    }
    async function complete(order,label){
     for(const id of order){
      await dragZone(id,'cutting-board');check(await item(id).getAttribute('data-location')==='cutting-board',`${label}: ${id} on board`);
      const before=await item(id).locator('.object-art').innerHTML();await drag('knife',item(id));await settled('knife','tool-rack-knife');
      check(await item(id).getAttribute('data-preparation')==='cut',`${label}: knife cuts ${id}`);
      check(await item(id).getAttribute('data-effect')==='cut',`${label}: brief cut feedback plays`);
      check(await item(id).locator('.object-art').innerHTML()!==before,`${label}: ${id} cut art changes`);
      check(await item('knife').getAttribute('data-location')==='tool-rack',`${label}: knife returns to rack`);
      if(id===order[0]&&label.endsWith('first order')){await dragZone(id,`reserve-${id}`);check(await item(id).getAttribute('data-preparation')==='cut',`${label}: cut state survives reserve return`);}
      else await dragZone(id,'bowl');
     }
     if(label.endsWith('first order'))await dragZone(order[0],'bowl');
     check(await page.locator('#kitchen-world').evaluate(el=>el.querySelector('.bowl-content').innerHTML.length>100),`${label}: salad bowl visually reflects contents`);
     await applyBottle('olive-oil',zone('bowl'));await page.waitForFunction(()=>!document.getElementById('result-screen').hidden);
     check(await item('olive-oil').getAttribute('data-effect')==='pour'&&await page.locator('.bowl-content').getAttribute('data-effect')==='dressed',`${label}: oil pour feedback and dressed bowl shown`);
     check((await page.locator('#result-title').innerText())==='Salade réussie !',`${label}: recipe completes by dropping olive oil`);
     check((await page.locator('#result-errors').innerText())===(label.endsWith('first order')?'2':'0'),`${label}: invalid actions counted; interruptions excluded`);
     check((await page.locator('#result-time').innerText()).includes('s'),`${label}: elapsed time shown`);
    }
    async function completeChicken(label){
     await page.goto(new URL('cooktap-prototype/',base).href);await page.locator('#recipe-chicken').click();await page.waitForFunction(()=>document.getElementById('recipe-screen').hidden);
     check(await item('chicken').isVisible()&&await item('sweet-potato').isVisible(),`${label}: chicken and sweet potato scene selected`);
     check(await item('bowl').evaluate(el=>el.hidden)&&await item('olive-oil').evaluate(el=>el.hidden),`${label}: salad-only objects hidden`);
     await applyBottle('soy',item('chicken'));check((await page.locator('#kitchen-message').innerText()).includes('Coupe'),`${label}: soy before cut refused`);
     await dragZone('chicken','cutting-board');await drag('knife',item('chicken'));
     check(await item('chicken').getAttribute('data-preparation')==='cut',`${label}: knife prepares raw chicken pieces`);
     await applyBottle('honey',item('chicken'));check((await page.locator('#kitchen-message').innerText()).includes('soja'),`${label}: honey before soy refused`);
     await applyBottle('soy',item('chicken'));await applyBottle('honey',item('chicken'));
     check((await item('chicken').getAttribute('data-flags')).includes('honeyAdded'),`${label}: soy then honey seasoning applied`);
     await dragZone('chicken','reserve-chicken');
     await dragZone('sweet-potato','cutting-board');const rawPotato=await item('sweet-potato').locator('.object-art').innerHTML();
     await drag('knife',item('sweet-potato'));check(await item('sweet-potato').getAttribute('data-preparation')==='whole',`${label}: potato knife use refused before peeling`);
     await drag('peeler',item('sweet-potato'));check(await item('sweet-potato').getAttribute('data-preparation')==='peeled',`${label}: peeler creates peeled state`);
     check(await item('sweet-potato').locator('.object-art').innerHTML()!==rawPotato,`${label}: peeled potato art changes`);
     await drag('knife',item('sweet-potato'));check(await item('sweet-potato').getAttribute('data-preparation')==='cut',`${label}: knife cuts peeled potato`);
     await dragZone('sweet-potato','reserve-sweet-potato');
     await dragZone('chicken','baking-dish');await dragZone('sweet-potato','baking-dish');
     check(await item('baking-dish').getAttribute('aria-label').then(x=>x.includes('Poulet')&&x.includes('Patate douce')),`${label}: dish reflects both ingredients`);
     await dragZone('baking-dish','oven');check(await item('baking-dish').getAttribute('data-location')==='oven',`${label}: complete dish enters oven`);
     await page.waitForFunction(()=>document.querySelector('[data-item="baking-dish"]').dataset.cooking==='true');
     await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>!document.getElementById('orientation-screen').hidden);
     const frozen=await page.evaluate(async()=>{const el=document.querySelector('[data-item="baking-dish"]');const value=el.dataset.progress;await new Promise(resolve=>requestAnimationFrame(t0=>{const loop=t=>t-t0>900?resolve():requestAnimationFrame(loop);loop(t0)}));return value===el.dataset.progress;});
     check(frozen,`${label}: five-second cooking progress freezes in portrait`);
     await page.setViewportSize({width:844,height:390});await page.waitForFunction(()=>document.getElementById('orientation-screen').hidden);
     await page.waitForFunction(()=>document.querySelector('.cuisine-root').dataset.recipePhase==='completed');
     check(await item('chicken').getAttribute('data-preparation')==='cooked'&&await item('sweet-potato').getAttribute('data-preparation')==='cooked',`${label}: both foods cooked after five active seconds`);
     check((await page.locator('#result-title').innerText()).includes('Poulet soja-miel'),`${label}: chicken result displayed`);
     check((await page.locator('#result-errors').innerText())==='3',`${label}: three intentional errors counted`);
     await page.locator('#recipe-replay').click();await page.waitForFunction(()=>document.getElementById('result-screen').hidden);
     check(await item('chicken').getAttribute('data-preparation')==='raw'&&await item('sweet-potato').getAttribute('data-preparation')==='whole'&&await item('baking-dish').getAttribute('data-location')==='dish-rack',`${label}: replay resets chicken, potato and dish`);
    }
    for(const size of [{width:844,height:390},{width:667,height:375}]){
     await page.setViewportSize(size);await startSalad(`${browserName} ${size.width} landscape`);
     for(const id of ['mozzarella','tomato','cucumber','knife','olive-oil']){const b=await item(id).boundingBox();check(b.width>=47.9&&b.height>=47.9,`${browserName} ${size.width}: ${id} hitbox >=48 CSS px`);}
     // Whole food in the bowl and oil before the ingredients are intentional player errors.
     await drag('tomato',zone('bowl'));await page.waitForFunction(()=>{const el=document.querySelector('[data-item="tomato"]');return el.dataset.location==='reserve'&&el.getAnimations().length===0;});check(await item('tomato').getAttribute('data-location')==='reserve',`${browserName} ${size.width}: whole ingredient rejected by bowl`);
      await applyBottle('olive-oil',zone('bowl'));const oilMessage=await page.locator('#kitchen-message').innerText();check(oilMessage.includes('3'),`${browserName} ${size.width}: premature oil drop refused`);
     // A system rotation during a live drag cancels it without recipe progress.
     const from=await start('cucumber'),dest=await center(zone('cutting-board'));await move(from,{x:(from.x+dest.x)/2,y:(from.y+dest.y)/2});
     if(cdp)await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});else{await page.evaluate(()=>document.querySelector('#kitchen-surface').dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerId:1,pointerType:'mouse'})));await page.mouse.up();}
     await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>!document.getElementById('orientation-screen').hidden);
     check(await item('cucumber').getAttribute('data-location')==='reserve',`${browserName} ${size.width}: portrait rotation cancels drag`);
     check(await page.locator('#scene-shell').evaluate(el=>el.inert),`${browserName} ${size.width}: portrait blocks scene`);
     await page.setViewportSize(size);await page.waitForFunction(()=>document.getElementById('orientation-screen').hidden);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
     await complete(['tomato','cucumber','mozzarella'],`${browserName} ${size.width} first order`);
     await page.locator('#recipe-replay').click();await page.waitForFunction(()=>document.getElementById('result-screen').hidden);
     check(await item('tomato').getAttribute('data-preparation')==='whole'&&await item('tomato').getAttribute('data-location')==='reserve',`${browserName} ${size.width}: replay fully resets ingredients`);
     check(await page.locator('.bowl-content').evaluate(el=>!el.innerHTML.includes('#dc725d')&&!el.innerHTML.includes('#c6d99b')&&!el.innerHTML.includes('#fff4d4')),`${browserName} ${size.width}: replay empties the bowl display`);
     await complete(['cucumber','mozzarella','tomato'],`${browserName} ${size.width} alternate order`);
     check(await page.evaluate(()=>scrollX===0&&scrollY===0&&document.body.scrollWidth<=innerWidth&&document.body.scrollHeight<=innerHeight+1),`${browserName} ${size.width}: no page scroll or overflow`);
     await page.screenshot({path:path.join(out,`${browserName}-${size.width}-salad-complete.png`)});
    }
    await page.setViewportSize({width:1280,height:800});await startSalad(`${browserName} desktop`);check(await item('bowl').isVisible(),`${browserName}: desktop scene visible`);
    await completeChicken(`${browserName} chicken`);
    await context.close();
   }finally{await browser.close();}
  }
  assert.deepEqual(report.errors,[]);report.passed=true;
 }finally{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:!!report.passed,checks:report.checks.length,errors:report.errors}));}
})().catch(error=>{console.error(error);process.exitCode=1;});
