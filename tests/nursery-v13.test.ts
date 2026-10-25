import {describe, expect, it} from 'vitest';
import {act, decodeGame, encodeGame} from '../src/simulation';
import {createGame} from '../src/state/initial';
import {scenarioState} from '../src/dev/scenarios';
import {quoteAcceleration} from '../src/simulation/hearts';
import {growthDuration} from '../src/config/balance';
import {jobKey} from '../src/simulation/initiation';
import type {GameState} from '../src/state/types';
import {setBaby, stateBaby} from './nursery-baby';

type Raw = Record<string, any>;
const nursery = (s: GameState) => s.buildings.find(b => b.kind === 'nursery')!;
const birth = (id: string) => ({id, species: 'paille' as const, guaranteed: false, reservedDiscovery: false});
function growing(): GameState {
  const s = createGame(0); setBaby(nursery(s), {birth: birth('birth-6'), startedAt: 0, readyAt: growthDuration('paille')}); s.nextId = 7; return s;
}
const raw = (s: GameState): Raw => JSON.parse(encodeGame(s));
const rawNursery = (r: Raw) => r.buildings.find((b: Raw) => b.kind === 'nursery');
const rejected = (r: Raw) => expect(decodeGame(JSON.stringify(r))).toEqual({ok: false, reason: 'INVALID_STATE'});

describe('Nursery v13 state', () => {
  it('starts a new game with the single nursery at capacity 1 and no baby; no other building carries a nursery payload', () => {
    const s = createGame(0);
    expect(s.version).toBe(18);
    expect(s.buildings.filter(b => b.kind === 'nursery').map(b => b.nursery)).toEqual([{capacity: 1, babies: []}]);
    expect(s.buildings.filter(b => b.kind !== 'nursery').every(b => b.nursery === null)).toBe(true);
  });
  it('transfers the finished birth into slot 0 and still keeps the next one waiting in the nest', () => {
    const s = scenarioState('initiationSaved', 0);
    expect(nursery(s).nursery).toMatchObject({capacity: 1, babies: [{slot: 0, birth: {id: s.initiation!.birthId}}]});
  });
});

describe('the saved nursery keeps the job keys of its growing baby', () => {
  it('keeps the free-aid and acceleration job key of a growing baby through a save, so a saved initiation right stays usable', () => {
    const s = scenarioState('initiationSaved', 0), r = decodeGame(encodeGame(s)); if (!r.ok) throw Error(r.reason);
    expect(r.state).toEqual(s);
    expect(jobKey(nursery(r.state), 'growth', s.initiation!.birthId!)).toBe(s.initiation!.growth);
    const q = quoteAcceleration(r.state, nursery(r.state).id, 'growth', 0, stateBaby(r.state)?.birth.id);
    expect(q.ok && q.jobKey).toBe(s.initiation!.growth);
    expect(act(r.state, {type: 'initiationAid', id: nursery(r.state).id, stage: 'growth', jobKey: s.initiation!.growth!, birthId: s.initiation!.birthId!}, 0).ok).toBe(true);
  });
});

describe('v13 save validation', () => {
  it('4. round-trips capacity and slot exactly', () => {
    for (const capacity of [1, 2, 3, 4] as const) {
      const s = growing(); nursery(s).nursery!.capacity = capacity; nursery(s).nursery!.babies[0].slot = (capacity - 1) as 0 | 1 | 2 | 3;
      expect(decodeGame(encodeGame(s))).toEqual({ok: true, state: s});
    }
  });
  it('accepts several babies in distinct unlocked slots (model only; no command creates them yet)', () => {
    const s = growing(); s.nextId = 8;
    s.buildings.find(b => b.kind === 'nursery')!.nursery = {capacity: 3, babies: [
      {slot: 2, birth: birth('birth-6'), startedAt: 0, readyAt: growthDuration('paille')},
      {slot: 0, birth: birth('birth-7'), startedAt: 0, readyAt: growthDuration('paille')}]};
    expect(decodeGame(encodeGame(s))).toEqual({ok: true, state: s});
  });
  it('5. rejects duplicate slots', () => {
    const r = raw(growing()); r.nextId = 8;
    rawNursery(r).nursery = {capacity: 2, babies: [rawNursery(r).nursery.babies[0], {...rawNursery(r).nursery.babies[0], birth: birth('birth-7')}]};
    rejected(r);
  });
  it('6. rejects a slot at or above the capacity', () => {
    const r = raw(growing()); rawNursery(r).nursery.babies[0].slot = 1; rejected(r);
    const four = raw(growing()); rawNursery(four).nursery.capacity = 4; rawNursery(four).nursery.babies[0].slot = 4; rejected(four);
  });
  it('7. rejects more babies than the capacity', () => {
    const r = raw(growing()); r.nextId = 8;
    rawNursery(r).nursery.babies.push({...rawNursery(r).nursery.babies[0], slot: 1, birth: birth('birth-7')});
    rejected(r);
  });
  it('8–9. rejects capacity 0 and 5', () => {
    for (const capacity of [0, 5]) { const r = raw(createGame(0)); rawNursery(r).nursery.capacity = capacity; rejected(r); }
  });
  it('10. rejects a nursery payload on any other building, and a nursery without one', () => {
    for (const kind of ['enclosure', 'nest']) {
      const r = raw(createGame(0)); r.buildings.find((b: Raw) => b.kind === kind).nursery = {capacity: 1, babies: []}; rejected(r);
    }
    const missing = raw(createGame(0)); rawNursery(missing).nursery = null; rejected(missing);
  });
  it('rejects the legacy single-baby field in v13', () => {
    const r = raw(createGame(0)); rawNursery(r).baby = null; rejected(r);
    const replaced = raw(createGame(0)); const b = rawNursery(replaced); delete b.nursery; b.baby = null; rejected(replaced);
  });
  it('11. still rejects two nurseries', () => {
    const r = raw(createGame(0)); r.nextId = 101;
    r.buildings.push({...rawNursery(r), id: 'building-100', x: rawNursery(r).x + 4}); rejected(r);
  });
  it('applies the growth timer validation and global birth-id uniqueness to every baby', () => {
    const late = raw(growing()); rawNursery(late).nursery.babies[0].readyAt += 1; rejected(late);
    const future = raw(growing()); rawNursery(future).nursery.babies[0].startedAt = 1; rejected(future);
    const shared = scenarioState('initiationSaved', 0), parents = shared.rabbits.slice(0, 2).map(r => r.id);
    const withNestBirth = (id: string) => {
      const r = raw(shared); r.nextId += 1;
      r.buildings.find((b: Raw) => b.kind === 'nest').breeding = {parents, startedAt: 0, endsAt: 20 * 60_000, birth: {...rawNursery(r).nursery.babies[0].birth, id}};
      return r;
    };
    const control = withNestBirth(`birth-${shared.nextId}`);
    expect(decodeGame(JSON.stringify(control)).ok).toBe(true);
    rejected(withNestBirth(rawNursery(raw(shared)).nursery.babies[0].birth.id));
  });
});
