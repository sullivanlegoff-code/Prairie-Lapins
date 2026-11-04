// @vitest-environment happy-dom
import {describe, expect, it} from 'vitest';
import {act, createGame, decodeGame, encodeGame} from '../src/simulation';
import {AFFECTION_STATUE, BALANCE, FEED_COSTS, HOUR, MINUTE, ORDERS, RARE_BIRTH_BONUS, SECOND_AFFECTION_STATUE, SPECIES} from '../src/config/balance';
import {affectionCap, feedReason, rareBirthFactor} from '../src/simulation/affection';
import {breedingOdds} from '../src/simulation/breeding';
import {cumulativeLevelXp} from '../src/simulation/progression';
import {emptyBuilding} from '../src/state/initial';
import {buildingPlacementReason} from '../src/simulation/placement';
import {currencyAccessibleText, setCurrencyText} from '../src/display/currency';
import {furrowPoints, furrowState} from '../src/display/farmCrops';
import {FARM_ART} from '../src/config/farmArt';
import type {Command, GameState} from '../src/state/types';

// Food rework (owner, 25 October 2026): « herbe » becomes food, the farm grows ten crops, affection 15 needs the statue.
const run = (s: GameState, c: Command, now = s.lastSimulatedAt) => { const r = act(s, c, now); if (!r.ok) throw Error(`${c.type}: ${r.reason}`); return r.state; };
const atLevel = (level: number) => { const s = createGame(0); s.progression = {totalXp: cumulativeLevelXp(level), rewardedThroughLevel: level}; return s; };
const free = (s: GameState) => { for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (!buildingPlacementReason(s, x, y)) return {x, y}; throw Error('no free cell'); };

describe('the Statue de l’Affection', () => {
  it('is sold among the buildings from level 15 at its price; the second one waits for level 22', () => {
    const early = atLevel(14); early.pattes = 100_000; early.hearts = 100;
    expect(act(early, {type: 'buyBuilding', kind: 'statue', ...free(early)}, 0)).toMatchObject({ok: false, reason: 'LEVEL_REQUIRED'});
    let s = atLevel(AFFECTION_STATUE.level); s.pattes = 100_000; s.hearts = AFFECTION_STATUE.heartPrice - 1; const at = free(s);
    expect(act(s, {type: 'buyBuilding', kind: 'statue', ...at}, 0)).toMatchObject({ok: false, reason: 'NOT_ENOUGH_HEARTS'});
    s.pattes = 0; s.hearts = 2 * AFFECTION_STATUE.heartPrice;
    s = run(s, {type: 'buyBuilding', kind: 'statue', ...at}); expect(s.hearts).toBe(AFFECTION_STATUE.heartPrice); expect(s.pattes).toBe(0);
    expect(act(s, {type: 'buyBuilding', kind: 'statue', ...free(structuredClone(s))}, 0)).toMatchObject({ok: false, reason: 'LEVEL_REQUIRED'});
    expect(affectionCap(s)).toBe(SECOND_AFFECTION_STATUE.cap);
    expect(decodeGame(encodeGame(s))).toEqual({ok: true, state: s});
  });
  it('walls affection at 14 until it stands; a rabbit already higher keeps its affection', () => {
    const s = createGame(0); s.grass = 100_000; s.rabbits[0].affection = 14;
    expect(feedReason(s, 14)).toBe('STATUE_REQUIRED'); expect(act(s, {type: 'feed', id: 'rabbit-2'}, 0)).toMatchObject({ok: false, reason: 'STATUE_REQUIRED'});
    s.rabbits[0].affection = 17; expect(decodeGame(encodeGame(s)).ok).toBe(true); expect(feedReason(s, 17)).toBe('STATUE_REQUIRED');
    s.buildings.push(emptyBuilding(`building-${s.nextId++}`, 'statue', 30, 30));
    s.rabbits[0].affection = 14; const fed = run(s, {type: 'feed', id: 'rabbit-2'});
    expect(fed.rabbits[0].affection).toBe(15); expect(s.grass - fed.grass).toBe(FEED_COSTS[14]);
  });
  it('makes affection 15 the costliest meal up to 20, and 30 and 50 the next walls', () => {
    expect(Math.max(...FEED_COSTS.slice(0, 20))).toBe(FEED_COSTS[AFFECTION_STATUE.cap]);
    for (let a = 2; a < AFFECTION_STATUE.cap; a++) expect(FEED_COSTS[a]).toBeGreaterThan(FEED_COSTS[a - 1]);
    expect(FEED_COSTS).toHaveLength(BALANCE.maxAffection);
    expect(FEED_COSTS.slice(20)).toEqual([900, 1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 6000,
      1900, 2000, 2100, 2200, 2300, 2400, 2500, 2600, 2700, 2800, 2900, 3000, 3100, 3200, 3300, 3400, 3500, 3600, 3700, 10000]);
    // Each wall costs more than everything before it; between the walls, every meal costs more than the previous one.
    for (const wall of [14, 29, 49]) expect(FEED_COSTS[wall]).toBe(Math.max(...FEED_COSTS.slice(0, wall + 1)));
    for (let a = 21; a < 49; a++) if (a !== 29 && a !== 30) expect(FEED_COSTS[a]).toBeGreaterThan(FEED_COSTS[a - 1]);
    expect(FEED_COSTS[30]).toBeGreaterThan(FEED_COSTS[28]); expect(feedReason({buildings: [], grass: 0}, 50)).toBe('MAX_AFFECTION');
  });
});

