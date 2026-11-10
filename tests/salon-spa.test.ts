// @vitest-environment happy-dom
import {describe, expect, it} from 'vitest';
import {itAll} from './cases';
import {COMPACT_FOOTPRINT, SALON_FOOTPRINT, buildingSize, salonScale} from '../src/config/habitatSizes';
import {artForRabbit} from '../src/config/rabbitArt';
import {SALON_ART, SALON_SCENES} from '../src/config/salonArt';
import {GLOW_FADE_MS, GLOW_MS, SPA_LOOK, glowStrength, spaLayout, waterLine} from '../src/display/salonSpaLayout';
import {decodeGame, encodeGame} from '../src/persistence/json';
import {createGame} from '../src/simulation';
import {buildingFootprint, buildingPlacementReason, overlaps} from '../src/simulation/placement';
import {emptyBuilding} from '../src/state/initial';
import type {BuildingKind} from '../src/config/balance';
import type {GameState} from '../src/state/types';
import {salonCareThumbnail, salonScene} from '../src/ui/salonScene';

const CARES = ['bath', 'brush', 'massage'] as const;
const load = (json: string): GameState => { const r = decodeGame(json); if (!r.ok) throw Error(r.reason); return r.state; };
/** A v27 save (before the spa): the same JSON, version 27, the salon without any mark. */
function asV27(s: GameState): string {
  const raw = JSON.parse(encodeGame(s)); raw.version = 27;
  for (const b of raw.buildings) if (b.kind === 'salon') delete b.formerFootprint;
  return JSON.stringify(raw);
}
/** A fresh game (south-west parcel: fine cells x 0–15, y 32–47) with a 4 × 4 salon at (x, y). */
function withOldSalon(x: number, y: number): GameState {
  const s = createGame(0), salon = emptyBuilding(`building-${s.nextId}`, 'salon', x, y); salon.formerFootprint = 1;
  s.nextId++; s.buildings.push(salon); return s;
}
function expectNoOverlap(s: GameState) {
  for (const [i, a] of s.buildings.entries()) for (const b of s.buildings.slice(i + 1)) expect(overlaps(buildingFootprint(a), buildingFootprint(b)), `${a.id} / ${b.id}`).toBe(false);
}

describe('the Salon de soins, a 6 × 6 spa', () => {
  it('is 6 × 6 when built, 4 × 4 drawn at two thirds while it keeps its former size', () => {
    expect(buildingSize({kind: 'salon'})).toEqual(SALON_FOOTPRINT);
    expect(SALON_FOOTPRINT).toEqual({width: 6, depth: 6});
    expect(buildingSize({kind: 'salon', formerFootprint: 1})).toEqual(COMPACT_FOOTPRINT);
    expect(salonScale({})).toBe(1);
    expect(salonScale({formerFootprint: 1})).toBeCloseTo(2 / 3);
  });

  it('migrates a v27 salon to its former size, then grows it to 6 × 6 where there is room, nothing lost', () => {
    const before = withOldSalon(10, 40);
    const after = load(asV27(before)), salon = after.buildings.find(b => b.kind === 'salon')!;
    expect(salon.formerFootprint).toBeUndefined();
    expect(buildingSize(salon)).toEqual(SALON_FOOTPRINT);
    expect(after.buildings.map(b => b.id)).toEqual(before.buildings.map(b => b.id));
    expect(after.rabbits).toEqual(before.rabbits);
    expectNoOverlap(after);
    // Written again, it stays as it is.
    expect(load(encodeGame(after)).buildings).toEqual(after.buildings);
  });

  it('keeps a v27 salon at 4 × 4, where it stands, when 6 × 6 fits nowhere near it', () => {
    const s = withOldSalon(12, 32);
    // Fill the parcel's free room with other buildings (within their limits), then with enclosures.
    const pool: BuildingKind[] = ['farm', 'farm', 'farm', 'farm', 'kitchen', 'agency', 'statue', 'statue', 'forest'];
    for (let y = 32; y < 48; y++) for (let x = 0; x < 16; x++) for (const kind of [...new Set(pool)]) {
      if (buildingPlacementReason(s, x, y, undefined, kind)) continue;
      pool.splice(pool.indexOf(kind), 1); s.buildings.push(emptyBuilding(`building-${s.nextId++}`, kind, x, y)); break;
    }
    for (let y = 32; y < 48; y++) for (let x = 0; x < 16; x++) if (!buildingPlacementReason(s, x, y, undefined, 'enclosure')) s.buildings.push(emptyBuilding(`building-${s.nextId++}`, 'enclosure', x, y, 'universal'));
    const after = load(asV27(s)), salon = after.buildings.find(b => b.kind === 'salon')!;
    expect(salon.formerFootprint).toBe(1);
    expect({x: salon.x, y: salon.y}).toEqual({x: 12, y: 32});
    expect(buildingSize(salon)).toEqual(COMPACT_FOOTPRINT);
    expect(after.buildings.length).toBe(s.buildings.length);
    expectNoOverlap(after);
    expect(decodeGame(encodeGame(after)).ok).toBe(true);
  });

  it('refuses another value of the former-size mark on a salon', () => {
    const s = withOldSalon(10, 40), raw = JSON.parse(encodeGame(s));
    raw.buildings.find((b: {kind: string}) => b.kind === 'salon').formerFootprint = 2;
    expect(decodeGame(JSON.stringify(raw)).ok).toBe(false);
  });
});

