import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {expect, it} from 'vitest';
import {HABITAT_TYPES} from '../src/config/habitats';
import {NEIGE_LEVEL2_ART, NEIGE_LEVEL2_LAYOUT, FEU_LEVEL2_ART, METAL_LEVEL2_ART, VOL_LEVEL2_ART, NEIGE_LEVEL3_ART, FEU_LEVEL3_ART, METAL_LEVEL3_ART, VOL_LEVEL3_ART, PAILLE_LEVEL3_ART, PAILLE_LEVEL2_ART, UNIVERSAL_LEVEL2_ART, UNIVERSAL_LEVEL3_ART, HABITAT_LEVEL1_ART, HABITAT_ART_LIST, habitatArtFor, habitatArtLayout} from '../src/config/habitatArt';
import {HABITAT_SIZE_PROPOSAL} from '../src/config/habitatSizes';
import {VISUAL} from '../src/config/visual';
import {allowedBox, createRabbitMotion, stepRabbitMotion} from '../src/display/rabbitMotion';
import {decodePng} from '../scripts/derive-nursery-overlays.mjs';
import {SOURCE_DIR, HABITAT_SOURCES, sourceName, cropAndHalve} from '../scripts/derive-habitat-art.mjs';

const art = NEIGE_LEVEL2_ART, layout = NEIGE_LEVEL2_LAYOUT;
const image = decodePng(readFileSync(new URL('../public/assets/habitats/habitat-neige-level2.png', import.meta.url)));

it('selects Jardin des flocons only for Neige level 2 AND acquired tier 2; all other choices stay unchanged', () => {
  for (const type of HABITAT_TYPES) for (const level of [1, 2, 3]) for (const tier of [undefined, 1, 2, 3]) {
    const level2 = type === 'neige' ? art : type === 'feu' ? FEU_LEVEL2_ART : type === 'metal' ? METAL_LEVEL2_ART : type === 'vol' ? VOL_LEVEL2_ART : type === 'paille' ? PAILLE_LEVEL2_ART : type === 'universal' ? UNIVERSAL_LEVEL2_ART : null;
    const expected = level === 3 && tier === 3 ? ({neige: NEIGE_LEVEL3_ART, feu: FEU_LEVEL3_ART, metal: METAL_LEVEL3_ART, vol: VOL_LEVEL3_ART, paille: PAILLE_LEVEL3_ART, universal: UNIVERSAL_LEVEL3_ART}[type] ?? null) : level === 2 && tier === 2 ? level2 : level === 1 && (tier ?? 1) === 1 ? HABITAT_LEVEL1_ART[type] : null;
    expect(habitatArtFor({type, level}, tier)).toBe(expected);
  }
  expect(HABITAT_ART_LIST.filter(a => a === art)).toHaveLength(1);
  expect(habitatArtLayout(art)).toBe(layout);
  expect(art.texture).toBe('habitat-level2-neige');
  expect(art.url).toBe(`${import.meta.env.BASE_URL}assets/habitats/habitat-neige-level2.png`);
});

it('ships a uniformly scaled half-size crop of the untouched approved source, with its measured courtyard anchor', () => {
  const source = readFileSync(join(SOURCE_DIR, sourceName('neigeLevel2')));
  const original = decodePng(source);
  expect(createHash('sha1').update('blob ' + source.length + '\0').update(source).digest('hex')).toBe('4bbefb4c98d497d60c9a47cc7dcfac917f3132a2');
  expect([original.width, original.height]).toEqual([1254, 1254]);
  expect(art.source.crop).toEqual(HABITAT_SOURCES.neigeLevel2.crop);
  expect(image.pixels.equals(cropAndHalve(original, art.source.crop).pixels)).toBe(true);
  expect([image.width, image.height]).toEqual([623, 524]);
  expect([art.width, art.height]).toEqual([image.width, image.height]);
  expect(art.anchor).toEqual({x: (627 - 4) / 2, y: (780 - 80) / 2});
  expect(art.worldWidth / art.width).toBeCloseTo(560 / 1254, 10);
  for (let x = 0; x < image.width; x++) for (const y of [0, image.height - 1]) expect(image.pixels[(y * image.width + x) * 4 + 3]).toBeLessThanOrEqual(8);
  for (let y = 0; y < image.height; y++) for (const x of [0, image.width - 1]) expect(image.pixels[(y * image.width + x) * 4 + 3]).toBeLessThanOrEqual(8);
});

it('keeps all five resting places and their complete walking boxes on opaque courtyard snow, away from its furniture', () => {
  expect(layout.slots).toHaveLength(5);
  expect(new Set(layout.slots.map(p => `${p.x},${p.y}`)).size).toBe(5);
  expect(HABITAT_SIZE_PROPOSAL[2].footprint).toEqual({width: 6, depth: 5});
  expect(layout.roamScale).toBe(HABITAT_SIZE_PROPOSAL[2].roamScale);
  expect(VISUAL.rabbit.scale).toBe(1.3);
  const k = art.worldWidth / art.width;
  for (const slot of layout.slots) {
    const box = allowedBox(slot, 5, layout);
    for (let y = box.minY; y <= box.maxY; y += 2) for (let x = box.minX; x <= box.maxX; x += 2) {
      const px = Math.round(art.anchor.x + x / k), py = Math.round(art.anchor.y + y / k);
      // A hand-measured conservative rectangle wholly inside the courtyard, in original source pixels.
      expect(px * 2 + 4).toBeGreaterThanOrEqual(300); expect(px * 2 + 4).toBeLessThanOrEqual(950);
      expect(py * 2 + 80).toBeGreaterThanOrEqual(650); expect(py * 2 + 80).toBeLessThanOrEqual(890);
      const i = (py * image.width + px) * 4, [r, g, b, a] = image.pixels.subarray(i, i + 4);
      expect(a).toBeGreaterThanOrEqual(224);
      expect(Math.min(r, g, b), `snow at ${px},${py}`).toBeGreaterThan(180);
      expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeLessThan(65);
    }
  }
});

it('lets each of the five residents walk while staying inside its safe box for five simulated minutes', () => {
  const motions = layout.slots.map((slot, i) => createRabbitMotion(`rabbit-${i + 10}`, slot, 5, layout));
  const walks = motions.map(() => 0);
  for (let t = 0; t < 300_000; t += 100) for (const [i, m] of motions.entries()) {
    const previous = m.mode;
    stepRabbitMotion(m, 100, motions.filter(other => other !== m).flatMap(o => o.mode === 'walk' ? [o.local, o.to] : [o.local]));
    if (m.mode === 'walk' && previous !== 'walk') walks[i]++;
    const b = allowedBox(m.home, 5, layout);
    expect(m.local.x).toBeGreaterThanOrEqual(b.minX); expect(m.local.x).toBeLessThanOrEqual(b.maxX);
    expect(m.local.y).toBeGreaterThanOrEqual(b.minY); expect(m.local.y).toBeLessThanOrEqual(b.maxY);
  }
  for (const count of walks) expect(count).toBeGreaterThan(0);
});
