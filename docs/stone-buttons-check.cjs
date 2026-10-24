// node docs/stone-buttons-check.cjs <URL> <capture-directory-outside-Git> <before|after>
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const [url,directory,phase]=process.argv.slice(2);assert.ok(['before','after'].includes(phase));
 const output=path.resolve(directory);fs.mkdirSync(output,{recursive:true});
 const baselinePath=path.join(output,'before-geometry.json');
 const baseline=phase==='after'?JSON.parse(fs.readFileSync(baselinePath,'utf8')):{};
 const report={phase,url,checks:0,geometry:{},screenshots:[],errors:[]};
 const browser=await chromium.launch();
 const luminance=css=>{const rgb=css.match(/[\d.]+/g).slice(0,3).map(v=>{v=Number(v)/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
 try{
  for(const [width,height] of [[390,844],[844,390]]){
   const page=await browser.newPage({viewport:{width,height}});page.on('pageerror',e=>report.errors.push(e.message));
   await page.goto(url);await page.waitForFunction(()=>document.querySelector('#save-status')?.dataset.status==='saved');
   await page.locator('#game canvas').waitFor();
   if(await page.locator('#continue-portrait').isVisible())await page.click('#continue-portrait');
   await page.waitForLoadState('networkidle');
   if(phase==='after')for(const [name,size,colorType] of [['stone-frame',256,6],['stone-grain',64,2]]){
    const response=await page.request.get(new URL(`assets/ui/${name}.png`,url).href);assert.equal(response.status(),200);
    const png=await response.body();assert.equal(png.readUInt32BE(16),size);assert.equal(png.readUInt32BE(20),size);assert.equal(png[25],colorType);report.checks+=4;
   }
   async function inspect(name,selectors){
    const rows=await page.evaluate(selectors=>selectors.flatMap(selector=>[...document.querySelectorAll(selector)].map((el,index)=>{
     const b=el.getBoundingClientRect(),s=getComputedStyle(el),frame=getComputedStyle(el,'::before');
     return {key:selector+':'+index,width:b.width,height:b.height,color:s.color,background:s.backgroundColor,image:s.backgroundImage,frame:frame.borderImageSource,
      disabled:el.disabled,text:el.textContent,outline:s.outlineStyle};
    })),selectors);
    for(const row of rows){
     assert.ok(row.width>=44&&row.height>=44,JSON.stringify(row));report.checks++;
     const key=`${width}/${name}/${row.key}`;report.geometry[key]=row;
     if(phase==='after'){
      assert.ok(row.frame.includes('stone-frame'),JSON.stringify(row));report.checks++;
      assert.ok(row.image.includes('stone-grain'),JSON.stringify(row));report.checks++;
      assert.equal(row.width,baseline[key].width,`${key} width unchanged`);
      assert.equal(row.height,baseline[key].height,`${key} height unchanged`);report.checks+=2;
      const ink=luminance(row.color),face=luminance(row.background),contrast=(Math.max(ink,face)+.05)/(Math.min(ink,face)+.05);
      assert.ok(contrast>=4.5,`${key}: base text contrast ${contrast}`);report.checks++;
     }
    }
   }
   const resources=await page.locator('#hud .resource,#player-progress').evaluateAll(els=>els.map(el=>{const s=getComputedStyle(el);return {id:el.id||el.className,background:s.backgroundColor,color:s.color,frame:getComputedStyle(el,'::before').borderImageSource};}));
   const resourceKey=`${width}/resources`;report.geometry[resourceKey]=resources;
   if(phase==='after'){assert.deepEqual(resources,baseline[resourceKey],'Resource counters unchanged');report.checks++;}
   const line=await page.locator('#hud').evaluate(el=>{const h=el.getBoundingClientRect();return {top:h.top,bottom:h.bottom,scroll:el.scrollWidth,width:el.clientWidth,
    nav:[...el.querySelectorAll('nav button')].map(b=>{const r=b.getBoundingClientRect();return {id:b.id,x:r.x,right:r.right,top:r.top,bottom:r.bottom};})};});
   assert.ok(line.scroll<=line.width);assert.deepEqual(line.nav.map(b=>b.id),['recenter-view','open-photo','open-settings']);report.checks+=2;
   for(const b of line.nav){assert.ok(b.top>=line.top&&b.bottom<=line.bottom&&b.right<=width);report.checks++;}
   const capture=async name=>{const file=path.join(output,`${phase}-${width}x${height}-${name}.png`);await page.screenshot({path:file});report.screenshots.push(file);};
   await inspect('main',['#hud nav button','#open-missions','#meadow-actions>button:not([hidden])']);await capture('main');
   await page.click('#open-shop');await inspect('shop',['.shop-category button','#close-panel']);await capture('shop');
   await page.getByRole('button',{name:'Bâtiments et décorations',exact:true}).click();await page.getByRole('button',{name:'Décorations',exact:true}).click();
   const disabled=page.locator('[data-catalog="hay-bale"] button:disabled').first();
   await disabled.scrollIntoViewIfNeeded();assert.equal(await disabled.isDisabled(),true);report.checks++;
   await inspect('disabled',['[data-catalog="hay-bale"] button:disabled']);await capture('disabled');
   const inventory=page.locator('[data-catalog="bush"]').getByRole('button',{name:'Acheter pour l’inventaire · 20 pièces',exact:true});
   await inventory.scrollIntoViewIfNeeded();await inspect('purchase',['[data-catalog="bush"] button']);await inventory.click();
   await page.locator('#game-dialog[open]').waitFor();await inspect('dialog',['#game-dialog button']);
   if(phase==='after'){
    const confirm=page.locator('#game-dialog').getByRole('button',{name:'Confirmer',exact:true});
    const cancel=page.locator('#game-dialog').getByRole('button',{name:'Annuler',exact:true});
    assert.notEqual(await confirm.evaluate(el=>getComputedStyle(el).backgroundColor),await cancel.evaluate(el=>getComputedStyle(el).backgroundColor));report.checks++;
    await confirm.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');
    assert.equal(await confirm.evaluate(el=>getComputedStyle(el).outlineStyle),'solid');report.checks++;
    const box=await confirm.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
    const pressed=await confirm.evaluate(el=>({color:getComputedStyle(el).backgroundColor,frame:getComputedStyle(el,'::before').filter}));
    assert.notEqual(pressed.color,report.geometry[`${width}/dialog/#game-dialog button:0`].background);report.checks++;
    await capture('pressed');await page.mouse.move(0,0);await page.mouse.up();await confirm.blur();
   }
   await capture('dialog');await page.locator('#game-dialog').getByRole('button',{name:'Annuler',exact:true}).click();
   assert.equal(await page.locator('#pattes').textContent(),'300');report.checks++;
   await page.close();
  }
  assert.deepEqual(report.errors,[]);report.checks++;
  if(phase==='before')fs.writeFileSync(baselinePath,JSON.stringify(report.geometry,null,2));
  fs.writeFileSync(path.join(output,phase+'-report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({phase,checks:report.checks,captures:report.screenshots.length,path:output,passed:true}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
