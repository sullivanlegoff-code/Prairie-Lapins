import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {expect, it} from 'vitest';
import {HABITAT_TYPES} from '../src/config/habitats';
import {NEIGE_LEVEL3_ART as art, NEIGE_LEVEL3_LAYOUT as layout, NEIGE_LEVEL2_ART, FEU_LEVEL2_ART, METAL_LEVEL2_ART, VOL_LEVEL2_ART, FEU_LEVEL3_ART, METAL_LEVEL3_ART, VOL_LEVEL3_ART, PAILLE_LEVEL3_ART, PAILLE_LEVEL2_ART, UNIVERSAL_LEVEL2_ART, UNIVERSAL_LEVEL3_ART, HABITAT_LEVEL1_ART, HABITAT_ART_LIST, habitatArtFor, habitatArtLayout} from '../src/config/habitatArt';
import {HABITAT_SIZE_PROPOSAL, habitatProposalWorldSize} from '../src/config/habitatSizes';
import {VISUAL} from '../src/config/visual';
import {allowedBox, createRabbitMotion, stepRabbitMotion} from '../src/display/rabbitMotion';
import {decodePng} from '../scripts/derive-nursery-overlays.mjs';
import {SOURCE_DIR, HABITAT_SOURCES, sourceName, cropAndHalve} from '../scripts/derive-habitat-art.mjs';

const image = decodePng(readFileSync(new URL('../public/assets/habitats/habitat-neige-level3.png', import.meta.url)));

it('selects Grand Jardin d’hiver only for Neige level 3 / tier 3, preserving all existing illustrations and compact fallbacks', () => {
  for (const type of HABITAT_TYPES) for (const level of [1, 2, 3]) for (const tier of [undefined, 1, 2, 3]) {
    const level2 = {neige: NEIGE_LEVEL2_ART, feu: FEU_LEVEL2_ART, metal: METAL_LEVEL2_ART, vol: VOL_LEVEL2_ART, paille: PAILLE_LEVEL2_ART, universal: UNIVERSAL_LEVEL2_ART}[type] ?? null;
    const expected = level === 3 && tier === 3 ? ({neige: art, feu: FEU_LEVEL3_ART, metal: METAL_LEVEL3_ART, vol: VOL_LEVEL3_ART, paille: PAILLE_LEVEL3_ART, universal: UNIVERSAL_LEVEL3_ART}[type] ?? null) : level === 2 && tier === 2 ? level2 : level === 1 && (tier ?? 1) === 1 ? HABITAT_LEVEL1_ART[type] : null;
    expect(habitatArtFor({type, level}, tier)).toBe(expected);
  }
  expect(HABITAT_ART_LIST.filter(a => a === art)).toHaveLength(1);
  expect(habitatArtLayout(art)).toBe(layout);
  expect(art.texture).toBe('habitat-level3-neige');
  expect(art.url).toBe(`${import.meta.env.BASE_URL}assets/habitats/habitat-neige-level3.png`);
});

it('ships the approved source as an exact half-size crop, uniformly spanning the 352-world-unit footprint width', () => {
  const source = readFileSync(join(SOURCE_DIR, sourceName('neigeLevel3'))), original = decodePng(source);
  expect(createHash('sha1').update('blob ' + source.length + '\0').update(source).digest('hex')).toBe('2848638fea1d2ba8dc00e487084eb7be4132e494');
  expect([original.width, original.height]).toEqual([1254, 1254]);
  expect(art.source.crop).toEqual(HABITAT_SOURCES.neigeLevel3.crop);
  expect(image.pixels.equals(cropAndHalve(original, art.source.crop).pixels)).toBe(true);
  expect([image.width, image.height, art.width, art.height]).toEqual([627, 487, 627, 487]);
  expect(art.anchor).toEqual({x: 627 / 2, y: (780 - 128) / 2});
  expect(art.worldWidth).toBe(habitatProposalWorldSize(3).width);
  expect(art.worldWidth / art.width).toBeCloseTo(704 / 1254, 10);
  // The original reaches both lateral edges: retain the full width without retouching those edges.
  expect(art.source.crop.x).toBe(0); expect(art.source.crop.width).toBe(original.width);
  for (let x = 0; x < image.width; x++) for (const y of [0, image.height - 1]) expect(image.pixels[(y * image.width + x) * 4 + 3]).toBeLessThanOrEqual(8);
});

it('uses seven well-spaced places and walking boxes entirely on courtyard snow, below the conservatory and above the gate', () => {
  expect(layout.slots).toHaveLength(7);
  expect(new Set(layout.slots.map(p => `${p.x},${p.y}`)).size).toBe(7);
  expect(HABITAT_SIZE_PROPOSAL[3].footprint).toEqual({width: 8, depth: 6});
  expect(layout.roamScale).toBe(HABITAT_SIZE_PROPOSAL[3].roamScale);
  expect(VISUAL.rabbit.scale).toBe(1.3);
  const k = art.worldWidth / art.width;
  for (const [index, slot] of layout.slots.entries()) {
    for (const other of layout.slots.slice(index + 1)) expect(Math.hypot(slot.x - other.x, slot.y - other.y)).toBeGreaterThanOrEqual(52);
    const box = allowedBox(slot, 7, layout);
    for (let y = box.minY; y <= box.maxY; y += 2) for (let x = box.minX; x <= box.maxX; x += 2) {
      const px = Math.round(art.anchor.x + x / k), py = Math.round(art.anchor.y + y / k);
      // Hand-measured conservative rectangles on the bare snow, away from the side flower beds and front gate pillars.
      expect(px * 2).toBeGreaterThanOrEqual(slot.y < 0 ? 300 : 220);
      expect(px * 2).toBeLessThanOrEqual(slot.y < 0 ? 950 : 1040);
      expect(py * 2 + 128).toBeGreaterThanOrEqual(slot.y < 0 ? 640 : 810);
      expect(py * 2 + 128).toBeLessThanOrEqual(slot.y < 0 ? 710 : 880);
      const i = (py * image.width + px) * 4, [r, g, b, a] = image.pixels.subarray(i, i + 4);
      expect(a).toBeGreaterThanOrEqual(224);
      expect(Math.min(r, g, b), `snow at ${px},${py}`).toBeGreaterThan(180);
      expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeLessThan(65);
    }
  }
});

it('lets all seven residents walk inside their snow courtyard boxes over five simulated minutes', () => {
  const motions = layout.slots.map((slot, i) => createRabbitMotion(`rabbit-${i + 10}`, slot, 7, layout)), walks = motions.map(() => 0);
  for (let t = 0; t < 300_000; t += 100) for (const [i, m] of motions.entries()) {
    const previous = m.mode;
    stepRabbitMotion(m, 100, motions.filter(o => o !== m).flatMap(o => o.mode === 'walk' ? [o.local, o.to] : [o.local]));
    if (m.mode === 'walk' && previous !== 'walk') walks[i]++;
    const b = allowedBox(m.home, 7, layout);
    expect(m.local.x).toBeGreaterThanOrEqual(b.minX); expect(m.local.x).toBeLessThanOrEqual(b.maxX);
    expect(m.local.y).toBeGreaterThanOrEqual(b.minY); expect(m.local.y).toBeLessThanOrEqual(b.maxY);
  }
  for (const count of walks) expect(count).toBeGreaterThan(0);
});
