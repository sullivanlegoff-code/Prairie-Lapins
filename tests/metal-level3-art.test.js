import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {expect, it} from 'vitest';
import {HABITAT_TYPES} from '../src/config/habitats';
import {METAL_LEVEL3_ART as art, METAL_LEVEL3_LAYOUT as layout, NEIGE_LEVEL3_ART, FEU_LEVEL3_ART, NEIGE_LEVEL2_ART, FEU_LEVEL2_ART, METAL_LEVEL2_ART, VOL_LEVEL2_ART, VOL_LEVEL3_ART, PAILLE_LEVEL3_ART, PAILLE_LEVEL2_ART, UNIVERSAL_LEVEL2_ART, UNIVERSAL_LEVEL3_ART, HABITAT_LEVEL1_ART, HABITAT_ART_LIST, habitatArtFor, habitatArtLayout} from '../src/config/habitatArt';
import {HABITAT_SIZE_PROPOSAL} from '../src/config/habitatSizes';
import {VISUAL} from '../src/config/visual';
import {allowedBox, createRabbitMotion, stepRabbitMotion} from '../src/display/rabbitMotion';
import {decodePng} from '../scripts/derive-nursery-overlays.mjs';
import {SOURCE_DIR, HABITAT_SOURCES, sourceName, cropAndHalve} from '../scripts/derive-habitat-art.mjs';

const image = decodePng(readFileSync(new URL('../public/assets/habitats/habitat-metal-level3.png', import.meta.url)));

it('selects Domaine des rouages only for Métal level 3 / tier 3, preserving all previous drawings and compact fallbacks', () => {
  for (const type of HABITAT_TYPES) for (const level of [1, 2, 3]) for (const tier of [undefined, 1, 2, 3]) {
    const level2 = {neige: NEIGE_LEVEL2_ART, feu: FEU_LEVEL2_ART, metal: METAL_LEVEL2_ART, vol: VOL_LEVEL2_ART, paille: PAILLE_LEVEL2_ART, universal: UNIVERSAL_LEVEL2_ART}[type] ?? null;
    const level3 = {neige: NEIGE_LEVEL3_ART, feu: FEU_LEVEL3_ART, metal: art, vol: VOL_LEVEL3_ART, paille: PAILLE_LEVEL3_ART, universal: UNIVERSAL_LEVEL3_ART}[type] ?? null;
    expect(habitatArtFor({type, level}, tier)).toBe(level === 3 && tier === 3 ? level3 : level === 2 && tier === 2 ? level2 : level === 1 && (tier ?? 1) === 1 ? HABITAT_LEVEL1_ART[type] : null);
  }
  expect(HABITAT_ART_LIST.filter(a => a === art)).toHaveLength(1);
  expect(habitatArtLayout(art)).toBe(layout);
  expect(art.texture).toBe('habitat-level3-metal');
  expect(art.url).toBe(`${import.meta.env.BASE_URL}assets/habitats/habitat-metal-level3.png`);
});

it('ships the exact half-size crop of the untouched approved source at the common level-3 scale and measured anchor', () => {
  const source = readFileSync(join(SOURCE_DIR, sourceName('metalLevel3'))), original = decodePng(source);
  expect(createHash('sha1').update('blob ' + source.length + '\0').update(source).digest('hex')).toBe('4e21cba09a84ba3a5d9076cb6a16b4955d3d422c');
  expect([original.width, original.height]).toEqual([1254, 1254]);
  expect(art.source.crop).toEqual(HABITAT_SOURCES.metalLevel3.crop);
  expect(image.pixels.equals(cropAndHalve(original, art.source.crop).pixels)).toBe(true);
  expect([image.width, image.height, art.width, art.height]).toEqual([627, 451, 627, 451]);
  expect(art.anchor).toEqual({x: 627 / 2, y: (750 - 150) / 2});
  expect(art.worldWidth).toBe(352);
  expect(art.worldWidth / art.width).toBeCloseTo(704 / 1254, 10);
  // The source has only one column after the visible right edge: retain the full width, without retouching it.
  expect(art.source.crop.x).toBe(0); expect(art.source.crop.width).toBe(original.width);
  for (let x = 0; x < image.width; x++) for (const y of [0, image.height - 1]) expect(image.pixels[(y * image.width + x) * 4 + 3]).toBeLessThanOrEqual(8);
});

it('keeps seven distinct places and their whole walking boxes in the courtyard, clear of buildings, left gate and central flower pot', () => {
  expect(layout.slots).toHaveLength(7);
  expect(new Set(layout.slots.map(p => `${p.x},${p.y}`)).size).toBe(7);
  expect(HABITAT_SIZE_PROPOSAL[3].footprint).toEqual({width: 8, depth: 6});
  expect(layout.roamScale).toBe(HABITAT_SIZE_PROPOSAL[3].roamScale);
  expect(VISUAL.rabbit.scale).toBe(1.3);
  // Conservative courtyard rectangles measured on the original for the staggered back and front places.
  const safe = [[330,455,675,740], [565,690,705,770], [800,925,730,800], [275,360,745,810], [435,560,760,825], [735,860,780,840], [935,1050,780,840]];
  const k = art.worldWidth / art.width;
  for (const [index, slot] of layout.slots.entries()) {
    const box = allowedBox(slot, 7, layout), [left,right,top,bottom] = safe[index];
    for (let y = box.minY; y <= box.maxY; y += 2) for (let x = box.minX; x <= box.maxX; x += 2) {
      const px = Math.round(art.anchor.x + x / k), py = Math.round(art.anchor.y + y / k);
      expect(px * 2).toBeGreaterThanOrEqual(left); expect(px * 2).toBeLessThanOrEqual(right);
      expect(py * 2 + 150).toBeGreaterThanOrEqual(top); expect(py * 2 + 150).toBeLessThanOrEqual(bottom);
      const i = (py * image.width + px) * 4, [r,g,b,a] = image.pixels.subarray(i,i+4);
      expect(a).toBeGreaterThanOrEqual(224);
      expect(r, `courtyard at ${px},${py}`).toBeGreaterThan(140);
      expect(g).toBeGreaterThan(130); expect(b).toBeGreaterThan(80);
      expect(r-g).toBeGreaterThan(-20); expect(r-g).toBeLessThan(60); expect(b-g).toBeLessThan(15);
    }
  }
});

it('lets all seven residents walk inside their courtyard boxes for five simulated minutes', () => {
  const motions = layout.slots.map((slot,i) => createRabbitMotion(`rabbit-${i+10}`,slot,7,layout)), walks = motions.map(() => 0);
  for (let t=0; t<300_000; t+=100) for (const [i,m] of motions.entries()) {
    const previous = m.mode;
    stepRabbitMotion(m,100,motions.filter(o=>o!==m).flatMap(o=>o.mode==='walk'?[o.local,o.to]:[o.local]));
    if (m.mode==='walk' && previous!=='walk') walks[i]++;
    const b = allowedBox(m.home,7,layout);
    expect(m.local.x).toBeGreaterThanOrEqual(b.minX); expect(m.local.x).toBeLessThanOrEqual(b.maxX);
    expect(m.local.y).toBeGreaterThanOrEqual(b.minY); expect(m.local.y).toBeLessThanOrEqual(b.maxY);
  }
  for (const count of walks) expect(count).toBeGreaterThan(0);
});
