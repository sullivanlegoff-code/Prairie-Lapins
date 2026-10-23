import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {expect, it} from 'vitest';
import {HABITAT_TYPES} from '../src/config/habitats';
import {VOL_LEVEL2_ART as art, VOL_LEVEL2_LAYOUT as layout, METAL_LEVEL2_ART, NEIGE_LEVEL2_ART, FEU_LEVEL2_ART, NEIGE_LEVEL3_ART, FEU_LEVEL3_ART, METAL_LEVEL3_ART, VOL_LEVEL3_ART, PAILLE_LEVEL3_ART, PAILLE_LEVEL2_ART, UNIVERSAL_LEVEL2_ART, UNIVERSAL_LEVEL3_ART, HABITAT_LEVEL1_ART, HABITAT_ART_LIST, habitatArtFor, habitatArtLayout} from '../src/config/habitatArt';
import {HABITAT_SIZE_PROPOSAL} from '../src/config/habitatSizes';
import {VISUAL} from '../src/config/visual';
import {allowedBox, createRabbitMotion, stepRabbitMotion} from '../src/display/rabbitMotion';
import {decodePng} from '../scripts/derive-nursery-overlays.mjs';
import {SOURCE_DIR, HABITAT_SOURCES, sourceName, cropAndHalve} from '../scripts/derive-habitat-art.mjs';

const image = decodePng(readFileSync(new URL('../public/assets/habitats/habitat-vol-level2.png', import.meta.url)));

it('selects Escale des vents only for Vol level 2 / tier 2, preserving every other drawing and fallback', () => {
  for (const type of HABITAT_TYPES) for (const level of [1, 2, 3]) for (const tier of [undefined, 1, 2, 3]) {
    const level2 = {vol: art, paille: PAILLE_LEVEL2_ART, metal: METAL_LEVEL2_ART, neige: NEIGE_LEVEL2_ART, feu: FEU_LEVEL2_ART, universal: UNIVERSAL_LEVEL2_ART}[type] ?? null;
    expect(habitatArtFor({type, level}, tier)).toBe(level === 3 && tier === 3 ? ({neige: NEIGE_LEVEL3_ART, feu: FEU_LEVEL3_ART, metal: METAL_LEVEL3_ART, vol: VOL_LEVEL3_ART, paille: PAILLE_LEVEL3_ART, universal: UNIVERSAL_LEVEL3_ART}[type] ?? null) : level === 2 && tier === 2 ? level2 : level === 1 && (tier ?? 1) === 1 ? HABITAT_LEVEL1_ART[type] : null);
  }
  expect(HABITAT_ART_LIST.filter(a => a === art)).toHaveLength(1);
  expect(habitatArtLayout(art)).toBe(layout);
  expect(art.texture).toBe('habitat-level2-vol');
  expect(art.url).toBe(`${import.meta.env.BASE_URL}assets/habitats/habitat-vol-level2.png`);
});

it('ships an exact half-size crop of the approved source at the common scale, preserving its original lateral edges', () => {
  const source = readFileSync(join(SOURCE_DIR, sourceName('volLevel2'))), original = decodePng(source);
  expect(createHash('sha1').update('blob ' + source.length + '\0').update(source).digest('hex')).toBe('c94d0a971f8643b390ce7620a8182855b34c01a2');
  expect([original.width, original.height]).toEqual([1254, 1254]);
  expect(art.source.crop).toEqual(HABITAT_SOURCES.volLevel2.crop);
  expect(image.pixels.equals(cropAndHalve(original, art.source.crop).pixels)).toBe(true);
  expect([image.width, image.height, art.width, art.height]).toEqual([627, 460, 627, 460]);
  expect(art.anchor).toEqual({x: 627 / 2, y: (750 - 144) / 2});
  expect(art.worldWidth / art.width).toBeCloseTo(560 / 1254, 10);
  // The approved drawing already reaches the source's right edge: retain every column, without inventing a transparent border.
  expect(art.source.crop.x).toBe(0); expect(art.source.crop.width).toBe(original.width);
  for (let x = 0; x < image.width; x++) for (const y of [0, image.height - 1]) expect(image.pixels[(y * image.width + x) * 4 + 3]).toBeLessThanOrEqual(8);
});

it('keeps five places and their entire walking boxes on the lawn, clear of the shelter, gazebo and front gate', () => {
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
      // Conservative bare-lawn rectangle measured in original source pixels.
      expect(px * 2).toBeGreaterThanOrEqual(350); expect(px * 2).toBeLessThanOrEqual(915);
      expect(py * 2 + 144).toBeGreaterThanOrEqual(660); expect(py * 2 + 144).toBeLessThanOrEqual(835);
      const i = (py * image.width + px) * 4, [r, g, b, a] = image.pixels.subarray(i, i + 4);
      expect(a).toBeGreaterThanOrEqual(224);
      expect(r, `lawn at ${px},${py}`).toBeGreaterThan(110); expect(g).toBeGreaterThan(130); expect(b).toBeGreaterThan(50);
      expect(g - r).toBeGreaterThan(-20); expect(g - b).toBeGreaterThan(25);
    }
  }
});

it('lets all five residents walk inside their lawn boxes over five simulated minutes', () => {
  const motions = layout.slots.map((slot, i) => createRabbitMotion(`rabbit-${i + 10}`, slot, 5, layout)), walks = motions.map(() => 0);
  for (let t = 0; t < 300_000; t += 100) for (const [i, m] of motions.entries()) {
    const previous = m.mode;
    stepRabbitMotion(m, 100, motions.filter(o => o !== m).flatMap(o => o.mode === 'walk' ? [o.local, o.to] : [o.local]));
    if (m.mode === 'walk' && previous !== 'walk') walks[i]++;
    const b = allowedBox(m.home, 5, layout);
    expect(m.local.x).toBeGreaterThanOrEqual(b.minX); expect(m.local.x).toBeLessThanOrEqual(b.maxX);
    expect(m.local.y).toBeGreaterThanOrEqual(b.minY); expect(m.local.y).toBeLessThanOrEqual(b.maxY);
  }
  for (const count of walks) expect(count).toBeGreaterThan(0);
});
