import {expect, it} from 'vitest';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {DECORATION_IDS} from '../src/config/decorations';
import {decodePng} from '../scripts/derive-nursery-overlays.mjs';
it('covers the full catalogue with compact transparent painted textures', () => {
 const manifest=JSON.parse(readFileSync('scripts/decoration-art-manifest.json','utf8'));
 expect(Object.keys(manifest).sort()).toEqual([...DECORATION_IDS].sort());
 for (const id of DECORATION_IDS) {
  const image=decodePng(readFileSync(`public/assets/decorations/${id}.png`));
  expect(Math.max(image.width,image.height)).toBeLessThanOrEqual(320);
  expect(image.pixels.some((value,index)=>index%4===3&&value===0)).toBe(true);
  expect(image.pixels.some((value,index)=>index%4===3&&value>=250)).toBe(true);
 }
});
it('verifies every approved decoration source and derivative SHA-1', () => {
 expect(() => execFileSync(process.execPath, ['scripts/derive-decoration-art.mjs', '--check'], {encoding:'utf8'})).not.toThrow();
}, 30000);
