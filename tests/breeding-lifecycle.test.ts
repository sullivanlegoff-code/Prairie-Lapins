import {describe, expect, it} from 'vitest';
import {act, advance, createGame, decodeGame, encodeGame} from '../src/simulation';
import {quoteAcceleration} from '../src/simulation/hearts';
import {welcomeDestinations, habitatEntryReason} from '../src/simulation/habitats';
import {buildingPlacementReason, footprintPlacementReason} from '../src/simulation/placement';
import {cumulativeLevelXp} from '../src/simulation/progression';
import {MINUTE, growthDuration} from '../src/config/balance';
import type {HabitatType} from '../src/config/habitats';
import type {Command, GameState} from '../src/state/types';
import {representative} from './representative-games';
import {babyOf, stateBaby, welcomeOf} from './nursery-baby';

/** Real commands on a new southwest game: Paille (starter habitat) + Neige (own habitat). an explicitly stored historical Neige birth. */
const run = (s: GameState, command: Command, now = s.lastSimulatedAt, roll = .5): GameState => {
  const r = act(s, command, now, () => roll); if (!r.ok) throw Error(r.reason); return r.state;
};
const nursery = (s: GameState) => s.buildings.find(b => b.kind === 'nursery')!;
const nest = (s: GameState) => s.buildings.find(b => b.kind === 'nest')!;
function habitat(s: GameState, type: HabitatType): GameState {
  // A cell where the habitat also has room to grow to its 6 × 5 level-2 footprint (the upgrade tests need it).
  for (let y = 32; y <= 44; y++) for (let x = 0; x <= 12; x++) if (!buildingPlacementReason(s, x, y) && !footprintPlacementReason(s, {x, y, width: 6, height: 5})) return run(s, {type: 'buyBuilding', kind: 'enclosure', habitatType: type, x, y});
  throw Error('no free cell');
}
const fill = (s: GameState, home: string, species: 'paille' | 'neige') => {
  while (!habitatEntryReason(s, s.buildings.find(b => b.id === home)!, species)) s = run(s, {type: 'buyRabbit', species, enclosureId: home});
  return s;
};
/** Baby Neige growing in the nursery; parents back in their habitats; the Neige habitat holds one rabbit. */
function growing() {
  let s = createGame(0); s.pattes = 100_000; s.hearts = 100; s.grass = 1000;
  s = habitat(s, 'neige'); const snowHome = s.buildings.at(-1)!.id, strawHome = 'building-1';
  s = run(s, {type: 'buyRabbit', species: 'neige', enclosureId: snowHome}); const snow = s.rabbits.at(-1)!.id;
  s = run(s, {type: 'feed', id: 'rabbit-2'}); s = run(s, {type: 'feed', id: snow});
  s = run(s, {type: 'breed', parents: ['rabbit-2', snow]});
  // Historical already-drawn Common: retain the original compatibility/capacity regression.
  expect(nest(s).breeding!.birth.species).toBe('icy');
  nest(s).breeding!.birth.species='neige';nest(s).breeding!.birth.reservedDiscovery=false;nest(s).breeding!.birth.guaranteed=false;nest(s).breeding!.endsAt=nest(s).breeding!.startedAt+growthDuration('neige');
  s = advance(s, s.lastSimulatedAt + growthDuration(nest(s).breeding!.birth.species));
  s = run(s, {type: 'transferBirth', id: nest(s).id, birthId: nest(s).breeding!.birth.id});
  return {s, snowHome, strawHome, snow};
}
const accelerate = (s: GameState): Extract<Command, {type: 'accelerate'}> => {
  const q = quoteAcceleration(s, nursery(s).id, 'growth', s.lastSimulatedAt, stateBaby(s)?.birth.id); if (!q.ok) throw Error(q.reason);
  return {type: 'accelerate', id: nursery(s).id, stage: 'growth', jobKey: q.jobKey, maxHearts: q.hearts, birthId: stateBaby(s)!.birth.id};
};
const refuses = (s: GameState, command: Command, reason: string) => {
  const r = act(s, command, s.lastSimulatedAt); expect(r).toMatchObject({ok: false, reason}); expect(r.state).toBe(s);
};
/** The authoritative welcome rule: welcome succeeds exactly into the helper's destinations. */
function welcomeAgrees(s: GameState) {
  const ready = babyOf(nursery(s))!, ids = welcomeDestinations(s, ready.birth.species).map(b => b.id);
  for (const b of s.buildings) expect(act(s, welcomeOf(s, b.id), s.lastSimulatedAt).ok, b.id).toBe(ids.includes(b.id));
  return ids;
}

