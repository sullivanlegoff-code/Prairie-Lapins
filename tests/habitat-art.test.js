import {existsSync, readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
import {HABITAT_TYPES} from '../src/config/habitats';
import {HABITAT_ART_LAYOUT, HABITAT_LEVEL1_ART, HABITAT_LEVEL1_ART_LIST, HABITAT_WORLD_WIDTH_OF_SOURCE, NEIGE_LEVEL2_ART, FEU_LEVEL2_ART, METAL_LEVEL2_ART, VOL_LEVEL2_ART, NEIGE_LEVEL3_ART, FEU_LEVEL3_ART, METAL_LEVEL3_ART, VOL_LEVEL3_ART, PAILLE_LEVEL3_ART, PAILLE_LEVEL2_ART, UNIVERSAL_LEVEL2_ART, UNIVERSAL_LEVEL3_ART, habitatArtFor} from '../src/config/habitatArt';
import {HABITAT_SIZE_PROPOSAL} from '../src/config/habitatSizes';
import {NEST_ART} from '../src/config/nestArt';
import {FARM_ART} from '../src/config/farmArt';
import {decodePng} from '../scripts/derive-nursery-overlays.mjs';
import {HABITAT_SOURCES, SOURCE_DIR, derivedName, sourceName, cropAndHalve} from '../scripts/derive-habitat-art.mjs';

/** Written by hand, not read from the registry under test. Terre is gone and never illustrated. */
const SIX = ['paille', 'neige', 'feu', 'metal', 'vol', 'universal'];
const file = type => new URL(`../public/assets/habitats/habitat-${type}-level1.png`, import.meta.url);
const decoded = Object.fromEntries(SIX.map(type => [type, decodePng(readFileSync(file(type)))]));
const alphaAt = (type, x, y) => { const {width, pixels} = decoded[type]; return pixels[(Math.floor(y) * width + Math.floor(x)) * 4 + 3]; };

describe('artistic completeness of the level-1 habitats', () => {
  it('has exactly the six approved types, in the registry and in the art table, and never Terre', () => {
    expect([...HABITAT_TYPES].sort()).toEqual([...SIX].sort());
    expect(Object.keys(HABITAT_LEVEL1_ART).sort()).toEqual([...SIX].sort());
    expect(HABITAT_LEVEL1_ART_LIST.map(art => art.type).sort()).toEqual([...SIX].sort());
    expect(JSON.stringify(HABITAT_LEVEL1_ART)).not.toMatch(/terre/i); expect(existsSync(file('terre'))).toBe(false);
  });
  it('gives each type its own texture key and a deployment-relative URL to a shipped file', () => {
    expect(new Set(HABITAT_LEVEL1_ART_LIST.map(art => art.texture)).size).toBe(6);
    for (const type of SIX) {
      const art = HABITAT_LEVEL1_ART[type];
      expect(art.texture).toBe(`habitat-level1-${type}`);
      expect(art.url).toBe(`${import.meta.env.BASE_URL}assets/habitats/habitat-${type}-level1.png`);
      expect(existsSync(file(type)), type).toBe(true);
    }
  });
});

describe('the shipped files', () => {
  it.each(SIX)('%s: PNG with alpha, loaded at the configured size, cropped from the approved 1254 source at half size', type => {
    const art = HABITAT_LEVEL1_ART[type], png = readFileSync(file(type)), image = decoded[type];
    expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a'); expect(png[24]).toBe(8); expect(png[25]).toBe(6);
    expect([image.width, image.height]).toEqual([art.width, art.height]);
    expect(art.source).toMatchObject({file: `habitat-${type}-level1-v1.png`, size: 1254, reduction: 2});
    // Exactly half of an even crop that lies inside the source: a uniform reduction, so no proportion changes.
    const {crop} = art.source; expect([crop.width / 2, crop.height / 2]).toEqual([art.width, art.height]);
    expect(crop.x).toBeGreaterThanOrEqual(0); expect(crop.y).toBeGreaterThanOrEqual(0); expect(crop.x + crop.width).toBeLessThanOrEqual(1254); expect(crop.y + crop.height).toBeLessThanOrEqual(1254);
    expect(crop).toEqual(HABITAT_SOURCES[type].crop);
  });
  it.each(SIX)('%s: transparent background, nothing cut at an edge, a few pixels of air all round, one solid drawing', type => {
    const {width, height, pixels} = decoded[type];
    let x0 = width, y0 = height, x1 = -1, y1 = -1, opaque = 0, partial = 0;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const a = pixels[(y * width + x) * 4 + 3];
      if (a > 8) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      if (a >= 224) opaque++; else if (a > 8) partial++;
      if ((x === 0 || y === 0 || x === width - 1 || y === height - 1)) expect(a, `${type} edge pixel ${x},${y}`).toBeLessThanOrEqual(8);
    }
    for (const margin of [x0, y0, width - 1 - x1, height - 1 - y1]) { expect(margin).toBeGreaterThanOrEqual(2); expect(margin).toBeLessThanOrEqual(6); }
    expect(opaque).toBeGreaterThan(width * height * .4); expect(partial).toBeLessThan(opaque * .05);
    for (const [x, y] of [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]]) expect(alphaAt(type, x, y)).toBe(0);
  });
  it('is the approved illustration, only cropped and halved, from the committed approved sources (never skipped)', () => {
    for (const type of SIX) {
      const bytes = readFileSync(join(SOURCE_DIR, sourceName(type)));
      expect(createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex'), sourceName(type)).toBe(HABITAT_SOURCES[type].sha1);
      const source = decodePng(bytes);
      const derived = cropAndHalve(source, HABITAT_SOURCES[type].crop);
      expect(decoded[type].pixels.equals(derived.pixels), derivedName(type)).toBe(true);
    }
  });
});

