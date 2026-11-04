// Reuses only the mouth from the approved image_gen edit, registered onto the approved evolved master.
import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {decode, encode} from './png-rgba.mjs';
import {resizeRegion} from './resize-rgba.mjs';
process.chdir(fileURLToPath(new URL('..', import.meta.url)));
const master = decode(readFileSync('assets-source/rabbits/dragon/dragon-evolution-sprite.png'));
const original = decode(readFileSync('assets-source/rabbits/dragon/dragon-evolution-source.png'));
const edit = decode(readFileSync(process.argv[2]));
// The crop is offset inside the square source. Find its integer registration by colour-matching unchanged opaque areas.
let best = {score: Infinity, x: 0, y: 0};
for (let oy = 0; oy <= 230; oy++) for (let ox = 0; ox <= 230; ox++) {
  let score = 0, n = 0;
  for (let y = 80; y < master.height - 80; y += 19) for (let x = 40; x < master.width - 40; x += 19) {
    if (x > master.width * .76 && y > master.height * .28 && y < master.height * .72) continue;
    const a = (y * master.width + x) * 4, b = ((y + oy) * original.width + x + ox) * 4;
    if (master.rgba[a + 3] < 245 || b + 3 >= original.rgba.length) continue;
    for (let c = 0; c < 3; c++) score += Math.abs(master.rgba[a + c] - original.rgba[b + c]); n++;
  }
  score /= Math.max(1, n * 3); if (score < best.score) best = {score, x: ox, y: oy};
}
if (best.score > 18) throw Error(`Registration is not reliable (${JSON.stringify(best)})`);
const result = Buffer.from(master.rgba), at = (x, y) => (y * edit.width + x) * 4;
// Box measured around the evolved snout in master pixels; feather only the left/top seams.
const BOX = {x0: 830, y0: 360, x1: master.width, y1: 610}, FEATHER = 8;
for (let y = BOX.y0; y < Math.min(BOX.y1, master.height); y++) for (let x = BOX.x0; x < master.width; x++) {
  const sx = x + best.x, sy = y + best.y, i = (y * master.width + x) * 4, j = at(sx, sy);
  const [r,g,b] = edit.rgba.subarray(j,j+3), alpha = Math.max(0, Math.min(1, (250 - Math.min(r,g,b)) / 45));
  if (alpha < .08) continue;
  const unmix = c => Math.max(0,Math.min(255,(c-(1-alpha)*255)/alpha));
  const weight = Math.min(1,(x-BOX.x0)/FEATHER,(y-BOX.y0)/FEATHER), outAlpha = alpha*255*weight + result[i+3]*(1-weight);
  if (!outAlpha) continue;
  for (let c=0;c<3;c++) result[i+c]=Math.round((unmix(edit.rgba[j+c])*alpha*255*weight+result[i+c]*result[i+3]*(1-weight))/outAlpha);
  result[i+3]=Math.round(outAlpha);
}
writeFileSync('assets-source/rabbits/dragon/mouth-open-evolution.png',encode({width:master.width,height:master.height,rgba:result}));
const runtime = decode(readFileSync('public/assets/rabbits/dragon/dragon-v2.png'));
const resized = resizeRegion({width:master.width,height:master.height,pixels:result},master.width,master.height,runtime.width,runtime.height);
const base = decode(readFileSync('public/assets/rabbits/dragon/dragon-v2-body.png'));
const opened = Buffer.from(base.rgba), scale = runtime.width / master.width;
const wing = [[0,445],[25,350],[90,260],[190,175],[300,110],[405,90],[470,112],[490,155],[478,220],[452,300],[425,390],[388,475],[340,530],[260,540],[160,520],[70,490]];
const inside = (x,y,polygon) => { let hit=false; for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const [xi,yi]=polygon[i],[xj,yj]=polygon[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)hit=!hit;} return hit; };
for(let y=0;y<runtime.height;y++) for(let x=0;x<runtime.width;x++) {
  const i=(y*runtime.width+x)*4, px=(x+.5)/scale, py=(y+.5)/scale;
  if(inside(px,py,wing)){opened.fill(0,i,i+4);continue;}
  const changed = resized.pixels[i+3] !== runtime.rgba[i+3] || resized.pixels[i] !== runtime.rgba[i] || resized.pixels[i+1] !== runtime.rgba[i+1] || resized.pixels[i+2] !== runtime.rgba[i+2];
  if(changed) resized.pixels.copy(opened,i,i,i+4);
}
writeFileSync('public/assets/rabbits/dragon/dragon-v2-mouth-open-body.png',encode({width:runtime.width,height:runtime.height,rgba:opened}));
console.log(JSON.stringify({registration:{scale:1,offset:{x:best.x,y:best.y},score:best.score},box:BOX,pad:0,runtime:[runtime.width,runtime.height]}));
