import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {expect, it} from 'vitest';
import {SPECIES} from '../src/config/species';
import {NEW_RARES} from './rabbit-art-fixtures';

it.each(NEW_RARES.map(r=>[r.id,r.source,r.sourceSha256,r.art.width,r.art.height,r.foot]))('%s (%s) keeps exactly the approved PNG bytes and measured pixel dimensions', (id,approved,approvedSha256,width,height,foot)=>{
  const art=SPECIES[id].art;
  expect(art.kind).toBe('static-sprite');
  const png=readFileSync(new URL(`../public/${art.file}`,import.meta.url));
  expect(createHash('sha256').update(png).digest('hex')).toBe(approvedSha256);
  expect([png.readUInt32BE(16),png.readUInt32BE(20)]).toEqual([width,height]);
  // Measured alpha > 200 foot rows; these anchors land near Paille/Neige's 11.5 local units.
  const contact=art.groundY-(height-foot)*art.worldWidth/width;
  expect(contact).toBeGreaterThan(11);expect(contact).toBeLessThan(12);
});