describe('scale, anchors and placement', () => {
  it('shows the six at one uniform scale, as large as the Nest and a little more than the Farm', () => {
    const scales = HABITAT_LEVEL1_ART_LIST.map(art => art.worldWidth / art.width);
    for (const scale of scales) expect(scale).toBeCloseTo(scales[0], 10);
    expect(scales[0] * 1254 / 2).toBeCloseTo(HABITAT_WORLD_WIDTH_OF_SOURCE, 6);
    expect(HABITAT_WORLD_WIDTH_OF_SOURCE).toBeGreaterThanOrEqual(NEST_ART.worldWidth); expect(HABITAT_WORLD_WIDTH_OF_SOURCE).toBeLessThanOrEqual(NEST_ART.worldWidth * 1.1); expect(HABITAT_WORLD_WIDTH_OF_SOURCE).toBeGreaterThan(FARM_ART.worldWidth);
    // The visible drawing is about the width of the 4 × 4 grid cell it stands on (176), a little wider with its fence and decor.
    for (const art of HABITAT_LEVEL1_ART_LIST) { expect(art.worldWidth).toBeGreaterThan(176); expect(art.worldWidth).toBeLessThan(200); }
  });
  it.each(SIX)('%s: the anchor is the middle of the sprite and stands on its opaque lawn', type => {
    const art = HABITAT_LEVEL1_ART[type];
    expect(Math.abs(art.anchor.x - art.width / 2)).toBeLessThanOrEqual(4);
    expect(art.anchor.y).toBeGreaterThan(art.height * .5); expect(art.anchor.y).toBeLessThan(art.height * .8);
    expect(alphaAt(type, art.anchor.x, art.anchor.y)).toBeGreaterThanOrEqual(224);
  });
  it('keeps the level-1 footprint, vector proposal zone and label offset untouched', () => {
    expect(HABITAT_SIZE_PROPOSAL[1].footprint).toEqual({width: 4, depth: 4}); expect(HABITAT_SIZE_PROPOSAL[1].zone).toEqual({minX: -56, maxX: 56, minY: -20, maxY: 38});
    expect(HABITAT_ART_LAYOUT.labelOffset).toBe(HABITAT_SIZE_PROPOSAL[1].labelOffset);
  });
  /** The resting places and the whole roaming zone of a rabbit must lie on the lawn: pixels of the lawn's own colour, never fence, shelter, rocks or gate. */
  it.each(SIX)('%s: every resting place and every point it can walk to, stand on the lawn', type => {
    const art = HABITAT_LEVEL1_ART[type], image = decoded[type], k = art.worldWidth / art.width;
    // Median colour of a small window: a flower or a blade of grass under a foot is decoration on the lawn, a fence, wall or gate is not.
    const mean = (cx, cy) => { const c = [[], [], []]; for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++) { const i = ((Math.round(cy) + dy) * image.width + Math.round(cx) + dx) * 4; for (let k = 0; k < 3; k++) c[k].push(image.pixels[i + k]); } return c.map(v => v.sort((a, b) => a - b)[Math.floor(v.length / 2)]); };
    const lawn = mean(art.anchor.x, art.anchor.y), at = p => mean(art.anchor.x + p.x / k, art.anchor.y + p.y / k);
    const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    const {slots, zone, roamScale} = HABITAT_ART_LAYOUT, radius = {x: 16 * roamScale, y: 8 * roamScale};
    // A resident strays at most `radius` from its place, and never beyond the zone: its reachable range is that box.
    for (const slot of slots) for (const [dx, dy] of [[0, 0], [-1, -1], [1, -1], [-1, 1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const p = {x: slot.x + dx * radius.x, y: slot.y + dy * radius.y};
      expect(p.x).toBeGreaterThanOrEqual(zone.minX); expect(p.x).toBeLessThanOrEqual(zone.maxX); expect(p.y).toBeGreaterThanOrEqual(zone.minY); expect(p.y).toBeLessThanOrEqual(zone.maxY);
      expect(distance(at(p), lawn), `${type} ${JSON.stringify(p)}`).toBeLessThan(60);
    }
  });
  it('rests three residents apart: two behind, one in front, inside the zone', () => {
    const {slots, zone} = HABITAT_ART_LAYOUT; expect(slots).toHaveLength(3);
    for (const s of slots) { expect(s.x).toBeGreaterThanOrEqual(zone.minX); expect(s.x).toBeLessThanOrEqual(zone.maxX); expect(s.y).toBeGreaterThanOrEqual(zone.minY); expect(s.y).toBeLessThanOrEqual(zone.maxY); }
    expect(slots[0].y).toBe(slots[1].y); expect(slots[2].y).toBeGreaterThan(slots[0].y); expect(slots[0].x).toBeLessThan(0); expect(slots[1].x).toBeGreaterThan(0);
  });
});

describe('which drawing a habitat gets', () => {
  it.each(SIX)('%s: level-1 art stays compact; approved enlarged drawings require their matching capacity level and tier', type => {
    expect(habitatArtFor({type, level: 1})).toBe(HABITAT_LEVEL1_ART[type]);
    expect(habitatArtFor({type, level: 1}, 1)).toBe(HABITAT_LEVEL1_ART[type]);
    for (const level of [2, 3]) { expect(habitatArtFor({type, level})).toBeNull(); expect(habitatArtFor({type, level}, 1)).toBeNull(); expect(habitatArtFor({type, level}, level)).toBe(level === 2 ? ({neige: NEIGE_LEVEL2_ART, feu: FEU_LEVEL2_ART, metal: METAL_LEVEL2_ART, vol: VOL_LEVEL2_ART, paille: PAILLE_LEVEL2_ART, universal: UNIVERSAL_LEVEL2_ART}[type] ?? null) : ({neige: NEIGE_LEVEL3_ART, feu: FEU_LEVEL3_ART, metal: METAL_LEVEL3_ART, vol: VOL_LEVEL3_ART, paille: PAILLE_LEVEL3_ART, universal: UNIVERSAL_LEVEL3_ART}[type] ?? null)); }
    expect(habitatArtFor({type, level: 1}, 2)).toBeNull(); expect(habitatArtFor({type, level: 1}, 3)).toBeNull();
  });
  it('gives nothing to a building without habitat', () => { expect(habitatArtFor(undefined)).toBeNull(); expect(habitatArtFor(undefined, 2)).toBeNull(); });
});