describe('the rabbit in its care', () => {
  const paille = createGame(0).rabbits[0]!, art = artForRabbit(paille)!;

  itAll(CARES)('%s: looks towards the middle of the spa, its pieces on its own head, chest and eyes', care => {
    const layout = spaLayout(art, care);
    expect(layout.flip * art.facing).toBe(SPA_LOOK[care]);
    expect(layout.width).toBeCloseTo(art.worldWidth);
    // Head above the chest, both on the drawing.
    expect(layout.head.y).toBeLessThan(layout.chest.y);
    for (const p of [layout.head, layout.chest, layout.eyes]) {
      expect(Math.abs(p.x)).toBeLessThanOrEqual(layout.width / 2);
      expect(p.y).toBeLessThanOrEqual(art.groundY); expect(p.y).toBeGreaterThanOrEqual(art.groundY - layout.height);
    }
    if (care === 'bath') {
      // In the tub: under water below the chest, its head out.
      expect(layout.keep).toBeLessThan(1);
      expect(waterLine(art, layout)).toBeGreaterThan(layout.chest.y);
      expect(waterLine(art, layout)).toBeGreaterThan(layout.head.y);
    } else expect(layout.keep).toBe(1);
  });

  it('places each care in its own corner of the spa', () => {
    const {bath, brush, massage} = SALON_ART.stations;
    expect(brush.x).toBeLessThan(bath.x); expect(bath.x).toBeLessThan(massage.x);
    for (const p of [bath, brush, massage]) { expect(p.x).toBeGreaterThan(0); expect(p.x).toBeLessThan(1); expect(p.y).toBeGreaterThan(0); expect(p.y).toBeLessThan(1); }
  });

  it('shines on its return for three minutes, fading out at the end', () => {
    const until = 1_000 + GLOW_MS;
    expect(glowStrength(until, 1_000)).toBe(1);
    expect(glowStrength(until, until - GLOW_FADE_MS / 2)).toBeCloseTo(.5);
    expect(glowStrength(until, until)).toBe(0);
    expect(glowStrength(until, until + 1)).toBe(0);
  });
});

describe('the scene in the Salon de soins menu', () => {
  const paille = createGame(0).rabbits[0]!;

  itAll(CARES)('%s: the painted corner, the rabbit eyes closed, the care’s pieces, a caption', care => {
    const scene = salonScene(paille, care);
    expect(scene.dataset.salonScene).toBe(care);
    expect(scene.querySelector<HTMLImageElement>('.salon-scene-backdrop')!.getAttribute('src')).toBe(SALON_SCENES[care].url);
    expect(scene.querySelector('.salon-scene-picture')).not.toBeNull();
    expect(scene.querySelector('.salon-scene-eyes')).not.toBeNull();
    const pieces = [...scene.querySelectorAll('.salon-scene-piece')].map(p => p.className);
    const expected = {bath: ['spa-foam-crown', 'spa-foam-water', 'spa-bubble'], brush: ['spa-brush', 'spa-tuft'], massage: ['spa-blanket', 'spa-turban', 'spa-cucumber', 'spa-steam']}[care];
    for (const name of [...expected, 'spa-heart']) expect(pieces.some(c => c.includes(name)), name).toBe(true);
    // Only the bath cuts the rabbit at the water line and draws the tub's front over it.
    expect(!!scene.querySelector('[data-water-line]')).toBe(care === 'bath');
    expect(!!scene.querySelector('.salon-scene-front')).toBe(care === 'bath');
    expect(scene.querySelector('figcaption')!.textContent).toMatch(/^Le lapin /);
  });

  it('gives each care’s card a small picture of its corner', () => {
    for (const care of CARES) expect(salonCareThumbnail(care).getAttribute('src')).toBe(SALON_SCENES[care].url);
  });
});
