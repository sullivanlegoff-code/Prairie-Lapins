// node docs/web-app-browser-check.cjs <build-directory> <base>
// Serves the compiled artifact locally. Safe areas are simulated CSS values, not an iPhone test.
const {chromium}=require('playwright');
const {createServer}=require('node:http');
const {readFileSync,existsSync,statSync}=require('node:fs');
const {resolve,sep,extname}=require('node:path');
const assert=require('node:assert/strict');
(async()=>{
 const root=resolve(process.argv[2]),base=process.argv[3];assert.ok(base.startsWith('/')&&base.endsWith('/'));
 const server=createServer((req,res)=>{
  const pathname=new URL(req.url,'http://local.invalid').pathname;
  if(!pathname.startsWith(base)){res.writeHead(404).end();return;}
  let file=resolve(root,decodeURIComponent(pathname.slice(base.length))||'index.html');
  if(file!==root&&!file.startsWith(root+sep)){res.writeHead(403).end();return;}
  if(existsSync(file)&&statSync(file).isDirectory())file=resolve(file,'index.html');
  if(!existsSync(file)){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webmanifest':'application/manifest+json'})[extname(file)]||'application/octet-stream');
  res.end(readFileSync(file));
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch();let checks=0;
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+base);
  const link=await page.locator('link[rel=manifest]').getAttribute('href');
  assert.equal(link,base+'assets/app/manifest.webmanifest');checks++;
  const response=await page.request.get(origin+link);assert.equal(response.status(),200);checks++;
  assert.match(response.headers()['content-type'],/manifest\+json/);checks++;
  const manifest=await response.json();assert.equal(manifest.display,'standalone');checks++;
  for(const key of ['id','start_url','scope']){assert.equal(new URL(manifest[key],origin+link).pathname,base);checks++;}
  const cdp=await page.context().newCDPSession(page);
  const parsed=await cdp.send('Page.getAppManifest');assert.deepEqual(parsed.errors,[]);checks++;
  for(const [name,value] of Object.entries({'apple-mobile-web-app-capable':'yes','mobile-web-app-capable':'yes','apple-mobile-web-app-title':'Prairie de lapins','apple-mobile-web-app-status-bar-style':'default'})){
   assert.equal(await page.locator(`meta[name="${name}"]`).getAttribute('content'),value);checks++;
  }
  for(const size of [180,192,512]){
   const url=origin+base+'assets/app/'+(size===180?'apple-touch-icon.png':`icon-${size}.png`);
   const imageResponse=await page.request.get(url);assert.equal(imageResponse.status(),200);checks++;
   const dimensions=await page.evaluate(async url=>{
    const img=new Image();img.src=url;await img.decode();const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;
    const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);const rgba=ctx.getImageData(0,0,img.width,img.height).data;
    return {width:img.width,height:img.height,opaque:rgba.every((value,index)=>index%4!==3||value===255)};
   },url);
   assert.deepEqual(dimensions,{width:size,height:size,opaque:true});checks++;
  }
  for(const [width,height,insets] of [[390,844,{top:59,right:0,bottom:34,left:0}],[844,390,{top:0,right:59,bottom:21,left:59}]]){
   await page.setViewportSize({width,height});await page.reload();
   await page.waitForFunction(()=>document.querySelector('#save-status')?.dataset.status==='saved');
   if(await page.locator('#continue-portrait').isVisible())await page.click('#continue-portrait');
   // Re-evaluate the actual compiled stylesheet using numeric stand-ins for device env().
   const css=await page.locator('link[rel=stylesheet]').getAttribute('href');
   let text=await (await page.request.get(origin+css)).text();
   for(const [edge,value] of Object.entries(insets))text=text.replaceAll(`env(safe-area-inset-${edge})`,`${value}px`);
   await page.addStyleTag({content:text});await page.waitForTimeout(100);
   const hud=await page.locator('#hud').boundingBox();
   for(const id of ['player-progress','open-hearts','recenter-view','open-photo','open-settings','open-missions','open-shop','open-arrange','open-collection']){
    const box=await page.locator('#'+id).boundingBox();assert.ok(box&&box.x>=insets.left&&box.y>=insets.top&&box.x+box.width<=width-insets.right&&box.y+box.height<=height-insets.bottom,`${width}: ${id}: ${JSON.stringify(box)}`);checks++;
    if(id==='open-missions') {assert.ok(box.y>=hud.y+hud.height,JSON.stringify({hud,box,width,insets}));checks++;}
   }
   const tutorial=await page.locator('#tutorial').boundingBox();assert.ok(tutorial.y+tutorial.height<=height-insets.bottom);checks++;
   assert.equal(await page.locator('#app').evaluate(el=>getComputedStyle(el).overscrollBehavior),'none');checks++;
   assert.equal(await page.locator('#game canvas').evaluate(el=>getComputedStyle(el).touchAction),'none');checks++;
   assert.equal(await page.locator('#open-shop').evaluate(el=>getComputedStyle(el).userSelect),'none');checks++;
   await page.click('#open-shop');await page.getByRole('button',{name:'Recettes de lapins',exact:true}).click();
   await page.locator('#panel-content').hover();await page.mouse.wheel(0,250);
   await page.waitForFunction(()=>document.querySelector('#panel-content').scrollTop>0);checks++;
   assert.equal(await page.locator('#panel-content').evaluate(el=>getComputedStyle(el).touchAction),'pan-y');checks++;
  }
  assert.equal(await page.evaluate(async()=>('serviceWorker'in navigator)?(await navigator.serviceWorker.getRegistrations()).length:0),0);checks++;
  await page.goto(origin+base+'dev/');await page.waitForFunction(()=>document.querySelector('#save-status')?.dataset.status==='saved');
  assert.equal(await page.locator('link[rel=manifest]').count(),0);checks++;
  assert.equal(await page.locator('meta[name="apple-mobile-web-app-capable"]').count(),0);checks++;
  assert.equal(await page.locator('link[rel=apple-touch-icon]').count(),0);checks++;
  assert.equal(await page.locator('#dev-badge').isVisible(),true);checks++;
  assert.deepEqual(errors,[]);checks++;
  console.log(JSON.stringify({base,checks,passed:true,browser:'Chromium; simulated safe areas, not physical iPhone'}));
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