describe('breeding → nursery → welcome lifecycle', () => {
  it('A: accelerates growth with compatible room, welcomes there, refuses the incompatible habitat, then the nest breeds again', () => {
    const {s: start, snowHome, strawHome, snow} = growing(), command = accelerate(start);
    let s = run(start, command);
    expect(s.hearts).toBe(start.hearts - command.maxHearts); expect(babyOf(nursery(s))!.readyAt).toBe(s.lastSimulatedAt);
    expect(welcomeAgrees(s)).toEqual([snowHome]);
    refuses(s, welcomeOf(s, strawHome), 'TYPE_INCOMPATIBLE');
    s = run(s, welcomeOf(s, snowHome));
    expect(babyOf(nursery(s))).toBeNull(); expect(nest(s).breeding).toBeNull();
    s = run(s, {type: 'breed', parents: ['rabbit-2', snow]}); expect(nest(s).breeding).not.toBeNull();
  });
  it('B/C/H: refuses growth acceleration and the free aid, spending nothing, when no compatible habitat has room', () => {
    const {s: start, snowHome, strawHome} = growing(), stale = accelerate(start);
    let s = fill(start, snowHome, 'neige');
    // C: only the incompatible Paille habitat has room. The former check (any free enclosure) accepted this.
    expect(habitatEntryReason(s, s.buildings.find(b => b.id === strawHome)!, 'paille')).toBeNull();
    expect(quoteAcceleration(s, nursery(s).id, 'growth', s.lastSimulatedAt, stateBaby(s)?.birth.id)).toEqual({ok: false, reason: 'CAPACITY_FULL'});
    refuses(s, stale, 'CAPACITY_FULL');
    refuses(s, {type: 'initiationAid', id: nursery(s).id, stage: 'growth', jobKey: stale.jobKey, birthId: stale.birthId}, 'CAPACITY_FULL');
    // B: every habitat full.
    s = fill(s, strawHome, 'paille');
    expect(quoteAcceleration(s, nursery(s).id, 'growth', s.lastSimulatedAt, stateBaby(s)?.birth.id)).toEqual({ok: false, reason: 'CAPACITY_FULL'});
    refuses(s, stale, 'CAPACITY_FULL');
  });
  it('the growth quote never names the species, whatever its answer', () => {
    const {s, snowHome} = growing();
    for (const state of [s, fill(s, snowHome, 'neige')]) expect(JSON.stringify(quoteAcceleration(state, nursery(state).id, 'growth', state.lastSimulatedAt, stateBaby(state)?.birth.id))).not.toContain('neige');
  });
  it('F: revalidates capacity taken between the quote and the command, atomically', () => {
    const {s: start, snowHome} = growing();
    let s = run(start, {type: 'buyRabbit', species: 'neige', enclosureId: snowHome});
    const quoted = accelerate(s);                      // one compatible place left
    s = run(s, {type: 'buyRabbit', species: 'neige', enclosureId: snowHome});
    expect(s.hearts).toBeGreaterThanOrEqual(quoted.maxHearts); refuses(s, quoted, 'CAPACITY_FULL'); // affordable, yet refused unchanged
  });
  it('D: becomes available again once compatible room exists (upgrade), without corrupting the job', () => {
    const {s: start, snowHome} = growing();
    let s = fill(start, snowHome, 'neige'); s.progression = {totalXp: cumulativeLevelXp(3), rewardedThroughLevel: 3};
    const baby = structuredClone(babyOf(nursery(s)));
    s = run(s, {type: 'upgradeHabitat', id: snowHome, fromLevel: 1});
    expect(babyOf(nursery(s))).toEqual(baby);
    s = run(s, accelerate(s)); expect(welcomeAgrees(s)).toEqual([snowHome]);
    s = run(s, welcomeOf(s, snowHome)); expect(babyOf(nursery(s))).toBeNull();
  });
  it('E: with several compatible habitats, any one with room suffices and welcome follows each one exactly', () => {
    const {s: start, snowHome} = growing();
    let s = fill(start, snowHome, 'neige'); s = habitat(s, 'neige'); const second = s.buildings.at(-1)!.id;
    s = run(s, accelerate(s));
    expect(welcomeAgrees(s)).toEqual([second]);
    refuses(s, welcomeOf(s, snowHome), 'CAPACITY_FULL');
    s = run(s, welcomeOf(s, second)); expect(s.rabbits.at(-1)!.enclosureId).toBe(second);
  });
  it('G/I: a ready baby without a home keeps the next birth waiting in the nest, survives save/load, then the pipeline resumes', () => {
    const {s: start, snowHome, snow} = growing();
    let s = fill(start, snowHome, 'neige'); s.progression = {totalXp: cumulativeLevelXp(3), rewardedThroughLevel: 3};
    s = advance(s, s.lastSimulatedAt + 5 * MINUTE); expect(babyOf(nursery(s))!.readyAt).toBeLessThanOrEqual(s.lastSimulatedAt);
    expect(welcomeAgrees(s)).toEqual([]);
    s = run(s, {type: 'breed', parents: ['rabbit-2', snow]}, s.lastSimulatedAt, .1);
    s = advance(s, s.lastSimulatedAt + growthDuration(nest(s).breeding!.birth.species));
    const waiting = nest(s).breeding!;
    refuses(s, {type: 'transferBirth', id: nest(s).id, birthId: waiting.birth.id}, 'BUSY');
    expect(decodeGame(encodeGame(s))).toEqual({ok: true, state: s});
    s = run(s, {type: 'upgradeHabitat', id: snowHome, fromLevel: 1});
    s = run(s, welcomeOf(s, snowHome));
    s = run(s, {type: 'transferBirth', id: nest(s).id, birthId: waiting.birth.id});
    expect(babyOf(nursery(s))!.birth).toEqual(waiting.birth); expect(nest(s).breeding).toBeNull();
  });
  it('J: a saved game with a ready nursery and a waiting nest reloads with the same welcome rule', () => {
    const saved = representative().nurseryAndWaitingNest; saved.progression = {totalXp: cumulativeLevelXp(14), rewardedThroughLevel: 14}; // the waiting rare result is level-gated
    const decoded = decodeGame(encodeGame(saved));
    if (!decoded.ok) throw Error(decoded.reason);
    const s = decoded.state;
    expect(babyOf(nursery(s))).toEqual(babyOf(nursery(saved))); expect(nest(s).breeding).toEqual(nest(saved).breeding);
    // The fixture's baby (rare, 25 min) is ready at its readyAt, which may be later than the saved clock: advance to it.
    const ready = advance(s, babyOf(nursery(s))!.readyAt);
    expect(welcomeAgrees(ready).length).toBeGreaterThan(0);
  });
});
