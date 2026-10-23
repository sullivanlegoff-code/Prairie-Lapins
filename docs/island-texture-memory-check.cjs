// Measures the GPU memory of the generated terrain textures on the maximal island (laboratory
const enterGame=require('./check-camera.cjs').enter; // loading screen: press « Jouer » after each page load
// "islandFull"), from the real WebGL uploads: every texImage2D call whose source is a canvas
// (generated textures; artwork comes from <img>) is tracked per WebGLTexture until deleteTexture,
// so the total is what stays resident. RGBA8 = 4 bytes per pixel, no mipmaps (non-power-of-two).
// node docs/island-texture-memory-check.cjs http://localhost:5174/ <outside-Git-directory> [label]
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const [url,directory,label='current']=process.argv.slice(2),out=path.resolve(directory);fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch(),report={url,label,views:[],errors:[]};
 try{
  for(const [width,height] of [[844,390],[390,844]]){
   const page=await browser.newPage({viewport:{width,height},hasTouch:true});page.on('pageerror',e=>report.errors.push(e.message));page.on('dialog',d=>d.accept());
   await page.addInitScript(()=>{
    // Resident textures: the size last uploaded into each WebGLTexture, until it is deleted.
    window.__resident=new Map();
    for(const proto of [WebGLRenderingContext.prototype,typeof WebGL2RenderingContext==='undefined'?null:WebGL2RenderingContext.prototype].filter(Boolean)){
     const upload=proto.texImage2D,remove=proto.deleteTexture;
     proto.texImage2D=function(...args){const source=args[5],texture=this.getParameter(this.TEXTURE_BINDING_2D);if(texture)window.__resident.set(texture,source instanceof HTMLCanvasElement?{width:source.width,height:source.height}:null);return upload.apply(this,args);};
     proto.deleteTexture=function(texture){window.__resident.delete(texture);return remove.call(this,texture);};
    }
   });
   await page.addLocatorHandler(page.locator('#player-level-dialog'),()=>page.click('#continue-level-up'));
   await page.goto(new URL('dev/',url).href);await enterGame(page);await page.waitForFunction(()=>document.querySelector('#save-status')?.dataset.status==='saved');await page.waitForLoadState('networkidle');
   if(await page.locator('#continue-portrait').isVisible())await page.click('#continue-portrait');
   await page.click('#open-settings');await page.click('#dev-scenario-islandFull');await page.click('#close-panel');
   await page.evaluate(()=>new Promise(r=>setTimeout(r,800)));
   const uploads=await page.evaluate(()=>[...window.__resident.values()].filter(Boolean));
   // Terrain textures are the large generated canvases (one per acquired parcel).
   const terrain=uploads.filter(u=>u.width>=1000&&u.height>=1000),bytes=terrain.reduce((n,u)=>n+u.width*u.height*4,0);
   report.views.push({width,height,parcelTextures:terrain.length,sizes:[...new Set(terrain.map(u=>`${u.width}×${u.height}`))],bytes,megabytes:+(bytes/1e6).toFixed(2),mebibytes:+(bytes/2**20).toFixed(2)});
   await page.close();
  }
 }finally{fs.writeFileSync(path.join(out,`texture-memory-${label}.json`),JSON.stringify(report,null,1));await browser.close();}
 for(const v of report.views)console.log(`${label} ${v.width}x${v.height}: ${v.parcelTextures} textures ${v.sizes.join(',')} = ${v.megabytes} Mo (${v.mebibytes} Mio)`);
 if(report.errors.length)console.log('errors',report.errors);
})().catch(e=>{console.error(e);process.exitCode=1;});
