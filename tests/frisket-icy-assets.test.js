import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {expect, it} from 'vitest';
import {SPECIES} from '../src/config/species';
import {NEW_RARES} from './rabbit-art-fixtures';

it.each(NEW_RARES.map(r=>[r.id,r.source,r.sourceSha256,r.art.width,r.art.height,r.foot]))('%s (%s) keeps the approved master bytes and publishes the useful pixel dimensions', (id,approved,approvedSha256,width,height,foot)=>{
  const art=SPECIES[id].art;
  expect(art.kind).toBe('static-sprite');
  const png=readFileSync(new URL(`../public/${art.file}`,import.meta.url));
  expect([png.readUInt32BE(16),png.readUInt32BE(20)]).toEqual([width,height]);
  const master=readFileSync(new URL(`../assets-source/rabbits/${id}/sprite.png`,import.meta.url));
  expect(createHash('sha256').update(master).digest('hex')).toBe(approvedSha256);
  // Measured alpha > 200 foot rows; these anchors land near Paille/Neige's 11.5 local units.
  const contact=art.groundY-(master.readUInt32BE(20)-foot)*art.worldWidth/master.readUInt32BE(16);
  expect(contact).toBeGreaterThan(11);expect(contact).toBeLessThan(12);
});
