// @vitest-environment happy-dom
import {describe, expect, it} from 'vitest';
import {act, createGame} from '../src/simulation';
import {emptyBuilding} from '../src/state/initial';
import {buildingPlacementReason} from '../src/simulation/placement';
import {capReason, feedReason, rabbitAffectionCap, waitsForEvolution} from '../src/simulation/affection';
import {giftAffectionReason, giftReason, picnicQuote} from '../src/simulation/care';
import {cumulativeLevelXp} from '../src/simulation/progression';
import {HOUR} from '../src/config/balance';
import {LegendaryClock, TAP_COOLDOWN_MS} from '../src/display/legendaryTimeline';
import type {GameState, Rabbit} from '../src/state/types';

// Owner, 4 November 2026: « Un lapin ne doit pas pouvoir dépasser le niveau 30 s'il n'a pas évolué » ; Benny may reach 50.
const free = (s: GameState) => { for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (!buildingPlacementReason(s, x, y)) return {x, y}; throw Error('no free cell'); };
const withStatues = (count: number) => {
  const s = createGame(0); s.grass = 1_000_000;
  for (let i = 0; i < count; i++) { const at = free(s); s.buildings.push(emptyBuilding(`building-${s.nextId++}`, 'statue', at.x, at.y)); }
  return s;
};
const rabbit = (s: GameState, patch: Partial<Rabbit>) => Object.assign(s.rabbits[0], patch);

describe('the evolution wall at affection 30', () => {
  it('stops a rabbit that has not evolved at 30, before the second statue', () => {
    const s = withStatues(2), r = rabbit(s, {affection: 30});
    expect(waitsForEvolution(r)).toBe(true); expect(rabbitAffectionCap(s, r)).toBe(30); expect(capReason(s, r)).toBe('EVOLUTION_REQUIRED');
    expect(feedReason(s, r)).toBe('EVOLUTION_REQUIRED');
    expect(act(s, {type: 'feed', id: r.id}, 0)).toMatchObject({ok: false, reason: 'EVOLUTION_REQUIRED'});
    // With one statue only, the evolution is asked first; the bare affection still reads the statues alone.
    const one = withStatues(1), r1 = rabbit(one, {affection: 30});
    expect(feedReason(one, r1)).toBe('EVOLUTION_REQUIRED'); expect(feedReason(one, 30)).toBe('SECOND_STATUE_REQUIRED');
    // Below 30 nothing changes.
    r.affection = 29; expect(feedReason(s, r)).toBeNull();
  });
  it('lets an evolved rabbit go on with the second statue only, even back in its old drawing', () => {
    const one = withStatues(1), r1 = rabbit(one, {affection: 30, evolution: {done: true}});
    expect(feedReason(one, r1)).toBe('SECOND_STATUE_REQUIRED');
    const two = withStatues(2), r2 = rabbit(two, {affection: 30, evolution: {done: true}, classicLook: true});
    expect(feedReason(two, r2)).toBeNull();
    const fed = act(two, {type: 'feed', id: r2.id}, 0); expect(fed.ok).toBe(true); if (fed.ok) expect(fed.state.rabbits[0].affection).toBe(31);
  });
  it('keeps Benny under the statues’ rules up to 50', () => {
    const s = withStatues(2), r = rabbit(s, {species: 'benny', affection: 30});
    expect(waitsForEvolution(r)).toBe(false); expect(rabbitAffectionCap(s, r)).toBe(50); expect(feedReason(s, r)).toBeNull();
  });
  it('lets a rabbit already above 30 keep its affection, without gaining more', () => {
    const s = withStatues(2), r = rabbit(s, {affection: 34});
    expect(feedReason(s, r)).toBe('EVOLUTION_REQUIRED');
    expect(act(s, {type: 'feed', id: r.id}, 0)).toMatchObject({ok: false});
    expect(s.rabbits[0].affection).toBe(34);
  });
  it('applies to the gifts (salon, picnic) and to the cuisine', () => {
    const s = withStatues(2), r = rabbit(s, {affection: 31});
    // No +1 from a gift before the evolution, but the care and the picnic stay open: both are evolution challenges.
    expect(giftAffectionReason(s, r)).toBe('EVOLUTION_REQUIRED'); expect(giftReason(s, r, 0)).toBeNull();
    r.evolution = {done: true}; expect(giftAffectionReason(s, r)).toBeNull();
    const k = withStatues(2), cook = rabbit(k, {affection: 30}), at = free(k);
    k.buildings.push(emptyBuilding(`building-${k.nextId++}`, 'kitchen', at.x, at.y));
    const cooked = act(k, {type: 'rewardCuisine', rabbitId: cook.id, recipeId: 'chicken'}, 0);
    expect(cooked.ok).toBe(true); if (!cooked.ok) return;
    expect(cooked.state.rabbits[0].affection).toBe(30);
    expect(cooked.cuisineReward).toMatchObject({affectionGranted: false, affectionEvolutionRequired: true, affectionStatueRequired: false});
  });
});

describe('the challenges of a rabbit waiting at 30', () => {
  it('lets it take a care and a picnic without gaining affection, and counts both for its evolution', () => {
    const s = withStatues(2); s.pattes = 1_000_000; s.progression = {totalXp: cumulativeLevelXp(25), rewardedThroughLevel: 25};
    const at = free(s); s.buildings.push(emptyBuilding('building-90', 'salon', at.x, at.y));
    const r = rabbit(s, {species: 'neige', affection: 30}); if (!s.discovered.includes('neige')) s.discovered.push('neige');
    const started = act(s, {type: 'startCare', rabbitId: r.id, care: 'bath'}, 0); expect(started.ok).toBe(true); if (!started.ok) return;
    const back = act(started.state, {type: 'claimCare', rabbitId: r.id}, 48 * HOUR); expect(back.ok).toBe(true); if (!back.ok) return;
    const neige = back.state.rabbits.find(x => x.id === r.id)!;
    expect(neige.affection).toBe(30); expect(neige.evolution?.challenges?.soin).toBe(1);
    const p = withStatues(2); p.pattes = 1_000_000; p.progression = {totalXp: cumulativeLevelXp(25), rewardedThroughLevel: 25};
    const guest = rabbit(p, {species: 'belier-gris', affection: 30}); if (!p.discovered.includes('belier-gris')) p.discovered.push('belier-gris');
    const quote = picnicQuote(p, guest.enclosureId, 0, 25); expect(quote.reason).toBeNull();
    const picnic = act(p, {type: 'picnic', enclosureId: guest.enclosureId, expectedCost: quote.price}, 0); expect(picnic.ok).toBe(true); if (!picnic.ok) return;
    const done = picnic.state.rabbits.find(x => x.id === guest.id)!;
    expect(done.affection).toBe(30); expect(done.evolution?.challenges?.piquenique).toBe(1);
  });
});

describe('the show button of a legendary sheet', () => {
  it('plays the chosen show of its species at once, with the anti-repeat delay', () => {
    const clock = new LegendaryClock('requin', 'rabbit-9');
    expect(clock.request('slam')).toBeNull(); // not a Requin show
    expect(clock.request('surf')?.act).toBe('surf');
    expect(clock.request('surf')).toBeNull(); // one is playing
    for (let t = 0; t < 4000; t += 100) clock.step(100, false);
    expect(clock.request('dive')?.act).toBe('dive');
    const again = new LegendaryClock('dragon', 'rabbit-1'); again.request('tap'); for (let t = 0; t < 2000; t += 100) again.step(100, false);
    expect(again.request('tap')).not.toBeNull();
    expect(TAP_COOLDOWN_MS).toBeLessThan(2000);
  });
});
