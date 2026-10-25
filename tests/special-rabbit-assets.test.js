import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {expect, it} from 'vitest';
import {SPECIES} from '../src/config/species';
import {NEW_SPECIALS} from './rabbit-art-fixtures';

// Epics and Legendaries approved on 25 October 2026 (the Rares are covered by frisket-icy-assets.test.js).
it.each(NEW_SPECIALS.filter(s => s.art.kind === 'static-sprite').map(s => [s.id, s]))('%s keeps its approved master and publishes useful dimensions', (id, sheet) => {
  const art = SPECIES[id].art;
  expect(art.kind).toBe('static-sprite');
  const png = readFileSync(new URL(`../public/${art.file}`, import.meta.url));
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([sheet.art.width, sheet.art.height]);
  const master = readFileSync(new URL(`../assets-source/rabbits/${id}/sprite.png`, import.meta.url));
  expect(createHash('sha256').update(master).digest('hex')).toBe(sheet.sourceSha256);
  // The foot row (alpha > 200) lands where Paille and Neige touch the ground.
  const contact = art.groundY - (master.readUInt32BE(20) - sheet.foot) * art.worldWidth / master.readUInt32BE(16);
  expect(contact).toBeGreaterThan(11); expect(contact).toBeLessThan(12);
});