describe('the second Statue de l’Affection', () => {
  it('costs 100 Hearts from level 22 (3 November 2026), hearts only, and a third one is refused', () => {
    expect(SECOND_AFFECTION_STATUE).toEqual({level: 22, cap: 30, heartPrice: 100}); expect(BALANCE.buildings.statue.maximum).toBe(2);
    let s = atLevel(21); s.hearts = 1000; s.pattes = 100_000;
    s = run(s, {type: 'buyBuilding', kind: 'statue', ...free(s)}); expect(s.hearts).toBe(1000 - AFFECTION_STATUE.heartPrice);
    expect(act(s, {type: 'buyBuilding', kind: 'statue', ...free(s)}, 0)).toMatchObject({ok: false, reason: 'LEVEL_REQUIRED'});
    s.progression = {totalXp: cumulativeLevelXp(22), rewardedThroughLevel: 22}; s.hearts = 99;
    expect(act(s, {type: 'buyBuilding', kind: 'statue', ...free(s)}, 0)).toMatchObject({ok: false, reason: 'NOT_ENOUGH_HEARTS'});
    s.hearts = 100; s = run(s, {type: 'buyBuilding', kind: 'statue', ...free(s)});
    expect([s.hearts, s.pattes]).toEqual([0, 100_000]); expect(s.buildings.filter(b => b.kind === 'statue')).toHaveLength(2);
    expect(affectionCap(s)).toBe(BALANCE.maxAffection);
    s.hearts = 1000; expect(act(s, {type: 'buyBuilding', kind: 'statue', ...free(s)}, 0)).toMatchObject({ok: false, reason: 'BUILDING_LIMIT'});
    expect(decodeGame(encodeGame(s))).toEqual({ok: true, state: s});
  });
  it('refuses 30 → 31 with one statue and accepts it with two', () => {
    const s = createGame(0); s.grass = 100_000; s.rabbits[0].affection = 30;
    const statue = () => { const at = free(s); s.buildings.push(emptyBuilding(`building-${s.nextId++}`, 'statue', at.x, at.y)); };
    statue();
    expect(feedReason(s, 29)).toBeNull(); expect(feedReason(s, 30)).toBe('SECOND_STATUE_REQUIRED');
    expect(act(s, {type: 'feed', id: 'rabbit-2'}, 0)).toMatchObject({ok: false, reason: 'SECOND_STATUE_REQUIRED'});
    statue();
    const fed = run(s, {type: 'feed', id: 'rabbit-2'}); expect(fed.rabbits[0].affection).toBe(31); expect(s.grass - fed.grass).toBe(FEED_COSTS[30]);
    expect(decodeGame(encodeGame(fed)).ok).toBe(true);
  });
  it('saves affection up to 50, never above', () => {
    const s = createGame(0); s.rabbits[0].affection = 50; expect(decodeGame(encodeGame(s)).ok).toBe(true);
    s.rabbits[0].affection = 51; expect(() => encodeGame(s)).toThrow();
  });
  it('migrates a v22 save with one statue to v23 without any change', () => {
    const s = createGame(0); s.rabbits[0].affection = 20; s.grass = 1234; s.hearts = 7;
    s.buildings.push(emptyBuilding(`building-${s.nextId++}`, 'statue', free(s).x, free(s).y));
    const raw = JSON.parse(encodeGame(s)); expect(raw.version).toBe(24); raw.version = 22;
    const migrated = decodeGame(JSON.stringify(raw)); expect(migrated).toEqual(decodeGame(encodeGame(s)));
    if (!migrated.ok) throw Error(migrated.reason);
    expect(migrated.state.version).toBe(24); expect(migrated.state.rabbits[0].affection).toBe(20);
    expect(migrated.state.buildings.filter(b => b.kind === 'statue')).toHaveLength(1); expect([migrated.state.grass, migrated.state.hearts]).toEqual([1234, 7]);
    expect(affectionCap(migrated.state)).toBe(30);
    // A v22 save could never hold affection above 20 or two statues, but nothing in v23 depends on it.
    raw.version = 25; expect(decodeGame(JSON.stringify(raw))).toEqual({ok: false, reason: 'UNSUPPORTED_VERSION'});
  });
});

