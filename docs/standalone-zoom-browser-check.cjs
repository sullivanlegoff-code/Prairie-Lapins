// node docs/standalone-zoom-browser-check.cjs <URL>
// Synthetic WebKit gesture events prove cancellation, not iPhone native page zoom behavior.
const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 for(const [name,engine] of [['Chromium',chromium],['WebKit Windows',webkit]]) {
  const browser=await engine.launch();let checks=0;
  try{
   for(const standalone of [false,true]){
    const context=await browser.newContext({viewport:{width:390,height:844}});
    if(standalone)await context.addInitScript(()=>Object.defineProperty(navigator,'standalone',{value:true}));
    const page=await context.newPage();await page.goto(process.argv[2]);
    await page.waitForFunction(()=>document.querySelector('#save-status')?.dataset.status==='saved');
    if(await page.locator('#continue-portrait').isVisible())await page.click('#continue-portrait');
    const result=await page.evaluate(()=>{
     const viewport=document.querySelector('meta[name=viewport]');
     const emit=(selector,type,touches=1)=>{
      const event=new Event(type,{bubbles:true,cancelable:true});
      Object.defineProperty(event,'touches',{value:Array.from({length:touches},()=>({}))});
      document.querySelector(selector).dispatchEvent(event);return event.defaultPrevented;
     };
     const result={viewport:viewport.content,canvas:emit('#game canvas','gesturestart'),
      start:emit('#open-shop','gesturestart'),change:emit('#open-shop','gesturechange'),
      doubleTouch:emit('#panel-content','touchmove',2),singleTouch:emit('#panel-content','touchmove',1),
      touchAction:getComputedStyle(document.getElementById('app')).touchAction};
     if(document.documentElement.classList.contains('standalone')){
      viewport.content='width=device-width, initial-scale=3';window.dispatchEvent(new Event('pageshow'));result.resume=viewport.content;
      viewport.content='width=device-width, initial-scale=3';document.dispatchEvent(new Event('visibilitychange'));result.visibility=viewport.content;
     }
     return result;
    });
    assert.equal(result.viewport.includes('user-scalable=no'),standalone);checks++;
    assert.equal(result.canvas,true);checks++;
    assert.equal(result.start,standalone);assert.equal(result.change,standalone);checks+=2;
    assert.equal(result.doubleTouch,standalone);assert.equal(result.singleTouch,false);checks+=2;
    if(standalone){assert.match(result.touchAction,/pan-x pan-y|pan-y pan-x/);assert.match(result.resume,/maximum-scale=1/);assert.match(result.visibility,/maximum-scale=1/);checks+=3;}
    else {assert.equal(result.touchAction,'manipulation');checks++;}
    await page.click('#open-shop');await page.getByRole('button',{name:'Recettes de lapins',exact:true}).click();
    await page.locator('#panel-content').hover();await page.mouse.wheel(0,250);
    await page.waitForFunction(()=>document.getElementById('panel-content').scrollTop>0);checks++;
    await context.close();
   }
   console.log(JSON.stringify({browser:name,checks,passed:true,nativeIPhoneZoomTested:false}));
  }finally{await browser.close();}
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
