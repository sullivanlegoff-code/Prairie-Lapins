// @vitest-environment happy-dom
import {describe, expect, it} from 'vitest';
import {act, createGame, decodeGame, encodeGame} from '../src/simulation';
import {AFFECTION_STATUE, BALANCE, FEED_COSTS, HOUR, MINUTE, ORDERS, SPECIES} from '../src/config/balance';
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
  it('is sold among the buildings from level 15, once, at its price', () => {
    const early = atLevel(14); early.pattes = 100_000;
    expect(act(early, {type: 'buyBuilding', kind: 'statue', ...free(early)}, 0)).toMatchObject({ok: false, reason: 'LEVEL_REQUIRED'});
    let s = atLevel(AFFECTION_STATUE.level); s.pattes = BALANCE.buildings.statue.price - 1; const at = free(s);
    expect(act(s, {type: 'buyBuilding', kind: 'statue', ...at}, 0)).toMatchObject({ok: false, reason: 'NOT_ENOUGH_PATTES'});
    s.pattes = 2 * BALANCE.buildings.statue.price;
    s = run(s, {type: 'buyBuilding', kind: 'statue', ...at}); expect(s.pattes).toBe(BALANCE.buildings.statue.price);
    expect(act(s, {type: 'buyBuilding', kind: 'statue', ...free(structuredClone(s))}, 0)).toMatchObject({ok: false, reason: 'BUILDING_LIMIT'});
    expect(affectionCap(s)).toBe(BALANCE.maxAffection);
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
  it('makes affection 15 the costliest meal of all', () => {
    expect(Math.max(...FEED_COSTS)).toBe(FEED_COSTS[AFFECTION_STATUE.cap]);
    for (let a = 2; a < AFFECTION_STATUE.cap; a++) expect(FEED_COSTS[a]).toBeGreaterThan(FEED_COSTS[a - 1]);
  });
});

describe('epic and legendary chances grow with both parents’ affection', () => {
  it('multiplies by 1.5 from 10 and by 2 from 15, on the lower parent, for epic and legendary only', () => {
    expect([rareBirthFactor('magicien', 9, 20), rareBirthFactor('magicien', 10, 14), rareBirthFactor('magicien', 15, 15), rareBirthFactor('dragon', 15, 20)]).toEqual([1, 1.5, 2, 2]);
    expect(rareBirthFactor('lunettes', 20, 20)).toBe(1); expect(SPECIES.lunettes.rarity).toBe('rare');
    expect(breedingOdds('magicien', 'belier-gris', 9, 9).magicien).toBe(5);
    expect(breedingOdds('magicien', 'belier-gris', 10, 10).magicien).toBe(7.5);
    expect(breedingOdds('magicien', 'belier-gris', 20, 15).magicien).toBe(10);
  });
});

describe('saves before the ten crops', () => {
  it('turn each running v17 production into its crop, with the yield and duration it was launched with', () => {
    const s = createGame(0); s.buildings.push(emptyBuilding(`building-${s.nextId}`, 'farm', free(createGame(0)).x, free(createGame(0)).y)); s.nextId++;
    const legacy = JSON.parse(encodeGame(s)); legacy.version = 17;
    for (const [recipe, crop, grass, duration] of [['small', 'foin', 20, 5 * MINUTE], ['medium', 'trefle', 60, 30 * MINUTE], ['large', 'fenouil', 180, 4 * HOUR], ['night', 'banane', 360, 10 * HOUR]] as const) {
      legacy.buildings.at(-1).order = {recipe, startedAt: 0, endsAt: duration};
      const decoded = decodeGame(JSON.stringify(legacy)); if (!decoded.ok) throw Error(decoded.reason);
      expect(decoded.state.version).toBe(19);
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