describe('epic and legendary chances grow with both parents’ affection', () => {
  it('multiplies by 1.15 from 10, 1.3 from 15, 1.5 from 30 and 2 at 50, on the lower parent, for epic and legendary only', () => {
    expect(RARE_BIRTH_BONUS).toEqual([{affection: 50, factor: 2}, {affection: 30, factor: 1.5}, {affection: 15, factor: 1.3}, {affection: 10, factor: 1.15}]);
    // Every factor is a whole number of twentieths, so breeding weights stay exact integers.
    for (const step of RARE_BIRTH_BONUS) expect(Math.abs(step.factor * 20 - Math.round(step.factor * 20))).toBeLessThan(1e-9);
    expect([rareBirthFactor('magicien', 9, 50), rareBirthFactor('magicien', 10, 14), rareBirthFactor('magicien', 15, 29), rareBirthFactor('magicien', 30, 49), rareBirthFactor('dragon', 50, 50), rareBirthFactor('dragon', 49, 50)]).toEqual([1, 1.15, 1.3, 1.5, 2, 1.5]);
    expect(rareBirthFactor('boudinet', 50, 50)).toBe(1); expect(SPECIES.boudinet.rarity).toBe('rare');
    expect(breedingOdds('magicien', 'belier-gris', 9, 9).magicien).toBe(10);
    // Weight model: Roukette and Boudinet weigh 1200 each, Magicien and Câlinou géant 300 × the factor each.
    expect(breedingOdds('magicien', 'belier-gris', 10, 10).magicien).toBe(345 * 100 / 3090);
    expect(breedingOdds('magicien', 'belier-gris', 20, 15).magicien).toBe(390 * 100 / 3180);
    expect(breedingOdds('magicien', 'belier-gris', 30, 40).magicien).toBe(450 * 100 / 3300);
    expect(breedingOdds('magicien', 'belier-gris', 50, 50).magicien).toBe(600 * 100 / 3600);
  });
});

describe('saves before the ten crops', () => {
  it('turn each running v17 production into its crop, with the yield and duration it was launched with', () => {
    const s = createGame(0); s.buildings.push(emptyBuilding(`building-${s.nextId}`, 'farm', free(createGame(0)).x, free(createGame(0)).y)); s.nextId++;
    const legacy = JSON.parse(encodeGame(s)); legacy.version = 17;
    for (const [recipe, crop, grass, duration] of [['small', 'foin', 20, 5 * MINUTE], ['medium', 'trefle', 60, 30 * MINUTE], ['large', 'fenouil', 180, 4 * HOUR], ['night', 'banane', 360, 10 * HOUR]] as const) {
      legacy.buildings.at(-1).order = {recipe, startedAt: 0, endsAt: duration};
      const decoded = decodeGame(JSON.stringify(legacy)); if (!decoded.ok) throw Error(decoded.reason);
      expect(decoded.state.version).toBe(24);
      expect(decoded.state.buildings.at(-1)!.order).toEqual({recipe: crop, startedAt: 0, endsAt: duration, grass, duration});
    }
  });
});

describe('food on screen', () => {
  it('shows the food logo with every amount, and before the bare word', () => {
    const host = document.createElement('p'); setCurrencyText(host, 'Nourrir · 230 nourriture. La nourriture augmente l’affection.');
    expect(host.querySelectorAll('img.food-icon')).toHaveLength(2);
    expect(host.querySelector('.food-amount')!.textContent).toBe('230 nourriture');
    expect(host.textContent).toBe('Nourrir · 230 nourriture. La nourriture augmente l’affection.');
    expect(currencyAccessibleText('+ 1000 nourriture et 5 pattes')).toBe('+ 1 000 nourriture et 5 pièces');
  });
  it('draws sprouts on the farm’s five furrows while a crop grows, the crop itself once ripe', () => {
    expect(furrowPoints()).toHaveLength(FARM_ART.furrows.rows * FARM_ART.furrows.perRow);
    const farm = {...emptyBuilding('building-9', 'farm', 0, 0), order: {recipe: 'pomme' as const, startedAt: 0, endsAt: ORDERS.pomme.duration}};
    expect([furrowState(emptyBuilding('building-8', 'farm', 0, 0), 0), furrowState(farm, HOUR), furrowState(farm, ORDERS.pomme.duration)]).toEqual(['empty', 'growing', 'ripe']);
  });
});
